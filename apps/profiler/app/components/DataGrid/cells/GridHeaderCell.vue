<script setup lang="ts">
defineProps<{
  name?: string;
  info?: string;
}>();
</script>

<template>
  <span class="inline-flex items-center gap-1 min-w-0">
    <span class="truncate">{{ name }}</span>
    <span
      v-if="info"
      class="inline-flex shrink-0 normal-case tracking-normal"
      @click.stop
      @mousedown.stop
    >
      <InfoPopover :info="info" />
    </span>
  </span>
</template>
