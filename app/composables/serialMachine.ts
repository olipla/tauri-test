import type { CommandOptions, DeviceState, PendingCommand } from '~/types/serial'
import { ref, shallowRef } from 'vue'
import { DeviceBusyError, ResponseTimeoutError } from '~/lib/errors'

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

    console.log('Checking for response:', line, expectedResponse, isMatch)

    if (isMatch) {
      clearTimeout(timer)
      pendingCommand.value = null
      state.value = 'IDLE'
      resolve(cleanLine)
    }
  }

  /**
   * Sends a command to the device and optionally waits for a response.
   *
   * @param cmd - The command string to send to the device
   * @param options - Configuration options for the command execution
   * @param options.timeout - Maximum time in milliseconds to wait for the expected response (default: 5000)
   * @param options.expectedResponse - The response string to wait for; if undefined, the command is fire-and-forget
   * @param options.delayBefore - Delay in milliseconds before sending the command (default: 0)
   * @returns A promise that resolves with the response string, or an empty string if no response is expected
   * @throws {DeviceBusyError} If the device is currently processing another command
   * @throws {ResponseTimeoutError} If the expected response is not received within the timeout period
   */
  const sendCommand = async (
    cmd: string,
    options: CommandOptions = {},
  ): Promise<string> => {
    if (state.value === 'BUSY') {
      throw new DeviceBusyError('Device is currently busy processing another command')
    }

    const { timeout = 500, expectedResponse = undefined, delayBefore = 0, retries = 3, retryDelay = 250 } = options

    // Optional delay for devices that need "breathing room"
    if (delayBefore > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBefore))
    }

    async function attemptCommand(): Promise<string> {
      return new Promise((resolve, reject) => {
        let timer

        if (expectedResponse !== undefined) {
          state.value = 'BUSY'

          timer = setTimeout(() => {
            pendingCommand.value = null
            state.value = 'ERROR'
            lastError.value = `Timeout waiting for: ${expectedResponse}`
            reject(new ResponseTimeoutError(lastError.value))
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

    for (let i = 0; i <= retries; i++) {
      try {
        return await attemptCommand()
      }
      catch (err) {
        const isLastAttempt = i === retries
        // Only retry if the error is specifically a Timeout
        const isTimeout = err instanceof ResponseTimeoutError

        // If it's the last try OR it's a non-timeout error (like Busy), fail now
        if (isLastAttempt || !isTimeout) {
          throw err
        }

        // If we got here, it's a timeout and we have retries left
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }

        console.warn(`Timeout waiting for: ${expectedResponse} after sending: ${cmd}. Retrying (${i + 1}/${retries})...`)
      }
    }

    throw new ResponseTimeoutError('Command failed after maximum retries')
  }

  return {
    state,
    lastError,
    sendCommand,
    receiveLine,
  }
}
