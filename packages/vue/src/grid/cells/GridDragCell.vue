<script setup lang="ts">
/**
 * Drag column cell, used only when a `dragHandle` part is given. A column
 * `cellTemplate` replaces RevoGrid's built-in handle, so this re-creates it:
 * the same `.revo-draggable` wrapper, and on mousedown the same bubbling
 * `dragstartcell` event the built-in handle emits (RevoGrid's row-order
 * editor only reads `originalEvent` from it).
 */
import { ref, type Component } from 'vue';

const props = defineProps<{
  part: Component;
  prop?: unknown;
  model?: Record<string, unknown>;
  column?: unknown;
  rowIndex?: number;
  colIndex?: number;
  colType?: unknown;
  type?: unknown;
  data?: unknown;
}>();

defineOptions({ inheritAttrs: false });

const root = ref<HTMLElement | null>(null);

function onMousedown(originalEvent: MouseEvent) {
  root.value?.dispatchEvent(
    new CustomEvent('dragstartcell', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        originalEvent,
        model: {
          prop: props.prop,
          model: props.model,
          column: props.column,
          rowIndex: props.rowIndex,
          colIndex: props.colIndex,
          colType: props.colType,
          type: props.type,
          data: props.data,
        },
      },
    }),
  );
}
</script>

<template>
  <span ref="root" class="revo-draggable" @mousedown="onMousedown">
    <component :is="part" />
  </span>
</template>
