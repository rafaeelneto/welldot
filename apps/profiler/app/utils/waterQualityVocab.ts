import type {
  Parameter,
  ParameterGroup,
  WaterQualityResult,
  WaterSample,
} from '@welldot/core';
import { getLimitSet, getParameterDefinition } from '@welldot/core';
import { formatDate } from './date';

/**
 * Recommended vocabularies for `water_samples` (.well spec v2.3). The open
 * ones (sample type, sampling method, point type, device) are suggestions
 * only — any `x-` value is valid and shown raw. The rest are closed enums.
 */
export const SAMPLE_TYPE_VALUES = [
  'routine',
  'field_duplicate',
  'split_sample',
  'field_blank',
  'trip_blank',
  'equipment_blank',
] as const;

/** Sample types that point to an original sample with `parent_sample_id`. */
export const PARENT_SAMPLE_TYPES: readonly string[] = [
  'field_duplicate',
  'split_sample',
];

/** Blank sample types (QA/QC). */
export const BLANK_SAMPLE_TYPES: readonly string[] = [
  'field_blank',
  'trip_blank',
  'equipment_blank',
];

export const SAMPLING_METHOD_VALUES = [
  'low_flow',
  'volumetric_purge',
  'no_purge',
  'pump_discharge',
] as const;

export const SAMPLING_POINT_TYPE_VALUES = [
  'pump_discharge',
  'wellhead_tap',
  'in_well',
] as const;

export const SAMPLING_DEVICE_VALUES = [
  'bailer',
  'discrete_depth_sampler',
  'passive_diffusion_bag',
  'grab_sleeve',
  'low_flow_pump',
  'packer_pump',
] as const;

export const QUALIFIER_VALUES = [
  '<',
  '>',
  'not_detected',
  'estimated',
] as const;

/** Qualifiers that only go with a numeric `value`. */
export const NUMERIC_QUALIFIERS: readonly string[] = ['<', '>', 'estimated'];

export const FRACTION_VALUES = ['total', 'dissolved', 'suspended'] as const;

export const MEASURED_IN_VALUES = ['field', 'lab'] as const;

export const FILTRATION_LOCATION_VALUES = ['field', 'lab'] as const;

export const VALIDATION_STATUS_VALUES = [
  'unvalidated',
  'validated',
  'qualified',
  'rejected',
] as const;

/** PrimeVue `Tag` severity for each validation status. */
export const VALIDATION_STATUS_SEVERITY: Record<string, string> = {
  unvalidated: 'secondary',
  validated: 'success',
  qualified: 'warn',
  rejected: 'danger',
};

/** Display order of the vocabulary groups. */
export const PARAMETER_GROUP_VALUES: readonly ParameterGroup[] = [
  'physical',
  'aggregate',
  'major_ion',
  'nutrient',
  'organic',
  'disinfection',
  'mining_redox',
  'metal',
  'microbiology',
  'radioactivity',
];

export type SampleTypeValue = (typeof SAMPLE_TYPE_VALUES)[number];
export type SamplingMethodValue = (typeof SAMPLING_METHOD_VALUES)[number];
export type SamplingPointTypeValue =
  (typeof SAMPLING_POINT_TYPE_VALUES)[number];
export type SamplingDeviceValue = (typeof SAMPLING_DEVICE_VALUES)[number];
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

/** Unit symbol of a result: the vocabulary unit, or `unit` for `x-` codes. */
export function parameterUnitSymbol(result: {
  parameter: Parameter;
  unit?: string;
}): string {
  const def = getParameterDefinition(result.parameter);
  if (def) return def.unit.symbol;
  // CAS numbers outside the equivalence table are substances in mg/L.
  if (result.parameter.vocabulary === 'cas') return 'mg/L';
  return result.unit ?? '';
}

/**
 * Display text of a result's value: `< 0.001`, `0.004 (est.)`,
 * `not detected`, `present` / `absent`, or the qualitative text.
 * `formatNumber` defaults to `String`.
 */
export function formatResultValue(
  result: Pick<WaterQualityResult, 'value' | 'presence' | 'text' | 'qualifier'>,
  t: Translate,
  formatNumber: (_n: number) => string = n => String(n),
): string {
  if (result.qualifier === 'not_detected') return t(`${PREFIX}.notDetected`);
  if (result.presence !== undefined)
    return t(`${PREFIX}.presence.${result.presence ? 'present' : 'absent'}`);
  if (result.text !== undefined) return result.text;
  if (result.value === undefined) return '—';
  const n = formatNumber(result.value);
  if (result.qualifier === '<' || result.qualifier === '>')
    return `${result.qualifier} ${n}`;
  if (result.qualifier === 'estimated')
    return `${n} (${t(`${PREFIX}.estimatedShort`)})`;
  return n;
}

/** Translated `sample_type`, falling back to the raw value. */
export function resolveSampleTypeLabel(value: string, t: Translate): string {
  return resolveLabel(SAMPLE_TYPE_VALUES, `${PREFIX}.sampleTypes`, value, t);
}

/** Translated `sampling_method`, falling back to the raw value. */
export function resolveSamplingMethodLabel(
  value: string,
  t: Translate,
): string {
  return resolveLabel(
    SAMPLING_METHOD_VALUES,
    `${PREFIX}.samplingMethods`,
    value,
    t,
  );
}

/** Translated `sampling_point.type`, falling back to the raw value. */
export function resolveSamplingPointTypeLabel(
  value: string,
  t: Translate,
): string {
  return resolveLabel(
    SAMPLING_POINT_TYPE_VALUES,
    `${PREFIX}.samplingPointTypes`,
    value,
    t,
  );
}

/** Translated `sampling_point.device`, falling back to the raw value. */
export function resolveDeviceLabel(value: string, t: Translate): string {
  return resolveLabel(SAMPLING_DEVICE_VALUES, `${PREFIX}.devices`, value, t);
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
export function sampleLabel(sample: WaterSample, t: Translate): string {
  return [
    resolveSampleTypeLabel(sample.sample_type, t),
    formatDate(sample.datetime, 'dd/MM/yyyy HH:mm'),
    sample.laboratory?.report_number ?? sample.campaign ?? null,
  ]
    .filter(Boolean)
    .join(' · ');
}
