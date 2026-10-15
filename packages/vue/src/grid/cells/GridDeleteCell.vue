<script setup lang="ts">
/**
 * Delete column cell: renders the `deleteButton` part (resolved by the
 * column builder) with the `WellDeleteButtonProps` contract and asks the grid
 * to delete the row on its `click`.
 */
import type { Component } from 'vue';

const props = defineProps<{
  rowIndex: number;
  model: Record<string, unknown>;
  part: Component;
  label?: string;
  requestDelete: (rowIndex: number, model: Record<string, unknown>) => void;
}>();

defineOptions({ inheritAttrs: false });

function handleClick(e?: unknown) {
  // A native click (default part, or a part whose root gets the listener)
  // must not reach the grid, which would treat it as a cell click.
  if (e instanceof Event) e.stopPropagation();
  props.requestDelete(props.rowIndex, props.model);
}
</script>

<template>
  <component
    :is="part"
    :index="rowIndex"
    :row="model"
    :label="label"
    @click="handleClick"
  />
</template>
