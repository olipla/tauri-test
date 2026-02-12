<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import { format } from 'date-fns'

const props = defineProps<{
  configurations: (DBConfiguredDevice & DBConfiguration)[]
  title: string
}>()

const columns: TableColumn<AppliedConfiguration>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: ({ row }) => {
      const value = row.getValue('timestamp') as Date
      return format(value, 'yyyy-MM-dd HH:mm:ss')
    },
  },
  {
    accessorKey: 'deviceId',
    header: 'Device ID',
  },
  {
    accessorKey: 'sFurnitureId',
    header: 'SF ID',
  },
  {
    accessorKey: 'sFurnitureW3W',
    header: 'What 3 Words',
  },
  {
    accessorKey: 'sFurnitureAddress',
    header: 'Address',
  },
  {
    accessorKey: 'assets',
    header: 'Meters',
    cell: ({ row }) => {
      const value = row.getValue('assets') as ConfigurationAsset[]
      // return value.map(x => x.radioIdFull).join(', ')
      return value.length
    },
  },
]
</script>

<template>
  <TableCard>
    <template #header>
      <div class="px-1 flex">
        <div>
          {{ props.title }}
        </div>
      </div>
    </template>
    <template #default>
      <UTable
        sticky
        :columns="columns"
        :data="props.configurations"
        class="w-full h-full"
      />
    </template>
  </TableCard>
</template>

<style></style>
