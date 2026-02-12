<script lang="ts" setup>

</script>

<template>
  <UCard
    class="grow bg-elevated"
    :ui="{
      root: 'flex flex-col',
      body: 'grow p-0 sm:p-0',
      header: 'p-2 sm:p-2 relative bg-default/75',
    }"
  >
    <template #header>
      <slot name="header" />
    </template>
    <div class="w-full h-full relative">
      <div class="absolute inset-0">
        <slot />
      </div>
    </div>
  </UCard>
</template>

<style></style>
