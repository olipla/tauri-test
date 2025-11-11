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
        <div class="flex gap-4">
          <SerialCard
            :serial-details="{
              baudRate: '9600',
              id: 'FTDXQ43XA',
              name: 'USB Serial Port',
              port: 'COM5',
            }"
            :transmitting="true"
          />
          <PrinterCard />
          <ConfigurationCard />
          <StatusCard :issues="[{ title: 'Printer Error', description: 'The selected printer is offline' }, { title: 'Serial Error', description: 'COM 4 does not exist!' }]" />
        </div>
      </Pane>
      <Pane>
        <TerminalPane class="w-full h-full" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
