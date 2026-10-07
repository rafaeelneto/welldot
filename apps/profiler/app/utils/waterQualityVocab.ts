import type { Parameter, WaterQualityResult, WaterSample } from '@welldot/core';
import {
  FRACTION_VALUES,
  MEASURED_IN_VALUES,
  PARAMETER_GROUP_VALUES,
  QUALIFIER_VALUES,
  SAMPLE_TYPES,
  VALIDATION_STATUS_VALUES,
  getLimitSet,
  getParameterDefinition,
  getVocabLabel,
} from '@welldot/core';
import { formatDate, formatWaterQualityResult } from '@welldot/utils';

// Closed value lists live in @welldot/core and pure formatting in
// @welldot/utils; re-exported for auto-import. The i18n-keyed label lookups
// and UI-only maps stay here.
export {
  BLANK_SAMPLE_TYPES,
  FILTRATION_LOCATION_VALUES,
  FRACTION_VALUES,
  MEASURED_IN_VALUES,
  NUMERIC_QUALIFIERS,
  PARAMETER_GROUP_VALUES,
  PARENT_SAMPLE_TYPES,
  QUALIFIER_VALUES,
  VALIDATION_STATUS_VALUES,
} from '@welldot/core';
export { parameterUnitSymbol } from '@welldot/utils';

/** PrimeVue `Tag` severity for each validation status. */
export const VALIDATION_STATUS_SEVERITY: Record<string, string> = {
  unvalidated: 'secondary',
  validated: 'success',
  qualified: 'warn',
  rejected: 'danger',
};

export type QualifierValue = (typeof QUALIFIER_VALUES)[number];
export type FractionValue = (typeof FRACTION_VALUES)[number];
export type MeasuredInValue = (typeof MEASURED_IN_VALUES)[number];
export type ValidationStatusValue = (typeof VALIDATION_STATUS_VALUES)[number];

type Translate = (_key: string) => string;

const PREFIX = 'editor.waterQuality';

function resolveLabel(
  values: readonly string[],
  prefix: string,
  value: string,
  t: Translate,
): string {
  return values.includes(value) ? t(`${prefix}.${value}`) : value;
}

/**
 * Translates `key`, returning `undefined` when the message is missing
 * (vue-i18n returns the key itself for a missing message).
 */
function tryTranslate(key: string, t: Translate): string | undefined {
  const msg = t(key);
  return msg && msg !== key ? msg : undefined;
}

/**
 * Localized label of a parameter: the app translation of its `welldot` code
 * (a CAS number resolves through the published equivalences first), else
 * the canonical English vocabulary label, else the raw code.
 */
export function resolveParameterLabel(
  parameter: Parameter,
  t: Translate,
): string {
  const def = getParameterDefinition(parameter);
  if (!def) return parameter.code;
  return tryTranslate(`${PREFIX}.parameters.${def.code}`, t) ?? def.label;
}

/**
 * Display text of a result's value: `< 0.001`, `0.004 (est.)`,
 * `not detected`, `present` / `absent`, or the qualitative text.
 * `formatNumber` defaults to `String`.
 */
export function formatResultValue(
  result: Pick<WaterQualityResult, 'value' | 'presence' | 'text' | 'qualifier'>,
  t: Translate,
  formatNumber?: (_n: number) => string,
): string {
  return formatWaterQualityResult(
    result,
    {
      notDetected: t(`${PREFIX}.notDetected`),
      present: t(`${PREFIX}.presence.present`),
      absent: t(`${PREFIX}.presence.absent`),
      estimated: t(`${PREFIX}.estimatedShort`),
    },
    formatNumber,
  );
}

/** Translated result `qualifier`, falling back to the raw value. */
export function resolveQualifierLabel(value: string, t: Translate): string {
  const key = { '<': 'lt', '>': 'gt' }[value] ?? value;
  return (QUALIFIER_VALUES as readonly string[]).includes(value)
    ? t(`${PREFIX}.qualifiers.${key}`)
    : value;
}

/** Translated result `fraction`, falling back to the raw value. */
export function resolveFractionLabel(value: string, t: Translate): string {
  return resolveLabel(FRACTION_VALUES, `${PREFIX}.fractions`, value, t);
}

/** Translated `measured_in` / `filtration.location`, falling back to the raw value. */
export function resolveMeasuredInLabel(value: string, t: Translate): string {
  return resolveLabel(MEASURED_IN_VALUES, `${PREFIX}.measuredIn`, value, t);
}

/** Translated `validation.status`, falling back to the raw value. */
export function resolveValidationStatusLabel(
  value: string,
  t: Translate,
): string {
  return resolveLabel(
    VALIDATION_STATUS_VALUES,
    `${PREFIX}.validationStatuses`,
    value,
    t,
  );
}

/** Translated vocabulary group. */
export function resolveParameterGroupLabel(
  value: string,
  t: Translate,
): string {
  return resolveLabel(PARAMETER_GROUP_VALUES, `${PREFIX}.groups`, value, t);
}

/** Display name of a bundled limit set, falling back to the raw id. */
export function resolveLimitSetLabel(id: string): string {
  return getLimitSet(id)?.name ?? id;
}

/** "Routine · 15/09/2026 09:30 · LD-4471/26" — identifies one sample. */
export function sampleLabel(sample: WaterSample, locale: string): string {
  return [
    getVocabLabel(SAMPLE_TYPES, sample.sample_type, locale),
    formatDate(sample.datetime, 'dd/MM/yyyy HH:mm'),
    sample.laboratory?.report_number ?? sample.campaign ?? null,
  ]
    .filter(Boolean)
    .join(' · ');
}
