<script lang="ts" setup>
import { SerialPort } from 'tauri-plugin-serialplugin-api'

let JFBFlashEngine: ReturnType<typeof useJFBFlashEngine>

function serialLineCallback(line: string) {
  JFBFlashEngine?.serialLineCallback(line)
}

function serialPartialLineCallback(line: string) {
  JFBFlashEngine?.serialPartialLineCallback(line)
}

const { open, writeLn, close, autoReconnect } = useSerialPort(() => { }, () => { }, serialLineCallback, serialPartialLineCallback)
JFBFlashEngine = useJFBFlashEngine(writeLn, () => flash('COM8'))

function flashFinish(reason: FlashFinishReason) {
  open()
  console.log('FLASH FINISH CALLBACK', reason)
  JFBFlashEngine?.flashFinish(reason === FlashFinishReason.SUCCESS)
}

const flasher = useBSLFlasher(flashFinish, false)

async function flash(port: string) {
  await close(false)
  autoReconnect.value = false
  await flasher.flash(port)
}

onMounted(async () => {
  console.log(await SerialPort.available_ports())
  open({
    path: 'COM8',
    baudRate: 9600,
  })

  if (process.dev) {
    (window as any).serial = {
      // receive: serial.receiveLine,
      // send: serial.sendCommand,
      // status: () => serial.state.value,
      close: () => close(),
      unlockCommand: () => JFBFlashEngine.sendUnlockCommand(),
      queryCommand: () => JFBFlashEngine.sendQueryCommand().then(() => console.log('Query Success!')),
      unlock: () => JFBFlashEngine.unlockDevice().then(() => console.log('Unlock success!')),
    }
  }
})

onUnmounted(async () => {
  await close()
})
</script>

<template>
  <div class="p-8">
    <ul>
      <li>{{ STAGE[JFBFlashEngine.engineStage.value] }}</li>
    </ul>
    <!-- <UProgress ></UProgress> -->
  </div>
</template>

<style></style>
