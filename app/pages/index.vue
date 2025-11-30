<script lang="ts" setup>
import type { Issue } from '~/components/StatusCard.vue'
import { Pane, Splitpanes } from 'splitpanes'
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
  printerConfiguredStatus,
} = storeToRefs(configuratorStore)

onMounted(async () => {
  if (window.__TAURI__) {
    configuratorStore.serialOpen()
  }
})

const overlay = useOverlay()

const settingsModal = overlay.create(SettingsModal)

async function openSettings(tab: 'general' | 'serial' | 'printer' | 'configuration' | undefined = undefined) {
  settingsModal.open({
    tab,
  })
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
  toggleMountPane,
  terminalPaneMount,
} = useTerminalPane()

const statusIssues = ref<Issue[]>([{ title: 'Printer Error', description: 'The selected printer is offline' }, { title: 'Serial Error', description: 'COM 4 does not exist!' }])
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes :horizontal="terminalPaneMount === 'bottom'" @resize="updatePanePercent">
      <Pane :size="bodyPaneSize">
        <div class="w-full h-full flex gap-8 p-4">
          <div class="flex flex-col gap-8 w-132">
            <div class="grid grid-cols-2 gap-4 w-full">
              <UButton icon="i-lucide-settings" @click="() => openSettings()">
                Settings
              </UButton>
              <UButton icon="i-lucide-terminal" variant="outline" @click="toggleTerminalPane">
                {{ terminalPaneVisible ? 'Close' : 'Open' }} Terminal
              </UButton>
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
                @click.stop="() => openSettings('serial')"
              />
              <PrinterCard :status="printerConfiguredStatus" @click.stop="() => openSettings('printer')" />
              <ConfigurationCard @click.stop="() => openSettings('configuration')" />
              <StatusCard :issues="statusIssues" />
            </div>
          </div>
        </div>
      </Pane>
      <Pane v-if="terminalPaneVisible" :size="terminalPaneSize">
        <TerminalPane :mounted="terminalPaneMount" :maximised="isTerminalMaximised" class="w-full h-full" @close="closeTerminalPane" @maximise="toggleMaximisePane" @mount="toggleMountPane" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
