import type {
  ParameterForm,
  ResultQualifier,
  ResultValidation,
  WaterQualityResult,
} from '@welldot/core';
import { getParameterDefinition } from '@welldot/core';
import { formatISO, startOfDay } from 'date-fns';

/** Which vocabulary a result's parameter is picked from in the editor. */
export type VocabularyMode = 'welldot' | 'cas' | 'custom';

/**
 * Editable form state of one result row. Nothing here is a valid result until
 * {@link draftToResult} builds one; the dialog then runs the core Zod schema.
 */
export type ResultDraft = {
  /** Local row key (never written). */
  key: string;
  mode: VocabularyMode;
  /** `welldot` code, CAS number, or custom code. */
  code: string | null;
  /** Custom vocabulary name, `x-…`. */
  customVocabulary: string;
  /** UCUM unit — custom vocabularies only. */
  unit: string;
  form: ParameterForm;
  value: number | null;
  presence: boolean | null;
  text: string;
  qualifier: ResultQualifier | null;
  detectionLimit: number | null;
  quantificationLimit: number | null;
  valuePrecision: number | null;
  fraction: WaterQualityResult['fraction'] | null;
  poreSize: number | null;
  filtrationLocation: 'field' | 'lab' | null;
  measuredIn: 'field' | 'lab' | null;
  method: string;
  analyzedAt: Date | null;
  analyzedDateOnly: boolean;
  labFlags: string[];
  validationStatus: ResultValidation['status'] | null;
  validationQualifier: string;
  validationGuideline: string;
  validatedBy: string;
  validatedAt: Date | null;
  notes: string;
  /** Members the editor does not cover (e.g. `x-` extensions), carried over. */
  extra: Record<string, unknown>;
  expanded: boolean;
};

const COVERED = new Set([
  'parameter',
  'value',
  'presence',
  'text',
  'qualifier',
  'unit',
  'detection_limit',
  'quantification_limit',
  'value_precision',
  'fraction',
  'filtration',
  'measured_in',
  'method',
  'analyzed_at',
  'analyzed_at_resolution',
  'lab_flags',
  'validation',
  'notes',
]);

let keySeq = 0;
const nextKey = () => `r${++keySeq}`;

export function emptyResultDraft(): ResultDraft {
  return {
    key: nextKey(),
    mode: 'welldot',
    code: null,
    customVocabulary: 'x-',
    unit: '',
    form: 'value',
    value: null,
    presence: null,
    text: '',
    qualifier: null,
    detectionLimit: null,
    quantificationLimit: null,
    valuePrecision: null,
    fraction: null,
    poreSize: null,
    filtrationLocation: null,
    measuredIn: null,
    method: '',
    analyzedAt: null,
    analyzedDateOnly: false,
    labFlags: [],
    validationStatus: null,
    validationQualifier: '',
    validationGuideline: '',
    validatedBy: '',
    validatedAt: null,
    notes: '',
    extra: {},
    expanded: false,
  };
}

/** Value form expected for a draft's parameter (vocabulary entry, else numeric). */
export function expectedForm(d: ResultDraft): ParameterForm | undefined {
  if (!d.code || d.mode === 'custom') return undefined;
  return getParameterDefinition({ code: d.code, vocabulary: d.mode })?.form;
}

export function resultToDraft(r: WaterQualityResult): ResultDraft {
  const d = emptyResultDraft();
  const vocab = r.parameter.vocabulary;
  d.mode = vocab === 'welldot' ? 'welldot' : vocab === 'cas' ? 'cas' : 'custom';
  d.code = r.parameter.code;
  if (d.mode === 'custom') d.customVocabulary = vocab;
  d.unit = r.unit ?? '';
  d.form =
    r.presence !== undefined
      ? 'presence'
      : r.text !== undefined
        ? 'text'
        : r.value !== undefined
          ? 'value'
          : (expectedForm(d) ?? 'value');
  d.value = r.value ?? null;
  d.presence = r.presence ?? null;
  d.text = r.text ?? '';
  d.qualifier = r.qualifier ?? null;
  d.detectionLimit = r.detection_limit ?? null;
  d.quantificationLimit = r.quantification_limit ?? null;
  d.valuePrecision = r.value_precision ?? null;
  d.fraction = r.fraction ?? null;
  d.poreSize = r.filtration?.pore_size ?? null;
  d.filtrationLocation = r.filtration?.location ?? null;
  d.measuredIn = r.measured_in ?? null;
  d.method = r.method ?? '';
  d.analyzedAt = r.analyzed_at ? new Date(r.analyzed_at) : null;
  d.analyzedDateOnly = r.analyzed_at_resolution === 'day';
  d.labFlags = [...(r.lab_flags ?? [])];
  d.validationStatus = r.validation?.status ?? null;
  d.validationQualifier = r.validation?.qualifier ?? '';
  d.validationGuideline = r.validation?.guideline ?? '';
  d.validatedBy = r.validation?.validated_by ?? '';
  d.validatedAt = r.validation?.validated_at
    ? new Date(r.validation.validated_at)
    : null;
  d.notes = r.notes ?? '';
  d.extra = Object.fromEntries(
    Object.entries(r).filter(([k]) => !COVERED.has(k)),
  );
  return d;
}

const text = (v: string | null | undefined) => v?.trim() || undefined;
const num = (v: number | null | undefined) => (v == null ? undefined : v);

/**
 * Instant + optional day resolution. A date-only instant is written at 00:00
 * local time with `_resolution: "day"` (consumers ignore the time).
 */
export function toInstant(
  date: Date | null,
  dateOnly: boolean,
): { instant?: string; resolution?: 'day' } {
  if (!date) return {};
  if (dateOnly)
    return { instant: formatISO(startOfDay(date)), resolution: 'day' };
  return { instant: formatISO(date) };
}

function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

/**
 * Builds the result written to the file. The value form follows the draft's
 * `form`; `not_detected` writes no value form. Rules the UI cannot enforce
 * are left to the core schema, run by the dialog before saving.
 */
export function draftToResult(d: ResultDraft): WaterQualityResult {
  const vocabulary = d.mode === 'custom' ? d.customVocabulary.trim() : d.mode;
  const notDetected = d.qualifier === 'not_detected';
  const numeric = d.form === 'value';
  const qualifier =
    d.qualifier && (notDetected || numeric) ? d.qualifier : undefined;
  const analyzed = toInstant(d.analyzedAt, d.analyzedDateOnly);
  const validated = toInstant(d.validatedAt, false);
  const filtration =
    d.fraction === 'dissolved' && (d.poreSize != null || d.filtrationLocation)
      ? compact({
          pore_size: num(d.poreSize),
          location: d.filtrationLocation ?? undefined,
        })
      : undefined;
  const validation = d.validationStatus
    ? compact({
        status: d.validationStatus,
        qualifier: text(d.validationQualifier),
        guideline: text(d.validationGuideline),
        validated_by: text(d.validatedBy),
        validated_at: validated.instant,
      })
    : undefined;
  const flags = d.labFlags.map(f => f.trim()).filter(Boolean);

  return compact({
    ...d.extra,
    parameter: { code: (d.code ?? '').trim(), vocabulary },
    value: !notDetected && numeric ? num(d.value) : undefined,
    presence:
      !notDetected && d.form === 'presence'
        ? (d.presence ?? undefined)
        : undefined,
    text: !notDetected && d.form === 'text' ? text(d.text) : undefined,
    qualifier,
    unit: d.mode === 'custom' ? text(d.unit) : undefined,
    detection_limit: num(d.detectionLimit),
    quantification_limit: num(d.quantificationLimit),
    value_precision: numeric ? num(d.valuePrecision) : undefined,
    fraction: d.fraction ?? undefined,
    filtration,
    measured_in: d.measuredIn ?? undefined,
    method: text(d.method),
    analyzed_at: analyzed.instant,
    analyzed_at_resolution: analyzed.resolution,
    lab_flags: flags.length ? flags : undefined,
    validation,
    notes: text(d.notes),
  }) as WaterQualityResult;
}

/** One editable purge stabilization reading (`welldot` field parameters). */
export type PurgeReadingDraft = {
  key: string;
  elapsed: number | null;
  code: string | null;
  value: number | null;
};

/** One warning on a sample, optionally tied to a result row. */
export type SampleWarning = { code: string; result_index?: number };
