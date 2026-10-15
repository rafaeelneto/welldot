<script setup lang="ts">
import Select from 'primevue/select';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useGridOverlayFocusGuard } from '../composables/useGridOverlayFocusGuard';
import type { ResolvedGridOption } from '../types';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
  options: ResolvedGridOption[];
}>();

defineOptions({ inheritAttrs: false });

const selectRef = ref<InstanceType<typeof Select> | null>(null);
const overlayFocusGuard = useGridOverlayFocusGuard();

// Deprecated entries aren't offered, unless it's the current value.
const choices = computed(() =>
  props.options.filter(o => !o.deprecated || o.value === props.val),
);

onMounted(() => nextTick(() => selectRef.value?.show()));

function onSelect(value: unknown) {
  props.save(value);
  props.close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    props.close();
  }
}
</script>

<template>
  <Select
    ref="selectRef"
    :model-value="val"
    :options="choices"
    option-label="label"
    option-value="value"
    append-to="body"
    :filter="choices.length > 8"
    :pt="{
      root: 'well-cell-select',
      label: 'flex items-center',
      option: 'text-sm p-1',
      overlay: () => overlayFocusGuard,
    }"
    @update:model-value="onSelect"
    @keydown="onKeydown"
  />
</template>
