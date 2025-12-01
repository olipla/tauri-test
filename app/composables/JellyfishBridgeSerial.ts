import type { DeviceConfiguration, DeviceMetadata, DeviceRegexs, DeviceState, MeterConfig } from '~/types/jellyfishBridge'

const RECENT_HISTORY_LENGTH = 3

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

export function useJellyfishBridgeSerial() {
  const currentDeviceMetadata = ref<DeviceMetadata>(newDeviceMetadata())
  const currentDeviceConfiguration = ref<DeviceConfiguration>(newDeviceConfiguration())
  const currentDeviceState = ref<DeviceState>(newDeviceState())

  const recentLineHistory: string[] = []

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
      onMatch: () => {
        currentDeviceState.value.runmode = 'CONFIG'
        // Ready to accept commands
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
    registerPreDefinedPrompt: {
      regex: /@05/,
      onMatch: () => {

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

  return { serialLineCallback, serialPartialLineCallback, currentDeviceMetadata, currentDeviceConfiguration, currentDeviceState }
}
