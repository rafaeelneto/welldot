<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value?: unknown;
}>();

defineOptions({ inheritAttrs: false });

const hex = computed(() => (props.value as string) ?? '');
</script>

<template>
  <span class="flex h-full w-full items-center gap-1.5">
    <span
      class="inline-block h-3 w-3 shrink-0 rounded-sm border border-surface-300"
      :style="{ backgroundColor: hex }"
    />
    <span>{{ hex }}</span>
  </span>
</template>
