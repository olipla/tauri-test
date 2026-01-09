<script lang="ts" setup>
import { Window } from '@tauri-apps/api/window'

const appWindow = new Window('main')

async function quit(close: () => void) {
  await appWindow.destroy()
  close()
}
</script>

<template>
  <UModal title="Are you sure?" description="BSL Flasher is currently running, quitting now will force close it.">
    <template #footer="{ close }">
      <UButton label="Quit Anyway" variant="outline" @click="quit(close)" />
      <UButton label="Cancel" @click="close" />
    </template>
  </UModal>
</template>

<style>

</style>
