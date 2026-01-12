import type { UnlistenFn } from '@tauri-apps/api/event'
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
}

export function useBSLFlasher(finishedCallback: (reason: FlashFinishReason) => void) {
  const overlay = useOverlay()
  const flashingModal = overlay.create(FlashingModal)

  const flashing = ref(false)

  const unlistens: UnlistenFn[] = []

  function cleanup(reason: FlashFinishReason) {
    flashing.value = false
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
    finishedCallback(reason)
  }

  async function flash(serialPath: string) {
    flashing.value = true
    // serialAutoReconnect.value = false
    // await configuratorStore.serialClose(false)

    flashingModal.open()
    await flashDevice(serialPath).catch(() => {
      cleanup(FlashFinishReason.INIT_ERROR)
    })
  }

  onMounted(async () => {
    unlistens.push(await listen('bsl-finished', async () => {
      console.log('BSL FINISHED')
      cleanup(FlashFinishReason.SUCCESS)
      // serialAutoReconnect.value = true
      // await configuratorStore.serialOpen()
    }))

    unlistens.push(await listen('bsl-failed', async (event) => {
      console.log('BSL FAILED', event.payload)
      if (event.payload === 1000) {
        cleanup(FlashFinishReason.ACK_ERROR)
      }
      else {
        cleanup(FlashFinishReason.FAILURE)
      }
    }))

    unlistens.push(await listen('bsl-timeout', async () => {
      console.log('BSL TIMED OUT')
      cleanup(FlashFinishReason.TIMEOUT)
    }))
  })

  onUnmounted(() => {
    cleanup(FlashFinishReason.QUIT)
    for (const unlisten of unlistens) {
      unlisten()
    }
  })

  return {
    flash,
  }
}
