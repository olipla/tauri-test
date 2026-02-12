<script lang="ts" setup>
import type { ITheme } from '@xterm/xterm'
import { vElementSize } from '@vueuse/components'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

const terminalDiv = useTemplateRef('terminalDiv')

const darkTheme: ITheme = {
  black: '#000000',
  red: '#ff5360',
  green: '#59d499',
  yellow: '#ffc531',
  blue: '#56c2ff',
  magenta: '#cf2f98',
  cyan: '#52eee5',
  white: '#ffffff',
  brightBlack: '#000000',
  brightRed: '#ff6363',
  brightGreen: '#59d499',
  brightYellow: '#ffc531',
  brightBlue: '#56c2ff',
  brightMagenta: '#cf2f98',
  brightCyan: '#52eee5',
  brightWhite: '#ffffff',
  background: '#292524',
  foreground: '#ffffff',
  selectionBackground: '#333333',
  cursor: '#cccccc',
}

const lightTheme: ITheme = {
  black: '#000000',
  red: '#b12424',
  green: '#006b4f',
  yellow: '#f8a300',
  blue: '#138af2',
  magenta: '#9a1b6e',
  cyan: '#3eb8bf',
  white: '#ffffff',
  brightBlack: '#000000',
  brightRed: '#b12424',
  brightGreen: '#006b4f',
  brightYellow: '#f8a300',
  brightBlue: '#138af2',
  brightMagenta: '#9a1b6e',
  brightCyan: '#3eb8bf',
  brightWhite: '#ffffff',
  background: '#f6f5f5',
  foreground: '#000000',
  selectionBackground: '#e5e5e5',
  cursor: '#000000',
}

const terminal = new Terminal({
  theme: darkTheme,
  fontFamily: 'Consolas',
})

const colourMode = useColorMode()

watch(colourMode, (newColourMode) => {
  if (newColourMode.value === 'light') {
    terminal.options.theme = lightTheme
  }
  else if (newColourMode.value === 'dark') {
    terminal.options.theme = darkTheme
  }
}, { immediate: true })

const fitAddon = new FitAddon()

terminal.loadAddon(fitAddon)

function terminalResize() {
  fitAddon.fit()
}

watch(terminalDiv, () => {
  if (terminalDiv.value) {
    terminal.open(terminalDiv.value)
    fitAddon.fit()
  }
}, { immediate: true })

defineExpose({ terminal })
</script>

<template>
  <div class="w-full h-full relative">
    <div
      ref="terminalDiv"
      v-element-size="terminalResize"
      class="absolute inset-0 flex flex-col justify-end"
    />
  </div>
</template>

<style></style>
