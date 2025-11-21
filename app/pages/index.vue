<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { Pane, Splitpanes } from 'splitpanes'
import { SerialPort } from 'tauri-plugin-serialplugin-api'
import SettingsModal from '~/components/SettingsModal.vue'

const configuratorStore = useConfiguratorStore()
const {
  serialPortInfo,
  serialPortOptions,
  serialTransmitting,
  serialReceiving,
  serialIsOpen,
  serialIsConfigured,
  serialIsConnected,
  serialSanitisedProduct,
  serialSanitisedSerialNumber,
} = storeToRefs(configuratorStore)

onMounted(async () => {
  // List available ports
  if (window.__TAURI__) {
    const ports = await SerialPort.available_ports()
    console.log('Available ports:', ports)

    invoke('get_printers').then(message => console.log(message))
    configuratorStore.serialOpen({
      path: 'COM15',
      baudRate: 9600,
      timeout: 32,
    })
  }
})

const overlay = useOverlay()

const settingsModal = overlay.create(SettingsModal)

async function openSettings() {
  settingsModal.open()
}

const panePercent = ref(33)

interface PaneEvent {
  panes: {
    min: number
    max: number
    size: number
  }[]
}

function updatePanePercent(event: PaneEvent) {
  if (event.panes[1]) {
    panePercent.value = event.panes[1].size
  }
}

const terminalPaneSize = computed(() => {
  if (panePercent.value > 99.9) {
    return 99.9
  }
  else if (panePercent.value < 0.1) {
    return 0.1
  }
  else {
    return panePercent.value
  }
})

const bodyPaneSize = computed(() => {
  if (panePercent.value > 99.9) {
    return 0.1
  }
  else if (panePercent.value < 0.1) {
    return 99.9
  }
  else {
    return 100 - panePercent.value
  }
})

const terminalPaneVisible = ref(true)

function closeTerminalPane() {
  terminalPaneVisible.value = false
}

function openTerminalPane() {
  panePercent.value = 33
  terminalPaneVisible.value = true
}

const isMaximised = computed(() => {
  return terminalPaneSize.value >= 90
})

function toggleMaximisePane() {
  if (isMaximised.value) {
    openTerminalPane()
  }
  else {
    panePercent.value = 100
  }
}

defineShortcuts({
  meta_t: () => {
    if (terminalPaneVisible.value) {
      closeTerminalPane()
    }
    else {
      openTerminalPane()
    }
  },
})
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes horizontal @resize="updatePanePercent">
      <Pane :size="bodyPaneSize">
        <div class="w-full h-full flex flex-col gap-2">
          <div class="w-full flex p-4">
            <h1 class="text-xl grow">
              Jellyfish Bridge Configurator
            </h1>
            <UButton icon="i-lucide-settings" @click="openSettings">
              Settings
            </UButton>
          </div>
          <div class="flex gap-4 px-4">
            <SerialCard
              :status="serialIsConnected ? 'ok' : 'error'"
              :serial-details="serialIsOpen ? {
                baudRate: serialPortOptions?.baudRate ?? 0,
                id: serialSanitisedSerialNumber ?? '',
                name: serialSanitisedProduct ?? '',
                port: serialPortOptions?.path ?? '',
              } : undefined"
              :transmitting="serialTransmitting"
              :receiving="serialReceiving"
              :is-connected="serialIsConnected"
            />
            <PrinterCard />
            <ConfigurationCard />
            <StatusCard :issues="[{ title: 'Printer Error', description: 'The selected printer is offline' }, { title: 'Serial Error', description: 'COM 4 does not exist!' }]" />
          </div>
        </div>
      </Pane>
      <Pane v-if="terminalPaneVisible" :size="terminalPaneSize">
        <TerminalPane :maximised="isMaximised" class="w-full h-full" @close="closeTerminalPane" @maximise="toggleMaximisePane" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
