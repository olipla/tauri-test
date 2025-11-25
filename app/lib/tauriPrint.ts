import { invoke } from '@tauri-apps/api/core'

interface PrinterSummary {
  name: string
  status: string
  state: string
  error_state: string
  is_offline: boolean
  is_default: boolean
  uri: string
  port_name: string
  is_shared: boolean
  location: string
  processor: string
  data_type: string
  description: string
}

interface PrinterShortSummary {
  name: string
  status: string
  state: string
  error_state: string
  is_offline: boolean
  is_default: boolean
}

export async function get_printers() {
  return await invoke<PrinterSummary[]>('get_printers')
}

export async function get_printer(printerName: string) {
  return await invoke<PrinterShortSummary>('get_printer', {
    printerName,
  })
}

export async function print_data(printerName: string, data: string) {
  return await invoke<number>('print_data', {
    printerName,
    data,
  })
}
