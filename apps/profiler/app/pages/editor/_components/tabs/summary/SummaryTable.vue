<script setup lang="ts">
export type SummaryColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  lead?: boolean;
};

export type SummaryRow = {
  cells: Record<string, string>;
  /** Lithology fill color, rendered as a dot before the lead cell. */
  color?: string;
};

export type SummaryGroup = {
  rows: SummaryRow[];
  total?: {
    label: string;
    value: string;
    /** Number of columns the label cell spans (all but the value column). */
    colspan: number;
  };
};

const props = defineProps<{
  columns: SummaryColumn[];
  groups: SummaryGroup[];
}>();

const visibleGroups = computed(() =>
  props.groups.filter(g => g.rows.length > 0),
);

function isLastRow(groupIndex: number, rowIndex: number) {
  const group = visibleGroups.value[groupIndex];
  if (!group) return false;
  if (group.total) return false;
  return (
    groupIndex === visibleGroups.value.length - 1 &&
    rowIndex === group.rows.length - 1
  );
}
</script>

<template>
  <table
    class="w-full overflow-hidden rounded-lg border border-surface-200 font-mono text-[11px]"
  >
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-left font-medium tracking-[0.06em] text-[9.5px] uppercase text-content-300"
          :class="{ 'text-right': col.align === 'right' }"
        >
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="(group, groupIndex) in visibleGroups" :key="groupIndex">
        <tr v-for="(row, rowIndex) in group.rows" :key="rowIndex">
          <td
            v-for="(col, colIndex) in columns"
            :key="col.key"
            class="border-b border-surface-200 px-3 py-2 tabular-nums text-content-0"
            :class="[
              col.align === 'right' ? 'text-right' : 'text-left',
              col.lead ? 'font-medium' : '',
              isLastRow(groupIndex, rowIndex) ? 'border-b-0' : '',
            ]"
          >
            <span
              v-if="colIndex === 0 && row.color"
              class="mr-2 inline-block size-2.5 rounded-full border border-surface-200 align-middle"
              :style="{ background: row.color }"
            />
            {{ row.cells[col.key] }}
          </td>
        </tr>
        <tr v-if="group.total" class="bg-primary-50 dark:bg-primary-500/10">
          <td
            :colspan="group.total.colspan"
            class="border-t border-surface-200 px-3 py-2 font-sans text-xs font-medium text-content-0"
          >
            {{ group.total.label }}
          </td>
          <td
            class="border-t border-surface-200 px-3 py-2 text-right font-mono text-[11px] text-primary-600 dark:text-primary-400"
          >
            {{ group.total.value }}
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
