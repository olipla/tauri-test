<script lang="ts" setup>
const props = defineProps<{
  name: string
  colour: string
  port: string
}>()

const jellyfishFlashAutomation = useJellyfishFlashAutomation()

onMounted(async () => {
  jellyfishFlashAutomation.serialOpen({
    path: props.port,
    baudRate: 9600,
  })
})

function getInstruction(stage: STAGE) {
  switch (stage) {
    case STAGE.IDLE:
      return 'Attach a device and hold a magnet to the bottom right of the QR code until the green LED turns solid.'
    case STAGE.DEVICE_WAKING:
      return 'Please wait while the device starts.'
    case STAGE.ENTERING_BOOTLOADER:
      return 'Please wait while the device is prepared to accept a firmware upgrade.'
    case STAGE.BOOTLOADER_FAIL:
      return 'Could not get device into bootloader mode. Detach and quarantine under "BOOTLOADER FAIL".'
    case STAGE.FLASHING:
      return 'Firmware upgrade in progress, DO NOT DETACH THE DEVICE!'
    case STAGE.FLASH_FAIL:
      return 'Could not apply firmware upgrade. Detach and quarantine under "FLASH FAIL".'
    case STAGE.FLASH_SUCCESS:
      return 'Device firmware upgraded. Detach and move to flashed area.'
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-4 p-4 border-4 rounded-xl w-75"
    :style="{ borderColor: props.colour }"
  >
    <div class="text-center text-4xl font-bold">
      {{ props.name }}
    </div>
    <SerialCard
      :status="jellyfishFlashAutomation.serialIsConnected.value ? 'ok' : 'error'"
      :serial-details="jellyfishFlashAutomation.serialIsOpen.value ? {
        baudRate: jellyfishFlashAutomation.serialPortOptions.value?.baudRate ?? 0,
        id: jellyfishFlashAutomation.serialSanitisedSerialNumber.value ?? '',
        name: jellyfishFlashAutomation.serialSanitisedProduct.value ?? '',
        port: jellyfishFlashAutomation.serialPortOptions.value?.path ?? '',
      } : undefined"
      :transmitting="jellyfishFlashAutomation.serialTransmitting.value"
      :receiving="jellyfishFlashAutomation.serialReceiving.value"
      :is-connected="jellyfishFlashAutomation.serialIsConnected.value"
    />
    <div
      class="h-full rounded-xl flex flex-col justify-center items-center text-gray-900"
      :class="{
        'bg-gray-400': jellyfishFlashAutomation.stage.value === STAGE.IDLE,
        'bg-blue-400': jellyfishFlashAutomation.stage.value === STAGE.DEVICE_WAKING || jellyfishFlashAutomation.stage.value === STAGE.ENTERING_BOOTLOADER,
        'bg-purple-400': jellyfishFlashAutomation.stage.value === STAGE.FLASHING,
        'bg-green-400': jellyfishFlashAutomation.stage.value === STAGE.FLASH_SUCCESS,
        'bg-red-400': jellyfishFlashAutomation.stage.value === STAGE.BOOTLOADER_FAIL || jellyfishFlashAutomation.stage.value === STAGE.FLASH_FAIL,
      }"
    >
      <div class="flex flex-col gap-4 h-full justify-center items-center">
        <div class="text-3xl font-bold text-wrap w-full text-center p-2">
          {{ STAGE[jellyfishFlashAutomation.stage.value]?.replaceAll("_", " ") }}
        </div>
        <div class="p-4 text-center font-semibold">
          {{ getInstruction(jellyfishFlashAutomation.stage.value) }}
        </div>
      </div>
      <div class="flex flex-col w-full p-2">
        <div class="w-full border-t border-black/25 mb-1.5" />
        <div class="flex flex-col w-full p-2 text-sm text-gray-700 font-mono">
          <div>DEV ID: {{ jellyfishFlashAutomation.currentDeviceId.value }}</div>
          <div>ALT ID: {{ jellyfishFlashAutomation.currentDeviceAltId.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style></style>
