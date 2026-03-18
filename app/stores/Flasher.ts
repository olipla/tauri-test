import type { SerialportOptions } from 'tauri-plugin-serialplugin-api'
import { defineStore } from 'pinia'

interface devicePort {
  colour?: string
  serialPortOptions?: SerialportOptions
}

export const useFlasherStore = defineStore('flasher', () => {
  const devicePorts = ref<devicePort[]>([])

  const flashMode = ref<'never' | 'always' | 'auto'>('always')
  const deviceConfigEnabled = ref(true)
  const timeRandomizationEnabled = ref(false)
  const customExtraCommands = ref('')
  const skipStatusMessage = ref(false)
  const skipTestMeterDataMessage = ref(false)

  return {
    devicePorts,
    flashMode,
    deviceConfigEnabled,
    timeRandomizationEnabled,
    customExtraCommands,
    skipStatusMessage,
    skipTestMeterDataMessage,
  }
}, {
  persist: {
    pick: [
      'devicePorts',
      'flashMode',
      'deviceConfigEnabled',
      'timeRandomizationEnabled',
      'customExtraCommands',
      'skipStatusMessage',
      'skipTestMeterDataMessage',
    ],
    storage: piniaPluginPersistedstate.localStorage(),
  },
})
