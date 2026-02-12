<script lang="ts" setup>
import { SettingsModal } from '#components'

const props = defineProps<{
  maximised: boolean
  mounted: 'bottom' | 'right'
  localEcho?: boolean
}>()

const emit = defineEmits<{
  close: []
  maximise: []
  mount: []
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
  JFBCurrentDeviceMetadata,
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

const INVERT = new Uint8Array([0x1B, 0x5B, 0x37, 0x6D]) // ESC[7m
const RESET = new Uint8Array([0x1B, 0x5B, 0x30, 0x6D]) // ESC[0m

function invertText(textBytes: Uint8Array) {
  const result = new Uint8Array(INVERT.length + textBytes.length + RESET.length)
  result.set(INVERT, 0)
  result.set(textBytes, INVERT.length)
  result.set(RESET, INVERT.length + textBytes.length)
  return result
}

configuratorStore.serialWriteSubscribe((data: Uint8Array) => {
  if (terminal.value) {
    // Local Echo
    if (props.localEcho) {
      terminal.value.write(invertText(data))
    }
  }
})

function terminalDataIn(data: string) {
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

async function unlockDevice() {
  await configuratorStore.JFBQueryDevice()
  if (!JFBCurrentDeviceMetadata.value.deviceAltId) {
    return
  }

  terminalDataIn(`O=${JFBCurrentDeviceMetadata.value.deviceAltId}\n`)
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex bg-elevated items-center">
      <div class="grow pl-2 p-1 flex items-center gap-3">
        <div
          class="rounded-full w-3 h-3"
          :class="{
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
        <UButton
          icon="i-lucide-settings"
          variant="ghost"
          @click.stop="choosePort"
        />
        <UButton
          :icon="props.mounted === 'bottom' ? 'i-lucide-panel-right' : 'i-lucide-panel-bottom'"
          variant="ghost"
          @click.stop="emit('mount')"
        />
        <UButton
          :icon="props.maximised ? 'i-lucide-minimize' : 'i-lucide-maximize'"
          variant="ghost"
          @click.stop="emit('maximise')"
        />
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          @click.stop="emit('close')"
        />
      </div>
    </div>
    <div class="w-full bg-elevated flex flex-wrap gap-2 px-2 py-1">
      <UButton
        color="secondary"
        @click.stop="unlockDevice()"
      >
        Unlock
      </UButton>
      <UButton
        color="secondary"
        @click.stop="configuratorStore.JFBApplyNextConfig()"
      >
        Apply Next Config
      </UButton>
      <UButton @click.stop="terminalDataIn('?\n')">
        ?
      </UButton>
      <UButton @click.stop="terminalDataIn('Y\n')">
        Y
      </UButton>
      <UButton @click.stop="terminalDataIn('N\n')">
        N
      </UButton>
      <UButton @click.stop="terminalDataIn('R=250\n')">
        R=250
      </UButton>
      <UButton @click.stop="terminalDataIn('R=255\n')">
        R=255
      </UButton>
      <UButton @click.stop="terminalDataIn('R=0\n')">
        R=0
      </UButton>
      <UButton @click.stop="terminalDataIn('R=1\n')">
        R=1
      </UButton>
      <UButton @click.stop="terminalDataIn('R=2\n')">
        R=2
      </UButton>
      <UButton @click.stop="terminalDataIn('R=3\n')">
        R=3
      </UButton>
      <UButton @click.stop="terminalDataIn('R=4\n')">
        R=4
      </UButton>
      <UButton @click.stop="terminalDataIn('I=1439\n')">
        I=1439
      </UButton>
      <UButton @click.stop="terminalDataIn(`I=${currentDayMinutes}\n`)">
        I={{ currentDayMinutes }}
      </UButton>
      <UButton @click.stop="terminalDataIn('T=0\n')">
        T=0
      </UButton>
      <UButton @click.stop="terminalDataIn('T=1\n')">
        T=1
      </UButton>
      <UButton @click.stop="terminalDataIn('T=2\n')">
        T=2
      </UButton>
      <UButton @click.stop="terminalDataIn('T=3\n')">
        T=3
      </UButton>
      <UButton @click.stop="terminalDataIn('S=60\n')">
        S=60
      </UButton>
      <UButton @click.stop="terminalDataIn('S=15\n')">
        S=15
      </UButton>
      <UButton @click.stop="terminalDataIn('C=*\n')">
        C=*
      </UButton>
    </div>
    <div class="w-full grow bg-elevated pl-2 pb-2">
      <SerialTerminal
        ref="terminal"
        @data="terminalDataIn"
      />
    </div>
  </div>
</template>

<style>
.xterm-scroll-area {
  padding-right: calc(var(--spacing) * 2) !important;
}
</style>
