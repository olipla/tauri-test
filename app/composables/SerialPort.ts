import type { PortInfo, SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

export function useSerialPort(serialCallback: (bytes: Uint8Array) => void) {
  let port: SerialPort | undefined

  const portInfo = ref<PortInfo | undefined>()
  const portOptions = ref<SerialportOptions | undefined>()

  const sanitisedProduct = computed(() => {
    const info = portInfo.value
    const options = portOptions.value
    if (!info || !options) {
      return
    }

    const nullTerminatorIndex = info.product.indexOf('\u0000')
    return info.product.substring(0, nullTerminatorIndex < 0 ? undefined : nullTerminatorIndex).replace(` (${options.path})`, '')
  })

  const sanitisedManufacturer = computed(() => {
    const info = portInfo.value
    if (!info) {
      return
    }

    const nullTerminatorIndex = info.manufacturer.indexOf('\u0000')
    return info.product.substring(0, nullTerminatorIndex < 0 ? undefined : nullTerminatorIndex)
  })

  const sanitisedSerialNumber = computed(() => {
    const info = portInfo.value
    if (!info) {
      return
    }

    const nullTerminatorIndex = info.serial_number.indexOf('\u0000')
    const serialNumber = info.serial_number.substring(0, nullTerminatorIndex < 0 ? undefined : nullTerminatorIndex)
    if (['', 'undefined', 'noserial', 'unknown'].includes(serialNumber.toLowerCase())) {
      return
    }
    return serialNumber
  })

  const isOpen = computed(() => {
    return portInfo !== undefined
  })

  const isConfigured = computed(() => {
    return portOptions !== undefined
  })

  const isConnected = ref(false)

  const transmitting = refAutoReset(false, 250)
  const receiving = refAutoReset(false, 250)

  async function disconnectedCallback() {
    console.log('Serial Disconnected!')
    isConnected.value = false
    portInfo.value = undefined
  }

  async function close() {
    try {
      if (port) {
        await port.cancelAllListeners()
        await port.close()
        portInfo.value = undefined
        portOptions.value = undefined
      }
    }
    catch (error) {
      console.error(`serial error ${error}`)
    }
  }

  function serialCallbackWrapper(bytes: Uint8Array) {
    receiving.value = true
    serialCallback(bytes)
  }

  async function listen() {
    try {
      if (port) {
        await port.startListening()
        await port.listen(serialCallbackWrapper)
        await port.disconnected(disconnectedCallback)
        isConnected.value = true
      }
      else {
        console.error('Not open!')
      }
    }
    catch (error) {
      console.error(`serial error ${error}`)
    }
  }

  async function getPortInfo(port: string) {
    const ports = await SerialPort.available_ports()
    if (port in ports) {
      return ports[port]
    }
  }

  async function open(options: SerialportOptions) {
    try {
      await close()
      port = new SerialPort(options)
      // await port.enableAutoReconnect({
      //   interval: 2500,
      // })
      portInfo.value = await getPortInfo(options.path)
      portOptions.value = options
      await port.open()
      await listen()
    }
    catch (error) {
      console.error(error)
    }
  }

  async function write(bytes: Uint8Array) {
    try {
      if (port) {
        transmitting.value = true
        await port.writeBinary(bytes)
      }
      else {
        console.error('Not open!')
      }
    }
    catch (error) {
      console.error(error)
    }
  }

  onUnmounted(() => {
    close()
  })

  return { open, write, receiving, transmitting, portInfo, portOptions, isOpen, isConfigured, isConnected, sanitisedManufacturer, sanitisedSerialNumber, sanitisedProduct }
}
