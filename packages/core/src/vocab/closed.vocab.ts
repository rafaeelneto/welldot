// Closed vocabularies: fields whose values the .well schema fixes (no free
// text, no `x-` extensions). Same shape as the open vocabularies — each entry
// carries en/pt labels — so `getVocabLabel` works for both. The `*_VALUES`
// lists are the bare values, derived from the entries.
import type {
  PermitAdministrativeStatus,
  ProductionEntry,
  ResultQualifier,
  ResultValidation,
  VolumeLimit,
  WaterQualityResult,
  WellStatus,
} from '../types/well.types';
import type { VocabEntry } from './vocab';
import type { ParameterGroup } from './waterQuality.vocab';

/**
 * Builds a closed vocabulary that must list every member of `T`: a missing
 * value is a compile error, so the list can never drift from the type.
 */
function closedVocab<T extends string>() {
  return <const L extends readonly VocabEntry<T>[]>(
    entries: L &
      ([Exclude<T, L[number]['value']>] extends [never] ? unknown : never),
  ): readonly VocabEntry<T>[] => entries;
}

const valuesOf = <T extends string>(vocab: readonly VocabEntry<T>[]) =>
  vocab.map(entry => entry.value) as readonly T[];

/** `history_logs[].status` of `status_change` entries (since v2.3). */
export const WELL_STATUSES = closedVocab<WellStatus>()([
  { value: 'active', label: { en: 'Active', pt: 'Ativo' } },
  {
    value: 'maintenance',
    label: { en: 'Under maintenance', pt: 'Em manutenção' },
  },
  { value: 'inactive', label: { en: 'Inactive', pt: 'Paralisado' } },
  {
    value: 'decommissioned',
    label: { en: 'Decommissioned', pt: 'Desativado' },
  },
  { value: 'abandoned', label: { en: 'Abandoned', pt: 'Abandonado' } },
]);

/** Stored administrative `permits[].status` (since v2.3). */
export const PERMIT_ADMINISTRATIVE_STATUSES =
  closedVocab<PermitAdministrativeStatus>()([
    { value: 'requested', label: { en: 'Requested', pt: 'Requerida' } },
    { value: 'granted', label: { en: 'Granted', pt: 'Concedida' } },
    { value: 'suspended', label: { en: 'Suspended', pt: 'Suspensa' } },
    { value: 'revoked', label: { en: 'Revoked', pt: 'Revogada' } },
    { value: 'denied', label: { en: 'Denied', pt: 'Indeferida' } },
    { value: 'withdrawn', label: { en: 'Withdrawn', pt: 'Desistida' } },
  ]);

/** `permits[].volume_limits[].period` (since v2.3). */
export const VOLUME_LIMIT_PERIODS = closedVocab<VolumeLimit['period']>()([
  { value: 'daily', label: { en: 'Daily', pt: 'Diário' } },
  { value: 'monthly', label: { en: 'Monthly', pt: 'Mensal' } },
  { value: 'annual', label: { en: 'Annual', pt: 'Anual' } },
]);

/** `production[].type` (since v2.3). */
export const PRODUCTION_ENTRY_TYPES = closedVocab<ProductionEntry['type']>()([
  {
    value: 'meter_reading',
    label: { en: 'Meter reading', pt: 'Leitura de hidrômetro' },
  },
  {
    value: 'declared_volume',
    label: { en: 'Declared volume', pt: 'Volume declarado' },
  },
]);

/** Result `qualifier` (since v2.3). */
export const RESULT_QUALIFIERS = closedVocab<ResultQualifier>()([
  { value: '<', label: { en: '< less than', pt: '< menor que' } },
  { value: '>', label: { en: '> greater than', pt: '> maior que' } },
  { value: 'not_detected', label: { en: 'Not detected', pt: 'Não detectado' } },
  { value: 'estimated', label: { en: 'Estimated', pt: 'Estimado' } },
]);

/** Result `fraction` (since v2.3). */
export const RESULT_FRACTIONS = closedVocab<
  NonNullable<WaterQualityResult['fraction']>
>()([
  { value: 'total', label: { en: 'Total', pt: 'Total' } },
  { value: 'dissolved', label: { en: 'Dissolved', pt: 'Dissolvida' } },
  { value: 'suspended', label: { en: 'Suspended', pt: 'Suspensa' } },
]);

/** Where a result was measured: `measured_in` and `filtration.location` (since v2.3). */
export const MEASUREMENT_LOCATIONS = closedVocab<
  NonNullable<WaterQualityResult['measured_in']>
>()([
  { value: 'field', label: { en: 'Field', pt: 'Campo' } },
  { value: 'lab', label: { en: 'Lab', pt: 'Laboratório' } },
]);

/** Result `validation.status` (since v2.3). */
export const VALIDATION_STATUSES = closedVocab<ResultValidation['status']>()([
  { value: 'unvalidated', label: { en: 'Unvalidated', pt: 'Não validado' } },
  { value: 'validated', label: { en: 'Validated', pt: 'Validado' } },
  { value: 'qualified', label: { en: 'Qualified', pt: 'Qualificado' } },
  { value: 'rejected', label: { en: 'Rejected', pt: 'Rejeitado' } },
]);

/** Parameter vocabulary groups, in display order (since v2.3). */
export const PARAMETER_GROUPS = closedVocab<ParameterGroup>()([
  {
    value: 'physical',
    label: { en: 'Physical / field', pt: 'Físico / campo' },
  },
  { value: 'aggregate', label: { en: 'Aggregate', pt: 'Agregados' } },
  { value: 'major_ion', label: { en: 'Major ions', pt: 'Íons maiores' } },
  { value: 'nutrient', label: { en: 'Nutrients', pt: 'Nutrientes' } },
  { value: 'organic', label: { en: 'Organic', pt: 'Orgânicos' } },
  { value: 'disinfection', label: { en: 'Disinfection', pt: 'Desinfecção' } },
  {
    value: 'mining_redox',
    label: { en: 'Mining and redox', pt: 'Mineração e redox' },
  },
  { value: 'metal', label: { en: 'Metals / trace', pt: 'Metais / traço' } },
  { value: 'microbiology', label: { en: 'Microbiology', pt: 'Microbiologia' } },
  {
    value: 'radioactivity',
    label: { en: 'Radioactivity', pt: 'Radioatividade' },
  },
]);

// ─── Bare value lists ────────────────────────────────────────────────────────

export const WELL_STATUS_VALUES = valuesOf(WELL_STATUSES);
export const PERMIT_ADMINISTRATIVE_STATUS_VALUES = valuesOf(
  PERMIT_ADMINISTRATIVE_STATUSES,
);
export const QUALIFIER_VALUES = valuesOf(RESULT_QUALIFIERS);
export const FRACTION_VALUES = valuesOf(RESULT_FRACTIONS);
export const MEASURED_IN_VALUES = valuesOf(MEASUREMENT_LOCATIONS);
export const FILTRATION_LOCATION_VALUES = valuesOf(MEASUREMENT_LOCATIONS);
export const VALIDATION_STATUS_VALUES = valuesOf(VALIDATION_STATUSES);
export const PARAMETER_GROUP_VALUES = valuesOf(PARAMETER_GROUPS);

// ─── Value rules ─────────────────────────────────────────────────────────────

/** Qualifiers that only go with a numeric `value`. */
export const NUMERIC_QUALIFIERS: readonly ResultQualifier[] = [
  '<',
  '>',
  'estimated',
];

/** Sample types that point to an original sample with `parent_sample_id`. */
export const PARENT_SAMPLE_TYPES: readonly string[] = [
  'field_duplicate',
  'split_sample',
];

/** Blank (QA/QC) sample types. */
export const BLANK_SAMPLE_TYPES: readonly string[] = [
  'field_blank',
  'trip_blank',
  'equipment_blank',
];
