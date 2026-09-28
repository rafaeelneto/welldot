<script setup lang="ts">
import VGrid from '@revolist/vue3-datagrid';
import { useWellGridColumns } from '~/composables/useWellGridColumns';
import type { WellGridColumn } from '~/components/DataGrid/types';

// ─── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Reactive array from the store (via deep-proxy or plain copy). */
  rows: Record<string, unknown>[];
  columns: WellGridColumn[];
  /** Label for the add-row button */
  addLabel?: string;
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
      <ClientOnly>
        <VGrid
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

        <template #fallback>
          <div
            class="well-grid-skeleton animate-pulse rounded bg-surface-100 w-full h-full"
          />
        </template>
      </ClientOnly>
    </div>

    <Button
      unstyled
      class="well-grid-add-btn"
      type="button"
      :label="addLabel ?? 'Add row'"
      @click="emit('add')"
    >
      <template #icon>
        <Icon name="ph:plus" />
      </template>
    </Button>
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

<style>
/* ── RevoGrid → welldot theme ─────────────────────────────────────────────
   Token map: --font-mono, --color-surface-*, --color-content-*, --color-primary-*
   ────────────────────────────────────────────────────────────────────────── */

revogr-attribution {
  display: none !important;
}

revo-grid {
  --revo-grid-font: var(--font-mono);
  --revo-grid-background: var(--color-surface-0);
  --revo-grid-foreground: var(--color-content-0);
  --revo-grid-text: var(--color-content-0);
  --revo-grid-divider: var(--color-surface-200);
  --revo-grid-border: var(--color-surface-200);
  --revo-grid-header-bg: var(--color-surface-50);
  --revo-grid-header-color: var(--color-content-500);
  --revo-grid-header-border: var(--color-surface-200);
  --revo-grid-cell-border: var(--color-surface-200);
  --revo-grid-focused-bg: var(--accent-soft);
  --revo-grid-row-hover: var(--accent-soft);
  --revo-grid-row-headers-bg: var(--color-surface-50);
  --revo-grid-row-headers-color: var(--color-content-500);
  --revo-grid-cell-disabled-bg: var(--color-surface-100);
  --revo-grid-primary: var(--color-primary-500);
  --revo-grid-primary-transparent: var(--color-primary-soft);
  font-family: var(--font-mono) !important;
  font-size: 11px !important;
  color: var(--color-content-0);
  border: 1px solid var(--color-surface-200);
  border-radius: 8px;
  overflow: hidden;
}

/* Header cells — .rgHeaderCell (v4+) and .header-rgCell (older builds) */
revo-grid .rgHeaderCell,
revo-grid .header-rgCell {
  background: var(--color-surface-50);
  color: var(--color-content-500);
  font-weight: 400;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-surface-200) !important;
  border-right: none !important;
}

/* Body cells */
revo-grid .rgCell {
  border-bottom: 1px solid var(--color-surface-200) !important;
  border-right: none !important;
  padding: 0 8px;
  display: flex;
  align-items: center;
  color: var(--color-content-0);
}

/* Row states — --accent-soft is tuned for legibility in both light and dark */
revo-grid .rgRow:hover .rgCell {
  background: var(--accent-soft);
}

revo-grid .rgRow.focused-rgRow .rgCell,
revo-grid .rgRow[selected] .rgCell {
  background: var(--accent-soft);
}

/* Accent rail on first cell of selected row */
revo-grid .rgRow[selected] .rgCell:first-child {
  box-shadow: inset 3px 0 0 var(--color-primary-500);
}

/* Numeric columns — tabular figures, right-aligned */
revo-grid .rgCell.num {
  justify-content: flex-end;
  font-variant-numeric: tabular-nums;
}

/* Checkbox columns — readonly for RevoGrid, but interactive via the cell
   template, so suppress the default "disabled" overlay. */
revo-grid .rgCell.disabled.well-grid-checkbox-cell {
  background-color: transparent;
  --revo-grid-cell-disabled-bg: transparent;
}

revo-grid .rgRow:hover .rgCell.disabled.well-grid-checkbox-cell {
  background-color: var(--accent-soft);
}

/* ── PrimeVue cell editors ────────────────────────────────────────────────── */

/* Editor renders in revogr-edit which is a portal outside revo-grid */
revogr-edit input {
  font-family: var(--font-mono) !important;
  font-size: 11px !important;
  color: var(--color-content-0) !important;
}

/* InputText root IS the <input>; InputNumber pcInput root is also the <input> */
revo-grid .well-cell-input {
  width: 100%;
  height: 100%;
  border: none !important;
  border-radius: 0 !important;
  background: var(--color-surface-0) !important;
  box-shadow: inset 0 0 0 1.5px var(--color-focus-ring) !important;
  font-family: var(--font-mono) !important;
  font-size: 11px !important;
  color: var(--color-content-0) !important;
  padding: 0 8px !important;
  outline: none !important;
}

/* InputNumber wrapper div must fill the cell */
revo-grid .well-cell-input-number {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  text-align: right !important;
}

revogr-edit .well-cell-input-number input {
  text-align: right !important;
}

/* Numeric cells — right-align */
revo-grid .rgCell.num .well-cell-input {
  text-align: left;
}

/* Focus ring */
revo-grid .rgCell.focused-cell,
revo-grid revogr-focus {
  border-color: var(--color-primary-500) !important;
}

/* ── Drag column ─────────────────────────────────────────────────────────── */

revo-grid .well-grid-drag-cell {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

revo-grid .revo-drag-icon::before {
  content: '';
  display: block;
  width: 12px;
  height: 12px;
  color: var(--color-content-0);
  background-color: currentColor;
  mask-image: url('/drag-handle.svg');
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  opacity: 0.7;
  transition: opacity 200ms ease;
}

revo-grid .revo-draggable:hover .revo-drag-icon::before {
  opacity: 1;
}

/* ── Delete / actions column ─────────────────────────────────────────────── */

revo-grid .well-grid-delete-cell {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

revo-grid .well-grid-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-content-500);
  font-family: var(--font-mono);
  font-size: 18px;
  line-height: 1;
  opacity: 0.4;
  transition:
    opacity 200ms ease,
    color 200ms ease,
    background-color 200ms ease;
}

revo-grid .well-grid-delete-btn::before {
  content: '×';
  display: block;
}

revo-grid .well-grid-delete-btn:hover {
  opacity: 1;
  color: oklch(50% 0.2 25);
  background-color: color-mix(in srgb, oklch(50% 0.2 25) 8%, transparent);
}

/* ── PrimeVue Select editor (enum columns) ───────────────────────────────── */

revogr-edit .well-cell-select.p-select {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  background: var(--color-surface-0);
  box-shadow: inset 0 0 0 1.5px var(--color-focus-ring);
  font-family: var(--font-mono);
  font-size: 11px;
}

revogr-edit .well-cell-select .p-select-label {
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-content-0);
}

revogr-edit .well-cell-select .p-select-dropdown {
  width: 24px;
  color: var(--color-content-500);
}

revogr-edit .well-cell-texture-select .p-select-label {
  padding: 0 4px;
}

/* ── Combo editor (free text + suggestions) ──────────────────────────────── */

revogr-edit .well-cell-combo {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  background: var(--color-surface-0);
  box-shadow: inset 0 0 0 1.5px var(--color-focus-ring);
}

revogr-edit .well-cell-combo-input {
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-content-0);
}

revogr-edit .well-cell-combo-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-content-500);
}

.well-combo-panel {
  position: fixed;
  z-index: 1100;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: var(--p-select-list-padding, 0.25rem);
  list-style: none;
  background: var(--p-select-overlay-background, var(--color-surface-0));
  border: 1px solid
    var(--p-select-overlay-border-color, var(--color-surface-200));
  border-radius: var(--p-select-overlay-border-radius, 0.75rem);
  box-shadow: var(--p-select-overlay-shadow);
  color: var(--p-select-overlay-color, var(--color-content-0));
}

.well-combo-option {
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--p-select-option-border-radius, 0.25rem);
  color: var(--p-select-option-color, var(--color-content-0));
}

.well-combo-option.is-active {
  background: var(--p-select-option-focus-background, var(--color-surface-100));
  color: var(--p-select-option-focus-color, var(--color-content-0));
}

.well-combo-option.is-selected {
  background: var(--p-select-option-selected-background);
  color: var(--p-select-option-selected-color);
}

.well-combo-option.is-selected.is-active {
  background: var(--p-select-option-selected-focus-background);
  color: var(--p-select-option-selected-focus-color);
}

/* ── Color editor trigger ─────────────────────────────────────────────────── */

revogr-edit .well-cell-color-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 0 8px;
  box-shadow: inset 0 0 0 1.5px var(--color-focus-ring);
  background: var(--color-surface-0);
}

.well-cell-color-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 3px;
  border: 1px solid var(--color-surface-300);
}

.well-cell-color-hex {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-content-0);
}

/* ── Add-row button ──────────────────────────────────────────────────────── */

.well-grid-add-btn {
  align-self: flex-start;
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;

  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);

  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.well-grid-add-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.well-grid-add-btn:active {
  transform: translateY(0.5px);
}

.well-grid-add-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-soft);
  border-color: var(--color-primary-500);
}
</style>
