<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import { computed } from 'vue';
import type { ResolvedGridOption } from '../types';

const props = defineProps<{
  value?: unknown;
  rowIndex: number;
  prop: string;
  options: ResolvedGridOption[];
  onChange: (rowIndex: number, prop: string, value: unknown) => void;
}>();

defineOptions({ inheritAttrs: false });

// Deprecated entries aren't offered, unless it's the current value.
const choices = computed(() =>
  props.options.filter(o => !o.deprecated || o.value === props.value),
);

function handleChange(newValue: string) {
  props.onChange(props.rowIndex, props.prop, newValue);
}
</script>

<template>
  <span
    class="flex h-full w-full items-center justify-center px-0"
    @click.stop
    @mousedown.stop
  >
    <SelectButton
      :model-value="value"
      :options="choices"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      size="small"
      :pt="{
        root: 'inline-flex items-center bg-surface-100 rounded-full p-0.5 gap-0.5',
        pcToggleButton: {
          root: 'font-mono text-[10px] h-5 p-0 focus-visible:ring-offset-1 border-none bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          content: ({ context }: { context: { active?: boolean } }) => {
            return [
              'inline-flex items-center gap-1.5 px-4 py-0 rounded-full text-[13px] font-medium font-display',
              'transition-all duration-200 px-1',
              context.active
                ? 'bg-content-0 text-surface-0 shadow-sm'
                : 'bg-transparent text-content-400 hover:text-content-200',
            ];
          },
        },
      }"
      @update:model-value="handleChange"
    />
  </span>
</template>
