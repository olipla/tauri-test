import type { DeviceConfiguration, DeviceMetadata, DeviceRegexs, DeviceState, MeterConfig } from '~/types/jellyfishBridge'

const RECENT_HISTORY_LENGTH = 3

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function newDeviceMetadata(): DeviceMetadata {
  return {
    deviceId: undefined,
    deviceAltId: undefined,
    versionLong: undefined,
    versionTag: undefined,
    versionShort: undefined,
    LPWANModemType: undefined,
  }
}

function newDeviceConfiguration(): DeviceConfiguration {
  return {
    stackMode: undefined,
    meterType: undefined,
    meters: new Map<number, MeterConfig>(),
    time: undefined,
    listeningStart: undefined,
    listeningCycle: undefined,
    listeningDuration: undefined,
  }
}

function newDeviceState(): DeviceState {
  return {
    runmode: undefined,
    mbusEnabled: false,
    transmitting: null,
  }
}

export function useJellyfishBridgeSerial(sendSerial: (data: string) => Promise<void>, availableConfigurations: Ref<DBConfiguration[] | undefined>, applyConfiguration: (configurationId: number, configuredDevice: ConfiguredDevice) => void) {
  const toast = useToast()

  function showToast(title: string, type: 'info' | 'error' = 'info') {
    const icons = {
      info: 'i-lucide-info',
      error: 'i-lucide-octagon-alert',
    }
    toast.add({
      title,
      icon: icons[type],
      color: type,
      ui: {
        title: 'text-xl',
        root: 'p-8',
        icon: 'size-20',
        wrapper: 'self-stretch justify-center pl-6',
      },
    })
  }

  const currentDeviceMetadata = ref<DeviceMetadata>(newDeviceMetadata())
  const currentDeviceConfiguration = ref<DeviceConfiguration>(newDeviceConfiguration())
  const currentDeviceState = ref<DeviceState>(newDeviceState())

  const automationEnabled = ref(true)

  const automationSkipMBUSTest = ref(true)
  const automationSkipStatusMessage = ref(true)
  const automationConfirmMbusFlash = ref(true)

  const recentLineHistory: string[] = []

  async function applyNextConfig(): Promise<boolean> {
    if (!currentDeviceMetadata.value.deviceId) {
      return false
    }
    if (!currentDeviceMetadata.value.deviceAltId) {
      return false
    }

    if (!availableConfigurations.value) {
      return false
    }

    const nextConfig = availableConfigurations.value[0]

    if (!nextConfig) {
      return false
    }

    const date = new Date()
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const minutesOfDay = (hours * 60) + minutes

    const commands = [
      `O=${currentDeviceMetadata.value.deviceAltId}`,
      'S=60',
      'T=7',
      'C=*',
      `I=${minutesOfDay}`,
    ]

    for (const asset of nextConfig.assets) {
      commands.push(`M=${asset.radioIdFull},${asset.wmbusKey}`)
    }
    commands.push('?')

    for (const command of commands) {
      await sendSerial(`${command}\n`)
      await sleep(100)
    }

    await sleep(400)

    const currentMeters = Array.from(currentDeviceConfiguration.value.meters.values())

    const assetsMatch = currentMeters.length === nextConfig.assets.length
      && currentMeters.every((meter, index) =>
        meter.id === nextConfig.assets[index]?.radioIdFull
        && meter.key === nextConfig.assets[index].wmbusKey,
      )

    if (!assetsMatch) {
      console.log('Meters don\'t match!')
      return false
    }

    if (currentDeviceConfiguration.value.listeningCycle !== 60) {
      console.log('Listening cycle is wrong!')
      return false
    }

    if (currentDeviceConfiguration.value.meterType !== '_NONE_') {
      console.log('Meter type is wrong!')
      return false
    }

    const metadata = currentDeviceMetadata.value

    if (metadata.LPWANModemType !== undefined && metadata.deviceAltId !== undefined && metadata.deviceId !== undefined && metadata.versionLong !== undefined && metadata.versionShort !== undefined && metadata.versionTag !== undefined) {
      applyConfiguration(nextConfig.id, metadata as ConfiguredDevice)
    }

    return true
  }

  const lineRegexs: DeviceRegexs = {
    deviceId: {
      regex: /DEVID: (?<id>[A-F0-9]+), (?<altId>[A-F0-9]+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { id: string, altId: string }

        currentDeviceMetadata.value.deviceId = groups.id
        currentDeviceMetadata.value.deviceAltId = groups.altId
      },
    },
    deviceIdFactory: {
      regex: /@02.2>>DEVID: (?<id>\d+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { id: string }

        currentDeviceMetadata.value.deviceId = groups.id
      },
    },
    simIdFactory: {
      regex: /@02.3>>SIMID: (?<altId>\d+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { altId: string }

        currentDeviceMetadata.value.deviceAltId = groups.altId
      },
    },
    versionLong: {
      regex: /.*Version: .+ - (?<meterType>.+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { meterType: string }
        // meter type
        // 0 SENSUS
        // 1 ITRON
        // 2 DIEHL_G4
        // 3 ELECTRIC
        // 4 GAS
        // 7 _NONE_

        currentDeviceMetadata.value.versionLong = str
        currentDeviceConfiguration.value.meterType = groups.meterType
      },
    },
    versionTag: {
      regex: /(?<modemType>\S+)_FW\S+/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { modemType: string }

        currentDeviceMetadata.value.LPWANModemType = groups.modemType
        currentDeviceMetadata.value.versionTag = str
      },
    },
    versionShort: {
      regex: /v\w+(?:\.\w+)+/,
      onMatch: (str) => {
        currentDeviceMetadata.value.versionShort = str
      },
    },
    stackMode: {
      regex: / - STACK MODE \((?<stackMode>.+)\)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { stackMode: string }

        currentDeviceConfiguration.value.stackMode = groups.stackMode
      },
    },
    // meterType: {
    //   regex: /T=(?<meterType>\d+)/,
    //   onMatch: (str, match) => {
    //     if (!match.groups) {
    //       return
    //     }
    //     const groups = match.groups as { meterType: string }

    //     currentDeviceConfiguration.value.meterType = Number(groups.meterType)
    //   },
    // },
    configuredMeter: {
      regex: /M(?<index>\d+)=(?<id>[A-F0-9]+),(?<key>[A-F0-9]+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { index: string, id: string, key: string }

        const meterConfiguration: MeterConfig = { id: groups.id, key: groups.key }

        const index = Number(groups.index)

        if (!Number.isSafeInteger(index)) {
          return
        }

        currentDeviceConfiguration.value.meters.set(index, meterConfiguration)
      },
    },
    time: {
      regex: /I=(?<minutesOfDay>\d+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { minutesOfDay: string }

        currentDeviceConfiguration.value.time = Number(groups.minutesOfDay)
      },
    },
    listening: {
      regex: /S=Start\|@Cycle\|Duration=\|(?<start>\d+)\|(?<cycle>\d+)\|(?<duration>\d+)\|/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { start: string, cycle: string, duration: string }

        currentDeviceConfiguration.value.listeningStart = Number(groups.start)
        currentDeviceConfiguration.value.listeningCycle = Number(groups.cycle)
        currentDeviceConfiguration.value.listeningDuration = Number(groups.duration)
      },
    },
    runmode: {
      regex: / - OPM_(?<runmode>\w+)/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { runmode: string }
        // runmode
        // 0 HIBERNATE
        // 1 CONFIG
        // 2 HIBERNATE_PRERUN
        // 3 NORMAL
        // 4 TEST
        // 5 TEST_CONTINUOUS

        currentDeviceState.value.runmode = groups.runmode
      },
    },
    mbusEnabled: {
      regex: /Enabling MBUS/,
      onMatch: () => {
        currentDeviceState.value.mbusEnabled = true
      },
    },
    mbusDisabled: {
      regex: /MBUS disabled/,
      onMatch: () => {
        currentDeviceState.value.mbusEnabled = false
      },
    },

    // @08>>MORMAL RUN MODE
    runmodeNormal: {
      regex: /@08>>/,
      onMatch: () => {
        currentDeviceState.value.runmode = 'NORMAL'
      },
    },
    runmodeConfig: {
      regex: /@07>>/,
      onMatch: async () => {
        await sendSerial('?\n')
        await sleep(500)
        currentDeviceState.value.runmode = 'CONFIG'
        // Ready to accept commands
        if (automationEnabled.value) {
          try {
            const success = await applyNextConfig()
            // await sleep(500)
            if (success) {
              await sendSerial('R=2\n')
              showToast('Config Successful: Entering pre-runmode hibernate')
            }
            else {
              console.log('DEVICE FAILED TO CONFIGURE, ATTEMPTING HIBERNATE')
              showToast('Config Failed: Device NOT configured correctly!', 'error')
              await sendSerial('R=0\n')
            }
          }
          catch (e) {
            console.error(e)
            console.log('DEVICE FAILED TO CONFIGURE, ATTEMPTING HIBERNATE')
            showToast('Config Failed: Device NOT configured correctly!', 'error')
            await sendSerial('R=0\n')
          }
        }
      },
    },
    runmodeHibernate: {
      regex: /@04>>/,
      onMatch: () => {
        // Fires whenever the device goes into low power
      },
    },

    transmitStart: {
      regex: /Sending.. (?<messageType>.+) Message/,
      onMatch: (str, match) => {
        if (!match.groups) {
          return
        }
        const groups = match.groups as { messageType: string }
        // message type
        // "Status"
        // "Meter Data"
        // "Discovered Meter"

        currentDeviceState.value.transmitting = groups.messageType
      },
    },

    transmitEnd: {
      regex: /(?:Finished|Completed) (?<messageType>.+) Transmission/,
      onMatch: () => {
        currentDeviceState.value.transmitting = null
      },
    },
    initialisingRadioModem: {
      regex: /@02.1/,
      onMatch: () => {
        // Press A a little bit later to skip
      },
    },
    initialisingMbusModem: {
      regex: /@02.5/,
      onMatch: () => {
        // Press A a little bit later to skip
      },
    },
    setMeterTypePrompt: {
      regex: /Set Meter Type:/,
      onMatch: () => {
        // Press 0 to register SENSUS test meter
        // Press 1 to register ITRON test meter
        // Press 2 to register DIEHL test meter
        // Any other to skip - will go to test but won't listen - need to then send unlock and R=1
        // No action will hibernate after a few seconds
      },
    },
    magnetTapped: {
      regex: /Magnet Tapped/,
      onMatch: () => {
        // Shows immediately when light becomes solid
        showToast('Magnet Tap Registered')
      },
    },
    registerPreDefinedPrompt: {
      regex: /@05>>/,
      onMatch: async () => {
        if (!automationEnabled.value || !automationSkipMBUSTest.value) {
          return
        }
        await sleep(500)
        await sendSerial('N\n')
        await sleep(500)
        await sendSerial('?\n')
        await sleep(500)
        if (!currentDeviceMetadata.value.deviceAltId) {
          console.log('Failed to get Alt ID')
          showToast('Could not skip MBUS Test', 'error')
          return
        }
        await sendSerial(`O=${currentDeviceMetadata.value.deviceAltId}\n`)
        await sleep(500)
        await sendSerial('R=1\n')
        showToast('Skipped MBUS Test: Entering config mode')
        await sleep(500)
      },
    },
    // MUST BE LAST
    emptyLine: {
      regex: / /,
      onMatch: () => {
        if (recentLineHistory[1]?.includes('Configured Meter List:')) {
          // Configured meter list is blank!
          console.log('Clearing meter list!')
          currentDeviceConfiguration.value.meters.clear()
        }
      },
    },
  }

  const partialLineRegexs: DeviceRegexs = {
    confirmMBUSFlashedPrompt: {
      regex: /Confirm MBUS FW has been flashed. Press 'y':/,
      onMatch: async () => {
        if (!automationEnabled.value || !automationConfirmMbusFlash.value) {
          return
        }

        await sleep(250)
        await sendSerial('y\n')
        showToast('Confirmed MBUS Flash')
      },
    },
    abortInitialisationTestPrompt: {
      regex: /Press 'A' to abort initialisation test/,
      onMatch: () => {

      },
    },
    skipSendStatusMessagePrompt: {
      regex: /Skip send Status message \? Press 'y':/,
      onMatch: async () => {
        if (!automationEnabled.value || !automationSkipStatusMessage.value) {
          return
        }

        await sleep(250)
        await sendSerial('y\n')
        showToast('Skipped Sending Status Message')
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

  function updateRecentLineHistory(line: string) {
    recentLineHistory.unshift(line)
    recentLineHistory.splice(RECENT_HISTORY_LENGTH)
  }

  function serialLineCallback(line: string) {
    matchLine(line, lineRegexs)
    updateRecentLineHistory(line)
  }

  function serialPartialLineCallback(partialLine: string) {
    matchLine(partialLine, partialLineRegexs)
  }

  return { serialLineCallback, serialPartialLineCallback, currentDeviceMetadata, currentDeviceConfiguration, currentDeviceState, automationEnabled }
}
