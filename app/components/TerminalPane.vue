<script lang="ts" setup>
</script>

<template>
  <div class="flex flex-col">
    <div class="flex bg-elevated items-center">
      <div class="grow pl-2 p-1 flex items-center gap-2">
        <div class="rounded-full bg-red-400 w-3 h-3" />
        <div class="font-semibold text-sm">
          COM15 (9600)
        </div>
      </div>
      <div class="flex gap-1 p-1">
        <UButton icon="i-lucide-settings" variant="ghost" />
        <UButton icon="i-lucide-expand" variant="ghost" />
        <UButton icon="i-lucide-x" variant="ghost" />
      </div>
    </div>
    <div class="w-full grow bg-elevated">
      <SerialTerminal />
    </div>
  </div>
</template>

<style></style>
