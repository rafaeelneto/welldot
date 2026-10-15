<script setup lang="ts">
import { computed } from 'vue';
import type { ResolvedGridOption } from '../types';

const props = defineProps<{
  value?: unknown;
  options: ResolvedGridOption[];
}>();

defineOptions({ inheritAttrs: false });

const label = computed(() => {
  const match = props.options.find(o => o.value === props.value);
  return match?.label ?? String(props.value ?? '');
});
</script>

<template>
  <span class="flex h-full w-full items-center">{{ label }}</span>
</template>
