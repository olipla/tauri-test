import type { DeviceRegexs } from '~/types/jellyfishBridge'

export function useSerialRegexMatcher(lineRegexs: DeviceRegexs, partialLineRegexs: DeviceRegexs, recentHistoryLength = 10) {
  const recentLineHistory = ref<string[]>([])

  function matchLine(line: string, lineRegexs: DeviceRegexs) {
    for (const [name, value] of Object.entries(lineRegexs)) {
      const match = value.regex.exec(line)
      if (match && match.length) {
        console.log('Matched ', name)
        value.onMatch(line, match)
        break
      }
    }
  }

  function updateRecentLineHistory(line: string) {
    recentLineHistory.value.unshift(line)
    recentLineHistory.value.splice(recentHistoryLength)
  }

  async function serialLineCallback(line: string) {
    matchLine(line, lineRegexs)
    updateRecentLineHistory(line)
  }

  function serialPartialLineCallback(partialLine: string) {
    matchLine(partialLine, partialLineRegexs)
  }

  return { serialLineCallback, serialPartialLineCallback }
}
