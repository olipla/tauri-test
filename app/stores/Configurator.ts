import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { of, switchMap } from 'rxjs'
import { FlashFinishReason, useBSLFlasher } from '~/composables/BSLFlasher'

import { useCustomToast } from '~/composables/CustomToast'

type SerialCallback = (data: Uint8Array) => void
type SerialLineCallback = (data: string) => void

export const useConfiguratorStore = defineStore('configurator', () => {
  const settingsIsOpen = ref(false)
  const { showToast } = useCustomToast()

  const {
    configuredName: printerConfiguredName,
    configuredStatus: printerConfiguredStatus,
    printData: printerPrintData,
  } = usePrinter()

  const {
    addConfigurations,
    getUnusedConfigurations,
    getConfiguredDevices,
    getConfiguredDevicesWithConfiguration,
    getAvailableConfigurations,
    getAllConfigurations,
    applyConfiguration,
    getSource,
    getSources,
    upsertHistory,
  } = useConfigurationDatabase()

  const configCurrentSourceId = ref<number | undefined>()

  async function importedConfigurationsCallback(configurations: Configuration[], sourceType: string, sourceName: string) {
    try {
      const sourceId = await addConfigurations(configurations, sourceType, sourceName)
      console.log('Setting current source id', sourceId)
      configCurrentSourceId.value = sourceId
      showToast('Config import success', 'success')
    }
    catch (err) {
      console.error(err)
      if (typeof err === 'object' && err && 'name' in err && err.name === 'BulkError') {
        if ('failures' in err && Array.isArray(err.failures) && err.failures.length > 0) {
          if ('name' in err.failures[0] && err.failures[0].name === 'ConstraintError') {
            showToast('Error importing configurations - record already ingested', 'error')
            return
          }
        }
      }
      showToast('Error importing configurations', 'error')
    }
  }

  const configUnusedConfigurations = useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(getUnusedConfigurations)))
  const configAvailableConfigurations = useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(getAvailableConfigurations)))
  const configConfiguredDevices = useObservable<DBConfiguredDevice[]>(from(liveQuery<DBConfiguredDevice[]>(getConfiguredDevices)))
  const configConfiguredDevicesWithConfiguration = useObservable<(DBConfiguredDevice & DBConfiguration)[]>(from(liveQuery<(DBConfiguredDevice & DBConfiguration)[]>(getConfiguredDevicesWithConfiguration)))

  const configCurrentSourceId$ = from(configCurrentSourceId)

  const configSources = useObservable<DBSource[] | undefined>(from(liveQuery<DBSource[] | undefined>(() => getSources())))

  const configCurrentSource = useObservable(
    configCurrentSourceId$.pipe(
      switchMap((id) => {
        if (id === undefined) {
          return of(undefined)
        }

        return from(liveQuery<DBSource | undefined>(() => getSource(id)))
      }),
    ),
  )

  const configCurrentSourceAvailableConfigurations = useObservable(
    configCurrentSourceId$.pipe(
      switchMap((id) => {
        if (id === undefined) {
          return of(undefined)
        }

        return from(liveQuery<DBConfiguration[]>(() => getAvailableConfigurations(id)))
      }),
    ),
  )

  const configCurrentSourceAllConfigurations = useObservable(
    configCurrentSourceId$.pipe(
      switchMap((id) => {
        if (id === undefined) {
          return of(undefined)
        }

        return from(liveQuery(() => getAllConfigurations(id)))
      }),
    ),
  )

  const configCurrentSourceConfiguredDevicesWithConfiguration = useObservable(
    configCurrentSourceId$.pipe(
      switchMap((id) => {
        if (id === undefined) {
          return of(undefined)
        }

        return from(liveQuery<(DBConfiguredDevice & DBConfiguration)[]>(() => getConfiguredDevicesWithConfiguration(id)))
      }),
    ),
  )

  const {
    openFile: configImport,
  } = useConfigurationImport(importedConfigurationsCallback)

  const {
    open: serialOpen,
    write: serialWrite,
    getHistory: serialGetHistory,
    close: serialClose,
    isOpen: serialIsOpen,
    portInfo: serialPortInfo,
    portOptions: serialPortOptions,
    receiving: serialReceiving,
    transmitting: serialTransmitting,
    isConfigured: serialIsConfigured,
    isConnected: serialIsConnected,
    sanitisedManufacturer: serialSanitisedManufacturer,
    sanitisedSerialNumber: serialSanitisedSerialNumber,
    sanitisedProduct: serialSanitisedProduct,
    autoReconnect: serialAutoReconnect,
  } = useSerialPort(serialCallbackWrapper, serialWriteCallbackWrapper, serialLineCallbackWrapper, serialPartialLineCallbackWrapper)

  async function stringToSerial(data: string) {
    const bytes = new TextEncoder().encode(data)
    await serialWrite(bytes)
  }
  const BSLFlasherserialAutoReconnectPrevious = ref(true)

  const BSLFlasherFlashing = ref(false)

  async function BSLFlasherFinished(reason: FlashFinishReason) {
    serialAutoReconnect.value = BSLFlasherserialAutoReconnectPrevious.value
    await serialOpen()
    BSLFlasherFlashing.value = false
    if (reason === FlashFinishReason.SUCCESS) {
      showToast('Device firmware update finished Successfully', 'success')
    }
  }

  const { flash: BSLFlasherFlashInner } = useBSLFlasher(BSLFlasherFinished)

  async function BSLFlasherFlash() {
    const path = serialPortOptions.value?.path
    if (path) {
      BSLFlasherFlashing.value = true
      BSLFlasherserialAutoReconnectPrevious.value = serialAutoReconnect.value
      serialAutoReconnect.value = false
      await serialClose(false)
      BSLFlasherFlashInner(path)
    }
  }

  const {
    currentDeviceMetadata: JFBCurrentDeviceMetadata,
    currentDeviceConfiguration: JFBCurrentDeviceConfiguration,
    currentDeviceState: JFBCurrentDeviceState,
    serialLineCallback: JFBSerialLineCallback,
    serialPartialLineCallback: JFBSerialPartialLineCallback,
    automationEnabled: JFBAutomationEnabled,
    versionTarget: JFBVersionTarget,
    automationConfirmMbusFlash: JFBAutomationConfirmMbusFlash,
    automationSkipMBUSTest: JFBAutomationSkipMBUSTest,
    automationSkipStatusMessage: JFBAutomationSkipStatusMessage,
    automationEnterTimedConfig: JFBAutomationEnterTimedConfig,
    automationFlashOldFirmware: JFBAutomationFlashOldFirmware,
    automationSkipSetMeterType: JFBAutomationSkipSetMeterType,
    queryDevice: JFBQueryDevice,
  } = useJellyfishBridgeSerial(stringToSerial, configCurrentSourceAvailableConfigurations, applyConfiguration, upsertHistory, printerPrintData, BSLFlasherFlash)

  const serialListeners = new Set<SerialCallback>()

  function serialSubscribe(callback: SerialCallback) {
    serialListeners.add(callback)
    return () => serialListeners.delete(callback)
  }

  function serialCallbackWrapper(data: Uint8Array) {
    serialListeners.forEach(callback => callback(data))
  }

  const serialWriteListeners = new Set<SerialCallback>()

  function serialWriteSubscribe(callback: SerialCallback) {
    serialWriteListeners.add(callback)
    return () => serialWriteListeners.delete(callback)
  }

  function serialWriteCallbackWrapper(data: Uint8Array) {
    serialWriteListeners.forEach(callback => callback(data))
  }

  const serialLineListeners = new Set<SerialLineCallback>()

  function serialLineSubscribe(callback: SerialLineCallback) {
    serialLineListeners.add(callback)
    return () => serialLineListeners.delete(callback)
  }

  function serialLineCallbackWrapper(line: string) {
    JFBSerialLineCallback(line)
    serialLineListeners.forEach(callback => callback(line))
  }

  const serialPartialLineListeners = new Set<SerialLineCallback>()

  function serialPartialLineSubscribe(callback: SerialLineCallback) {
    serialPartialLineListeners.add(callback)
    return () => serialPartialLineListeners.delete(callback)
  }

  function serialPartialLineCallbackWrapper(line: string) {
    JFBSerialPartialLineCallback(line)
    serialPartialLineListeners.forEach(callback => callback(line))
  }

  watch(settingsIsOpen, (value) => {
    serialAutoReconnect.value = !value
  })

  const serialLocalEcho = ref(false)

  return {
    settingsIsOpen,
    serialOpen,
    serialClose,
    serialWrite,
    serialSubscribe,
    serialWriteSubscribe,
    serialGetHistory,
    serialLineSubscribe,
    serialPartialLineSubscribe,
    serialIsOpen,
    serialAutoReconnect,
    serialPortInfo,
    serialPortOptions,
    serialReceiving,
    serialTransmitting,
    serialIsConfigured,
    serialIsConnected,
    serialSanitisedManufacturer,
    serialSanitisedSerialNumber,
    serialSanitisedProduct,
    serialLocalEcho,
    printerConfiguredName,
    printerConfiguredStatus,
    printerPrintData,
    JFBCurrentDeviceMetadata,
    JFBCurrentDeviceConfiguration,
    JFBCurrentDeviceState,
    JFBAutomationEnabled,
    JFBVersionTarget,
    JFBAutomationConfirmMbusFlash,
    JFBAutomationSkipMBUSTest,
    JFBAutomationSkipStatusMessage,
    JFBAutomationEnterTimedConfig,
    JFBAutomationFlashOldFirmware,
    JFBAutomationSkipSetMeterType,
    JFBQueryDevice,
    configImport,
    configUnusedConfigurations,
    configConfiguredDevices,
    configConfiguredDevicesWithConfiguration,
    configAvailableConfigurations,
    configCurrentSource,
    configCurrentSourceId,
    configCurrentSourceAvailableConfigurations,
    configCurrentSourceConfiguredDevicesWithConfiguration,
    configCurrentSourceAllConfigurations,
    configSources,
    BSLFlasherFlash,
    BSLFlasherFlashing,
  }
}, {
  persist: {
    pick: [
      'serialPortOptions',
      'printerConfiguredName',
      'configCurrentSourceId',
      'configAvailable',
      'configImportedSize',
      'configApplied',
      'configFilename',
      'serialLocalEcho',
      'JFBVersionTarget',
      'JFBAutomationEnabled',
      'JFBAutomationConfirmMbusFlash',
      'JFBAutomationSkipMBUSTest',
      'JFBAutomationSkipStatusMessage',
    ],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
