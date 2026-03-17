<script lang="ts" setup>
import { useFlasherStore } from '~/stores/Flasher'

const flasherStore = useFlasherStore()
const { flashMode, deviceConfigEnabled, timeRandomizationEnabled, customExtraCommands } = storeToRefs(flasherStore)

const flashModeOptions = [
  { value: 'never', label: 'Never', description: 'Disable firmware upgrading', disabled: true },
  { value: 'always', label: 'Always', description: 'Force firmware upgrade' },
  { value: 'auto', label: 'Auto', description: 'Upgrade incorrect firmware', disabled: true },
]
</script>

<template>
  <UModal title="Flash Settings">
    <template #body>
      <div class="flex flex-col gap-6 p-4">
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

        <UFormField
          label="Device Configuration"
          description="Enable or disable post-flash configuration."
        >
          <USwitch
            v-model="deviceConfigEnabled"
            label="Enabled"
          />
        </UFormField>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="deviceConfigEnabled"
            class="flex flex-col gap-4 pl-4 border-l-2 border-l-muted"
          >
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
        </Transition>
      </div>
    </template>
  </UModal>
</template>

<style scoped></style>
