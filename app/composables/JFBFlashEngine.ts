import type { DeviceRegexs } from '~/types/jellyfishBridge'
import { ResponseTimeoutError, ValidationError } from '~/lib/errors'

export enum STAGE {
  IDLE,
  DEVICE_RESTARTING,
  DEVICE_WAKING,
  ENTERING_BOOTLOADER,
  BOOTLOADER_FAIL,
  FLASHING,
  FLASH_FAIL,
  FLASH_SUCCESS,
}

const ENDS_OK_RESPONSE = /.*OK/

export function useJFBFlashEngine(sendSerial: (data: string) => Promise<void>, flash: () => Promise<void>) {
  const engineStage = ref(STAGE.IDLE)
  const lastSeenID = ref<string | undefined>()
  const lastSeenAltID = ref<string | undefined>()

  const serial = useSerialMachine(sendSerial)

  async function sendUnlockCommand() {
    if (lastSeenAltID.value === undefined) {
      throw new ValidationError('Alt ID not available')
    }
    await serial.sendCommand(`O=${lastSeenAltID.value}`, { expectedResponse: ENDS_OK_RESPONSE })
  }

  async function sendQueryCommand() {
    await serial.sendCommand('?', { expectedResponse: /S=.*/, timeout: 1000 })
  }

  async function sendInvokeBootloaderCommand() {
    await serial.sendCommand('R=250', { expectedResponse: /Invo.*/ })
  }

  async function sendSetTestMeterTypeResponse(testMeterType = 0) {
    await serial.sendCommand(`${testMeterType}`, { expectedResponse: /Setting.*/ })
  }

  async function sendRegisterPreDefinedTestMeterResponse() {
    await serial.sendCommand('y', { expectedResponse: /Setting.*/ })
  }

  async function sendConfirmMBUSFlashResponse() {
    await serial.sendCommand('y')
  }

  async function sendXWhenDoneResponse() {
    await serial.sendCommand('x', { expectedResponse: /MBUS d.*/, timeout: 1000, retries: 10, retryDelay: 100 })
  }

  async function unlockDevice() {
    try {
      await sendUnlockCommand()
    }
    catch (error) {
      if (error instanceof ValidationError || error instanceof ResponseTimeoutError) {
        await sendQueryCommand()
        await sendUnlockCommand()
      }
      else {
        throw error
      }
    }
  }

  const lineRegexs: DeviceRegexs = {
    magnetTapped: {
      regex: /Magnet/,
      onMatch: async () => {
        engineStage.value = STAGE.DEVICE_WAKING
      },
    },
    deviceIdNBIoT: {
      regex: /DEVID: (?<id>\d{15}), (?<simId>\d{20})/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { id: string, simId: string }

        lastSeenID.value = groups.id
        lastSeenAltID.value = groups.simId
      },
    },
    deviceIdFactoryNBIoT: {
      regex: /@02.2>>DEVID: (?<id>\d{15})/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { id: string }

        lastSeenID.value = groups.id
      },
    },
    simIdFactoryNBIoT: {
      regex: /@02.3>>SIMID: (?<simId>\d{20})/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { simId: string }

        lastSeenAltID.value = groups.simId
      },
    },
    runmodeHibernate: {
      regex: /@04>>/,
      onMatch: () => {
        // Fires whenever the device goes into low power
        engineStage.value = STAGE.IDLE
      },
    },
    selectPreDefinedPrompt: {
      regex: /@05>>Select/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_WAKING) {
          engineStage.value = STAGE.ENTERING_BOOTLOADER
          await sleep(500)
          try {
            await sendSetTestMeterTypeResponse()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
          }
        }
      },
    },
    listening: {
      regex: /Listening/,
      onMatch: async () => {
        if (engineStage.value === STAGE.ENTERING_BOOTLOADER) {
          await sleep(500)
          try {
            await unlockDevice()
            await sendInvokeBootloaderCommand()
            engineStage.value = STAGE.FLASHING
            await flash()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
          }
        }
      },
    },
    pressXWhenDone: {
      regex: /Press 'X'/,
      onMatch: async () => {
        if (engineStage.value === STAGE.FLASHING) {
          await sleep(500)
          try {
            await sendXWhenDoneResponse()
            engineStage.value = STAGE.FLASH_SUCCESS
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.FLASH_FAIL
          }
        }
      },
    },
  }

  const partialLineRegexs: DeviceRegexs = {
    registerPreDefinedPrompt: {
      regex: /@05>>Register.*:/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_WAKING) {
          engineStage.value = STAGE.ENTERING_BOOTLOADER
          await sleep(500)
          try {
            await sendRegisterPreDefinedTestMeterResponse()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
          }
        }
      },
    },
    // confirmMBUSFlashedPrompt: {
    //   regex: /Confirm M.*:/,
    //   onMatch: async () => {
    //     if (engineStage.value === STAGE.FLASHING) {
    //       try {
    //         await sendConfirmMBUSFlashResponse()
    //       }
    //       catch (err) {
    //         console.error(err)
    //         engineStage.value = STAGE.FLASH_FAIL
    //       }
    //     }
    //   },
    // },
  }

  const { serialLineCallback: regexSerialLineCallback, serialPartialLineCallback } = useSerialRegexMatcher(lineRegexs, partialLineRegexs)

  async function serialLineCallback(line: string) {
    serial.receiveLine(line)
    await regexSerialLineCallback(line)
  }

  async function flashFinish(success: boolean) {
    if (!success) {
      engineStage.value = STAGE.FLASH_FAIL
      return
    }

    await sleep(10000)

    if (engineStage.value === STAGE.FLASHING) {
      try {
        await sendXWhenDoneResponse()
        engineStage.value = STAGE.FLASH_SUCCESS
      }
      catch (err) {
        console.error(err)
        engineStage.value = STAGE.FLASH_FAIL
      }
    }
  }

  return {
    engineStage,
    lastSeenID,
    lastSeenAltID,
    serialLineCallback,
    serialPartialLineCallback,
    sendQueryCommand,
    sendUnlockCommand,
    unlockDevice,
    flashFinish,
  }
}
