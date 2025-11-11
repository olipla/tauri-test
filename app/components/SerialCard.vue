<script lang="ts" setup>
</script>

<template>
  <CommonCard status="error" title="Serial">
    <div class="flex gap-3">
      <div class="flex gap-2">
        <div class="flex flex-col gap-1 ">
          <div class="flex items-center justify-center h-full w-4 rounded-sm bg-accented text-xs text-black/65">
            R
          </div>
          <div class="flex items-center justify-center h-full w-4 rounded-sm bg-accented text-xs text-black/65  ">
            T
          </div>
        </div>
        <div class="flex flex-col gap-1 ">
          <div class="font-bold">
            COM4
          </div>
          <div>
            9600
          </div>
        </div>
      </div>
      <div class="border-muted border self-stretch" />
      <div class="flex flex-col gap-1">
        <div>USB Serial Port</div>
        <div>FTDXQ43XA</div>
      </div>
    </div>
  </CommonCard>
</template>

<style>

</style>
