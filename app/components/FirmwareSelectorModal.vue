<script lang="ts" setup>
import { useFirmwareStore } from '~/stores/Firmware'

const firmwareStore = useFirmwareStore()
const { firmwareName } = storeToRefs(firmwareStore)

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const arrayBuffer = e.target?.result as ArrayBuffer
    if (arrayBuffer) {
      const bytes = Array.from(new Uint8Array(arrayBuffer))
      await firmwareStore.setFirmware(bytes, file.name)
    }
  }
  reader.readAsArrayBuffer(file)
}
</script>

<template>
  <UModal title="Select Firmware">
    <template #body>
      <div class="p-6 flex flex-col gap-6">
        <UFormField
          label="Firmware File"
          description="Select the .txt firmware file to be used for flashing."
        >
          <UInput
            type="file"
            accept=".txt"
            icon="i-lucide-file-search"
            class="w-full"
            @change="handleFileChange"
          />
        </UFormField>

        <UAlert
          v-if="firmwareName"
          icon="i-lucide-file-check"
          color="success"
          variant="subtle"
          :title="`Current: ${firmwareName}`"
          description="Firmware is loaded and ready for flashing."
        />
        <UAlert
          v-else
          icon="i-lucide-file-warning"
          color="warning"
          variant="subtle"
          title="No firmware selected"
          description="Please select a firmware file before attempting to flash."
        />
      </div>
    </template>
  </UModal>
</template>
