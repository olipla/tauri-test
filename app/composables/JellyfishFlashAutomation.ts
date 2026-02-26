import { FlashError } from '~/lib/errors'

export function useJellyfishFlashAutomation() {
  let JFBFlashEngine: ReturnType<typeof useJFBFlashEngine>

  function serialLineCallback(line: string) {
    JFBFlashEngine?.serialLineCallback(line)
  }

  function serialPartialLineCallback(line: string) {
    JFBFlashEngine?.serialPartialLineCallback(line)
  }

  const { open, writeLn, close, autoReconnect, portOptions } = useSerialPort(() => { }, () => { }, serialLineCallback, serialPartialLineCallback)

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
      await sleep(1000)
      flashCurrentDevice()
      return
    }

    flashAttempt.value = 0
    open()
    console.log(port, 'FLASH FINISH CALLBACK', reason)
    JFBFlashEngine?.flashFinish(reason === FlashFinishReason.SUCCESS)
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

  return { stage: JFBFlashEngine.engineStage, serialOpen: open, serialClose: close, serialAutoReconnect: autoReconnect }
}
