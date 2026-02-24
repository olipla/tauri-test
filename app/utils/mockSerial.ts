export function createMockDevice(onData: (line: string) => void) {
  return (cmd: string) => {
    console.log(`[Mock Device] Received: ${cmd}`)

    // Simulate hardware processing delay
    setTimeout(() => {
      if (cmd === 'AT') {
        onData('OK')
      }
      else if (cmd === 'GET_VERSION') {
        onData('V1.0.4')
      }
      else {
        onData('ERROR: Unknown Command')
      }
    }, 500) // 500ms lag
  }
}
