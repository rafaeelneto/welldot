import type { DiameterUnits } from '@welldot/core';
import { resolveDiameterUnitLabel } from '@welldot/utils';
import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import {
  useWellUnits,
  type DisplayUnitType,
} from '../../composables/useWellUnits';
import { useWelldotConfig } from '../../config';

/**
 * Display suffix of the configured unit for `unitType` (`m`, `ft`, `mm`,
 * `in.`/`"`, `m³/h`, `kW`, `m³`…). Diameter inches depend on the language.
 * `unitType` is a value, ref or getter.
 */
export function useUnitSuffix(
  unitType: MaybeRefOrGetter<DisplayUnitType>,
): ComputedRef<string> {
  const config = useWelldotConfig();
  const { unit } = useWellUnits(unitType);
  return computed(() =>
    toValue(unitType) === 'diameter'
      ? resolveDiameterUnitLabel(
          unit.value as DiameterUnits,
          config.locale.split('-')[0].toLowerCase(),
        )
      : unit.value,
  );
}
