<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import { PortChooserModal, UModal } from '#components'
import PrinterChooserModal from './PrinterChooserModal.vue'
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

const configuratorStore = useConfiguratorStore()

const { settingsIsOpen, printerConfiguredName, serialLocalEcho, JFBVersionTarget } = storeToRefs(configuratorStore)

onMounted(() => {
  console.log('SETTINGS MODAL MOUNT')
  settingsIsOpen.value = true
})

onUnmounted(() => {
  console.log('SETTINGS MODAL UNMOUNT')
  settingsIsOpen.value = false
})

const overlay = useOverlay()

const modalPort = overlay.create(PortChooserModal)

async function choosePort() {
  const instance = modalPort.open()
  const result = await instance.result
  if (result !== undefined) {
    console.log(result)
    configuratorStore.serialOpen({
      baudRate: 9600,
      path: result,
    })
  }
}

const modalPrinter = overlay.create(PrinterChooserModal)

async function choosePrinter() {
  const instance = modalPrinter.open()
  const result = await instance.result
  if (result !== undefined) {
    printerConfiguredName.value = result
  }
}

async function printTestLabel() {
  await configuratorStore.printerPrintData('^XA^PON^LH0,0^FWN^CF0,120^FO210,100^FDTest Label^FS^XZ')
}

const localEcho = ref<boolean>(serialLocalEcho.value)

watch(localEcho, (newValue) => {
  serialLocalEcho.value = newValue
})
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
          <SettingsTab>
            <UFormField label="Version Target">
              <UInput
                v-model="JFBVersionTarget"
                class="w-full"
              />
            </UFormField>
          </SettingsTab>
        </template>
        <template #serial>
          <SettingsTab>
            <h2>Serial Port</h2>
            <UButton @click="choosePort">
              Choose
            </UButton>
            <USwitch v-model="localEcho" label="Local Echo" />
          </SettingsTab>
        </template>
        <template #printer>
          <SettingsTab>
            <h2>Printer</h2>
            <UButton @click="choosePrinter">
              Choose
            </UButton>
            <UButton @click="printTestLabel">
              Print Test Label
            </UButton>
          </SettingsTab>
        </template>
        <template #configuration>
          <SettingsTab>
            <h2>Configuration</h2>
            <UButton @click="configuratorStore.configImport()">
              Import from spreadsheet
            </UButton>
            <!-- <UButton color="error" @click="configuratorStore.configClear()">
              Clear configurations
            </UButton> -->
          </SettingsTab>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>

<style>

</style>
