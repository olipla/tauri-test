import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'

export const useFirmwareStore = defineStore('firmware', () => {
  const firmwareBytes = ref<number[] | null>(null)
  const firmwareName = ref<string | null>(null)

  async function setFirmware(bytes: number[], name: string) {
    firmwareBytes.value = bytes
    firmwareName.value = name
    await syncToBackend()
  }

  async function syncToBackend() {
    if (firmwareBytes.value && firmwareName.value) {
      try {
        await invoke('set_firmware', { bytes: firmwareBytes.value, name: firmwareName.value })
      }
      catch (error) {
        console.error('Failed to sync firmware to backend:', error)
      }
    }
  }

  return {
    firmwareBytes,
    firmwareName,
    setFirmware,
    syncToBackend,
  }
}, {
  persist: {
    pick: ['firmwareBytes', 'firmwareName'],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
