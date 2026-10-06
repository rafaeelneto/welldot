import type { Meter, PumpInstallation, WellStatus } from '@welldot/core';
import { formatDate } from './date';
import { resolvePumpTypeLabel } from './pumpVocab';

/**
 * Recommended vocabularies for the `meters`, `production` and
 * `history_logs` operational fields (.well spec v2.3) — suggestions only;
 * any free text or `x-` value is valid and stored as-is, except the closed
 * `status_change` status vocabulary.
 */
export const METER_TYPE_VALUES = [
  'mechanical',
  'electromagnetic',
  'ultrasonic',
] as const;

export const READING_SOURCE_VALUES = ['manual', 'telemetry'] as const;

export const DECLARED_METHOD_VALUES = ['estimated', 'reported'] as const;

export const MAINTENANCE_TYPE_VALUES = [
  'inspection',
  'cleaning',
  'redevelopment',
  'disinfection',
  'pump_service',
  'meter_calibration',
  'video_inspection',
  'level_measurement',
  'pump_test',
  'water_sampling',
] as const;

/** `status_change` statuses — a closed vocabulary (no free text or `x-`). */
export const WELL_STATUS_VALUES: readonly WellStatus[] = [
  'active',
  'maintenance',
  'inactive',
  'decommissioned',
  'abandoned',
];

export type MeterTypeValue = (typeof METER_TYPE_VALUES)[number];
export type ReadingSourceValue = (typeof READING_SOURCE_VALUES)[number];
export type DeclaredMethodValue = (typeof DECLARED_METHOD_VALUES)[number];
export type MaintenanceTypeValue = (typeof MAINTENANCE_TYPE_VALUES)[number];

function resolveLabel(
  values: readonly string[],
  prefix: string,
  value: string,
  t: (_key: string) => string,
): string {
  return values.includes(value) ? t(`${prefix}.${value}`) : value;
}

/** Translated meter `type`, falling back to the raw value. */
export function resolveMeterTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    METER_TYPE_VALUES,
    'editor.operation.meterTypes',
    value,
    t,
  );
}

/** Translated meter reading `source`, falling back to the raw value. */
export function resolveReadingSourceLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    READING_SOURCE_VALUES,
    'editor.operation.readingSources',
    value,
    t,
  );
}

/** Translated declared volume `method`, falling back to the raw value. */
export function resolveDeclaredMethodLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    DECLARED_METHOD_VALUES,
    'editor.operation.declaredMethods',
    value,
    t,
  );
}

/** Translated `maintenance_type`, falling back to the raw value. */
export function resolveMaintenanceTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    MAINTENANCE_TYPE_VALUES,
    'editor.operation.maintenanceTypes',
    value,
    t,
  );
}

/** Translated `status_change` status, falling back to the raw value (malformed files). */
export function resolveWellStatusLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return resolveLabel(
    WELL_STATUS_VALUES,
    'editor.operation.wellStatuses',
    value,
    t,
  );
}

/** PrimeVue `Tag` severity for each well status. */
export const WELL_STATUS_SEVERITY: Record<WellStatus, string> = {
  active: 'success',
  maintenance: 'warn',
  inactive: 'secondary',
  decommissioned: 'danger',
  abandoned: 'danger',
};

/** "Electromagnetic · S/N 123 · 01/02/2024" — identifies one meter installation. */
export function meterLabel(m: Meter, t: (_key: string) => string): string {
  return [
    m.type
      ? resolveMeterTypeLabel(m.type, t)
      : t('editor.operation.meter.untyped'),
    m.serial ? `S/N ${m.serial}` : null,
    formatDate(m.installed_at, 'dd/MM/yyyy'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Submersible Acme SP-5 · 01/02/2024" — identifies one pump installation. */
export function pumpInstallationLabel(
  p: PumpInstallation,
  t: (_key: string) => string,
): string {
  const equipment = [p.manufacturer, p.model].filter(Boolean).join(' ');
  return [
    [resolvePumpTypeLabel(p.type, t), equipment].filter(Boolean).join(' '),
    formatDate(p.installed_at, 'dd/MM/yyyy'),
  ].join(' · ');
}
