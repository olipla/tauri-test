<script lang="ts" setup>
const emit = defineEmits<{
  data: [data: string]
}>()

const xterm = useTemplateRef('xterm')

function write(data: Uint8Array) {
  if (xterm.value) {
    xterm.value.terminal.write(data)
  }
}

defineExpose({
  write,
})

watch(xterm, () => {
  if (xterm.value) {
    xterm.value.terminal.onData((data: string) => {
      emit('data', data)
    })
  }
}, { immediate: true })
</script>

<template>
  <XTerm ref="xterm" />
</template>

<style></style>
