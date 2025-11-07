<script lang="ts" setup>
import { PortChooserModal } from '#components'

const overlay = useOverlay()

const modal = overlay.create(PortChooserModal)

async function choosePort() {
  const instance = modal.open()
  const result = await instance.result
  console.log(result)
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
        <div class="rounded-full bg-red-400 w-3 h-3" />
        <div class="flex flex-col">
          <div class="font-bold text-sm">
            COM5
          </div>
          <div class=" text-sm">
            9600
          </div>
        </div>
        <div class="border-muted border self-stretch" />
        <div class="flex flex-col">
          <div class="text-muted text-sm">
            USB Serial Port (COM5)
          </div>
          <div class="text-muted text-sm">
            FTDI / FTDXQ43XA
          </div>
        </div>
      </div>
      <div class="flex gap-1 p-1">
        <UButton icon="i-lucide-settings" variant="ghost" @click="choosePort" />
        <UButton icon="i-lucide-expand" variant="ghost" />
        <UButton icon="i-lucide-x" variant="ghost" />
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
      <SerialTerminal />
    </div>
  </div>
</template>

<style>
.xterm-scroll-area {
  padding-right: calc(var(--spacing) * 2) !important;
}
</style>
