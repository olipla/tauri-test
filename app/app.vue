<script lang="ts" setup>
import { useFirmwareStore } from '~/stores/Firmware'

const firmwareStore = useFirmwareStore()

onMounted(() => {
  firmwareStore.syncToBackend()
})
</script>

<template>
  <UApp
    :toaster="{
      ui: {
        viewport: 'sm:w-[calc(25%-2rem)]',
      },
    }"
  >
    <NuxtLoadingIndicator color="repeating-linear-gradient(to right,var(--ui-primary) 0%,var(--ui-secondary) 100%)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
