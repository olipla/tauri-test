<script lang="ts" setup>
// const emit = defineEmits<{ close: [boolean] }>()

import { listen } from '@tauri-apps/api/event'

const props = defineProps<{
  error: string | undefined
}>()

const logContainer = useTemplateRef('logContainer')

function logLine(line: string) {
  const container = logContainer.value
  if (container === null) {
    return
  }

  const div = document.createElement('div')
  div.textContent = line
  container.appendChild(div)
  div.scrollIntoView()
}

const unlisten = await listen('bsl-stdout', async (event) => {
  if (typeof event.payload === 'string') {
    logLine(event.payload)
  }
})

onUnmounted(() => {
  unlisten()
})
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-4xl' }" title="Firmware flashing in progress" description="Do not unplug device while firmware is being flashed to it!" :dismissible="props.error !== undefined" :close="props.error !== undefined">
    <template #body>
      <div ref="logContainer" class="font-mono w-full h-96 bg-elevated overflow-y-auto" />
    </template>
    <template v-if="props.error !== undefined" #footer>
      <UAlert color="error" title="Error!" :description="props.error" icon="i-lucide-triangle-alert" />
    </template>
  </UModal>
</template>

<style>

</style>
