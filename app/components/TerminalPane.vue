<script lang="ts" setup>
import { SettingsModal } from '#components'

const props = defineProps<{
  maximised: boolean
}>()

const emit = defineEmits<{
  close: []
  maximise: []
}>()

const overlay = useOverlay()
const modal = overlay.create(SettingsModal)

const configuratorStore = useConfiguratorStore()

const {
  serialIsConnected,
  serialSanitisedProduct,
  serialSanitisedSerialNumber,
  serialSanitisedManufacturer,
  serialPortOptions,
} = storeToRefs(configuratorStore)

const serialDescription = computed(() => {
  const values = []

  if (serialSanitisedManufacturer.value) {
    values.push(serialSanitisedManufacturer.value)
  }

  if (serialSanitisedSerialNumber.value) {
    values.push(serialSanitisedSerialNumber.value)
  }

  return values.join(' • ')
})

const terminal = useTemplateRef('terminal')

watch(terminal, (value) => {
  if (!value) {
    return
  }

  const history = configuratorStore.serialGetHistory()
  history.forEach((bytes) => {
    value.write(bytes)
  })
}, { immediate: true })

configuratorStore.serialSubscribe((data: Uint8Array) => {
  if (terminal.value) {
    terminal.value.write(data)
  }
})

function terminalDataIn(data: string) {
  console.log(data)
  configuratorStore.serialWrite(new TextEncoder().encode(data))
}

async function choosePort() {
  modal.open({
    tab: 'serial',
  })
}

const timestamp = useTimestamp({ offset: 0 })

const timestampThrottled = useThrottle(timestamp, 1000)

const currentDayMinutes = computed(() => {
  const date = new Date(timestampThrottled.value)
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  return (hours * 60) + minutes
})
</script>

<template>
  <div class="flex flex-col">
    <div class="flex bg-elevated items-center">
      <div class="grow pl-2 p-1 flex items-center gap-3">
        <div
          class="rounded-full w-3 h-3" :class="{
            'dark:bg-red-400': !serialIsConnected,
            'bg-red-500': !serialIsConnected,
            'dark:bg-green-400': serialIsConnected,
            'bg-green-500': serialIsConnected,
          }"
        />
        <div class="flex flex-col">
          <div class="font-bold text-sm">
            {{ serialPortOptions?.path }}
          </div>
          <div class=" text-sm">
            {{ serialPortOptions?.baudRate }}
          </div>
        </div>
        <div class="border-muted border self-stretch" />
        <div class="flex flex-col">
          <div class="text-muted text-sm">
            {{ serialSanitisedProduct }}
          </div>
          <div class="text-muted text-sm">
            {{ serialDescription }}
          </div>
        </div>
      </div>
      <div class="flex gap-1 p-1">
        <UButton icon="i-lucide-settings" variant="ghost" @click.stop="choosePort" />
        <UButton :icon="props.maximised ? 'i-lucide-minimize' : 'i-lucide-maximize'" variant="ghost" @click.stop="emit('maximise')" />
        <UButton icon="i-lucide-x" variant="ghost" @click.stop="emit('close')" />
      </div>
    </div>
    <div class="w-full bg-elevated flex flex-wrap gap-2 px-2 py-1">
      <UButton>?</UButton>
      <UButton>Y</UButton>
      <UButton>N</UButton>
      <UButton>R=0</UButton>
      <UButton>R=1</UButton>
      <UButton>R=2</UButton>
      <UButton>R=3</UButton>
      <UButton>R=4</UButton>
      <UButton>I=1439</UButton>
      <UButton>I={{ currentDayMinutes }}</UButton>
      <UButton>T=0</UButton>
      <UButton>T=1</UButton>
      <UButton>T=2</UButton>
      <UButton>T=3</UButton>
      <UButton>S=60</UButton>
      <UButton>S=15</UButton>
      <UButton>C=*</UButton>
      <UButton color="secondary">
        Add Meter
      </UButton>
    </div>
    <div class="w-full grow bg-elevated pl-2 pb-2">
      <SerialTerminal ref="terminal" @data="terminalDataIn" />
    </div>
  </div>
</template>

<style>
.xterm-scroll-area {
  padding-right: calc(var(--spacing) * 2) !important;
}
</style>
