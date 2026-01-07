import { invoke } from '@tauri-apps/api/core'

export async function flashDevice(port: string) {
  await invoke('flash', { port })
}
