/**
 * Canonical `well_type` vocabulary per the .well spec v2.1 — construction
 * method only. `artesian` is deprecated (a hydraulic condition, not a
 * construction method) and is kept out of the selectable options, but still
 * resolves to a label so legacy files display correctly.
 */
export const WELL_TYPE_VALUES = [
  'tubular',
  'hand_dug',
  'horizontal',
  'infiltration_gallery',
] as const;

/** Deprecated in .well v2.1; still valid, never offered for new input. */
export const DEPRECATED_WELL_TYPE_VALUES = ['artesian'] as const;

export type WellTypeValue =
  | (typeof WELL_TYPE_VALUES)[number]
  | (typeof DEPRECATED_WELL_TYPE_VALUES)[number];

const WELL_TYPE_I18N_KEYS: Record<WellTypeValue, string> = {
  tubular: 'editor.general.wellTypes.tubular',
  artesian: 'editor.general.wellTypes.artesian',
  hand_dug: 'editor.general.wellTypes.handDug',
  horizontal: 'editor.general.wellTypes.horizontal',
  infiltration_gallery: 'editor.general.wellTypes.infiltrationGallery',
};

function isWellTypeValue(value: string): value is WellTypeValue {
  return value in WELL_TYPE_I18N_KEYS;
}

/** Whether `value` is a `well_type` deprecated by the current spec revision. */
export function isDeprecatedWellType(value: string | undefined): boolean {
  return (DEPRECATED_WELL_TYPE_VALUES as readonly string[]).includes(
    value ?? '',
  );
}

/**
 * Resolves a `well_type` value to its translated label, falling back to the
 * raw value for non-canonical values (e.g. `x-` prefixed or legacy data).
 */
export function resolveWellTypeLabel(
  value: string,
  // eslint-disable-next-line no-unused-vars
  t: (key: string) => string,
): string {
  return isWellTypeValue(value) ? t(WELL_TYPE_I18N_KEYS[value]) : value;
}
