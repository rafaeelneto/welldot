/** Canonical `well_purpose` vocabulary per the .well spec v2.1. */
export const WELL_PURPOSE_VALUES = [
  'production',
  'monitoring',
  'piezometer',
  'water_level_indicator',
  'observation',
  'exploration',
  'injection',
  'dewatering',
] as const;

export type WellPurposeValue = (typeof WELL_PURPOSE_VALUES)[number];

const WELL_PURPOSE_I18N_KEYS: Record<WellPurposeValue, string> = {
  production: 'editor.general.wellPurposes.production',
  monitoring: 'editor.general.wellPurposes.monitoring',
  piezometer: 'editor.general.wellPurposes.piezometer',
  water_level_indicator: 'editor.general.wellPurposes.waterLevelIndicator',
  observation: 'editor.general.wellPurposes.observation',
  exploration: 'editor.general.wellPurposes.exploration',
  injection: 'editor.general.wellPurposes.injection',
  dewatering: 'editor.general.wellPurposes.dewatering',
};

function isWellPurposeValue(value: string): value is WellPurposeValue {
  return value in WELL_PURPOSE_I18N_KEYS;
}

/**
 * Resolves a `well_purpose` value to its translated label, falling back to
 * the raw value for non-canonical values (e.g. `x-` prefixed).
 */
export function resolveWellPurposeLabel(
  value: string,
  t: (key: string) => string,
): string {
  return isWellPurposeValue(value) ? t(WELL_PURPOSE_I18N_KEYS[value]) : value;
}

/** Joins a `well_purpose` array into a comma-separated translated string. */
export function formatWellPurposes(
  values: string[] | undefined,
  t: (key: string) => string,
): string {
  return (values ?? []).map(v => resolveWellPurposeLabel(v, t)).join(', ');
}
