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
    <div class="flex flex-col gap-1 pl-1">
      <div class="font-bold">
        {{ props.status?.name }}
      </div>
      <div class="flex gap-2">
        <div class="font-bold">
          {{ props.status?.state }}
        </div>
        <div class="border-muted border self-stretch" />
        <div>{{ props.status?.error_state }}</div>
      </div>
    </div>
  </CommonCard>
</template>

<style>

</style>
