<script lang="ts" setup>
import { SerialPort } from 'tauri-plugin-serialplugin-api'

const xterm = useTemplateRef('xterm')

watch(xterm, () => {
  if (xterm.value) {
    xterm.value.terminal.onData((data: string) => {
      // serialStore.write(data)
      console.log(data)
    })
  }
}, { immediate: true })

// if (window.__TAURI__) {
//   const port = new SerialPort({
//     path: 'COM4',
//     baudRate: 9600,
//     timeout: 30,
//     size: 1024,
//   })
//   await port.open()

//   // Write data
//   await port.write('Hello, Serial Port!')

//   // Start port listening
//   await port.startListening()

//   // Start port listening
//   const unsubscribe = await port.listen((data) => {
//     console.log('Received:', data)
//     if (data instanceof Uint8Array) {
//       xterm.value?.terminal.write(data)
//     }
//   }, false)
// }

// Stop listening when done
// await port.cancelListen()

// // Close port
// await port.close()
</script>

<template>
  <XTerm ref="xterm" />
</template>

<style></style>
