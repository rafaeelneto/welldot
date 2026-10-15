import type { Meter, PumpInstallation, WellStatus } from '@welldot/core';
import { PUMP_TYPES, WELL_STATUS_VALUES, getVocabLabel } from '@welldot/core';
import { formatDate, formatMeterLabel } from '@welldot/utils';

export { WELL_STATUS_VALUES } from '@welldot/core';

// The closed status list lives in @welldot/core (open vocabularies too);
// labels come from the app's i18n messages.

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
export function meterLabel(
  m: Meter,
  t: (_key: string) => string,
  locale: string,
): string {
  return formatMeterLabel(m, {
    locale,
    untypedLabel: t('editor.operation.meter.untyped'),
  });
}

/** "Submersible Acme SP-5 · 01/02/2024" — identifies one pump installation. */
export function pumpInstallationLabel(
  p: PumpInstallation,
  locale: string,
): string {
  const equipment = [p.manufacturer, p.model].filter(Boolean).join(' ');
  return [
    [getVocabLabel(PUMP_TYPES, p.type, locale), equipment]
      .filter(Boolean)
      .join(' '),
    formatDate(p.installed_at, 'dd/MM/yyyy'),
  ].join(' · ');
}
