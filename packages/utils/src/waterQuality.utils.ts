import type {
  Limit,
  LimitSet,
  Parameter,
  Purge,
  WaterQualityResult,
  WaterSample,
  Well,
} from '@welldot/core';
import {
  getParameterDefinition,
  isKnownParameter,
  NEPHELOMETRIC_TURBIDITY_CODES,
  parameterKey,
} from '@welldot/core';

import { getRetractedIds, instantLocalDate } from './shared.utils';

// ─── Water quality (.well v2.3 `water_samples`) ──────────────────────────────

const BLANK_TYPES = new Set(['field_blank', 'trip_blank', 'equipment_blank']);

/** Floating-point slack for tolerance comparisons. */
const EPSILON = 1e-9;

function toTime(instant: string | undefined): number {
  return typeof instant === 'string' ? new Date(instant).getTime() : NaN;
}

/** Days since epoch of a `YYYY-MM-DD` calendar date. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Whether a sample is a field, trip or equipment blank. */
function isBlank(sample: WaterSample): boolean {
  return BLANK_TYPES.has(sample.sample_type);
}

/** Numeric, uncensored result (no `<`, `>` or `not_detected`). */
function uncensoredValue(r: WaterQualityResult): number | undefined {
  if (r.validation?.status === 'rejected') return undefined;
  if (typeof r.value !== 'number') return undefined;
  if (r.qualifier === '<' || r.qualifier === '>') return undefined;
  if (r.qualifier === 'not_detected') return undefined;
  return r.value;
}

/** Identity of a result within a sample: parameter, fraction and lab/field. */
function resultIdentity(r: WaterQualityResult): string {
  return `${parameterKey(r.parameter)}|${r.fraction ?? ''}|${r.measured_in ?? ''}`;
}

/**
 * Best uncensored value of a parameter in a sample. Among several results
 * for the same key, lab results win over unspecified, which win over field;
 * then `dissolved` wins over unspecified, which wins over `total`.
 */
function pickValue(sample: WaterSample, key: string): number | undefined {
  let best: { value: number; score: number } | undefined;
  for (const r of sample.results) {
    if (parameterKey(r.parameter) !== key) continue;
    const value = uncensoredValue(r);
    if (value === undefined) continue;
    const measured =
      r.measured_in === 'lab' ? 2 : r.measured_in === 'field' ? 0 : 1;
    const fraction =
      r.fraction === 'dissolved' ? 2 : r.fraction === undefined ? 1 : 0;
    const score = measured * 10 + fraction;
    if (best === undefined || score > best.score) best = { value, score };
  }
  return best?.value;
}

/** Milliequivalents per liter of a vocabulary ion given in mg/L. */
function toMeq(code: string, mgL: number): number {
  const def = getParameterDefinition({ code, vocabulary: 'welldot' });
  if (!def?.molar_mass || !def.charge) return 0;
  return mgL / (def.molar_mass / Math.abs(def.charge));
}

/** meq/L of a code in a sample, or `undefined` when not measured. */
function meqOf(sample: WaterSample, code: string): number | undefined {
  const v = pickValue(sample, code);
  return v === undefined ? undefined : toMeq(code, v);
}

function sumDefined(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((v): v is number => v !== undefined);
  return defined.length === 0 ? undefined : defined.reduce((a, b) => a + b, 0);
}

/**
 * HCO₃⁻ + CO₃²⁻ in meq/L: `bicarbonate` / `carbonate` when measured, else
 * `alkalinity_total_as_caco3`.
 */
function carbonateMeq(sample: WaterSample): number | undefined {
  const direct = sumDefined([
    meqOf(sample, 'bicarbonate'),
    meqOf(sample, 'carbonate'),
  ]);
  return direct ?? meqOf(sample, 'alkalinity_total_as_caco3');
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

/**
 * Returns the ids of every water sample retracted by another sample's
 * `corrects` field (.well v2.3 ledger corrections). A corrected lab report or
 * a data revalidation is a new sample; the retracted one stays in the file
 * but is excluded from every derivation.
 */
export function getRetractedSampleIds(well: Well): Set<string> {
  return getRetractedIds(well.water_samples ?? []);
}

/**
 * Returns the water samples that count for derivations — every sample not
 * retracted via `corrects` — sorted by collection instant (`datetime`)
 * ascending, then `sequence` (absent = 0), then file order.
 */
export function getEffectiveWaterSamples(well: Well): WaterSample[] {
  const samples = well.water_samples ?? [];
  const retracted = getRetractedSampleIds(well);
  return samples
    .map((sample, index) => ({ sample, index }))
    .filter(({ sample }) => !retracted.has(sample.id))
    .sort(
      (a, b) =>
        toTime(a.sample.datetime) - toTime(b.sample.datetime) ||
        (a.sample.sequence ?? 0) - (b.sample.sequence ?? 0) ||
        a.index - b.index,
    )
    .map(({ sample }) => sample);
}

/**
 * Whether a result takes part in derivations and limit comparisons. Only
 * `validation.status: "rejected"` excludes it; absent validation equals
 * `unvalidated`, and `qualified` results are kept.
 */
export function isResultUsable(r: WaterQualityResult): boolean {
  return r.validation?.status !== 'rejected';
}

/**
 * Returns the most recent usable result of a parameter across the effective
 * (non-retracted) samples, skipping field/trip/equipment blanks. `code` is a
 * `parameterKey` (the `welldot` code, so a CAS-coded result with a published
 * equivalence matches too). Within one sample the first matching result in
 * file order is returned. `undefined` when the parameter was never measured.
 */
export function getLatestResult(
  well: Well,
  code: string,
): { sample: WaterSample; result: WaterQualityResult } | undefined {
  const samples = getEffectiveWaterSamples(well);
  for (let i = samples.length - 1; i >= 0; i--) {
    const sample = samples[i];
    if (isBlank(sample)) continue;
    const result = sample.results.find(
      r => isResultUsable(r) && parameterKey(r.parameter) === code,
    );
    if (result) return { sample, result };
  }
  return undefined;
}

// ─── Sampling point ──────────────────────────────────────────────────────────

/** Depth of a sample (m from ground level): a point or an isolated interval. */
export type SampleDepth =
  | { kind: 'point'; depth: number }
  | { kind: 'interval'; from: number; to: number };

/**
 * Effective depth of a sample. A sample taken at the production pump
 * (`sampling_point.pump_installation_id`) takes the pump's `intake_depth`;
 * otherwise `sampling_point.depth` gives a point and `from`/`to` an interval
 * (`depth` wins on the malformed combination of both). `undefined` when the
 * depth is unknown (no sampling point, a wellhead tap, an unresolved pump or
 * a pump without `intake_depth`).
 */
export function getSampleDepth(
  well: Well,
  sample: WaterSample,
): SampleDepth | undefined {
  const point = sample.sampling_point;
  if (!point) return undefined;
  if (point.pump_installation_id !== undefined) {
    const pump = (well.pump_installations ?? []).find(
      p => p.id === point.pump_installation_id,
    );
    if (typeof pump?.intake_depth !== 'number') return undefined;
    return { kind: 'point', depth: pump.intake_depth };
  }
  if (typeof point.depth === 'number') {
    return { kind: 'point', depth: point.depth };
  }
  if (typeof point.from === 'number' && typeof point.to === 'number') {
    return { kind: 'interval', from: point.from, to: point.to };
  }
  return undefined;
}

/** Top and bottom (m) of a sample depth. */
function depthEnds(depth: SampleDepth): [number, number] {
  return depth.kind === 'point'
    ? [depth.depth, depth.depth]
    : [Math.min(depth.from, depth.to), Math.max(depth.from, depth.to)];
}

function insideScreen(well: Well, d: number): boolean {
  return well.well_screen.some(
    s => Math.min(s.from, s.to) <= d && d <= Math.max(s.from, s.to),
  );
}

/** Static level (m) of the event referenced by `static_level_event_id`. */
function referencedStaticLevel(
  well: Well,
  sample: WaterSample,
): number | undefined {
  if (sample.static_level_event_id === undefined) return undefined;
  const event = (well.hydrodynamic_events ?? []).find(
    e => e.id === sample.static_level_event_id,
  );
  const level = (event as { static_level?: unknown } | undefined)?.static_level;
  return typeof level === 'number' ? level : undefined;
}

/** Well bottom (m): `well_depth`, else the deepest `bore_hole.to`. */
function wellBottom(well: Well): number | undefined {
  if (typeof well.well_depth === 'number') return well.well_depth;
  if (well.bore_hole.length === 0) return undefined;
  return Math.max(...well.bore_hole.map(b => Math.max(b.from, b.to)));
}

/**
 * Whether a sample represents formation water: its depth (both ends of an
 * interval) lies inside a `well_screen` interval and is not shallower than
 * the static level of `static_level_event_id`. Without a resolvable static
 * level only the screen test applies. Returns `undefined` when the depth is
 * unknown or the well has no `well_screen` entries.
 */
export function isFormationWater(
  well: Well,
  sample: WaterSample,
): boolean | undefined {
  const depth = getSampleDepth(well, sample);
  if (!depth || well.well_screen.length === 0) return undefined;
  const [top, bottom] = depthEnds(depth);
  if (!insideScreen(well, top) || !insideScreen(well, bottom)) return false;
  const level = referencedStaticLevel(well, sample);
  if (level !== undefined && top < level) return false;
  return true;
}

// ─── Derivations ─────────────────────────────────────────────────────────────

/** Cation / anion sums (meq/L) and the charge-balance error (%). */
export type IonBalance = {
  cations_meq: number;
  anions_meq: number;
  error_pct: number;
};

const BALANCE_CATIONS = [
  'calcium',
  'magnesium',
  'sodium',
  'potassium',
  'lithium',
  'iron',
  'manganese',
  'ammonia_as_n',
] as const;

const BALANCE_ANIONS = [
  'chloride',
  'sulfate',
  'fluoride',
  'orthophosphate_as_po4',
] as const;

/** One of two expressions of the same ion; the first measured one wins. */
const BALANCE_ANION_ALTERNATIVES = [
  ['nitrate_as_no3', 'nitrate_as_n'],
  ['nitrite_as_no2', 'nitrite_as_n'],
] as const;

function cationMeqs(sample: WaterSample): (number | undefined)[] {
  return BALANCE_CATIONS.map(code => meqOf(sample, code));
}

function anionMeqs(sample: WaterSample): (number | undefined)[] {
  return [
    carbonateMeq(sample),
    ...BALANCE_ANIONS.map(code => meqOf(sample, code)),
    ...BALANCE_ANION_ALTERNATIVES.map(
      ([a, b]) => meqOf(sample, a) ?? meqOf(sample, b),
    ),
  ];
}

/**
 * Charge balance of a sample. Concentrations (mg/L) are converted to meq/L
 * with the vocabulary molar mass and charge (`mg/L ÷ (M / |z|)`).
 *
 * Cations: Ca, Mg, Na, K, Li, Fe (as Fe²⁺), Mn, NH₄⁺ (`ammonia_as_n`).
 * Anions: HCO₃⁻ + CO₃²⁻ (falling back to `alkalinity_total_as_caco3`), Cl⁻,
 * SO₄²⁻, F⁻, PO₄³⁻, NO₃⁻ and NO₂⁻ (the `_as_no3`/`_as_no2` code preferred
 * over `_as_n`, never both). Rejected and censored (`<`, `>`,
 * `not_detected`) results are left out.
 *
 * `error_pct = (Σcat − Σan) / (Σcat + Σan) × 100`. Returns `undefined`
 * without at least one measured cation and one measured anion.
 */
export function getIonBalance(sample: WaterSample): IonBalance | undefined {
  const cations = sumDefined(cationMeqs(sample));
  const anions = sumDefined(anionMeqs(sample));
  if (cations === undefined || anions === undefined) return undefined;
  const total = cations + anions;
  return {
    cations_meq: cations,
    anions_meq: anions,
    error_pct: total === 0 ? 0 : ((cations - anions) / total) * 100,
  };
}

/** Relative percent difference of one parameter between duplicate and original. */
export type RelativePercentDifference = {
  /** `parameterKey` of the parameter. */
  key: string;
  parameter: Parameter;
  /** Value in the original (parent) sample. */
  original: number;
  /** Value in the duplicate / split sample. */
  duplicate: number;
  rpd_pct: number;
};

/**
 * RPD between a `field_duplicate` / `split_sample` and its original
 * (`parent_sample_id`), per parameter. Results pair by `parameterKey` +
 * `fraction` + `measured_in`; rejected and censored (`<`, `>`,
 * `not_detected`) results are skipped. `RPD = |a − b| / ((a + b) / 2) × 100`
 * (0 when both are 0). Returns `[]` when the sample or its parent is missing.
 */
export function getRelativePercentDifferences(
  well: Well,
  sampleId: string,
): RelativePercentDifference[] {
  const samples = well.water_samples ?? [];
  const dup = samples.find(s => s.id === sampleId);
  if (dup?.parent_sample_id === undefined) return [];
  const parent = samples.find(s => s.id === dup.parent_sample_id);
  if (!parent) return [];

  const out: RelativePercentDifference[] = [];
  const used = new Set<string>();
  for (const r of dup.results) {
    const b = uncensoredValue(r);
    if (b === undefined) continue;
    const identity = resultIdentity(r);
    if (used.has(identity)) continue;
    const o = parent.results.find(
      p => resultIdentity(p) === identity && uncensoredValue(p) !== undefined,
    );
    if (!o) continue;
    used.add(identity);
    const a = uncensoredValue(o)!;
    const mean = (a + b) / 2;
    out.push({
      key: parameterKey(r.parameter),
      parameter: o.parameter,
      original: a,
      duplicate: b,
      rpd_pct: mean === 0 ? 0 : (Math.abs(a - b) / mean) * 100,
    });
  }
  return out;
}

/** A parameter detected in a field, trip or equipment blank. */
export type BlankDetection = {
  blank_id: string;
  campaign?: string;
  /** `parameterKey` of the parameter. */
  key: string;
  parameter: Parameter;
  value: number;
};

/**
 * Parameters detected in blanks (`field_blank`, `trip_blank`,
 * `equipment_blank`) among the effective samples: usable numeric results
 * without a `<` or `not_detected` qualifier and with a value above 0.
 * Physical field parameters (pH, conductivity, temperature, ORP, turbidity,
 * color…) are not contaminants and are skipped. Group by `campaign` to relate
 * a detection to the samples of the same campaign.
 */
export function getBlankContamination(well: Well): BlankDetection[] {
  const out: BlankDetection[] = [];
  for (const sample of getEffectiveWaterSamples(well)) {
    if (!isBlank(sample)) continue;
    for (const r of sample.results) {
      if (!isResultUsable(r) || typeof r.value !== 'number') continue;
      if (r.qualifier === '<' || r.qualifier === 'not_detected') continue;
      if (!(r.value > 0)) continue;
      if (getParameterDefinition(r.parameter)?.group === 'physical') continue;
      out.push({
        blank_id: sample.id,
        ...(sample.campaign !== undefined && { campaign: sample.campaign }),
        key: parameterKey(r.parameter),
        parameter: r.parameter,
        value: r.value,
      });
    }
  }
  return out;
}

/** Time from collection to analysis of one result. */
export type HoldingTime = {
  /** Index of the result in `sample.results`. */
  result_index: number;
  /** `parameterKey` of the parameter. */
  key: string;
  hours: number;
  /** `day` when `analyzed_at_resolution` is `day` (whole local days × 24). */
  resolution: 'instant' | 'day';
};

/**
 * Holding time (collection `datetime` → `analyzed_at`) of every usable result
 * with an `analyzed_at`. With `analyzed_at_resolution: "day"` the time of day
 * is ignored: the difference is in whole local calendar dates × 24 h.
 * Holding-time limits per parameter are not applied here.
 */
export function getHoldingTimes(sample: WaterSample): HoldingTime[] {
  const out: HoldingTime[] = [];
  sample.results.forEach((r, index) => {
    if (!isResultUsable(r) || r.analyzed_at === undefined) return;
    const key = parameterKey(r.parameter);
    if (r.analyzed_at_resolution === 'day') {
      const days =
        dayNumber(instantLocalDate(r.analyzed_at)) -
        dayNumber(instantLocalDate(sample.datetime));
      if (Number.isNaN(days)) return;
      out.push({
        result_index: index,
        key,
        hours: days * 24,
        resolution: 'day',
      });
      return;
    }
    const ms = toTime(r.analyzed_at) - toTime(sample.datetime);
    if (Number.isNaN(ms)) return;
    out.push({
      result_index: index,
      key,
      hours: ms / 3_600_000,
      resolution: 'instant',
    });
  });
  return out;
}

/**
 * Whether the sample arrived at the lab cold enough:
 * `laboratory.received_temperature ≤ maxC` (default 6 °C). `undefined` when
 * no receipt temperature is recorded.
 */
export function getReceivedTemperatureCompliance(
  sample: WaterSample,
  maxC = 6,
): boolean | undefined {
  const t = sample.laboratory?.received_temperature;
  if (typeof t !== 'number') return undefined;
  return t <= maxC;
}

/**
 * Purge stabilization tolerances keyed by `parameterKey`. A step between two
 * consecutive readings is within tolerance when `|Δ| ≤ abs` or
 * `|Δ| / |previous| × 100 ≤ rel_pct` (either one, when both are given).
 */
export type PurgeStabilizationCriteria = Record<
  string,
  { abs?: number; rel_pct?: number }
>;

/**
 * Default low-flow purge stabilization criteria (US EPA low-flow guidance /
 * ASTM D6771): pH ±0.1, specific conductance ±3 %, temperature ±0.2 °C, ORP
 * ±10 mV, dissolved oxygen ±0.2 mg/L or ±10 %, turbidity ±10 %.
 */
export const DEFAULT_PURGE_STABILIZATION_CRITERIA: PurgeStabilizationCriteria =
  {
    ph: { abs: 0.1 },
    specific_conductance: { rel_pct: 3 },
    temperature: { abs: 0.2 },
    orp: { abs: 10 },
    dissolved_oxygen: { abs: 0.2, rel_pct: 10 },
    turbidity: { rel_pct: 10 },
    turbidity_ntu: { rel_pct: 10 },
    turbidity_fnu: { rel_pct: 10 },
    turbidity_fau: { rel_pct: 10 },
  };

/** Purge stabilization result, overall and per parameter. */
export type PurgeStabilization = {
  /** Every parameter with criteria stabilized (false when none has criteria). */
  stabilized: boolean;
  parameters: { key: string; stabilized: boolean; readings: number }[];
};

function withinTolerance(
  prev: number,
  next: number,
  c: { abs?: number; rel_pct?: number },
): boolean {
  const delta = Math.abs(next - prev);
  if (c.abs !== undefined && delta <= c.abs + EPSILON) return true;
  if (c.rel_pct !== undefined) {
    if (prev === 0) return delta <= EPSILON;
    if ((delta / Math.abs(prev)) * 100 <= c.rel_pct + EPSILON) return true;
  }
  return false;
}

/**
 * Derives purge stabilization from `purge.readings`. Readings are grouped by
 * `parameterKey` and ordered by `elapsed`; a parameter is stabilized when its
 * last `window` (default 3) readings step within its criteria. Parameters
 * without criteria are ignored. Returns `undefined` without readings.
 */
export function getPurgeStabilization(
  purge: Purge | undefined,
  criteria: PurgeStabilizationCriteria = DEFAULT_PURGE_STABILIZATION_CRITERIA,
  window = 3,
): PurgeStabilization | undefined {
  const readings = purge?.readings ?? [];
  if (readings.length === 0) return undefined;
  const byKey = new Map<string, { elapsed: number; value: number }[]>();
  for (const r of readings) {
    const key = parameterKey(r.parameter);
    if (!criteria[key]) continue;
    const list = byKey.get(key) ?? [];
    list.push({ elapsed: r.elapsed, value: r.value });
    byKey.set(key, list);
  }
  const parameters: PurgeStabilization['parameters'] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.elapsed - b.elapsed);
    const n = Math.max(window, 2);
    let stabilized = list.length >= n;
    if (stabilized) {
      const tail = list.slice(-n);
      for (let i = 1; i < tail.length; i++) {
        if (!withinTolerance(tail[i - 1].value, tail[i].value, criteria[key])) {
          stabilized = false;
          break;
        }
      }
    }
    parameters.push({ key, stabilized, readings: list.length });
  }
  return {
    stabilized: parameters.length > 0 && parameters.every(p => p.stabilized),
    parameters,
  };
}

/** Acid mine drainage indicators of a sample. */
export type AcidDrainageIndicators = {
  /** `alkalinity_total_as_caco3 − acidity_total_as_caco3`, mg/L as CaCO₃. */
  net_alkalinity?: number;
  /** `sulfate / chloride` mass ratio (mg/L ÷ mg/L). */
  sulfate_chloride_ratio?: number;
};

/**
 * Acid drainage indicators from usable, uncensored results: net alkalinity
 * (total alkalinity − total acidity, both as CaCO₃; negative = net acidic)
 * and the sulfate/chloride mass ratio. Each field is present only when its
 * inputs are (and chloride is above 0).
 */
export function getAcidDrainageIndicators(
  sample: WaterSample,
): AcidDrainageIndicators {
  const out: AcidDrainageIndicators = {};
  const alk = pickValue(sample, 'alkalinity_total_as_caco3');
  const acid = pickValue(sample, 'acidity_total_as_caco3');
  if (alk !== undefined && acid !== undefined) out.net_alkalinity = alk - acid;
  const so4 = pickValue(sample, 'sulfate');
  const cl = pickValue(sample, 'chloride');
  if (so4 !== undefined && cl !== undefined && cl > 0) {
    out.sulfate_chloride_ratio = so4 / cl;
  }
  return out;
}

/** Major-ion meq/L used by Piper, Stiff and facies (missing ions = 0). */
export type StiffValues = {
  na_k: number;
  ca: number;
  mg: number;
  cl: number;
  hco3_co3: number;
  so4: number;
};

/**
 * Stiff diagram values in meq/L: Na⁺ + K⁺, Ca²⁺, Mg²⁺ (cations) and Cl⁻,
 * HCO₃⁻ + CO₃²⁻ (falling back to `alkalinity_total_as_caco3`), SO₄²⁻
 * (anions). Unmeasured ions count as 0. Returns `undefined` without at least
 * one of those cations and one of those anions measured.
 */
export function getStiffValues(sample: WaterSample): StiffValues | undefined {
  const na = meqOf(sample, 'sodium');
  const k = meqOf(sample, 'potassium');
  const ca = meqOf(sample, 'calcium');
  const mg = meqOf(sample, 'magnesium');
  const cl = meqOf(sample, 'chloride');
  const hco3 = carbonateMeq(sample);
  const so4 = meqOf(sample, 'sulfate');
  if ([na, k, ca, mg].every(v => v === undefined)) return undefined;
  if ([cl, hco3, so4].every(v => v === undefined)) return undefined;
  return {
    na_k: (na ?? 0) + (k ?? 0),
    ca: ca ?? 0,
    mg: mg ?? 0,
    cl: cl ?? 0,
    hco3_co3: hco3 ?? 0,
    so4: so4 ?? 0,
  };
}

/** Piper diagram position of a sample. Percentages are meq % (0–100). */
export type PiperCoordinates = {
  cations: { ca: number; mg: number; na_k: number };
  anions: { hco3_co3: number; cl: number; so4: number };
  /**
   * Point in the central diamond, in a unit-side rhombus frame: bottom vertex
   * (0, 0) = 100 % Na+K and 100 % HCO₃+CO₃; left (−0.5, √3/2) = Ca+Mg /
   * HCO₃+CO₃; right (0.5, √3/2) = Na+K / Cl+SO₄; top (0, √3) = Ca+Mg /
   * Cl+SO₄.
   */
  diamond: { x: number; y: number };
};

/**
 * Piper diagram coordinates: cation (Ca, Mg, Na+K) and anion (HCO₃+CO₃, Cl,
 * SO₄) meq percentages of each triangle, and the projected diamond point.
 * Returns `undefined` when either triangle sums to 0 or is unmeasured.
 */
export function getPiperCoordinates(
  sample: WaterSample,
): PiperCoordinates | undefined {
  const s = getStiffValues(sample);
  if (!s) return undefined;
  const cat = s.ca + s.mg + s.na_k;
  const an = s.hco3_co3 + s.cl + s.so4;
  if (!(cat > 0) || !(an > 0)) return undefined;
  const cations = {
    ca: (s.ca / cat) * 100,
    mg: (s.mg / cat) * 100,
    na_k: (s.na_k / cat) * 100,
  };
  const anions = {
    hco3_co3: (s.hco3_co3 / an) * 100,
    cl: (s.cl / an) * 100,
    so4: (s.so4 / an) * 100,
  };
  const a = cations.na_k / 100;
  const b = (anions.cl + anions.so4) / 100;
  const h = Math.sqrt(3) / 2;
  return {
    cations,
    anions,
    diamond: { x: (a + b - 1) / 2, y: h * (1 - a + b) },
  };
}

/** Dominant cation and anion (> 50 meq %), else `mixed`. */
export type HydrochemicalFacies = {
  cation: 'calcium' | 'magnesium' | 'sodium_potassium' | 'mixed';
  anion: 'bicarbonate' | 'chloride' | 'sulfate' | 'mixed';
};

/**
 * Hydrochemical facies from the Piper percentages: the cation and anion each
 * above 50 meq % of their triangle, or `mixed` when none dominates.
 * `bicarbonate` stands for HCO₃⁻ + CO₃²⁻.
 */
export function getHydrochemicalFacies(
  sample: WaterSample,
): HydrochemicalFacies | undefined {
  const p = getPiperCoordinates(sample);
  if (!p) return undefined;
  const { ca, mg, na_k } = p.cations;
  const { hco3_co3, cl, so4 } = p.anions;
  const cation: HydrochemicalFacies['cation'] =
    ca > 50
      ? 'calcium'
      : mg > 50
        ? 'magnesium'
        : na_k > 50
          ? 'sodium_potassium'
          : 'mixed';
  const anion: HydrochemicalFacies['anion'] =
    hco3_co3 > 50
      ? 'bicarbonate'
      : cl > 50
        ? 'chloride'
        : so4 > 50
          ? 'sulfate'
          : 'mixed';
  return { cation, anion };
}

/** One result outside a limit. */
export type Exceedance = {
  /** Index of the result in `sample.results`. */
  result_index: number;
  parameter: Parameter;
  limit: Limit;
  kind: 'above_max' | 'below_min' | 'presence';
};

function limitMatches(key: string, limit: Limit): boolean {
  if (key === 'turbidity_fau' || limit.code === 'turbidity_fau') return false;
  if (limit.code === key) return true;
  return (
    NEPHELOMETRIC_TURBIDITY_CODES.includes(key) &&
    NEPHELOMETRIC_TURBIDITY_CODES.includes(limit.code)
  );
}

/**
 * Compares a sample's usable results with a limit set (or a list of limits).
 *
 * - Results resolve through `parameterKey`, so a CAS-coded result matches the
 *   limit of its `welldot` equivalent.
 * - Turbidity: `turbidity`, `turbidity_ntu` and `turbidity_fnu` match a limit
 *   on any of those codes; `turbidity_fau` is never compared.
 * - A limit with `fraction` applies only to results of that fraction (a
 *   result without `fraction` counts as `total`).
 * - `presence_allowed: false` is exceeded by `presence: true` (`presence`).
 * - `<` and `not_detected` never exceed a maximum (`<` is below a minimum when
 *   its value is ≤ `min`); `>` exceeds a maximum when its value is ≥ `max`.
 *   Other numeric values are compared directly (bounds inclusive).
 * - Rejected results and text results are skipped.
 */
export function getExceedances(
  sample: WaterSample,
  limits: LimitSet | readonly Limit[],
): Exceedance[] {
  const list: readonly Limit[] = 'limits' in limits ? limits.limits : limits;
  const out: Exceedance[] = [];
  sample.results.forEach((r, index) => {
    if (!isResultUsable(r)) return;
    const key = parameterKey(r.parameter);
    for (const limit of list) {
      if (!limitMatches(key, limit)) continue;
      if (
        limit.fraction !== undefined &&
        (r.fraction ?? 'total') !== limit.fraction
      ) {
        continue;
      }
      const push = (kind: Exceedance['kind']) =>
        out.push({ result_index: index, parameter: r.parameter, limit, kind });

      if (r.presence !== undefined) {
        if (limit.presence_allowed === false && r.presence === true) {
          push('presence');
        }
        continue;
      }
      if (typeof r.value !== 'number' || r.qualifier === 'not_detected') {
        continue;
      }
      const v = r.value;
      if (r.qualifier === '<') {
        if (limit.min !== undefined && v <= limit.min) push('below_min');
      } else if (r.qualifier === '>') {
        if (limit.max !== undefined && v >= limit.max) push('above_max');
      } else {
        if (limit.max !== undefined && v > limit.max) push('above_max');
        if (limit.min !== undefined && v < limit.min) push('below_min');
      }
    }
  });
  return out;
}

// ─── Warnings ────────────────────────────────────────────────────────────────

export type WaterSampleWarningCode =
  | 'parent_missing'
  | 'dissolved_without_filtration'
  | 'depth_outside_screen'
  | 'depth_below_well_bottom'
  | 'depth_above_static_level'
  | 'value_form_mismatch'
  | 'not_detected_without_limit'
  | 'duplicate_result'
  | 'unknown_parameter_code'
  | 'analyzed_before_collection'
  | 'received_before_collection'
  | 'reference_unresolved'
  | 'corrects_cycle';

export type WaterSampleWarning = {
  code: WaterSampleWarningCode;
  /**
   * `[sample id]`; for `reference_unresolved`, `[sample id, missing id]`.
   */
  ids: string[];
  /** Index in `sample.results` for result-level warnings. */
  result_index?: number;
};

/** Whether instant `a` is before instant `b`; whole local dates when `day`. */
function isBefore(a: string, b: string, resolution?: string): boolean {
  if (resolution === 'day') return instantLocalDate(a) < instantLocalDate(b);
  const ta = toTime(a);
  const tb = toTime(b);
  return !Number.isNaN(ta) && !Number.isNaN(tb) && ta < tb;
}

/**
 * Validation warnings of the `water_samples` block (.well v2.3). Warnings
 * never make a file invalid; every sample in the file is checked, retracted
 * or not. Sample-level warnings carry `ids: [sample]`, result-level ones add
 * `result_index`.
 *
 * - `parent_missing` — `field_duplicate` / `split_sample` without `parent_sample_id`.
 * - `dissolved_without_filtration` — `fraction: "dissolved"` without `filtration`.
 * - `depth_outside_screen` — a sample depth end outside every `well_screen`
 *   interval (only when the well has screens).
 * - `depth_below_well_bottom` — deeper than `well_depth` (else the deepest
 *   `bore_hole`).
 * - `depth_above_static_level` — shallower than the `static_level` of the
 *   `static_level_event_id` event.
 * - `value_form_mismatch` — a value form (`value` / `presence` / `text`)
 *   other than the vocabulary `form` of the code.
 * - `not_detected_without_limit` — `not_detected` without `detection_limit`.
 * - `duplicate_result` — the same `parameterKey` + `fraction` + `measured_in`
 *   repeated in a sample (flagged on each repetition after the first).
 * - `unknown_parameter_code` — a `welldot` code missing from the vocabulary.
 * - `analyzed_before_collection` / `received_before_collection` —
 *   `analyzed_at` / `laboratory.received_at` before `datetime` (local dates
 *   compared when the resolution is `day`).
 * - `reference_unresolved` — `corrects`, `parent_sample_id`,
 *   `static_level_event_id` or `sampling_point.pump_installation_id` that does
 *   not resolve. ids: [sample, missing id].
 * - `corrects_cycle` — the `corrects` chain loops back to the sample.
 */
export function getWaterSampleWarnings(well: Well): WaterSampleWarning[] {
  const warnings: WaterSampleWarning[] = [];
  const samples = well.water_samples ?? [];
  const sampleIds = new Set(samples.map(s => s.id));
  const eventIds = new Set((well.hydrodynamic_events ?? []).map(e => e.id));
  const pumpIds = new Set((well.pump_installations ?? []).map(p => p.id));
  const correctsOf = new Map<string, string>();
  for (const s of samples) {
    if (typeof s.corrects === 'string') correctsOf.set(s.id, s.corrects);
  }
  const bottom = wellBottom(well);

  for (const sample of samples) {
    const push = (
      code: WaterSampleWarningCode,
      extra: { ids?: string[]; result_index?: number } = {},
    ) =>
      warnings.push({
        code,
        ids: extra.ids ?? [sample.id],
        ...(extra.result_index !== undefined && {
          result_index: extra.result_index,
        }),
      });

    if (
      (sample.sample_type === 'field_duplicate' ||
        sample.sample_type === 'split_sample') &&
      sample.parent_sample_id === undefined
    ) {
      push('parent_missing');
    }

    // References
    const refs: [string | undefined, Set<string>][] = [
      [sample.corrects, sampleIds],
      [sample.parent_sample_id, sampleIds],
      [sample.static_level_event_id, eventIds],
      [sample.sampling_point?.pump_installation_id, pumpIds],
    ];
    for (const [ref, ids] of refs) {
      if (ref !== undefined && !ids.has(ref)) {
        push('reference_unresolved', { ids: [sample.id, ref] });
      }
    }

    if (sample.corrects !== undefined && sampleIds.has(sample.corrects)) {
      const seen = new Set<string>();
      let next: string | undefined = sample.corrects;
      while (next !== undefined && !seen.has(next)) {
        if (next === sample.id) {
          push('corrects_cycle');
          break;
        }
        seen.add(next);
        next = correctsOf.get(next);
      }
    }

    // Depth
    const depth = getSampleDepth(well, sample);
    if (depth) {
      const [top, bot] = depthEnds(depth);
      if (
        well.well_screen.length > 0 &&
        (!insideScreen(well, top) || !insideScreen(well, bot))
      ) {
        push('depth_outside_screen');
      }
      if (bottom !== undefined && bot > bottom) {
        push('depth_below_well_bottom');
      }
      const level = referencedStaticLevel(well, sample);
      if (level !== undefined && top < level) {
        push('depth_above_static_level');
      }
    }

    // Lab receipt
    const lab = sample.laboratory;
    if (
      lab?.received_at !== undefined &&
      isBefore(lab.received_at, sample.datetime, lab.received_at_resolution)
    ) {
      push('received_before_collection');
    }

    // Results
    const identities = new Set<string>();
    sample.results.forEach((r, index) => {
      const at = { result_index: index };
      if (r.fraction === 'dissolved' && r.filtration === undefined) {
        push('dissolved_without_filtration', at);
      }
      const def = getParameterDefinition(r.parameter);
      if (def) {
        const forms = (['value', 'presence', 'text'] as const).filter(
          f => r[f] !== undefined,
        );
        if (forms.some(f => f !== def.form)) push('value_form_mismatch', at);
      }
      if (r.qualifier === 'not_detected' && r.detection_limit === undefined) {
        push('not_detected_without_limit', at);
      }
      const identity = resultIdentity(r);
      if (identities.has(identity)) push('duplicate_result', at);
      identities.add(identity);
      if (!isKnownParameter(r.parameter)) push('unknown_parameter_code', at);
      if (
        r.analyzed_at !== undefined &&
        isBefore(r.analyzed_at, sample.datetime, r.analyzed_at_resolution)
      ) {
        push('analyzed_before_collection', at);
      }
    });
  }

  return warnings;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/** Unit symbol of a result: the vocabulary unit, else `mg/L` for unmapped CAS numbers, else `unit`. */
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

/** Translated words {@link formatWaterQualityResult} needs. */
export type ResultValueLabels = {
  notDetected: string;
  present: string;
  absent: string;
  /** Short "estimated" marker, shown as `0.004 (est.)`. */
  estimated: string;
};

/**
 * Display text of a result's value: `< 0.001`, `0.004 (est.)`, the
 * not-detected/present/absent label, or the qualitative text.
 * `formatNumber` defaults to `String`.
 */
export function formatWaterQualityResult(
  result: Pick<WaterQualityResult, 'value' | 'presence' | 'text' | 'qualifier'>,
  labels: ResultValueLabels,
  formatNumber: (_n: number) => string = n => String(n),
): string {
  if (result.qualifier === 'not_detected') return labels.notDetected;
  if (result.presence !== undefined)
    return result.presence ? labels.present : labels.absent;
  if (result.text !== undefined) return result.text;
  if (result.value === undefined) return '—';
  const n = formatNumber(result.value);
  if (result.qualifier === '<' || result.qualifier === '>')
    return `${result.qualifier} ${n}`;
  if (result.qualifier === 'estimated') return `${n} (${labels.estimated})`;
  return n;
}
