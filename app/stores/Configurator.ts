import { defineStore } from 'pinia'

type SerialCallback = (data: Uint8Array) => void
type SerialLineCallback = (data: string) => void

export const useConfiguratorStore = defineStore('configurator', () => {
  const settingsIsOpen = ref(false)

  const {
    currentDeviceMetadata: JFBCurrentDeviceMetadata,
    currentDeviceConfiguration: JFBCurrentDeviceConfiguration,
    currentDeviceState: JFBCurrentDeviceState,
    serialLineCallback: JFBSerialLineCallback,
    serialPartialLineCallback: JFBSerialPartialLineCallback,
  } = useJellyfishBridgeSerial()

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

  watch(settingsIsOpen, (value) => {
    serialAutoReconnect.value = !value
  })

  const {
    configuredName: printerConfiguredName,
    configuredStatus: printerConfiguredStatus,
    printData: printerPrintData,
  } = usePrinter()

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
    printerConfiguredName,
    printerConfiguredStatus,
    printerPrintData,
    JFBCurrentDeviceMetadata,
    JFBCurrentDeviceConfiguration,
    JFBCurrentDeviceState,
  }
}, {
  persist: {
    pick: ['serialPortOptions', 'printerConfiguredName'],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
