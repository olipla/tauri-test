<script lang="ts" setup>
import { SerialPort } from 'tauri-plugin-serialplugin-api'

function serialCallback(bytes: Uint8Array<ArrayBufferLike>) {
  // console.log('DEBUG SERIAL CALLBACK', bytes)
}

function serialSentCallback(bytes: Uint8Array<ArrayBufferLike>) {
  // console.log('DEBUG SERIAL SENT CALLBACK', bytes)
}

function serialLineCallback(line: string) {
  // console.log('DEBUG SERIAL LINE CALLBACK', line)
  JFBFlashEngine.serialLineCallback(line)
}

const { open, write, close } = useSerialPort(serialCallback, serialSentCallback, serialLineCallback)

async function writeLn(line: string) {
  await write(new TextEncoder().encode(`${line}\n`))
}

// const serial = useSerialMachine(writeLn)

const JFBFlashEngine = useJFBFlashEngine(writeLn)

onMounted(async () => {
  console.log(await SerialPort.available_ports())
  open({
    path: 'COM8',
    baudRate: 9600,
  })
})

onUnmounted(async () => {
  await close()
})

// Only expose in development to keep production clean
if (process.dev) {
  (window as any).serial = {
    // receive: serial.receiveLine,
    // send: serial.sendCommand,
    // status: () => serial.state.value,
    unlockCommand: () => JFBFlashEngine.sendUnlockCommand(),
    queryCommand: () => JFBFlashEngine.sendQueryCommand().then(() => console.log('Query Success!')),
    unlock: () => JFBFlashEngine.unlockDevice().then(() => console.log('Unlock success!')),
  }
}
</script>

<template>
  <div class="p-8">
    <ul>
      <!-- <li>{{ serial.lastError }}</li>
      <li>{{ serial.state }}</li> -->
    </ul>
  </div>
</template>

<style></style>
