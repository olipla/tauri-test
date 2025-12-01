<script lang="ts" setup>
import type { Status } from '~/types/common'

interface SerialDetails {
  port: string
  baudRate: number
  name: string
  id: string
}

const props = defineProps<{
  transmitting?: boolean
  receiving?: boolean
  serialDetails?: SerialDetails
  status: Status
  isConnected?: boolean
}>()
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <CommonCard title="Serial" status="error" />
    </template>
    <CommonCard :status="props.status" title="Serial">
      <div v-if="!serialDetails?.baudRate || !serialDetails?.port" class="flex justify-center items-center w-full">
        <div class="flex flex-col grow items-center justify-center gap-1 w-full">
          <UIcon name="i-lucide-triangle-alert" class="size-6" />
          <div>
            Not configured
          </div>
        </div>
      </div>
      <div v-else class="flex gap-3 w-full">
        <div class="flex gap-2 shrink grow-0">
          <div class="flex flex-col gap-1 min-w-0">
            <div class="flex items-center justify-center h-full w-4 rounded-sm bg-accented text-xs relative overflow-hidden">
              <div class="absolute inset-0 bg-primary opacity-0" :class="{ 'animate-[flash_0.2s_steps(1)_infinite]': props.receiving }" />
              <div class="z-10">
                R
              </div>
            </div>
            <div class="flex items-center justify-center h-full w-4 rounded-sm bg-accented text-xs relative overflow-hidden">
              <div class="absolute inset-0 bg-primary opacity-0" :class="{ 'animate-[flash_0.2s_steps(1)_infinite]': props.transmitting }" />
              <div class="z-10">
                T
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1 ">
            <div class="font-bold">
              {{ props.serialDetails?.port }}
            </div>
            <div>
              {{ props.serialDetails?.baudRate }}
            </div>
          </div>
        </div>
        <div class="border-muted border self-stretch" />
        <div v-if="isConnected" class="flex flex-col grow justify-center">
          <div class="text-ellipsis overflow-hidden leading-4.5 line-clamp-2">
            {{ props.serialDetails?.name }}
          </div>
          <div class="text-xs text-muted">
            {{ props.serialDetails?.id }}
          </div>
        </div>
        <div v-else class="flex flex-col grow items-center justify-center gap-1 w-full">
          <UIcon name="i-lucide-unplug" class="size-6" />
          <div>
            Disconnected
          </div>
        </div>
      </div>
    </CommonCard>
  </ClientOnly>
</template>

<style>
@keyframes flash {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
