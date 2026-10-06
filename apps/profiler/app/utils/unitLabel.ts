import type { DiameterUnits, FlowUnits, VolumeUnits } from '@welldot/core';

/**
 * Resolves the diameter unit's display suffix for the active locale.
 * `mm` is locale-invariant; `inches` reads `in.` in English and `"` in
 * Portuguese, matching the double-quote convention used in Brazilian
 * well reports.
 */
export function resolveDiameterUnitLabel(
  unit: DiameterUnits,
  locale: string,
): string {
  if (unit === 'mm') return 'mm';
  return locale === 'pt' ? '"' : 'in.';
}

/** Display suffix for a flow unit (`m3/h` is the storage token, `m³/h` the label). */
export function resolveFlowUnitLabel(unit: FlowUnits): string {
  return unit === 'm3/h' ? 'm³/h' : unit;
}

const VOLUME_UNIT_LABELS: Record<VolumeUnits, string> = {
  m3: 'm³',
  L: 'L',
  ft3: 'ft³',
  gal: 'gal',
};

/** Display suffix for a volume unit (`m3`/`ft3` are storage tokens, `m³`/`ft³` the labels). */
export function resolveVolumeUnitLabel(unit: VolumeUnits): string {
  return VOLUME_UNIT_LABELS[unit] ?? unit;
}
