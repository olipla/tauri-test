<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { Pane, Splitpanes } from 'splitpanes'
import { SerialPort } from 'tauri-plugin-serialplugin-api'
import SettingsModal from '~/components/SettingsModal.vue'

const configuratorStore = useConfiguratorStore()
const {
  serialPortOptions,
  serialTransmitting,
  serialReceiving,
  serialIsOpen,
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

const {
  updatePanePercent,
  bodyPaneSize,
  toggleTerminalPane,
  terminalPaneVisible,
  terminalPaneSize,
  isTerminalMaximised,
  closeTerminalPane,
  toggleMaximisePane,
} = useTerminalPane()
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes horizontal @resize="updatePanePercent">
      <Pane :size="bodyPaneSize">
        <div class="w-full h-full flex flex-col gap-2">
          <div class="w-full flex p-4 gap-2">
            <h1 class="text-xl grow">
              Jellyfish Bridge Configurator
            </h1>
            <UButton icon="i-lucide-terminal" variant="outline" @click="toggleTerminalPane">
              {{ terminalPaneVisible ? 'Close' : 'Open' }} Terminal
            </UButton>
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
        <TerminalPane :maximised="isTerminalMaximised" class="w-full h-full" @close="closeTerminalPane" @maximise="toggleMaximisePane" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
