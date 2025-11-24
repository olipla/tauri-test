<script lang="ts" setup>
import type { Status } from '~/types/common'

const props = withDefaults(defineProps<{
  title?: string
  status?: Status
  showSettings?: boolean
}>(), {
  showSettings: true,
})

const emit = defineEmits<{
  (e: 'settings'): void
}>()
</script>

<template>
  <UCard class="w-64 h-28 shrink-0 bg-elevated" :class="{ 'cursor-pointer': props.showSettings && props.title !== undefined, 'hover:bg-elevated/50': props.showSettings && props.title !== undefined }" :ui="{ body: `p-2 sm:p-2 !pt-1 h-16 flex ${title === undefined ? 'min-h-full' : ''}`, header: 'p-2 sm:p-2' }">
    <template v-if="props.title !== undefined" #header>
      <div class="flex gap-2 items-center">
        <div class="flex gap-2 items-center grow">
          <div
            v-if="props.status !== undefined"
            class="w-5 h-5 rounded-md"
            :class="{
              'dark:bg-red-400': props.status === 'error',
              'bg-red-500': props.status === 'error',
              'dark:bg-green-400': props.status === 'ok',
              'bg-green-500': props.status === 'ok',
            }"
          />
          <h1 class="text-lg">
            {{ props.title }}
          </h1>
        </div>
        <div class="flex gap-2 items-center">
          <UButton v-if="props.showSettings" icon="i-lucide-settings" variant="ghost" color="neutral" class="cursor-pointer" @click="emit('settings')" />
        </div>
      </div>
    </template>
    <template #default>
      <slot />
    </template>
  </UCard>
</template>

<style></style>
