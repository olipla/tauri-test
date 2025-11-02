<script lang="ts" setup>

</script>

<template>
  <div class="flex flex-col">
    <div class="flex bg-elevated items-center">
      <div class="grow pl-2 p-1 flex items-center gap-2">
        <div class="rounded-full bg-red-400 w-4 h-4" />
        <div class="font-semibold">
          COM15 (9600)
        </div>
      </div>

      <div class="p-1 px-2">
        <UButton icon="i-lucide-settings" variant="ghost" />
      </div>
      <div class="flex gap-1 border-l-2 border-muted p-1 px-2">
        <UButton icon="i-lucide-expand" variant="ghost" />
        <UButton icon="i-lucide-x" variant="ghost" />
      </div>
    </div>
    <div>
      Terminal
    </div>
  </div>
</template>

<style></style>
