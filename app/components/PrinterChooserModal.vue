<script lang="ts" setup>
import type { TableColumn, TableRow, TabsItem } from '@nuxt/ui'
import type { PrinterSummary } from '~/lib/tauriPrint'
import { UBadge } from '#components'
import { getPrinters } from '~/lib/tauriPrint'

const emit = defineEmits<{ close: [undefined | string] }>()
const table = useTemplateRef('table')

const printers = ref<undefined | PrinterSummary[]>()

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(e: Event, row: TableRow<PrinterSummary>) {
  emit('close', String(row.getValue('name')))
}

const columns: TableColumn<PrinterSummary>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'is_offline',
    header: 'Connected',
    cell: ({ row }) => {
      const value = row.getValue('is_offline') as boolean
      const colour = value ? 'error' as const : 'success' as const

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color: colour }, () =>
        value ? 'Offline' : 'Online')
    },
  },
  {
    accessorKey: 'port_name',
    header: 'Port',
  },
]

async function updateAvailablePrinters() {
  if (window.__TAURI__) {
    try {
      printers.value = await getPrinters()
      console.log(printers.value)
    }
    catch {
      printers.value = undefined
    }
  }
}

useIntervalFn(updateAvailablePrinters, 1000, {
  immediateCallback: true,
})
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-4xl', body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center grow">
        <div class="grow flex items-center">
          <h1 class="font-bold">
            Choose a label printer
          </h1>
        </div>
      </div>
    </template>
    <template #body>
      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        :data="printers"
        class="flex-1 transition-[height]"
        :columns="columns"
        :ui="{ th: 'whitespace-nowrap cursor-auto', tr: 'cursor-pointer' }"
        @select="onSelect"
      />
    </template>
  </UModal>
</template>

<style></style>
