import { defineStore } from 'pinia'

type SerialCallback = (data: Uint8Array) => void

export const useConfiguratorStore = defineStore('configurator', () => {
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
    isOpen: serialIsOpen,
    portInfo: serialPortInfo,
    portOptions: SerialPortOptions,
    receiving: serialReceiving,
    transmitting: serialTransmitting,
    isConfigured: serialIsConfigured,
    isConnected: serialIsConnected,
    sanitisedManufacturer: serialSanitisedManufacturer,
    sanitisedSerialNumber: serialSanitisedSerialNumber,
    sanitisedProduct: serialSanitisedProduct,
  } = useSerialPort(serialCallbackWrapper)

  return {
    serialOpen,
    serialWrite,
    serialSubscribe,
    serialIsOpen,
    serialPortInfo,
    SerialPortOptions,
    serialReceiving,
    serialTransmitting,
    serialIsConfigured,
    serialIsConnected,
    serialSanitisedManufacturer,
    serialSanitisedSerialNumber,
    serialSanitisedProduct,
  }
})
