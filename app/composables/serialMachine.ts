import type { CommandOptions, DeviceState, PendingCommand } from '~/types/serial'
import { ref, shallowRef } from 'vue'

export function useSerialMachine(sendFn: (line: string) => Promise<void> | void) {
  const state = ref<DeviceState>('IDLE')
  const lastError = ref<string | null>(null)
  const pendingCommand = shallowRef<PendingCommand | null>(null)

  /**
   * Processes a received line of data and matches it against a pending command's expected response.
   * If the line matches the expected response pattern, clears the pending command, resets the state to idle,
   * and resolves the promise with the received line.
   *
   * @param line - The line of data received from the serial connection
   */
  const receiveLine = (line: string) => {
    const cleanLine = line.trim()
    if (!cleanLine || !pendingCommand.value)
      return

    const { expectedResponse, resolve, timer } = pendingCommand.value

    const isMatch = expectedResponse instanceof RegExp
      ? expectedResponse.test(cleanLine)
      : cleanLine.includes(expectedResponse || 'OK')

    if (isMatch) {
      clearTimeout(timer)
      pendingCommand.value = null
      state.value = 'IDLE'
      resolve(cleanLine)
    }
  }

  /**
   * Sends a command to the device and waits for the expected response.
   *
   * @param cmd - The command string to send to the device
   * @param options - Optional configuration for the command execution
   * @param options.timeout - Maximum time in milliseconds to wait for a response (default: 5000)
   * @param options.expectedResponse - The expected response string to wait for (default: 'OK')
   * @param options.delayBefore - Delay in milliseconds before sending the command (default: 0)
   *
   * @returns A promise that resolves with the device response when the expected response is received
   *
   * @throws {Error} If the device is currently busy processing another command
   * @throws {Error} If a timeout occurs while waiting for the expected response
   * @throws {Error} If an error occurs while sending the command
   */
  const sendCommand = async (
    cmd: string,
    options: CommandOptions = {},
  ): Promise<string> => {
    if (state.value === 'BUSY') {
      throw new Error('Device is currently busy processing another command')
    }

    const { timeout = 5000, expectedResponse = undefined, delayBefore = 0 } = options

    // Optional delay for devices that need "breathing room"
    if (delayBefore > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBefore))
    }

    return new Promise((resolve, reject) => {
      let timer

      if (expectedResponse !== undefined) {
        state.value = 'BUSY'

        timer = setTimeout(() => {
          pendingCommand.value = null
          state.value = 'ERROR'
          lastError.value = `Timeout waiting for: ${expectedResponse}`
          reject(new Error(lastError.value))
        }, timeout)

        pendingCommand.value = { resolve, reject, expectedResponse, timer }
      }

      try {
        sendFn(cmd)

        if (expectedResponse === undefined) {
          resolve('')
        }
      }
      catch (err) {
        clearTimeout(timer)
        state.value = 'ERROR'
        reject(err)
      }
    })
  }

  return {
    state,
    lastError,
    sendCommand,
    receiveLine,
  }
}
