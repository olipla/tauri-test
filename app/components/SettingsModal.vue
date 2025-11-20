<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import { PortChooserModal, UModal } from '#components'
import SettingsTab from './SettingsTab.vue'

const props = withDefaults(defineProps<{
  tab?: 'general' | 'serial' | 'printer' | 'configuration'
}>(), {
  tab: 'general',
})

const items = [
  {
    label: 'General',
    title: 'General Settings',
    icon: 'i-lucide-settings',
    slot: 'general' as const,
    value: 'general',
  },
  {
    label: 'Serial',
    title: 'Serial Settings',
    icon: 'i-lucide-binary',
    slot: 'serial' as const,
    value: 'serial',
  },
  {
    label: 'Printer',
    title: 'Printer Settings',
    icon: 'i-lucide-printer',
    slot: 'printer' as const,
    value: 'printer',
  },
  {
    label: 'Config',
    title: 'Configuration Settings',
    icon: 'i-lucide-wrench',
    slot: 'configuration' as const,
    value: 'configuration',
  },
] satisfies TabsItem[]

const active = ref(props.tab)
const activeItem = computed(() => {
  return items.find(x => x.value === active.value)
})

const overlay = useOverlay()

const modal = overlay.create(PortChooserModal)

async function choosePort() {
  const instance = modal.open()
  const result = await instance.result
  console.log(result)
}
</script>

<template>
  <UModal :title="activeItem?.title" :ui="{ body: 'p-0 sm:p-0' }">
    <template #body>
      <UTabs
        v-model="active" variant="link" orientation="vertical" :items="items" class="w-full items-start" :ui="{
          list: 'pt-3',
          indicator: 'w-1',
        }"
      >
        <template #general>
          <SettingsTab />
        </template>
        <template #serial>
          <SettingsTab>
            <h2>Serial Port</h2>
            <div />
            <UButton @click="choosePort">
              Choose
            </UButton>
          </SettingsTab>
        </template>
        <template #printer>
          <SettingsTab />
        </template>
        <template #configuration>
          <SettingsTab />
        </template>
      </UTabs>
    </template>
  </UModal>
</template>

<style>

</style>
