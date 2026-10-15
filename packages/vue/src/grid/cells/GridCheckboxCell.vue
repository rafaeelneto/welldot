<script setup lang="ts">
import Checkbox from 'primevue/checkbox';

const props = defineProps<{
  value?: unknown;
  rowIndex: number;
  prop: string;
  onToggle: (rowIndex: number, prop: string, value: boolean) => void;
}>();

defineOptions({ inheritAttrs: false });

function handleChange(checked: boolean) {
  props.onToggle(props.rowIndex, props.prop, checked);
}
</script>

<template>
  <span
    class="flex h-full w-full items-center justify-center"
    @click.stop
    @mousedown.stop
  >
    <Checkbox
      :model-value="!!value"
      binary
      @update:model-value="handleChange"
    />
  </span>
</template>
