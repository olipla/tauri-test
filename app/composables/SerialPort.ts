import type { PortInfo, SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

export function useSerialPort(serialCallback: (bytes: Uint8Array) => void, serialSentCallback: (bytes: Uint8Array) => void, serialLineCallback?: (line: string) => void, serialPartialLineCallback?: (partialLine: string) => void) {
  let port: SerialPort | undefined

  const portInfo = ref<PortInfo | undefined>()
  const portOptions = ref<SerialportOptions | undefined>()
  const autoReconnect = ref(true)

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
    console.log('SERIAL INTERVAL')
    if (!isConnected.value && portOptions.value !== undefined) {
      open(portOptions.value, false)
    }
  }, 2000)

  async function disconnectedCallback() {
    isConnected.value = false
    portInfo.value = undefined
  }

  watchEffect(() => {
    // console.log('SERIAL WE', autoReconnect.value, !isConnected.value, portOptions.value !== undefined)
    if (autoReconnect.value && !isConnected.value && portOptions.value !== undefined) {
      resumeAutoReconnect()
    }
    else {
      pauseAutoReconnect()
    }
  })

  async function close(resetRefs = true) {
    try {
      if (port) {
        await port.cancelAllListeners()
        await port.close()
        console.log('CLOSING PORT', port)
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
    processSerial(bytes)
  }

  async function listen() {
    try {
      if (port) {
        await port.startListening()
        await port.listen(serialCallbackWrapper, false)
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
        console.log('SENDING SERIAL:', new TextDecoder().decode(bytes))
        await port.writeBinary(bytes)
        serialSentCallback(bytes)
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

  let strBuffer: string = ''

  function serialLineCallbackWrapper(line: string) {
    console.log('SERIAL LINE:', line)
    if (serialLineCallback) {
      serialLineCallback(line)
    }
  }

  function serialPartialLineCallbackWrapper(partialLine: string) {
    // console.log('PARTIAL SERIAL LINE:', partialLine)
    if (serialPartialLineCallback) {
      serialPartialLineCallback(partialLine)
    }
  }

  function processSerial(data: Uint8Array) {
    const dataStr = new TextDecoder('utf-8', { fatal: false }).decode(data)

    strBuffer += dataStr

    while (strBuffer.includes('\n')) {
      const newlineIndex = strBuffer.indexOf('\n')
      const line = strBuffer.slice(0, newlineIndex)
      strBuffer = strBuffer.slice(newlineIndex + 1)

      if (line) {
        serialLineCallbackWrapper(line)
      }
    }

    if (strBuffer) {
      serialPartialLineCallbackWrapper(strBuffer)
    }
  }

  return {
    open,
    write,
    getHistory,
    close,
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
