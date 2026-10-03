import type { DiameterUnits } from '@welldot/core';

export function useUnitFormat() {
  const {
    toDisplay: lengthToDisplay,
    toCanonical: lengthToCanonical,
    unit: lengthUnit,
  } = useUnitDisplay('length');
  const {
    toDisplay: diamToDisplay,
    toCanonical: diamToCanonical,
    unit: diameterUnit,
  } = useUnitDisplay('diameter');
  const {
    toDisplay: flowToDisplay,
    toCanonical: flowToCanonical,
    unit: flowUnit,
  } = useUnitDisplay('flow');
  const {
    toDisplay: powerToDisplay,
    toCanonical: powerToCanonical,
    unit: powerUnit,
  } = useUnitDisplay('power');
  const { formatNumber } = useNumberFormat();
  const { locale } = useI18n();

  function formatLength(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(lengthToDisplay(value), {
      fractionDigits,
      suffix: lengthUnit.value,
    });
  }

  function formatDiameter(
    value: number | null | undefined,
    fractionDigits = 1,
  ): string {
    if (value == null) return '—';
    return formatNumber(diamToDisplay(value), {
      fractionDigits,
      suffix: resolveDiameterUnitLabel(
        diameterUnit.value as DiameterUnits,
        locale.value,
      ),
    });
  }

  function formatVolume(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(value, { fractionDigits, suffix: 'm³' });
  }

  function formatFlow(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(flowToDisplay(value), {
      maximumFractionDigits: fractionDigits,
      suffix: flowUnit.value,
    });
  }

  function formatPower(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(powerToDisplay(value), {
      maximumFractionDigits: fractionDigits,
      suffix: powerUnit.value,
    });
  }

  /** Unit label of specific capacity (flow per length of drawdown). */
  const specificCapacityUnit = computed(() =>
    flowUnit.value === 'm³/h' && lengthUnit.value === 'm'
      ? 'm²/h'
      : `${flowUnit.value}/${lengthUnit.value}`,
  );

  /** Specific capacity, canonically m³/h per m, in the chosen flow / length units. */
  function toSpecificCapacity(value: number): number {
    return flowToDisplay(value) / lengthToDisplay(1);
  }

  function formatSpecificCapacity(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(toSpecificCapacity(value), {
      maximumFractionDigits: fractionDigits,
      suffix: specificCapacityUnit.value,
    });
  }

  return {
    formatLength,
    formatDiameter,
    formatVolume,
    lengthUnit,
    diameterUnit,
    toLength: lengthToDisplay,
    toCanonicalLength: lengthToCanonical,
    toDiameter: diamToDisplay,
    toCanonicalDiameter: diamToCanonical,
    formatFlow,
    formatPower,
    formatSpecificCapacity,
    flowUnit,
    powerUnit,
    specificCapacityUnit,
    toFlow: flowToDisplay,
    toCanonicalFlow: flowToCanonical,
    toPower: powerToDisplay,
    toCanonicalPower: powerToCanonical,
    toSpecificCapacity,
  };
}
