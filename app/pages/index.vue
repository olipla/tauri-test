<script lang="ts" setup>
import type { Issue } from '~/components/StatusCard.vue'
import { Window } from '@tauri-apps/api/window'
import { Pane, Splitpanes } from 'splitpanes'

import QuitWhileFlashingModal from '~/components/QuitWhileFlashingModal.vue'
import SettingsModal from '~/components/SettingsModal.vue'

const overlay = useOverlay()

const settingsModal = overlay.create(SettingsModal)
const quitWhileFlashingModal = overlay.create(QuitWhileFlashingModal)

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
  configCurrentSource,
  configCurrentSourceAvailableConfigurations,
  configCurrentSourceConfiguredDevicesWithConfiguration,
  configCurrentSourceAllConfigurations,
  configSources,
  BSLFlasherFlashing,
} = storeToRefs(configuratorStore)

onMounted(async () => {
  if (window.__TAURI__) {
    configuratorStore.serialOpen()

    const appWindow = new Window('main')
    appWindow.onCloseRequested((event) => {
      if (BSLFlasherFlashing.value) {
        event.preventDefault()
        quitWhileFlashingModal.open()
      }
    })
  }
})

watch(configSources, newValue => console.log(newValue), { immediate: true })

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
    <Splitpanes
      :horizontal="terminalPaneMount === 'bottom'"
      @resize="updatePanePercent"
    >
      <Pane :size="bodyPaneSize">
        <div class="w-full h-full flex gap-4 p-4">
          <div class="flex flex-col gap-4 w-132">
            <div class="grid grid-cols-2 gap-4 w-full">
              <UButton
                icon="i-lucide-settings"
                @click="() => openSettings()"
              >
                Settings
              </UButton>
              <UButton
                icon="i-lucide-terminal"
                variant="outline"
                @click="toggleTerminalPane"
              >
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
              <PrinterCard
                :status="printerConfiguredStatus"
                @click.stop="() => openSettings('printer')"
              />
              <ConfigurationCard
                :size="configCurrentSourceAllConfigurations?.length"
                :filter="configCurrentSource?.name"
                :source="configCurrentSource?.type"
                :configured="configCurrentSourceConfiguredDevicesWithConfiguration?.length ?? 0"
                @click.stop="() => openSettings('configuration')"
              />
              <StatusCard :issues="statusIssues" />
            </div>
            <CommonCard
              title="Current Device (W.I.P)"
              :show-settings="false"
              status="error"
              class="w-full grow"
            >
              <div class="w-full flex h-full overflow-auto  ">
                <div class="flex flex-col gap-4 h-full">
                  <UButton @click.stop="configuratorStore.BSLFlasherFlash()">
                    Flash
                  </UButton>
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
                          Query Attempt
                        </td>
                        <td>{{ JFBCurrentDeviceState.lastQueryAttempt }}</td>
                      </tr>
                      <tr>
                        <td class="pr-4">
                          Config Attempt
                        </td>
                        <td>
                          {{ JFBCurrentDeviceState.lastConfigAttempt }} ({{
                            JFBCurrentDeviceState.lastConfigInnerAttempt }})
                        </td>
                      </tr>
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
                      <tr>
                        <td class="pr-4">
                          Needs Flash
                        </td>
                        <td>{{ JFBCurrentDeviceState.needsFlash }}</td>
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
                      <tr
                        v-for="([key, meter]) in JFBCurrentDeviceConfiguration.meters"
                        :key="key"
                      >
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
          <div class="flex flex-col gap-4 grow">
            <AvailableConfigurationsTable
              :configurations="configCurrentSourceAvailableConfigurations ?? []"
              :title="`Available Configurations (${configCurrentSourceAvailableConfigurations?.length ?? 0})`"
            />
            <AppliedConfigurationsTable
              :configurations="configCurrentSourceConfiguredDevicesWithConfiguration ?? []"
              :title="`Applied Configurations (${configCurrentSourceConfiguredDevicesWithConfiguration?.length ?? 0})`"
            />
          </div>
        </div>
      </Pane>
      <Pane
        v-if="terminalPaneVisible"
        :size="terminalPaneSize"
      >
        <TerminalPane
          :mounted="terminalPaneMount"
          :maximised="isTerminalMaximised"
          class="w-full h-full"
          :local-echo="serialLocalEcho"
          @close="closeTerminalPane"
          @maximise="toggleMaximisePane"
          @mount="toggleMountPane"
        />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
