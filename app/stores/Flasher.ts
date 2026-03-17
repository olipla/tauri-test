import type { SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { defineStore } from 'pinia'

interface devicePort {
  colour?: string
  serialPortOptions?: SerialportOptions
}

export const useFlasherStore = defineStore('flasher', () => {
  const devicePorts = ref<devicePort[]>([])

  const flashMode = ref<'never' | 'always' | 'auto'>('auto')
  const deviceConfigEnabled = ref(true)
  const timeRandomizationEnabled = ref(true)
  const customExtraCommands = ref('')

  return {
    devicePorts,
    flashMode,
    deviceConfigEnabled,
    timeRandomizationEnabled,
    customExtraCommands,
  }
}, {
  persist: {
    pick: [
      'devicePorts',
      'flashMode',
      'deviceConfigEnabled',
      'timeRandomizationEnabled',
      'customExtraCommands',
    ],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
