import { invoke } from '@tauri-apps/api/core'

export interface PrinterSummary {
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

export interface PrinterShortSummary {
  name: string
  status: string
  state: string
  error_state: string
  is_offline: boolean
  is_default: boolean
}

export async function getPrinters() {
  return await invoke<PrinterSummary[]>('get_printers')
}

export async function getPrinter(printerName: string) {
  return await invoke<PrinterShortSummary>('get_printer', {
    printerName,
  })
}

export async function printData(printerName: string, data: string) {
  return await invoke<number>('print_data', {
    printerName,
    data,
  })
}
