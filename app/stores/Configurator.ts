import { defineStore } from 'pinia'

export const useConfiguratorStore = defineStore('configurator', () => {
  function serialCallback(bytes: Uint8Array) {
    console.log(bytes)
  }

  const {
    open: serialOpen,
    write: serialWrite,
    isOpen: serialIsOpen,
    portInfo: serialPortInfo,
    portOptions: SerialPortOptions,
    receiving: serialReceiving,
    transmitting: serialTransmitting,
  } = useSerialPort(serialCallback)

  return { serialOpen, serialWrite, serialIsOpen, serialPortInfo, SerialPortOptions, serialReceiving, serialTransmitting }
})
