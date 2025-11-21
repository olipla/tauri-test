export function useTerminalPane() {
  const panePercent = ref(33)

  interface PaneEvent {
    panes: {
      min: number
      max: number
      size: number
    }[]
  }

  function updatePanePercent(event: PaneEvent) {
    if (event.panes[1]) {
      panePercent.value = event.panes[1].size
    }
  }

  const terminalPaneSize = computed(() => {
    if (panePercent.value > 99.9) {
      return 99.9
    }
    else if (panePercent.value < 0.1) {
      return 0.1
    }
    else {
      return panePercent.value
    }
  })

  const bodyPaneSize = computed(() => {
    if (panePercent.value > 99.9) {
      return 0.1
    }
    else if (panePercent.value < 0.1) {
      return 99.9
    }
    else {
      return 100 - panePercent.value
    }
  })

  const terminalPaneVisible = ref(false)

  function closeTerminalPane() {
    terminalPaneVisible.value = false
  }

  function openTerminalPane() {
    panePercent.value = 33
    terminalPaneVisible.value = true
  }

  const isTerminalMaximised = computed(() => {
    return terminalPaneSize.value >= 90
  })

  function toggleMaximisePane() {
    if (isTerminalMaximised.value) {
      openTerminalPane()
    }
    else {
      panePercent.value = 100
    }
  }

  function toggleTerminalPane() {
    if (terminalPaneVisible.value) {
      closeTerminalPane()
    }
    else {
      openTerminalPane()
    }
  }

  defineShortcuts({
    meta_t: () => {
      toggleTerminalPane()
    },
  })

  return { updatePanePercent, bodyPaneSize, toggleTerminalPane, terminalPaneVisible, terminalPaneSize, isTerminalMaximised, closeTerminalPane, toggleMaximisePane }
}
