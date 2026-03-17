<script lang="ts" setup>
import { Window } from '@tauri-apps/api/window'
import FlashSettingsModal from '~/components/FlashSettingsModal.vue'
import QuitWhileFlashingModal from '~/components/QuitWhileFlashingModal.vue'
import { STAGE } from '~/composables/JFBFlashEngine'

const flasherStore = useFlasherStore()
const { devicePorts } = storeToRefs(flasherStore)

const deviceColumnRefs = ref<any[]>([])

const overlay = useOverlay()
const modalSettings = overlay.create(FlashSettingsModal)
const quitWhileFlashingModal = overlay.create(QuitWhileFlashingModal)

function goToHome() {
  window.location.href = '/'
}

function openSettings() {
  modalSettings.open()
}

onMounted(async () => {
  if (window.__TAURI__) {
    const appWindow = new Window('main')
    appWindow.onCloseRequested((event) => {
      const isAnyFlashing = deviceColumnRefs.value.some(col => unref(col?.stage) === STAGE.FLASHING)
      if (isAnyFlashing) {
        event.preventDefault()
        quitWhileFlashingModal.open()
      }
    })
  }
})
</script>

<template>
  <div class="flex flex-col gap-2 h-full">
    <div class="flex gap-2 p-4 items-center">
      <h1 class="text-2xl font-semibold">
        Device Flasher
      </h1>
      <UButton
        icon="i-lucide-plus"
        class="ml-4"
        @click.stop="() => { devicePorts.push({}) }"
      >
        Add port
      </UButton>
      <div class="grow flex justify-end gap-2">
        <UButton
          icon="i-lucide-settings"
          variant="ghost"
          color="neutral"
          @click.stop="openSettings"
        >
          Settings
        </UButton>
        <UButton
          icon="i-lucide-arrow-left"
          color="secondary"
          @click.stop="goToHome()"
        >
          Back to Config
        </UButton>
      </div>
    </div>
    <div class="p-8 pt-2 flex gap-4 h-full w-full overflow-y-auto">
      <ClientOnly>
        <DeviceColumn
          v-for="(devicePort, index) in devicePorts"
          :key="index"
          ref="deviceColumnRefs"
          :name="`CABLE ${index + 1}`"
          :colour="devicePort.colour"
          :port-options="devicePort.serialPortOptions"
          @remove="() => devicePorts.splice(index, 1)"
          @update-serial-config="(options) => {
            const devicePort = devicePorts[index]
            if (devicePort) {
              devicePort.serialPortOptions = options
            }
          }"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<style></style>
