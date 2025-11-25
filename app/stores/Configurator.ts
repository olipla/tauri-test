import { defineStore } from 'pinia'

type SerialCallback = (data: Uint8Array) => void

export const useConfiguratorStore = defineStore('configurator', () => {
  const settingsIsOpen = ref(false)

  const serialListeners = new Set<SerialCallback>()

  function serialSubscribe(callback: SerialCallback) {
    serialListeners.add(callback)
    return () => serialListeners.delete(callback)
  }

  function serialCallbackWrapper(data: Uint8Array) {
    console.log(data)
    serialListeners.forEach(callback => callback(data))
  }

  const serialWriteListeners = new Set<SerialCallback>()

  function serialWriteSubscribe(callback: SerialCallback) {
    serialWriteListeners.add(callback)
    return () => serialWriteListeners.delete(callback)
  }

  function serialWriteCallbackWrapper(data: Uint8Array) {
    console.log(data)
    serialWriteListeners.forEach(callback => callback(data))
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
  } = useSerialPort(serialCallbackWrapper, serialWriteCallbackWrapper)

  watch(settingsIsOpen, (value) => {
    console.log('SETTINGS IS OPEN CONFIGURATOR', value)
    serialAutoReconnect.value = !value
  })

  const {
    configuredName: printerConfiguredName,
    configuredStatus: printerConfiguredStatus,
  } = usePrinter()

  return {
    settingsIsOpen,
    serialOpen,
    serialWrite,
    serialSubscribe,
    serialWriteSubscribe,
    serialGetHistory,
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
  }
})
