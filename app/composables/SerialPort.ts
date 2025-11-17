import type { PortInfo, SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

export function useSerialPort(serialCallback: (bytes: Uint8Array) => void) {
  let port: SerialPort | undefined

  const portInfo = ref<PortInfo | undefined>()
  const portOptions = ref<SerialportOptions | undefined>()

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

  return { open, write, receiving, transmitting, portInfo, portOptions, isOpen, isConfigured, isConnected }
}
