<script lang="ts" setup>
import { vElementSize } from '@vueuse/components'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

const terminalDiv = useTemplateRef('terminalDiv')

const terminal = new Terminal({
    theme: {
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

    },
})
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
        <div ref="terminalDiv" v-element-size="terminalResize" class="absolute inset-0 flex flex-col justify-end" />
    </div>
</template>

<style></style>
