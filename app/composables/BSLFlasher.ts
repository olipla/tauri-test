import type { UnlistenFn } from '@tauri-apps/api/event'
import type { FlashPayload } from '~/types/serial'
import { FlashingModal } from '#components'
import { listen } from '@tauri-apps/api/event'
import { flashDevice } from '~/lib/tauriFlash'

export enum FlashFinishReason {
  SUCCESS,
  FAILURE,
  TIMEOUT,
  QUIT,
  INIT_ERROR,
  ACK_ERROR,
  PERMISSION_ERROR,
}

export function useBSLFlasher(finishedCallback: (reason: FlashFinishReason, port: string) => void, showOverlay = true) {
  const overlay = useOverlay()
  const flashingModal = overlay.create(FlashingModal)

  const flashing = ref(false)

  const unlistens: UnlistenFn[] = []

  const activePort = ref<string | null>(null)

  function cleanup(reason: FlashFinishReason, serialPath: string) {
    if (activePort.value !== serialPath)
      return

    flashing.value = false
    activePort.value = null

    if (reason === FlashFinishReason.SUCCESS || reason === FlashFinishReason.INIT_ERROR) {
      flashingModal.close()
    }
    else {
      switch (reason) {
        case FlashFinishReason.ACK_ERROR:
          flashingModal.patch({
            error: 'Device didn\'t respond',
          })
          break

        case FlashFinishReason.TIMEOUT:
          flashingModal.patch({
            error: 'Flash took too long',
          })
          break

        default:
          flashingModal.patch({
            error: 'Firmware update failed',
          })
          break
      }
    }
    finishedCallback(reason, serialPath)
  }

  async function flash(serialPath: string) {
    activePort.value = serialPath
    flashing.value = true
    console.log('FLASH BEGIN', serialPath)
    // serialAutoReconnect.value = false
    // await configuratorStore.serialClose(false)
    if (showOverlay) {
      flashingModal.open()
    }
    await flashDevice(serialPath).catch(() => {
      cleanup(FlashFinishReason.INIT_ERROR, serialPath)
    })
  }

  onMounted(async () => {
    // 1. Listen for finished
    unlistens.push(await listen<FlashPayload<any>>('bsl-finished', (event) => {
      console.log('TAURI EVENT bsl-finished', event)
      if (event.payload.port === activePort.value) {
        console.log('EVENT PORT', event.payload.port, 'MATCHED')
        cleanup(FlashFinishReason.SUCCESS, event.payload.port)
      }
    }))

    // 2. Listen for failed
    unlistens.push(await listen<FlashPayload<number>>('bsl-failed', (event) => {
      console.log('TAURI EVENT bsl-failed', event)
      if (event.payload.port === activePort.value) {
        console.log('EVENT PORT', event.payload.port, 'MATCHED')
        let reason = FlashFinishReason.FAILURE
        if (event.payload.data === 1000) {
          reason = FlashFinishReason.ACK_ERROR
        }
        if (event.payload.data === 1001) {
          reason = FlashFinishReason.PERMISSION_ERROR
        }
        cleanup(reason, event.payload.port)
      }
    }))

    // 3. Listen for timeout
    unlistens.push(await listen<FlashPayload<any>>('bsl-timeout', (event) => {
      console.log('TAURI EVENT bsl-timeout', event)
      if (event.payload.port === activePort.value) {
        console.log('EVENT PORT', event.payload.port, 'MATCHED')
        cleanup(FlashFinishReason.TIMEOUT, event.payload.port)
      }
    }))
  })

  onUnmounted(() => {
    cleanup(FlashFinishReason.QUIT, activePort.value ?? '')
    for (const unlisten of unlistens) {
      unlisten()
    }
  })

  return {
    flash,
  }
}
