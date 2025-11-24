import type { PortInfo, SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

export function useSerialPort(serialCallback: (bytes: Uint8Array) => void) {
  let port: SerialPort | undefined

  const portInfo = ref<PortInfo | undefined>()
  const portOptions = ref<SerialportOptions | undefined>()
  const autoReconnect = ref(false)

  const history: Uint8Array[] = []

  function getHistory(): Uint8Array[] {
    return history
  }

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
    return info.manufacturer.substring(0, nullTerminatorIndex < 0 ? undefined : nullTerminatorIndex)
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

  const { pause: pauseAutoReconnect, resume: resumeAutoReconnect } = useIntervalFn(() => {
    console.log('AUTO RECONNECT')
    if (!isConnected.value && portOptions.value !== undefined) {
      console.log('TRYING OPEN')
      open(portOptions.value, false)
    }
  }, 2000)

  async function disconnectedCallback() {
    isConnected.value = false
    portInfo.value = undefined
  }

  watchEffect(() => {
    console.log('SERIAL WATCH EFFECT', autoReconnect.value, isConnected.value, portOptions.value)
    if (autoReconnect.value && !isConnected.value && portOptions.value !== undefined) {
      console.log('SERIAL WATCH RESUME')
      resumeAutoReconnect()
    }
    else {
      console.log('SERIAL WATCH PAUSE')
      pauseAutoReconnect()
    }
  })

  async function close(resetRefs = true) {
    try {
      if (port) {
        await port.cancelAllListeners()
        await port.close()
        if (resetRefs) {
          portInfo.value = undefined
          portOptions.value = undefined
        }
      }
    }
    catch (error) {
      console.error(`serial error ${error}`)
    }
  }

  function serialCallbackWrapper(bytes: Uint8Array) {
    receiving.value = true
    history.push(bytes)
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

  async function open(options?: SerialportOptions, resetRefs = true) {
    try {
      const serialPortOptions = options ?? portOptions.value
      if (serialPortOptions === undefined) {
        return
      }

      serialPortOptions.timeout = 12

      await close(resetRefs)
      port = new SerialPort(serialPortOptions)
      // await port.enableAutoReconnect({
      //   interval: 2500,
      // })
      portInfo.value = await getPortInfo(serialPortOptions.path)
      portOptions.value = serialPortOptions
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

  onScopeDispose(() => {
    pauseAutoReconnect()
    close()
  })

  return {
    open,
    write,
    getHistory,
    receiving,
    transmitting,
    portInfo,
    portOptions,
    isOpen,
    isConfigured,
    isConnected,
    sanitisedManufacturer,
    sanitisedSerialNumber,
    sanitisedProduct,
    autoReconnect,
  }
}
