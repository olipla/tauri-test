import type { SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { defineStore } from 'pinia'

interface devicePort {
  colour?: string
  serialPortOptions?: SerialportOptions
}

export const useFlasherStore = defineStore('flasher', () => {
  const devicePorts = ref<devicePort[]>([])

  return { devicePorts }
}, {
  persist: {
    pick: [
      'devicePorts',
    ],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
