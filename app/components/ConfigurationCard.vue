<script lang="ts" setup>
const props = defineProps<{
  source?: string
  size?: number
  filter?: string
  configured?: number
}>()
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <CommonCard
        title="Configuration"
        status="error"
      />
    </template>
    <CommonCard
      :status="!props.source || !props.size ? 'error' : 'ok'"
      title="Configuration"
    >
      <div
        v-if="!props.source || !props.size"
        class="flex justify-center items-center w-full"
      >
        <div class="flex flex-col grow items-center justify-center gap-1 w-full">
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-6"
          />
          <div>
            Not configured
          </div>
        </div>
      </div>
      <div
        v-else
        class="flex gap-3"
      >
        <div class="flex gap-2">
          <div class="flex flex-col gap-1 ">
            <div class="font-bold">
              {{ props.source }}
            </div>
            <div class="bg-accented px-1 rounded-sm">
              x{{ props.size }}
            </div>
          </div>
        </div>
        <div class="border-muted border self-stretch" />
        <div class="flex flex-col grow justify-center">
          <div class="text-ellipsis overflow-hidden leading-4.5 line-clamp-2">
            {{ props.filter ?? '' }}
          </div>
          <div class="text-xs text-muted">
            {{ props.configured ?? 0 }} Configured
          </div>
        </div>
      </div>
    </CommonCard>
  </ClientOnly>
</template>

<style></style>
