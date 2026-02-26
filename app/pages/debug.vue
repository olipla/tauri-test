<script lang="ts" setup>
const jellyfishFlashAutomation = useJellyfishFlashAutomation()

onMounted(() => {
  jellyfishFlashAutomation.serialOpen({
    path: 'COM8',
    baudRate: 9600,
  })
})
</script>

<template>
  <div class="p-8">
    <ul>
      <li>{{ STAGE[jellyfishFlashAutomation.stage.value] }}</li>
    </ul>
    <!-- <UProgress ></UProgress> -->
  </div>
</template>

<style></style>
