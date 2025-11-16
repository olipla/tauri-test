<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { Pane, Splitpanes } from 'splitpanes'
import { SerialPort } from 'tauri-plugin-serialplugin-api'
import SettingsModal from '~/components/SettingsModal.vue'

const configuratorStore = useConfiguratorStore()
const {
  serialPortInfo,
  SerialPortOptions,
  serialTransmitting,
  serialReceiving,
  serialIsOpen,
} = storeToRefs(configuratorStore)

onMounted(async () => {
  // List available ports
  if (window.__TAURI__) {
    const ports = await SerialPort.available_ports()
    console.log('Available ports:', ports)

    invoke('get_printers').then(message => console.log(message))
    configuratorStore.serialOpen({
      path: 'COM2',
      baudRate: 9600,
    })
  }
})

const overlay = useOverlay()

const settingsModal = overlay.create(SettingsModal)

async function openSettings() {
  settingsModal.open()
}
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes horizontal>
      <Pane>
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
              :serial-details="serialIsOpen ? {
                baudRate: SerialPortOptions?.baudRate ?? 0,
                id: serialPortInfo?.serial_number ?? '',
                name: serialPortInfo?.product ?? '',
                port: SerialPortOptions?.path ?? '',
              } : undefined"
              :transmitting="serialTransmitting"
              :receiving="serialReceiving"
            />
            <PrinterCard />
            <ConfigurationCard />
            <StatusCard :issues="[{ title: 'Printer Error', description: 'The selected printer is offline' }, { title: 'Serial Error', description: 'COM 4 does not exist!' }]" />
          </div>
        </div>
      </Pane>
      <Pane>
        <TerminalPane class="w-full h-full" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
