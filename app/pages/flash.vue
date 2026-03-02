<script lang="ts" setup>
const flasherStore = useFlasherStore()

const { devicePorts } = storeToRefs(flasherStore)

function goToHome() {
  document.location = '/'
}
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
      <div class="grow flex justify-end">
        <UButton
          icon="i-lucide-arrow-left"
          color="secondary"
          class="ml-4"
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
