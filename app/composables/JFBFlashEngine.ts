import type { DeviceRegexs } from '~/types/jellyfishBridge'
import { ResponseTimeoutError, ValidationError } from '~/lib/errors'

enum STAGE {
  IDLE,
  ENTERING_BOOTLOADER,
  DEVICE_RESTARTING,
  DEVICE_WAKING,
  FLASHING,
  FLASH_FAIL,
  FLASH_SUCCESS,
}

const ENDS_OK_RESPONSE = /.*OK/

export function useJFBFlashEngine(sendSerial: (data: string) => Promise<void>) {
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
    registerPreDefinedPrompt: {
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
    // registerPreDefinedPrompt: {
    //   regex: /@05>>/,
    //   onMatch: async () => {
    //     // await sleep(500)
    //     // await sendSerial('0\n')
    //   },
    // },
    listening: {
      regex: /Listening/,
      onMatch: async () => {
        await sleep(500)
        // await sendSerial('0\n')
      },
    },
  }

  function matchLine(line: string, lineRegexs: DeviceRegexs) {
    for (const [name, value] of Object.entries(lineRegexs)) {
      const match = value.regex.exec(line)
      if (match && match.length) {
        console.log('Matched ', name)
        value.onMatch(line, match)
        break
      }
    }
  }

  async function serialLineCallback(line: string) {
    matchLine(line, lineRegexs)
    serial.receiveLine(line)
  }

  return {
    engineStage,
    lastSeenID,
    lastSeenAltID,
    serialLineCallback,
    sendQueryCommand,
    sendUnlockCommand,
    unlockDevice,
  }
}
