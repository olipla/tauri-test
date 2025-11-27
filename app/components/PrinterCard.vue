<script lang="ts" setup>
import type { PrinterShortSummary } from '~/lib/tauriPrint'
import type { Status } from '~/types/common'

const props = defineProps<{
  status?: PrinterShortSummary
}>()

const status = computed<Status>(() => {
  if (props.status && !props.status.is_offline && props.status.error_state === 'No Error') {
    return 'ok'
  }

  return 'error'
})
</script>

<template>
  <CommonCard :status="status" title="Printer">
    <div v-if="!props.status" class="flex justify-center items-center w-full">
      <div class="flex flex-col grow items-center justify-center gap-1 w-full">
        <UIcon name="i-lucide-triangle-alert" class="size-6" />
        <div>
          Not configured
        </div>
      </div>
    </div>
    <div v-else class="flex flex-col gap-1 pl-1">
      <div class="font-bold">
        {{ props.status?.name }}
      </div>
      <div class="flex gap-2">
        <div class="font-bold">
          {{ props.status?.status }}
        </div>
        <div class="border-muted border self-stretch" />
        <div>{{ props.status?.error_state }}</div>
      </div>
    </div>
  </CommonCard>
</template>

<style>

</style>
