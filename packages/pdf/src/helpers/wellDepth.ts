import type { Well } from '@welldot/core';

/**
 * Deepest recorded point across a well's constructive arrays only — not
 * geologic (lithology/fractures/caves can extend past the actual
 * constructed well and would overstate it). Mirrors `calculatedWellDepth`
 * in `@welldot/core`'s `well.utils.ts`; kept separate because the app needs
 * it wherever `well_depth`'s calculated fallback is shown or auto-tracked,
 * distinct from `profileStore.maxDepth` (which intentionally includes
 * geology, for the SVG profile's render scale).
 */
export function calculatedWellDepth(well: Well): number {
  const lastTo = (items: { to: number }[]): number =>
    items.length ? items[items.length - 1]!.to : 0;

  return Math.max(
    0,
    lastTo(well.bore_hole),
    lastTo(well.hole_fill),
    lastTo(well.reduction),
    lastTo(well.surface_case),
    lastTo(well.well_case),
    lastTo(well.well_screen),
  );
}
