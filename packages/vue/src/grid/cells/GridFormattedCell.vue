<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value?: unknown;
  model: Record<string, unknown>;
  formatter: (value: unknown, row: Record<string, unknown>) => string;
}>();

defineOptions({ inheritAttrs: false });

const text = computed(() => props.formatter(props.value, props.model));
</script>

<template>
  <span class="flex h-full w-full items-center">{{ text }}</span>
</template>
