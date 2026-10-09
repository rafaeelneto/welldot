// `@welldot/vue/grid` — RevoGrid-based editable data grid.
// `@revolist/vue3-datagrid` / `@revolist/revogrid` (and `vue-color`, for the
// colour editor) are optional peers needed only by this entry. The RevoGrid
// theme is `grid.css`, imported by `@welldot/vue/tailwind.css`.

export { columnStretchPlugin } from './columnStretchPlugin';
export { useWellGridColumns } from './useWellGridColumns';
export type { UseWellGridColumnsOptions } from './useWellGridColumns';
/** Editable spreadsheet of a well feature array (`WellGridColumn`s, parts, labels). */
export { default as WellDataGrid } from './WellDataGrid.vue';

export type {
  WellAddButtonProps,
  WellDeleteButtonProps,
  WellDragHandleProps,
} from '../types';
export type {
  WellDataGridComponents,
  WellDataGridLabels,
  WellGridColumn,
  WellGridColumnBase,
  WellGridColumnType,
  WellGridOption,
} from './types';
