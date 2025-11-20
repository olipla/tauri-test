<script lang="ts" setup>
import type { TableColumn, TableRow, TabsItem } from '@nuxt/ui'
import type { PortInfo } from 'tauri-plugin-serialplugin-api'
import { SerialPort } from 'tauri-plugin-serialplugin-api'

const emit = defineEmits<{ close: [undefined | string] }>()
const table = useTemplateRef('table')

const ports = ref<undefined | {
  [key: string]: PortInfo
}>()

interface NamedPortInfo extends PortInfo {
  portName: string
}

// path: string;
//     manufacturer: string;
//     pid: string;
//     product: string;
//     serial_number: string;
//     type: string;
//     vid: string;

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(e: Event, row: TableRow<NamedPortInfo>) {
  emit('close', String(row.getValue('portName')))
}

const columns: TableColumn<NamedPortInfo>[] = [
  {
    accessorKey: 'portName',
    header: 'Port Name',
  },
  {
    accessorKey: 'description',
    header: 'Description',
    meta: {
      class: {
        td: 'whitespace-normal',
      },
    },
    cell: ({ row }) => {
      const product = String(row.getValue('product'))
      const manufacturer = String(row.getValue('manufacturer'))
      const portName = String(row.getValue('portName'))

      const sanitisedProduct = product.replace(` (${portName})`, '')

      const nullTerminatorIndex = manufacturer.indexOf('\u0000')
      const sanitisedManufacturer = manufacturer.substring(0, nullTerminatorIndex < 0 ? undefined : nullTerminatorIndex)

      const values = [
        sanitisedProduct,
        sanitisedManufacturer,
        String(row.getValue('serial_number')),
      ]

      return values.filter(value => value !== 'Unknown' && value !== 'undefined' && value !== 'NOSERIAL').join(' • ')
    },
    // `${row.getValue('product')} / ${row.getValue('manufacturer')} / ${row.getValue('serial_number')}`,
  },
  {
    accessorKey: 'product',
    header: 'Product',
  },
  {
    accessorKey: 'manufacturer',
    header: 'Manufacturer',
  },
  {
    accessorKey: 'serial_number',
    header: 'Serial Number',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'pid',
    header: 'PID',
  },
  {
    accessorKey: 'vid',
    header: 'VID',
  },
]

const simpleColumnVisibility = {
  portName: true,
  description: true,
  product: false,
  manufacturer: false,
  serial_number: false,
  type: false,
  pid: false,
  vid: false,
}

const detailedColumnVisibility = {
  portName: true,
  description: false,
  product: true,
  manufacturer: true,
  serial_number: true,
  type: true,
  pid: true,
  vid: true,
}

const portData = computed<NamedPortInfo[]>(() => {
  const value = ports.value
  if (value === undefined) {
    return []
  }

  return Object.entries(value).map(([portName, portInfo]) => {
    return { portName, ...portInfo }
  }).sort((a, b) => {
    if (a.portName < b.portName) {
      return -1
    }
    else if (a.portName > b.portName) {
      return 1
    }
    return 0
  })
})

async function updateAvailablePorts() {
  if (window.__TAURI__) {
    try {
      ports.value = await SerialPort.available_ports()
      console.log(ports.value)
    }
    catch {
      ports.value = undefined
    }
  }
}

useIntervalFn(updateAvailablePorts, 1000, {
  immediateCallback: true,
})

const tabItems = ref<TabsItem[]>([
  {
    label: 'Simple',
    value: 'simple',
  },
  {
    label: 'Detailed',
    value: 'detailed',
  },
])

const activeTab = ref<'simple' | 'detailed'>('simple')

const columnVisibility = computed(() => {
  if (activeTab.value === 'detailed') {
    return detailedColumnVisibility
  }
  else if (activeTab.value === 'simple') {
    return simpleColumnVisibility
  }
  return {}
})

const columnPinningSimple = {
  left: [],
  right: [],
}

const columnPinningDetailed = {
  left: ['portName'],
  right: [],
}

const columnPinning = computed(() => {
  if (activeTab.value === 'detailed') {
    return columnPinningDetailed
  }
  else if (activeTab.value === 'simple') {
    return columnPinningSimple
  }
  return {}
})
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-2xl', body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center grow">
        <div class="grow flex items-center">
          <h1 class="font-bold">
            Choose a serial port
          </h1>
        </div>
        <UTabs v-model="activeTab" :content="false" :items="tabItems" />
      </div>
    </template>
    <template #body>
      <UTable
        ref="table" v-model:column-visibility="columnVisibility" v-model:row-selection="rowSelection"
        v-model:column-pinning="columnPinning" :data="portData" class="flex-1 transition-[height]" :columns="columns"
        :ui="{ th: 'whitespace-nowrap cursor-auto', tr: 'cursor-pointer' }" @select="onSelect"
      />
    </template>
  </UModal>
</template>

<style></style>
