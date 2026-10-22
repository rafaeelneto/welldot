// Height of `WellDataGrid`: it grows with its rows, up to an optional cap.

/** Header row height in px. */
export const GRID_HEADER_H = 38;
/** Body row height in px (RevoGrid `row-size`). */
export const GRID_ROW_H = 30;

/**
 * Grid height in px for `rowCount` rows: header + rows (at least one) + 2px
 * of border, capped at `maxHeight` when given. Past the cap RevoGrid scrolls
 * and renders only the visible rows.
 */
export function gridHeight(rowCount: number, maxHeight?: number): number {
  const height = GRID_HEADER_H + Math.max(1, rowCount) * GRID_ROW_H + 2;
  return maxHeight ? Math.min(height, maxHeight) : height;
}
