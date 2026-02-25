export type DeviceState = 'DISCONNECTED' | 'IDLE' | 'BUSY' | 'ERROR'

export interface CommandOptions {
  timeout?: number
  expectedResponse?: string | RegExp | undefined
  delayBefore?: number
  retries?: number
  retryDelay?: number
}

export interface PendingCommand {
  resolve: (value: string) => void
  reject: (reason: string) => void
  expectedResponse?: string | RegExp
  timer: ReturnType<typeof setTimeout>
}
