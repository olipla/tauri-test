<script lang="ts" setup>
import { Pane, Splitpanes } from 'splitpanes'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

onMounted(async () => {
  // List available ports
  if (window.__TAURI__) {
    const ports = await SerialPort.available_ports()
    console.log('Available ports:', ports)
  }
})
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes horizontal>
      <Pane>
        1
      </Pane>
      <Pane>
        <Terminal class="w-full h-full" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
