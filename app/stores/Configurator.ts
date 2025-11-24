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
  } = useSerialPort(serialCallbackWrapper)

  watch(settingsIsOpen, (value) => {
    console.log('SETTINGS IS OPEN CONFIGURATOR', value)
    serialAutoReconnect.value = !value
  })

  return {
    settingsIsOpen,
    serialOpen,
    serialWrite,
    serialSubscribe,
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
  }
})
