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
import { resolveFlowUnitLabel, resolveVolumeUnitLabel } from '@welldot/utils';
import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import { useWelldotConfig, type WelldotUnits } from '../config';

export type DisplayUnitType = keyof WelldotUnits;

/**
 * Canonical ↔ display conversion for one quantity, following the configured
 * display unit (`createWelldot({ units })`). `.well` files always store SI
 * (m, mm, m³/h, kW, m³); this only changes what the UI shows and accepts.
 *
 * `unitType` is a value, ref or getter, so a component can pass
 * `() => props.unitType` and follow prop changes. `unitOverride` (a value,
 * ref or getter) replaces the configured unit for this quantity;
 * `null`/`undefined` falls back to the configuration.
 */
export function useWellUnits<T extends DisplayUnitType>(
  unitType: MaybeRefOrGetter<T>,
  unitOverride?: MaybeRefOrGetter<WelldotUnits[T] | null | undefined>,
): {
  /** Raw unit for length/diameter/power (`m`, `inches`, `kW`…); display label for flow/volume (`m³/h`, `m³`). */
  unit: ComputedRef<string>;
  toDisplay: (canonical: number) => number;
  toCanonical: (display: number) => number;
} {
  const config = useWelldotConfig();
  const type = computed<DisplayUnitType>(() => toValue(unitType));
  const units = computed<WelldotUnits>(() => {
    const override = toValue(unitOverride);
    return override != null
      ? { ...config.units, [type.value]: override }
      : config.units;
  });

  const unit = computed(() => {
    const u = units.value;
    const kind = type.value;
    if (kind === 'length') return u.length;
    if (kind === 'diameter') return u.diameter;
    if (kind === 'flow') return resolveFlowUnitLabel(u.flow);
    if (kind === 'volume') return resolveVolumeUnitLabel(u.volume);
    return u.power;
  });

  function toDisplay(canonical: number): number {
    const u = units.value;
    switch (type.value) {
      case 'length':
        return u.length === 'ft' ? metersToFeet(canonical) : canonical;
      case 'diameter':
        return u.diameter === 'inches' ? mmToInches(canonical) : canonical;
      case 'flow':
        return flowFromCanonical(canonical, u.flow);
      case 'power':
        return powerFromCanonical(canonical, u.power);
      default:
        return volumeFromCanonical(canonical, u.volume);
    }
  }

  function toCanonical(display: number): number {
    const u = units.value;
    switch (type.value) {
      case 'length':
        return u.length === 'ft' ? feetToMeters(display) : display;
      case 'diameter':
        return u.diameter === 'inches' ? inchesToMm(display) : display;
      case 'flow':
        return flowToCanonical(display, u.flow);
      case 'power':
        return powerToCanonical(display, u.power);
      default:
        return volumeToCanonical(display, u.volume);
    }
  }

  return { unit, toDisplay, toCanonical };
}

/**
 * Whether `value`, emitted by a PrimeVue `InputNumber`, is just `display`
 * as that input shows it (rounded to `maxFractionDigits`). `InputNumber`
 * emits its parsed text on every blur, so an untouched focus + blur would
 * otherwise replace the exact value with its rounded display (`1` m shown
 * as `3.2808` ft would come back as `0.99998784` m). Internal: not exported
 * from the package entry.
 */
export function isDisplayedValue(
  value: number | null | undefined,
  display: number | null | undefined,
  maxFractionDigits: number,
): boolean {
  if (value == null || display == null) return value == null && display == null;
  if (!Number.isFinite(display)) return false;
  const digits = Math.min(100, Math.max(0, Math.trunc(maxFractionDigits) || 0));
  return value === Number(display.toFixed(digits));
}
