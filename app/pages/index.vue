<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { Pane, Splitpanes } from 'splitpanes'
import { getPrinters, ping } from 'tauri-plugin-printer-v2'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

onMounted(async () => {
  // List available ports
  if (window.__TAURI__) {
    const ports = await SerialPort.available_ports()
    console.log('Available ports:', ports)

    invoke('get_printers').then(message => console.log(message))
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
        <TerminalPane class="w-full h-full" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
