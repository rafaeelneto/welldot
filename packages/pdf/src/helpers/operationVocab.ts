import type { Meter, WellStatus } from '@welldot/core';
import { METER_TYPES, getVocabLabel } from '@welldot/core';
import { formatDate } from './date';

/**
 * Closed operational vocabularies. The open ones (meter type, reading source,
 * declared method, maintenance type) live in `@welldot/core`.
 */

/** `status_change` statuses — a closed vocabulary (no free text or `x-`). */
export const WELL_STATUS_VALUES: readonly WellStatus[] = [
  'active',
  'maintenance',
  'inactive',
  'decommissioned',
  'abandoned',
];

function resolveLabel(
  values: readonly string[],
  prefix: string,
  value: string,
  t: (_key: string) => string,
): string {
  return values.includes(value) ? t(`${prefix}.${value}`) : value;
}

/** Translated `status_change` status, falling back to the raw value (malformed files). */
export function resolveWellStatusLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(WELL_STATUS_VALUES, 'operation.wellStatuses', value, t);
}

/** "Electromagnetic · S/N 123 · 01/02/2024" — identifies one meter installation. */
export function meterLabel(
  m: Meter,
  t: (_key: string) => string,
  locale: string,
  dateFormat = 'dd/MM/yyyy',
): string {
  return [
    m.type
      ? getVocabLabel(METER_TYPES, m.type, locale)
      : t('operation.meter.untyped'),
    m.serial ? `S/N ${m.serial}` : null,
    formatDate(m.installed_at, dateFormat),
  ]
    .filter(Boolean)
    .join(' · ');
}
