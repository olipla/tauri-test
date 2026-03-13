<script lang="ts" setup>
import type { SerialportOptions } from 'tauri-plugin-serialplugin-api'
import PortChooserModal from './PortChooserModal.vue'

const props = defineProps<{
  name: string
  colour?: string
  portOptions?: SerialportOptions
}>()

const emit = defineEmits<{
  remove: []
  updateSerialConfig: [SerialportOptions | undefined]
}>()

const jellyfishFlashAutomation = useJellyfishFlashAutomation()

onMounted(async () => {
  jellyfishFlashAutomation.serialOpen(props.portOptions)
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
    case STAGE.DEVICE_INITIALISING:
      return 'Please wait while the device is prepared for configuration.'
    case STAGE.DEVICE_WAKE_FAIL:
      return 'Could not wake device after hibernate. Detach and quarantine under "WAKE FAIL".'
    case STAGE.DEVICE_CONFIG_SUCCESS:
      return 'Device is configured and in pre-run hibernate mode. Detach and move to configured area.'
    case STAGE.DEVICE_SELF_TEST:
      return 'Please wait while the WMBUS module is being tested.'
    case STAGE.DEVICE_SELF_TEST_FAIL:
      return 'Could not verify functionality of WMBUS module. Detach and quarantine under "WMBUS FAIL".'
    case STAGE.DEVICE_CONFIGURING:
      return 'Please wait while a generic configuration is applied to the device.'
  }
}

const overlay = useOverlay()

const modalPort = overlay.create(PortChooserModal)

async function choosePort() {
  const instance = modalPort.open()
  const result = await instance.result
  if (result !== undefined) {
    // console.log(result)
    jellyfishFlashAutomation.serialOpen({
      baudRate: 9600,
      path: result,
    })

    emit('updateSerialConfig', {
      baudRate: 9600,
      path: result,
    })
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-4 p-4 border-4 rounded-2xl w-75"
    :style="{ borderColor: props.colour }"
  >
    <div class="text-center text-4xl font-bold flex justify-between items-center">
      <div>
        {{ props.name }}
      </div>
      <UButton
        icon="i-lucide-x"
        variant="soft"
        color="neutral"
        @click.stop="emit('remove')"
      />
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
      @click.stop="choosePort()"
    />
    <div
      class="h-full rounded-xl flex flex-col justify-center items-center text-gray-900 bg-gray-400"
      :class="{
        'bg-blue-400': jellyfishFlashAutomation.stage.value === STAGE.DEVICE_WAKING || jellyfishFlashAutomation.stage.value === STAGE.ENTERING_BOOTLOADER,
        'bg-purple-400': jellyfishFlashAutomation.stage.value === STAGE.FLASHING,
        'bg-green-400': jellyfishFlashAutomation.stage.value === STAGE.FLASH_SUCCESS || jellyfishFlashAutomation.stage.value === STAGE.DEVICE_CONFIG_SUCCESS,
        'bg-red-400': jellyfishFlashAutomation.stage.value === STAGE.BOOTLOADER_FAIL || jellyfishFlashAutomation.stage.value === STAGE.FLASH_FAIL || jellyfishFlashAutomation.stage.value === STAGE.DEVICE_WAKE_FAIL || jellyfishFlashAutomation.stage.value === STAGE.DEVICE_CONFIG_FAIL,
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
