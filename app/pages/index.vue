<script lang="ts" setup>
const items = ref(['Backlog', 'Todo', 'In Progress', 'Done'])
const value = ref('Backlog')
</script>

<template>
  <div>
    <h1>Hello!</h1>
    <USelectMenu v-model="value" :items="items" />
  </div>
</template>

<style>

</style>
