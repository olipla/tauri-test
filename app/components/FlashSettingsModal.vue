<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import { useFirmwareStore } from '~/stores/Firmware'
import { useFlasherStore } from '~/stores/Flasher'
import FirmwareSelectorModal from './FirmwareSelectorModal.vue'
import SettingsTab from './SettingsTab.vue'

const flasherStore = useFlasherStore()
const {
  flashMode,
  deviceConfigEnabled,
  timeRandomizationEnabled,
  customExtraCommands,
  skipStatusMessage,
  skipTestMeterDataMessage,
} = storeToRefs(flasherStore)

const firmwareStore = useFirmwareStore()
const { firmwareName } = storeToRefs(firmwareStore)

const overlay = useOverlay()
const modalFirmware = overlay.create(FirmwareSelectorModal)

const items = [
  {
    label: 'Flashing',
    title: 'Flashing Settings',
    icon: 'i-lucide-zap',
    slot: 'flashing' as const,
    value: 'flashing',
  },
  {
    label: 'Config',
    title: 'Configuration Settings',
    icon: 'i-lucide-wrench',
    slot: 'configuration' as const,
    value: 'configuration',
  },
  {
    label: 'Automations',
    title: 'Automation Settings',
    icon: 'i-lucide-cpu',
    slot: 'automations' as const,
    value: 'automations',
  },
] satisfies TabsItem[]

const active = ref('flashing')
const activeItem = computed(() => {
  return items.find(x => x.value === active.value)
})

const flashModeOptions = [
  { value: 'never', label: 'Never', description: 'Disable firmware upgrading', disabled: true },
  { value: 'always', label: 'Always', description: 'Force firmware upgrade' },
  { value: 'auto', label: 'Auto', description: 'Upgrade incorrect firmware', disabled: true },
]
</script>

<template>
  <UModal
    :title="activeItem?.title"
    :ui="{
      body: 'p-0 sm:p-0 overflow-hidden',
      content: 'transition-[height] duration-300 ease-in-out',
    }"
  >
    <template #body>
      <UTabs
        v-model="active"
        variant="link"
        orientation="vertical"
        :items="items"
        class="w-full items-start transition-[height] duration-300 ease-in-out"
        :ui="{
          list: 'pt-3',
          indicator: 'w-1',
          content: 'p-0 overflow-hidden relative',
        }"
      >
        <template #flashing>
          <SettingsTab :key="active">
            <UFormField label="Firmware">
              <div class="flex items-center gap-4">
                <UButton @click="modalFirmware.open">
                  Choose Firmware
                </UButton>
                <span
                  v-if="firmwareName"
                  class="text-sm font-medium text-neutral-500"
                >
                  {{ firmwareName }}
                </span>
              </div>
            </UFormField>

            <UFormField
              label="Flashing Mode"
              description="Choose when the device should be flashed."
            >
              <URadioGroup
                v-model="flashMode"
                :items="flashModeOptions"
                orientation="horizontal"
                variant="table"
                class="mt-4"
              />
            </UFormField>
          </SettingsTab>
        </template>

        <template #configuration>
          <Transition
            name="expand"
            mode="out-in"
          >
            <SettingsTab
              :key="active"
              class="expand-content"
            >
              <UFormField
                label="Device Configuration"
                description="Enable or disable post-flash configuration."
              >
                <USwitch
                  v-model="deviceConfigEnabled"
                  label="Enabled"
                />
              </UFormField>

              <div
                class="grid transition-all duration-300 ease-in-out"
                :class="[deviceConfigEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0']"
              >
                <div class="overflow-hidden">
                  <div class="flex flex-col gap-4 pl-4 border-l-2 border-l-muted py-2">
                    <UFormField
                      label="Time Randomisation"
                      description="Randomise the device time during configuration."
                    >
                      <USwitch
                        v-model="timeRandomizationEnabled"
                        :disabled="true"
                        label="Enabled"
                      />
                    </UFormField>

                    <UFormField
                      label="Custom Extra Commands"
                      description="Add any additional commands to be executed."
                    >
                      <UTextarea
                        v-model="customExtraCommands"
                        placeholder="Enter commands here..."
                        class="w-full"
                        :rows="3"
                        :disabled="true"
                      />
                    </UFormField>
                  </div>
                </div>
              </div>
            </SettingsTab>
          </Transition>
        </template>

        <template #automations>
          <Transition
            name="expand"
            mode="out-in"
          >
            <SettingsTab :key="active">
              <div class="flex flex-col gap-4">
                <UFormField
                  label="Status Message"
                  description="Choose whether to skip the status message."
                >
                  <USwitch
                    v-model="skipStatusMessage"
                    label="Skip Status Message"
                  />
                </UFormField>
                <UFormField
                  label="Test Meter Data Message"
                  description="Choose whether to skip the test meter data message."
                >
                  <USwitch
                    v-model="skipTestMeterDataMessage"
                    label="Skip Test Meter Data Message"
                  />
                </UFormField>
              </div>
            </SettingsTab>
          </Transition>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
