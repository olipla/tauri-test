<script lang="ts" setup>
import { Pane, Splitpanes } from 'splitpanes'
</script>

<template>
  <div class="w-full h-full">
    <Splitpanes class="w-full h-full">
      <Pane min-size="20">
        1
      </Pane>
      <Pane>
        <Splitpanes horizontal>
          <Pane>2</Pane>
          <Pane>3</Pane>
          <Pane>4</Pane>
        </Splitpanes>
      </Pane>
      <Pane>5</Pane>
    </Splitpanes>
  </div>
</template>

<style></style>
