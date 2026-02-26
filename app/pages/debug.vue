<script lang="ts" setup>
import { SerialPort } from 'tauri-plugin-serialplugin-api'

const jellyfishFlashAutomation1 = useJellyfishFlashAutomation()
const jellyfishFlashAutomation2 = useJellyfishFlashAutomation()

onMounted(async () => {
  console.log(await SerialPort.available_ports())
  jellyfishFlashAutomation1.serialOpen({
    path: 'COM8',
    baudRate: 9600,
  })
  jellyfishFlashAutomation2.serialOpen({
    path: 'COM7',
    baudRate: 9600,
  })
})
</script>

<template>
  <div class="p-8">
    <ul>
      <li>{{ STAGE[jellyfishFlashAutomation1.stage.value] }}</li>
      <li>{{ STAGE[jellyfishFlashAutomation2.stage.value] }}</li>
    </ul>
    <!-- <UProgress ></UProgress> -->
  </div>
</template>

<style></style>
