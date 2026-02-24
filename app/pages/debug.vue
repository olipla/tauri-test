<script lang="ts" setup>
async function writeLn(line: string) {
  console.log(`mock line written: ${line}`)
}

const serial = useSerialMachine(writeLn)

// Only expose in development to keep production clean
if (process.dev) {
  (window as any).serial = {
    receive: serial.receiveLine,
    send: serial.sendCommand,
    status: () => serial.state.value,
    unlock: () => serial.sendCommand('O=123456789', { expectedResponse: /.*OK/ }),
  }
}
</script>

<template>
  <div class="p-8">
    <ul>
      <li>{{ serial.lastError }}</li>
      <li>{{ serial.state }}</li>
    </ul>
  </div>
</template>

<style></style>
