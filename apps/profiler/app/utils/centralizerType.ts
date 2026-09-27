/**
 * Recommended centralizer `type` vocabulary per the .well spec v2.1 —
 * suggestions only; any free text is valid and stored as-is.
 */
export const CENTRALIZER_TYPE_VALUES = [
  'spring_bow',
  'rigid',
  'semi_rigid',
  'polymer',
] as const;

export type CentralizerTypeValue = (typeof CENTRALIZER_TYPE_VALUES)[number];

const CENTRALIZER_TYPE_I18N_KEYS: Record<CentralizerTypeValue, string> = {
  spring_bow: 'editor.construction.centralizer.types.springBow',
  rigid: 'editor.construction.centralizer.types.rigid',
  semi_rigid: 'editor.construction.centralizer.types.semiRigid',
  polymer: 'editor.construction.centralizer.types.polymer',
};

function isCentralizerTypeValue(value: string): value is CentralizerTypeValue {
  return value in CENTRALIZER_TYPE_I18N_KEYS;
}

/**
 * Resolves a centralizer `type` to its translated label, falling back to the
 * raw value for free-text or `x-` prefixed values.
 */
export function resolveCentralizerTypeLabel(
  value: string,
  t: (key: string) => string,
): string {
  return isCentralizerTypeValue(value)
    ? t(CENTRALIZER_TYPE_I18N_KEYS[value])
    : value;
}
