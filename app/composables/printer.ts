import type { PrinterShortSummary } from '~/lib/tauriPrint'
import { getPrinter, printData as printDataTauri } from '~/lib/tauriPrint'

export function usePrinter() {
  const configuredName = ref<string | undefined>()

  const configuredStatus = ref<PrinterShortSummary | undefined>()
  const configuredError = ref<string | undefined>()

  async function pollStatus() {
    if (configuredName.value) {
      try {
        configuredStatus.value = await getPrinter(configuredName.value)
        configuredError.value = undefined
      }
      catch (error) {
        configuredError.value = String(error)
      }
    }
  }

  const { pause: pauseStatusPoll, resume: resumeStatusPoll } = useIntervalFn(async () => {
    await pollStatus()
  }, 2000)

  watch(configuredName, (newName) => {
    if (newName) {
      pollStatus()
      resumeStatusPoll()
    }
    else {
      pauseStatusPoll()
    }
  }, {
    immediate: true,
  })

  async function printData(data: string) {
    if (configuredName.value) {
      return await printDataTauri(configuredName.value, data)
    }
  }

  return { configuredName, configuredStatus, printData }
}
