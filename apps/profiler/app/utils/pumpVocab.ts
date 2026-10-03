/**
 * Recommended vocabularies for `pump_installations` (.well spec v2.3) —
 * suggestions only; any free text or `x-` value is valid and stored as-is.
 */
export const PUMP_TYPE_VALUES = [
  'submersible',
  'vertical_turbine',
  'jet',
  'progressive_cavity',
  'hand_pump',
  'compressor_airlift',
] as const;

export const POWER_SOURCE_VALUES = [
  'grid',
  'solar',
  'diesel',
  'hybrid',
] as const;

export type PumpTypeValue = (typeof PUMP_TYPE_VALUES)[number];
export type PowerSourceValue = (typeof POWER_SOURCE_VALUES)[number];

/**
 * Resolves a pump `type` to its translated label, falling back to the raw
 * value for free-text or `x-` prefixed values.
 */
export function resolvePumpTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return (PUMP_TYPE_VALUES as readonly string[]).includes(value)
    ? t(`editor.operation.pumpTypes.${value}`)
    : value;
}

/**
 * Resolves a pump `power_source` to its translated label, falling back to the
 * raw value for free-text or `x-` prefixed values.
 */
export function resolvePowerSourceLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return (POWER_SOURCE_VALUES as readonly string[]).includes(value)
    ? t(`editor.operation.powerSources.${value}`)
    : value;
}
