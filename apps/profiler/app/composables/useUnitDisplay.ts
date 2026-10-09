import { useWellUnits, type DisplayUnitType } from '@welldot/vue';

export type { DisplayUnitType } from '@welldot/vue';

/**
 * Canonical ↔ display conversion for one quantity, following the unit the
 * user picked in Settings. `.well` files always store SI (m, mm, m³/h, kW, m³);
 * this only changes what the UI shows and accepts.
 *
 * Thin wrapper over `@welldot/vue`'s `useWellUnits`; the display units reach
 * it from the UI store through `plugins/03.welldot.ts`.
 */
export function useUnitDisplay(unitType: DisplayUnitType) {
  return useWellUnits(unitType);
}
