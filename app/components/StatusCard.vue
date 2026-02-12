<script lang="ts" setup>
export interface Issue {
  title: string
  description: string
}

const props = defineProps<{
  issues: Issue[]
}>()

const issueIndex = ref(0)

function increaseIndex() {
  const nextIndex = issueIndex.value + 1
  if (nextIndex > props.issues.length - 1) {
    issueIndex.value = 0
  }
  else {
    issueIndex.value = nextIndex
  }
}

function decreaseIndex() {
  const nextIndex = issueIndex.value - 1
  if (nextIndex < 0) {
    issueIndex.value = props.issues.length - 1
  }
  else {
    issueIndex.value = nextIndex
  }
}

watch(() => props.issues, () => {
  console.log('props issue change')
  issueIndex.value = 0
})

const currentIssue = computed(() => {
  return props.issues[issueIndex.value]
})

const icon = computed(() => {
  if (props.issues.length > 0) {
    return 'i-lucide-x'
  }
  return 'i-lucide-check'
})
</script>

<template>
  <CommonCard>
    <div class="flex gap-3 min-h-full relative">
      <div
        class="absolute top-[-20px] bottom-[-20px] left-[-20px] right-[-20px] flex items-center justify-center text-4xl bg-default/80 z-10 hover:opacity-0"
      >
        W.I.P
      </div>
      <div class="h-full flex items-center ">
        <UIcon
          :name="icon"
          class="size-15"
          :class="{
            'dark:bg-red-400': props.issues.length > 0,
            'bg-red-500': props.issues.length > 0,
            'dark:bg-green-400': props.issues.length === 0,
            'bg-green-500': props.issues.length === 0,
          }"
        />
      </div>
      <div class="border-muted border self-stretch" />
      <div class="flex flex-col">
        <div class="flex flex-col grow">
          <div class="text-lg py-0.5">
            {{ currentIssue?.title ?? 'System OK' }}
          </div>
          <div class="flex text-base grow items-center">
            {{ currentIssue?.description ?? 'No problems detected' }}
          </div>
        </div>
        <div
          v-if="issues.length > 1"
          class="flex gap-2 items-center"
        >
          <div class="text-sm text-muted grow">
            Issue {{ issueIndex + 1 }} of {{ props.issues.length }}
          </div>
          <div class="flex">
            <UButton
              icon="i-lucide-chevron-left"
              variant="ghost"
              :ui="{ base: 'p-0' }"
              @click="decreaseIndex"
            />
            <UButton
              icon="i-lucide-chevron-right"
              variant="ghost"
              :ui="{ base: 'p-0' }"
              @click="increaseIndex"
            />
          </div>
        </div>
      </div>
    </div>
  </CommonCard>
</template>

<style></style>
