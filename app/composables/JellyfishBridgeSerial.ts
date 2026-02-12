import type { DeviceConfiguration, DeviceMetadata, DeviceRegexs, DeviceState, MeterConfig } from '~/types/jellyfishBridge'
import { useCustomToast } from './CustomToast'

const RECENT_HISTORY_LENGTH = 10

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
    needsFlash: false,
    lastConfigAttempt: 0,
    lastConfigInnerAttempt: 0,
    lastQueryAttempt: 0,
  }
}

function getLabel(sFurnitureW3W: string, sFurnitureAddress: string, postcode: string) {
  const [w3w1, w3w2, w3w3] = sFurnitureW3W.replace('///', '').split('.')

  if (!w3w1 || !w3w2 || !w3w3) {
    return
  }

  const label = `
^XA

^LT14
^LS4

^FX Set monospace font
^CF1,30

^FB590,2,10,L^FO12,15,0^FD#W3W_FULL#\\&^FS

^FB340,6,10,L^FO12,90,0^FD#LOCATION#\\&#POSTCODE#\\&^FS

^FX QR Code
^FT360,332^BQN,2,7,M,7^FDQA,https://w3w.co/#W3W1#.#W3W2#.#W3W3#/##HASH#^FS

^FX Top Label Box
^FO606,8,0^GB280,280,5,B,2^FS
^FX Set smaller monospace font
^CF1,40
^FB280,4,10,C^FO606,40,0^FD#W3W1#\\&#W3W2#\\&#W3W3#\\&^FS
^FB280,1,10,C^FO606,230,0^FD#POSTCODE#\\&^FS
^XZ`

  const qrLength = 19 + w3w1.length + w3w2.length + w3w3.length
  const padding = '0'.repeat(qrLength > 43 ? 0 : 43 - qrLength)

  return label
    .replaceAll('#W3W_FULL#', sFurnitureW3W)
    .replaceAll('#W3W1#', w3w1)
    .replaceAll('#W3W2#', w3w2)
    .replaceAll('#W3W3#', w3w3)
    .replaceAll('#LOCATION#', sFurnitureAddress)
    .replaceAll('#POSTCODE#', postcode)
    .replaceAll('#HASH#', padding)
}

export interface TimestampedLine {
  timestamp: Date
  line: string
}

export function useJellyfishBridgeSerial(
  sendSerial: (data: string) => Promise<void>,
  availableConfigurations: Ref<DBConfiguration[] | undefined>,
  applyConfiguration: (configurationId: number, configuredDevice: ConfiguredDevice) => void,
  upsertHistory: (start: Date, deviceId: string, history: TimestampedLine | TimestampedLine[]) => Promise<void>,
  printData: (data: string) => Promise<number | undefined>,
  flashDevice: () => Promise<void>,
) {
  const versionTarget = ref<string | undefined>()

  const { showToast } = useCustomToast()

  const currentDeviceMetadata = ref<DeviceMetadata>(newDeviceMetadata())
  const currentDeviceConfiguration = ref<DeviceConfiguration>(newDeviceConfiguration())
  const currentDeviceState = ref<DeviceState>(newDeviceState())

  const unknownDeviceHistory = ref<TimestampedLine[]>([])
  const unknownDeviceStart = ref<Date | undefined>()

  async function queryDevice(attempt = 0) {
    currentDeviceState.value.lastQueryAttempt = attempt
    await sendSerial('?\n')
    await sleep(1000)
    const firstMetadata = JSON.stringify(currentDeviceMetadata.value)
    currentDeviceMetadata.value = newDeviceMetadata()
    await sendSerial('?\n')
    await sleep(1000)
    const secondMetadata = JSON.stringify(currentDeviceMetadata.value)
    if (firstMetadata !== secondMetadata) {
      if (attempt < 10) {
        await queryDevice(attempt + 1)
      }
    }
    else {
      console.log(`Device query success (attempt ${attempt + 1})`)
    }
  }

  function resetDevice(existingHistory?: string | string[], force = false) {
    if (currentDeviceMetadata.value.deviceId === undefined && !force) {
      return
    }

    unknownDeviceHistory.value = []

    const timestamp = new Date()

    if (existingHistory !== undefined) {
      if (typeof existingHistory === 'string') {
        unknownDeviceHistory.value.push({ timestamp, line: existingHistory })
      }
      else {
        unknownDeviceHistory.value.push(...existingHistory.map(x => ({ timestamp, line: x })))
      }
    }

    unknownDeviceStart.value = undefined

    currentDeviceMetadata.value = newDeviceMetadata()
    currentDeviceConfiguration.value = newDeviceConfiguration()
    currentDeviceState.value = newDeviceState()
  }

  async function saveHistoryLine(line: string) {
    if (unknownDeviceStart.value === undefined) {
      unknownDeviceStart.value = new Date()
    }

    const timestamp = new Date()
    const timestampedLine = { timestamp, line }

    if (currentDeviceMetadata.value.deviceId === undefined) {
      unknownDeviceHistory.value.push(timestampedLine)
      console.log('SAVING LINE TO UNKNOWN: ', line)
    }
    else {
      console.log('SAVING LINE TO DEVICE: ', currentDeviceMetadata.value.deviceId, line)
      if (unknownDeviceHistory.value.length > 0) {
        const history = [...unknownDeviceHistory.value, timestampedLine]
        unknownDeviceHistory.value = []
        await upsertHistory(unknownDeviceStart.value, currentDeviceMetadata.value.deviceId, history)
      }
      else {
        await upsertHistory(unknownDeviceStart.value, currentDeviceMetadata.value.deviceId, timestampedLine)
      }
    }
  }

  watch(() => currentDeviceState.value.runmode, (newData, oldData) => {
    console.log(newData, oldData)
    if (newData !== undefined && newData !== oldData) {
      if (newData === 'NORMAL') {
        showToast(`Device is in "${newData}" Runmode!`, 'warning')
      }
      else {
        showToast(`Device is in "${newData}" Runmode`)
      }
    }
  }, { deep: true })

  const automationEnabled = ref(true)

  const automationSkipMBUSTest = ref(true)
  const automationSkipStatusMessage = ref(true)
  const automationConfirmMbusFlash = ref(true)
  const automationEnterTimedConfig = ref(true)
  const automationSkipSetMeterType = ref(true)
  const automationFlashOldFirmware = ref(true)
  const automationErrorOnNot1NCE = ref(true)

  const recentLineHistory: string[] = []

  async function applyNextConfig(mainAttempt = 0): Promise<boolean> {
    currentDeviceState.value.lastConfigAttempt = mainAttempt
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
    console.log(nextConfig)

    if (!nextConfig) {
      return false
    }

    async function attemptApply(nextConfig: DBConfiguration, attempt = 0) {
      currentDeviceState.value.lastConfigInnerAttempt = attempt
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

      for (const command of commands) {
        await sendSerial(`${command}\n`)
        await sleep(100)
      }

      await queryDevice()

      const currentMeters = Array.from(currentDeviceConfiguration.value.meters.values())

      const assetsMatch = currentMeters.length === nextConfig.assets.length
        && currentMeters.every((meter, index) =>
          meter.id === nextConfig.assets[index]?.radioIdFull
          && meter.key === nextConfig.assets[index].wmbusKey,
        )

      if (!assetsMatch) {
        console.log('Meters don\'t match!')
        if (attempt < 15) {
          return await attemptApply(nextConfig, attempt + 1)
        }
        else {
          return false
        }
      }

      if (currentDeviceConfiguration.value.listeningCycle !== 60) {
        console.log('Listening cycle is wrong!')
        if (attempt < 15) {
          return await attemptApply(nextConfig, attempt + 1)
        }
        else {
          return false
        }
      }

      if (currentDeviceConfiguration.value.meterType !== '_NONE_') {
        console.log('Meter type is wrong!')
        if (attempt < 15) {
          return await attemptApply(nextConfig, attempt + 1)
        }
        else {
          return false
        }
      }

      return true
    }

    const attemptApplySuccess = await attemptApply(nextConfig)

    if (!attemptApplySuccess) {
      return false
    }

    const metadata = currentDeviceMetadata.value

    if (metadata.LPWANModemType !== undefined && metadata.deviceAltId !== undefined && metadata.deviceId !== undefined && metadata.versionLong !== undefined && metadata.versionShort !== undefined && metadata.versionTag !== undefined) {
      applyConfiguration(nextConfig.id, metadata as ConfiguredDevice)

      console.log(nextConfig)

      const nearestPostcode = nextConfig.assets.sort((a, b) => Number(a.distance) - Number(b.distance))[0]?.meterPostcode
      if (nearestPostcode) {
        const labelData = getLabel(nextConfig.sFurnitureW3W, nextConfig.sFurnitureAddress, nearestPostcode)
        console.log(labelData)
        if (labelData) {
          await printData(labelData)
        }
      }
      return true
    }

    if (mainAttempt < 10) {
      return await applyNextConfig(mainAttempt + 1)
    }

    return false
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

        if (automationErrorOnNot1NCE.value) {
          if (!groups.altId.startsWith('8988228')) {
            showToast('ALT ID is not a 1NCE SIM ID', 'error')
          }
        }
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
        if (automationErrorOnNot1NCE.value) {
          if (!groups.altId.startsWith('8988228')) {
            showToast('ALT ID is not a 1NCE SIM ID', 'error')
          }
        }
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
        if (versionTarget.value && str.toLowerCase().trim() !== versionTarget.value.toLowerCase().trim()) {
          showToast(`Device Version (${str}) Does Not Match Target Version (${versionTarget.value})!`, 'error')
          currentDeviceState.value.needsFlash = true
        }
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

        // if (groups.runmode === 'NORMAL') {
        //   showToast(`Device is in "${groups.runmode}" Runmode!`, 'warning')
        // }
        // else {
        //   showToast(`Device is in "${groups.runmode}" Runmode`)
        // }

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
        // showToast(`Device Entered "NORMAL" Runmode!`, 'warning')
      },
    },
    runmodeConfig: {
      regex: /@07>>/,
      onMatch: async () => {
        await queryDevice()
        currentDeviceState.value.runmode = 'CONFIG'
        // Ready to accept commands
        if (automationEnabled.value) {
          try {
            const success = await applyNextConfig()
            // await sleep(500)
            if (success) {
              showToast('Device Configured Successfully', 'success')

              await sendSerial('R=2\n')
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
      regex: /@02\.1/,
      onMatch: () => {
        // Press A a little bit later to skip
      },
    },
    initialisingMbusModem: {
      regex: /@02\.5/,
      onMatch: () => {
        // Press A a little bit later to skip
      },
    },
    setMeterTypePrompt: {
      regex: /@03>>/,
      onMatch: async () => {
        // Press 0 to register SENSUS test meter
        // Press 1 to register ITRON test meter
        // Press 2 to register DIEHL test meter
        // Any other to skip - will go to test but won't listen - need to then send unlock and R=1
        // No action will hibernate after a few seconds

        if (!automationEnabled.value || !automationSkipSetMeterType.value) {
          return
        }

        await sleep(800)
        await sendSerial(' \n')
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
      onMatch: async (str) => {
        await resetDevice([...recentLineHistory, str])

        if (!automationEnabled.value) {
          return
        }

        if (automationSkipSetMeterType.value) {
          await sleep(500)
          await sendSerial(' \n')
        }

        if (automationFlashOldFirmware.value) {
          await queryDevice()
          await sendSerial(`O=${currentDeviceMetadata.value.deviceAltId}\n`)
          await sleep(500)
          if (currentDeviceState.value.needsFlash) {
            await sendSerial('R=250\n')
            return
          }
        }

        if (!automationSkipMBUSTest.value) {
          return
        }
        await sleep(200)
        await queryDevice()
        if (!currentDeviceMetadata.value.deviceAltId) {
          console.log('Failed to get Alt ID')
          showToast('Could not skip MBUS Test', 'error')
          return
        }
        await sendSerial(`O=${currentDeviceMetadata.value.deviceAltId}\n`)
        await sleep(500)
        await sendSerial('R=1\n')
        await sleep(300)
        await sendSerial('R=1\n')
        await sleep(200)
        await sendSerial('R=1\n')
        showToast('Skipped MBUS Test: Entering config mode')
        await sleep(500)
      },
    },
    factoryStart: {
      regex: /@01>>/,
      onMatch: async (str) => {
        // Device has started for the first time
        showToast('Device Performing Factory Start')
        await resetDevice(str)
      },
    },
    invokingBootloader: {
      regex: /Invoking Bootloader/,
      onMatch: async () => {
        // Device has started for the first time
        showToast('Device is in bootloader mode')
        await flashDevice()
      },
    },
    loadMBUSFW: {
      regex: /Load MBUS FW using XDS110 UniFlash/,
      onMatch: async () => {
        if (!automationEnabled.value || !automationConfirmMbusFlash.value) {
          return
        }
        await sleep(800)
        await sendSerial('X\n')
        await sleep(400)
        await sendSerial('X\n')
        await sleep(200)
        await sendSerial('X\n')
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
        // showToast('Confirmed MBUS Flash')
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
        // showToast('Skipped Sending Status Message')
      },
    },
    enterTimedConfigPrompt: {
      regex: /Enter timed CONFIG \? Press 'y':/,
      onMatch: async () => {
        if (!automationEnabled.value || !automationEnterTimedConfig.value) {
          return
        }

        await sleep(250)
        await sendSerial('y\n')

        await sleep(100)
        await queryDevice()
        if (!currentDeviceMetadata.value.deviceAltId) {
          console.log('Failed to get Alt ID')
          showToast('Could not start firmware upgrade', 'error')
          return
        }
        await sendSerial(`O=${currentDeviceMetadata.value.deviceAltId}\n`)
        await sleep(500)

        if (currentDeviceState.value.needsFlash) {
          await sendSerial('F=250\n')
        }
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

  async function serialLineCallback(line: string) {
    matchLine(line, lineRegexs)
    updateRecentLineHistory(line)
    await saveHistoryLine(line)
  }

  function serialPartialLineCallback(partialLine: string) {
    matchLine(partialLine, partialLineRegexs)
  }

  return {
    queryDevice,
    applyNextConfig,
    serialLineCallback,
    serialPartialLineCallback,
    currentDeviceMetadata,
    currentDeviceConfiguration,
    currentDeviceState,
    automationEnabled,
    versionTarget,
    automationConfirmMbusFlash,
    automationSkipMBUSTest,
    automationSkipStatusMessage,
    automationEnterTimedConfig,
    automationFlashOldFirmware,
    automationSkipSetMeterType,
  }
}
