import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { from } from 'rxjs'

type SerialCallback = (data: Uint8Array) => void
type SerialLineCallback = (data: string) => void

export const useConfiguratorStore = defineStore('configurator', () => {
  const settingsIsOpen = ref(false)

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
    const sourceId = await addConfigurations(configurations, sourceType, sourceName)
    configCurrentSourceId.value = sourceId
  }

  const configUnusedConfigurations = useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(getUnusedConfigurations)))
  const configAvailableConfigurations = useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(getAvailableConfigurations)))
  const configConfiguredDevices = useObservable<DBConfiguredDevice[]>(from(liveQuery<DBConfiguredDevice[]>(getConfiguredDevices)))
  const configConfiguredDevicesWithConfiguration = useObservable<(DBConfiguredDevice & DBConfiguration)[]>(from(liveQuery<(DBConfiguredDevice & DBConfiguration)[]>(getConfiguredDevicesWithConfiguration)))

  const configSources = computed(() => {
    const sourceId = configCurrentSourceId.value
    if (sourceId === undefined) {
      return
    }
    return useObservable<DBSource[] | undefined>(from(liveQuery<DBSource[] | undefined>(() => getSources())))
  })

  const configCurrentSource = computed(() => {
    const sourceId = configCurrentSourceId.value
    if (sourceId === undefined) {
      return
    }
    return useObservable<DBSource | undefined>(from(liveQuery<DBSource | undefined>(() => getSource(sourceId))))
  })

  const configCurrentSourceAvailableConfigurations = computed(() => {
    const sourceId = configCurrentSourceId.value
    if (sourceId === undefined) {
      return
    }
    return useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(() => getAvailableConfigurations(sourceId))))
  })

  const configCurrentSourceAllConfigurations = computed(() => {
    const sourceId = configCurrentSourceId.value
    if (sourceId === undefined) {
      return
    }
    return useObservable<DBConfiguration[]>(from(liveQuery<DBConfiguration[]>(() => getAllConfigurations(sourceId))))
  })

  const configCurrentSourceConfiguredDevicesWithConfiguration = computed(() => {
    const sourceId = configCurrentSourceId.value
    if (sourceId === undefined) {
      return
    }
    return useObservable<(DBConfiguredDevice & DBConfiguration)[]>(from(liveQuery<(DBConfiguredDevice & DBConfiguration)[]>(() => getConfiguredDevicesWithConfiguration(sourceId))))
  })

  const {
    openFile: configImport,
  } = useConfigurationImport(importedConfigurationsCallback)

  const {
    open: serialOpen,
    write: serialWrite,
    getHistory: serialGetHistory,
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
  } = useJellyfishBridgeSerial(stringToSerial, configAvailableConfigurations, applyConfiguration, upsertHistory, printerPrintData)

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
    serialWrite,
    serialSubscribe,
    serialWriteSubscribe,
    serialGetHistory,
    serialLineSubscribe,
    serialPartialLineSubscribe,
    serialIsOpen,
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
  }
}, {
  persist: {
    pick: ['serialPortOptions', 'printerConfiguredName', 'configCurrentSourceId', 'configAvailable', 'configImportedSize', 'configApplied', 'configFilename', 'serialLocalEcho', 'JFBVersionTarget', 'JFBAutomationEnabled', 'JFBAutomationConfirmMbusFlash', 'JFBAutomationSkipMBUSTest', 'JFBAutomationSkipStatusMessage'],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
