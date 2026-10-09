<script setup lang="ts">
/**
 * Editable spreadsheet for a well feature array (lithology, casing, screens…)
 * built on RevoGrid. Controlled: the grid never mutates `rows`, it emits
 * `add` / `delete` / `change` / `reorder` and the parent updates its store.
 *
 * - Columns are `WellGridColumn`s; their text is `LanguageTextInput`,
 *   resolved for the configured locale. Unit columns follow the configured
 *   display units.
 * - Parts (`components` prop, then `createWelldot({ components })`, then the
 *   built-in default): `addButton` (`WellAddButtonProps`), `deleteButton`
 *   (`WellDeleteButtonProps`), `dragHandle` (visual only).
 * - Rendered on the client only (after mount); a skeleton shows until then.
 * - Needs `@welldot/vue/tailwind.css` (which imports `grid.css`) for the
 *   RevoGrid theme.
 */
import { VGrid } from '@revolist/vue3-datagrid';
import type { LanguageTextInput } from '@welldot/core';
import { computed, onMounted, ref } from 'vue';
import { useWellText } from '../composables/useWellText';
import { resolvePart, useWelldotConfig } from '../config';
import WellGridAddButton from './parts/WellGridAddButton.vue';
import type {
  WellDataGridComponents,
  WellDataGridLabels,
  WellGridColumn,
} from './types';
import { useWellGridColumns } from './useWellGridColumns';

// ─── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Reactive array from the store (via deep-proxy or plain copy). */
  rows: Record<string, unknown>[];
  columns: WellGridColumn[];
  /** Label of the add-row button. Icon-only when omitted. */
  addLabel?: LanguageTextInput;
  /** Label handed to the delete-row button (its aria-label by default). */
  deleteLabel?: LanguageTextInput;
  /** Grid-internal text (texture editor, column info trigger). */
  labels?: WellDataGridLabels;
  /** Part overrides: `addButton`, `deleteButton`, `dragHandle`. */
  components?: WellDataGridComponents;
}>();

const emit = defineEmits<{
  /** Parent should push a new row to the store */
  add: [];
  /** Parent should splice row at `index` from the store */
  delete: [index: number];
  /** Parent should assign `value` to `store.array[index][prop]` */
  change: [index: number, prop: string, value: unknown];
  /** Parent should reorder row from `from` to `to` */
  reorder: [from: number, to: number];
}>();

const config = useWelldotConfig();
const text = useWellText();

const {
  gridEditors,
  revoColumns,
  gridStretch,
  plugins,
  handleAfterEdit,
  gridContainerRef,
  handleAfterFocus,
  handleGridMousedown,
  handleGridClick,
} = useWellGridColumns({
  columns: () => props.columns,
  onDelete: rowIndex => emit('delete', rowIndex),
  onChange: (rowIndex, prop, value) => emit('change', rowIndex, prop, value),
  deleteLabel: () => props.deleteLabel,
  labels: () => props.labels,
  components: () => props.components,
});

const addButton = computed(() =>
  resolvePart(
    'addButton',
    props.components?.addButton,
    WellGridAddButton,
    config,
  ),
);

// ─── Client-only rendering ────────────────────────────────────────────────────
// RevoGrid is a web component; render it only once mounted in the browser.

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

// ─── Source ───────────────────────────────────────────────────────────────────
// Spread to a plain array so RevoGrid's internal diffing does not fight the
// Immer/deep-proxy wrapper on the store.

const gridSource = computed(() => props.rows.map(r => ({ ...r })));

// ─── Height — auto-size based on row count ────────────────────────────────────

const HEADER_H = 38;
const ROW_H = 30;

const gridHeight = computed(() => {
  const contentH = Math.max(1, props.rows.length) * ROW_H;
  return `${HEADER_H + contentH + 2}px`;
});

// ─── Event handlers ───────────────────────────────────────────────────────────

function handleRowOrderChanged(
  event: CustomEvent<{ from: number; to: number }>,
) {
  emit('reorder', event.detail.from, event.detail.to);
}
</script>

<template>
  <div class="well-data-grid-wrapper flex flex-col">
    <div
      v-show="rows.length > 0"
      ref="gridContainerRef"
      class="well-grid-container"
      @mousedown.capture="handleGridMousedown"
      @click="handleGridClick"
    >
      <VGrid
        v-if="mounted"
        class="well-data-grid"
        :style="{ height: gridHeight }"
        :row-size="ROW_H"
        :stretch="gridStretch"
        :source="gridSource"
        :columns="revoColumns"
        :editors="gridEditors"
        :plugins="plugins"
        :range="true"
        can-drag
        theme="compact"
        @afteredit="handleAfterEdit"
        @afterfocus="handleAfterFocus"
        @roworderchanged="handleRowOrderChanged"
      />
      <div
        v-else
        class="well-grid-skeleton animate-pulse rounded bg-surface-100 w-full h-full"
      />
    </div>

    <component
      :is="addButton"
      :label="text(props.addLabel)"
      @click="emit('add')"
    />
  </div>
</template>

<style scoped>
.well-data-grid-wrapper {
  --accent-soft: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
  --color-primary-soft: color-mix(
    in srgb,
    var(--color-primary-500) 25%,
    transparent
  );
}

.well-data-grid :deep(.header-rgRow) {
  height: v-bind('`${HEADER_H}px`');
}
</style>
