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
  serialLocalEcho,
  printerConfiguredStatus,
  JFBCurrentDeviceMetadata,
  JFBCurrentDeviceState,
  JFBCurrentDeviceConfiguration,
  configAvailable,
  configFilename,
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
              <ConfigurationCard :size="configAvailable.length" :filter="configFilename" source="SHEET" @click.stop="() => openSettings('configuration')" />
              <StatusCard :issues="statusIssues" />
            </div>
            <CommonCard title="Current Device" :show-settings="false" status="error" class="w-full grow">
              <div class="w-full flex">
                <div class="flex flex-col gap-4">
                  <table class="table">
                    <tbody>
                      <tr>
                        <td class="pr-4">
                          Device ID
                        </td>
                        <td>{{ JFBCurrentDeviceMetadata.deviceId }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          PAC/SIM ID
                        </td>
                        <td>{{ JFBCurrentDeviceMetadata.deviceAltId }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Version Tag
                        </td>
                        <td>{{ JFBCurrentDeviceMetadata.versionTag }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Version
                        </td>
                        <td>{{ JFBCurrentDeviceMetadata.versionShort }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table class="table">
                    <tbody>
                      <tr>
                        <td class="pr-4">
                          Runmode
                        </td>
                        <td>{{ JFBCurrentDeviceState.runmode }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          MBUS Enabled
                        </td>
                        <td>{{ JFBCurrentDeviceState.mbusEnabled }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Transmitting
                        </td>
                        <td>{{ JFBCurrentDeviceState.transmitting }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table class="table">
                    <tbody>
                      <tr>
                        <td class="pr-4">
                          Stack Mode
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.stackMode }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Meter Type
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.meterType }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Time
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.time }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Listening Start
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.listeningStart }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Listening Cycle
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.listeningCycle }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Listening Duration
                        </td>
                        <td>{{ JFBCurrentDeviceConfiguration.listeningDuration }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table class="table">
                    <tbody>
                      <tr v-for="([key, meter]) in JFBCurrentDeviceConfiguration.meters" :key="key">
                        <td class="pr-4">
                          Meter {{ key }}
                        </td>
                        <td>{{ meter.id }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="flex flex-col gap-4" />
              </div>
            </CommonCard>
          </div>
        </div>
      </Pane>
      <Pane v-if="terminalPaneVisible" :size="terminalPaneSize">
        <TerminalPane :mounted="terminalPaneMount" :maximised="isTerminalMaximised" class="w-full h-full" :local-echo="serialLocalEcho" @close="closeTerminalPane" @maximise="toggleMaximisePane" @mount="toggleMountPane" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
