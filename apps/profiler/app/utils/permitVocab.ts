import type { Permit, Well } from '@welldot/core';
import {
  getPermitIdentifier,
  getPermitStartDate,
  getPermitStatus,
  todayCalendarDate,
} from '@welldot/utils';

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
  'drilling_permit',
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

export const PERMIT_HISTORY_TYPE_VALUES = [
  'filing',
  'process',
  'notification',
  'fee',
  'inspection',
  'decision',
  'renewal',
] as const;

/** Closed vocabulary of the stored administrative `status` (spec v2.3). */
export const PERMIT_ADMINISTRATIVE_STATUS_VALUES = [
  'requested',
  'granted',
  'suspended',
  'revoked',
  'denied',
  'withdrawn',
] as const;

/** Icon per recommended history `type`; others use a generic one. */
export const PERMIT_HISTORY_TYPE_ICON: Record<string, string> = {
  filing: 'ph:file-arrow-up-duotone',
  process: 'ph:arrows-clockwise-duotone',
  notification: 'ph:bell-ringing-duotone',
  fee: 'ph:receipt-duotone',
  inspection: 'ph:magnifying-glass-duotone',
  decision: 'ph:gavel-duotone',
  renewal: 'ph:arrow-counter-clockwise-duotone',
};

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

/** Translated permit history `type`, falling back to the raw value. */
export function resolvePermitHistoryTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    PERMIT_HISTORY_TYPE_VALUES,
    'editor.operation.permit.history.types',
    value,
    t,
  );
}

/**
 * Short display label of a permit: authority plus `identifier`, else
 * `request_identifier`. Falls back to `fallback` (e.g. an unresolved id).
 */
export function permitLabel(permit: Permit | undefined, fallback = ''): string {
  if (!permit) return fallback;
  return [permit.authority, getPermitIdentifier(permit)]
    .filter(Boolean)
    .join(' ');
}

/** PrimeVue `Tag` severity for each derived permit status. */
export const PERMIT_STATUS_SEVERITY: Record<string, string> = {
  requested: 'info',
  suspended: 'warn',
  revoked: 'danger',
  denied: 'danger',
  withdrawn: 'secondary',
  active: 'success',
  active_pending_renewal: 'warn',
  not_yet_valid: 'info',
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

/**
 * The permit production compliance is judged by: among the `active` /
 * `active_pending_renewal` permits on `today`, the one with the latest start.
 */
export function getActivePermit(
  well: Well,
  today: string = todayCalendarDate(),
): Permit | undefined {
  return (well.permits ?? [])
    .filter(p => {
      const status = getPermitStatus(well, p, today);
      return status === 'active' || status === 'active_pending_renewal';
    })
    .sort((a, b) =>
      (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
    )[0];
}
