/**
 * Recommended vocabularies for `permits` (.well spec v2.3) — suggestions
 * only; any free text or `x-` value is valid and stored as-is.
 */
export const PERMIT_TYPE_VALUES = [
  'abstraction_permit',
  'preliminary_permit',
  'exemption',
  'registration',
  'dewatering_permit',
] as const;

export const WATER_USE_VALUES = [
  'human_supply',
  'industrial',
  'mining',
  'irrigation',
  'livestock',
  'commercial',
] as const;

export const CONDITION_CATEGORY_VALUES = [
  'monitoring_report',
  'water_level_monitoring',
  'production_report',
  'water_quality_analysis',
  'meter_installation',
  'sanitary_protection',
  'renewal_request',
] as const;

export type PermitTypeValue = (typeof PERMIT_TYPE_VALUES)[number];
export type WaterUseValue = (typeof WATER_USE_VALUES)[number];
export type ConditionCategoryValue = (typeof CONDITION_CATEGORY_VALUES)[number];

function resolveLabel(
  values: readonly string[],
  prefix: string,
  value: string,
  t: (_key: string) => string,
): string {
  return values.includes(value) ? t(`${prefix}.${value}`) : value;
}

/** Translated permit `type`, falling back to the raw value. */
export function resolvePermitTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    PERMIT_TYPE_VALUES,
    'editor.operation.permitTypes',
    value,
    t,
  );
}

/** Translated `water_use` value, falling back to the raw value. */
export function resolveWaterUseLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(WATER_USE_VALUES, 'editor.operation.waterUses', value, t);
}

/** Translated condition `category`, falling back to the raw value. */
export function resolveConditionCategoryLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    CONDITION_CATEGORY_VALUES,
    'editor.operation.conditionCategories',
    value,
    t,
  );
}

/** PrimeVue `Tag` severity for each derived permit status. */
export const PERMIT_STATUS_SEVERITY: Record<string, string> = {
  active: 'success',
  active_pending_renewal: 'warn',
  pending: 'info',
  expired: 'danger',
  superseded: 'secondary',
};

/** PrimeVue `Tag` severity for each derived condition deadline status. */
export const DEADLINE_STATUS_SEVERITY: Record<string, string> = {
  fulfilled: 'success',
  fulfilled_late: 'warn',
  upcoming: 'info',
  overdue: 'danger',
};
