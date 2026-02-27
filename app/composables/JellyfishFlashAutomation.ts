import { FlashError } from '~/lib/errors'

export function useJellyfishFlashAutomation() {
  let JFBFlashEngine: ReturnType<typeof useJFBFlashEngine>

  function serialLineCallback(line: string) {
    JFBFlashEngine?.serialLineCallback(line)
  }

  function serialPartialLineCallback(line: string) {
    JFBFlashEngine?.serialPartialLineCallback(line)
  }

  const {
    open,
    writeLn,
    close,
    autoReconnect,
    portOptions,
    portInfo,
    isOpen,
    isConnected,
    sanitisedManufacturer,
    sanitisedProduct,
    sanitisedSerialNumber,
    transmitting,
    receiving,
  } = useSerialPort(() => { }, () => { }, serialLineCallback, serialPartialLineCallback)

  async function flashCurrentDevice() {
    const currentPort = portOptions.value?.path

    if (!currentPort) {
      throw new FlashError('No port set')
    }

    await flash(currentPort)
  }

  JFBFlashEngine = useJFBFlashEngine(writeLn, flashCurrentDevice)

  const flashAttempt = ref(0)

  async function flashFinish(reason: FlashFinishReason, port: string) {
    if (flashAttempt.value < 3 && reason === FlashFinishReason.PERMISSION_ERROR) {
      flashAttempt.value++
      await sleep(5000)
      flashCurrentDevice()
      return
    }

    flashAttempt.value = 0
    await open()
    console.log(port, 'FLASH FINISH CALLBACK', reason)
    await JFBFlashEngine?.flashFinish(reason === FlashFinishReason.SUCCESS)
  }

  const flasher = useBSLFlasher(flashFinish, false)

  async function flash(port: string) {
    await close(false)
    autoReconnect.value = false
    await sleep(1000)
    await flasher.flash(port)
  }

  onMounted(async () => {
    if (import.meta.dev) {
      (window as any).serial = {
        // receive: serial.receiveLine,
        // send: serial.sendCommand,
        // status: () => serial.state.value,
        close: () => close(),
        unlockCommand: () => JFBFlashEngine.sendUnlockCommand(),
        queryCommand: () => JFBFlashEngine.sendQueryCommand().then(() => console.log('Query Success!')),
        unlock: () => JFBFlashEngine.unlockDevice().then(() => console.log('Unlock success!')),
      }
    }
  })

  onUnmounted(async () => {
    await close()
  })

  return {
    stage: JFBFlashEngine.engineStage,
    currentDeviceId: JFBFlashEngine.lastSeenID,
    currentDeviceAltId: JFBFlashEngine.lastSeenAltID,
    serialOpen: open,
    serialClose: close,
    serialAutoReconnect: autoReconnect,
    serialPortOptions: portOptions,
    serialPortInfo: portInfo,
    serialIsOpen: isOpen,
    serialIsConnected: isConnected,
    serialSanitisedManufacturer: sanitisedManufacturer,
    serialSanitisedProduct: sanitisedProduct,
    serialSanitisedSerialNumber: sanitisedSerialNumber,
    serialTransmitting: transmitting,
    serialReceiving: receiving,
  }
}
