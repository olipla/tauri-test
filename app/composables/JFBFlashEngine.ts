import type { DeviceRegexs } from '~/types/jellyfishBridge'
import { ResponseTimeoutError, ValidationError } from '~/lib/errors'

export enum STAGE {
  IDLE,
  DEVICE_RESTARTING, // Unused
  DEVICE_FTDI_WAKE,
  DEVICE_UNRESPONSIVE,
  DEVICE_IN_MODE_3,
  DEVICE_WAKING, // Begins on magnet tap or FTDI interrupt
  ENTERING_BOOTLOADER, // Begins on @05 pre defined if DEVICE_WAKING
  BOOTLOADER_FAIL, // Begins if error on set test meter type, unlocking, invoking bootloader mode
  FLASHING, // Begins if invoke bootloader command succeeds
  FLASH_FAIL, // Begins if flash callback returns error or send x response fails
  FLASH_SUCCESS, // Begins if send x response succeeds after flash
  DEVICE_INITIALISING, // Begins on @02 peripherals init - for after flash
  DEVICE_WAKE_FAIL, // Begins if ? after hibernate fails
  DEVICE_SELF_TEST, // Begins on @05 pre defined if DEVICE_INITIALISING
  DEVICE_SELF_TEST_FAIL, // Begins if setting pre defined fails if DEVICE_INITIALISING or WMBUS test fails,
  DEVICE_CONFIGURING, // Begins on @06 self test success
  DEVICE_CONFIG_SUCCESS, // Begins when set desired mode succeeds
  DEVICE_CONFIG_FAIL, // Begins when set desired mode fails
}

// Device will send ftdi wake if hibernate while DEVICE_INITIALISING

const ENDS_OK_RESPONSE = /.*OK/

export function useJFBFlashEngine(sendSerial: (data: string) => Promise<void>, flash: () => Promise<void>) {
  const engineStage = ref(STAGE.IDLE)
  const lastSeenID = ref<string | undefined>()
  const lastSeenAltID = ref<string | undefined>()
  const lastSeenVersion = ref<string | undefined>()

  const flasherStore = useFlasherStore()
  const configuratorStore = useConfiguratorStore()

  const { flashMode } = storeToRefs(flasherStore)
  const { JFBVersionTarget } = storeToRefs(configuratorStore)

  function reset() {
    engineStage.value = STAGE.IDLE
    lastSeenID.value = ''
    lastSeenAltID.value = ''
    lastSeenVersion.value = ''
  }

  // const UNRESPONSIVE_TIMEOUT = 10000 // ms

  // let unresponsiveTimer: ReturnType<typeof setTimeout> | null = null

  // function isTerminalStage(stage: STAGE) {
  //   const stageName = STAGE[stage]
  //   return (
  //     stage === STAGE.DEVICE_UNRESPONSIVE
  //     || stage === STAGE.IDLE
  //     || stageName.endsWith('_FAIL')
  //     || stageName.endsWith('_SUCCESS')
  //   )
  // }

  // function getUnresponsiveTimeout(stage: STAGE) {
  //   switch (stage) {
  //     case STAGE.FLASHING:
  //       return 25000
  //     case STAGE.DEVICE_FTDI_WAKE:
  //       return 5000
  //     default:
  //       return UNRESPONSIVE_TIMEOUT
  //   }
  // }

  // watch(engineStage, (newStage) => {
  //   if (unresponsiveTimer) {
  //     clearTimeout(unresponsiveTimer)
  //     unresponsiveTimer = null
  //   }

  //   if (!isTerminalStage(newStage)) {
  //     unresponsiveTimer = setTimeout(() => {
  //       if (!isTerminalStage(engineStage.value)) {
  //         engineStage.value = STAGE.DEVICE_UNRESPONSIVE
  //       }
  //     }, getUnresponsiveTimeout(newStage))
  //   }
  // })

  watch(engineStage, (newStage, oldStage) => {
    console.log('CHANGING STAGE FROM - TO', STAGE[oldStage], STAGE[newStage])
  })

  const serial = useSerialMachine(sendSerial)

  async function sendUnlockCommand() {
    if (lastSeenAltID.value === undefined) {
      throw new ValidationError('Alt ID not available')
    }
    await serial.sendCommand(`O=${lastSeenAltID.value}`, { expectedResponse: ENDS_OK_RESPONSE, timeout: 250 })
  }

  async function sendQueryCommand() {
    await serial.sendCommand('?', { expectedResponse: /S=.*/, timeout: 1000 })
  }

  async function sendInvokeBootloaderCommand(quickConfig = false) {
    if (quickConfig) {
      await serial.sendCommand('F=250', { expectedResponse: /Invo.*/ })
    }
    else {
      await serial.sendCommand('R=250', { expectedResponse: /Invo.*/ })
    }
  }

  async function sendSetTestMeterTypeResponse(testMeterType = 0) {
    await serial.sendCommand(`${testMeterType}`, { expectedResponse: /Setting.*/ })
  }

  async function sendChangePreDefinedResponse(testMeterType = 0) {
    await serial.sendCommand(`${testMeterType}`, { expectedResponse: /- .*/ })
  }

  async function sendRegisterPreDefinedTestMeterResponse() {
    await serial.sendCommand('y', { expectedResponse: /Setting.*/ })
  }

  async function sendSelectDesiredModeResponse(mode: 0 | 1 | 2 | 3 = 2) {
    if (mode === 2) {
      await serial.sendCommand('2', { expectedResponse: /@04>>.*/, retryDelay: 100, retries: 3, timeout: 500 })
    }
    else {
      await serial.sendCommand(`${mode}`)
    }
  }

  // async function sendConfirmMBUSFlashResponse() {
  //   await serial.sendCommand('y')
  // }

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

  async function sendFTDIWake() {
    await serial.sendCommand('?', { expectedResponse: /.*Initialising.*/, timeout: 1000 })
  }

  async function sendEnterTimedConfig() {
    await serial.sendCommand('y', { expectedResponse: /QUICK CONFIG.*/ })
  }

  const lineRegexs: DeviceRegexs = {
    magnetTapped: {
      regex: /Magnet/,
      onMatch: async () => {
        if (engineStage.value !== STAGE.DEVICE_INITIALISING) {
          engineStage.value = STAGE.DEVICE_WAKING
        }
      },
    },
    ftdiInterrupt: {
      regex: /FTDI/,
      onMatch: async () => {
        if (engineStage.value !== STAGE.DEVICE_INITIALISING && engineStage.value !== STAGE.DEVICE_FTDI_WAKE) {
          engineStage.value = STAGE.DEVICE_FTDI_WAKE
          sleep(10000).then(() => {
            if (engineStage.value !== STAGE.IDLE && engineStage.value !== STAGE.DEVICE_WAKING && engineStage.value !== STAGE.DEVICE_IN_MODE_3) {
              engineStage.value = STAGE.DEVICE_UNRESPONSIVE
            }
          })
        }
      },
    },
    initAfterFTDI: {
      regex: /Initialising/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_FTDI_WAKE) {
          engineStage.value = STAGE.DEVICE_WAKING
        }
      },
    },
    atAfterFTDI: {
      regex: /AT\+/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_FTDI_WAKE) {
          engineStage.value = STAGE.DEVICE_IN_MODE_3
        }
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
    peripheralsInitialisationStarted: {
      regex: /@02>>/,
      onMatch: () => {
        if (engineStage.value === STAGE.FLASH_SUCCESS) {
          engineStage.value = STAGE.DEVICE_INITIALISING
        }
      },
    },
    runmodeHibernate: {
      regex: /@04>>/,
      onMatch: async () => {
        // Fires whenever the device goes into low power
        // engineStage.value = STAGE.IDLE
        if (engineStage.value === STAGE.DEVICE_INITIALISING) {
          await sleep(2000)
          try {
            await sendFTDIWake()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.DEVICE_WAKE_FAIL
          }
        }
        else if (engineStage.value === STAGE.DEVICE_SELF_TEST) {
          engineStage.value = STAGE.DEVICE_SELF_TEST_FAIL
        }
        else if (engineStage.value === STAGE.DEVICE_WAKING) {
          engineStage.value = STAGE.DEVICE_WAKE_FAIL
        }
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
        else if (engineStage.value === STAGE.DEVICE_INITIALISING) {
          engineStage.value = STAGE.DEVICE_SELF_TEST
        }
      },
    },
    changePreDefinedPrompt: {
      regex: /@05>>Change/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_WAKING) {
          engineStage.value = STAGE.ENTERING_BOOTLOADER
          await sleep(1000)
          try {
            await sendChangePreDefinedResponse(7)
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
          }
        }
        else if (engineStage.value === STAGE.DEVICE_INITIALISING) {
          engineStage.value = STAGE.DEVICE_SELF_TEST
          await sleep(1000)
          try {
            await sendChangePreDefinedResponse(7)
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.DEVICE_SELF_TEST_FAIL
          }
        }
      },
    },
    testMetersSuccess: {
      regex: /@06>>/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_SELF_TEST) {
          engineStage.value = STAGE.DEVICE_CONFIGURING
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
    selectDesiredModePrompt: {
      regex: /Select desired mode/,
      onMatch: async () => {
        if (engineStage.value === STAGE.DEVICE_CONFIGURING) {
          await sleep(500)
          try {
            await sendSelectDesiredModeResponse()
            engineStage.value = STAGE.DEVICE_CONFIG_SUCCESS
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.DEVICE_CONFIG_FAIL
          }
        }
      },
    },
    // sendCommandToExitTestPrompt: {
    //   regex: /Send.*exit TEST/,
    //   onMatch: async () => {
    //     if (engineStage.value === STAGE.ENTERING_BOOTLOADER) {
    //       await sleep(500)
    //       try {
    //         await sendInvokeBootloaderCommand()
    //         engineStage.value = STAGE.FLASHING
    //         await flash()
    //       }
    //       catch (err) {
    //         console.error(err)
    //         engineStage.value = STAGE.BOOTLOADER_FAIL
    //       }
    //     }
    //   },
    // },
  }

  const partialLineRegexs: DeviceRegexs = {
    registerPreDefinedPrompt: {
      regex: /@05>>Register.*:$/,
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
        else if (engineStage.value === STAGE.DEVICE_INITIALISING) {
          engineStage.value = STAGE.DEVICE_SELF_TEST
        }
      },
    },
    skipSendStatusMessagePrompt: {
      regex: /Skip send Status message \? Press 'y':$/,
      onMatch: async () => {
        // if (engineStage.value === STAGE.DEVICE_WAKING) {
        await sleep(500)
        await serial.sendCommand('y')
        // }
      },
    },
    skipRegisterTestMetersPrompt: {
      regex: /Skip Registration of TEST.*:$/,
      onMatch: async () => {
        // if (engineStage.value === STAGE.DEVICE_WAKING) {
        await sleep(500)
        await serial.sendCommand('n')
        // }
      },
    },
    skipSendTestMeterDataMessagePrompt: {
      regex: /Skip send test.*:$/,
      onMatch: async () => {
        // if (engineStage.value === STAGE.DEVICE_WAKING) {
        await sleep(500)
        await serial.sendCommand('y')
        // }
      },
    },
    enterTimedConfigPrompt: {
      regex: /Enter timed.*:$/,
      onMatch: async () => {
        if (engineStage.value === STAGE.ENTERING_BOOTLOADER) {
          await sleep(500)
          try {
            await sendEnterTimedConfig()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
          }

          await sleep(500)
          try {
            await unlockDevice()
            await sendInvokeBootloaderCommand(true)
            engineStage.value = STAGE.FLASHING
            await flash()
          }
          catch (err) {
            console.error(err)
            engineStage.value = STAGE.BOOTLOADER_FAIL
            await serial.sendCommand('F=0')
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
    lastSeenVersion,
    serialLineCallback,
    serialPartialLineCallback,
    sendQueryCommand,
    sendUnlockCommand,
    unlockDevice,
    flashFinish,
    reset,
  }
}
