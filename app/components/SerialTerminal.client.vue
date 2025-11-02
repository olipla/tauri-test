<script lang="ts" setup>
const xterm = useTemplateRef('xterm')

watch(xterm, () => {
  if (xterm.value) {
    xterm.value.terminal.onData((data: string) => {
      // serialStore.write(data)
      console.log(data)
    })
  }
}, { immediate: true })

// function onData(data: Uint8Array) {
//   xterm.value?.terminal.write(data)
// }
</script>

<template>
  <XTerm ref="xterm" />
</template>

<style></style>
