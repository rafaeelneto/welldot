import {
  feetToMeters,
  flowFromCanonical,
  flowToCanonical,
  inchesToMm,
  metersToFeet,
  mmToInches,
  powerFromCanonical,
  powerToCanonical,
  volumeFromCanonical,
  volumeToCanonical,
} from '@welldot/core';
import {
  resolveFlowUnitLabel,
  resolveVolumeUnitLabel,
} from '~/utils/unitLabel';

export type DisplayUnitType =
  | 'length'
  | 'diameter'
  | 'flow'
  | 'power'
  | 'volume';

/**
 * Canonical ↔ display conversion for one quantity, following the unit the
 * user picked in Settings. `.well` files always store SI (m, mm, m³/h, kW, m³);
 * this only changes what the UI shows and accepts.
 */
export function useUnitDisplay(unitType: DisplayUnitType) {
  const uiStore = useUiStore();

  /** Raw unit for length/diameter (`m`, `inches`…); display label for flow/power/volume. */
  const unit = computed(() => {
    if (unitType === 'length') return uiStore.lengthUnit;
    if (unitType === 'diameter') return uiStore.diameterUnit;
    if (unitType === 'flow') return resolveFlowUnitLabel(uiStore.flowUnit);
    if (unitType === 'volume')
      return resolveVolumeUnitLabel(uiStore.volumeUnit);
    return uiStore.powerUnit;
  });

  function toDisplay(canonical: number): number {
    switch (unitType) {
      case 'length':
        return uiStore.lengthUnit === 'ft'
          ? metersToFeet(canonical)
          : canonical;
      case 'diameter':
        return uiStore.diameterUnit === 'inches'
          ? mmToInches(canonical)
          : canonical;
      case 'flow':
        return flowFromCanonical(canonical, uiStore.flowUnit);
      case 'power':
        return powerFromCanonical(canonical, uiStore.powerUnit);
      case 'volume':
        return volumeFromCanonical(canonical, uiStore.volumeUnit);
    }
  }

  function toCanonical(display: number): number {
    switch (unitType) {
      case 'length':
        return uiStore.lengthUnit === 'ft' ? feetToMeters(display) : display;
      case 'diameter':
        return uiStore.diameterUnit === 'inches'
          ? inchesToMm(display)
          : display;
      case 'flow':
        return flowToCanonical(display, uiStore.flowUnit);
      case 'power':
        return powerToCanonical(display, uiStore.powerUnit);
      case 'volume':
        return volumeToCanonical(display, uiStore.volumeUnit);
    }
  }

  return { unit, toDisplay, toCanonical };
}
