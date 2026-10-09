/**
 * Jurisdiction limit sets for water quality results.
 *
 * Limits are never written to `.well` files (jurisdiction neutrality): a
 * consumer picks a set at display time and compares results with the
 * `getExceedances` helper of `@welldot/utils`.
 *
 * IMPORTANT: values below are transcribed from the cited sources and MUST be
 * verified against the official documents before regulatory use. Only
 * parameters of the core `welldot` vocabulary are included; values are in
 * the parameter's canonical unit (mg/L for substances).
 */

/** Why a limit exists. */
export type LimitBasis = 'health' | 'aesthetic' | 'indicator' | 'operational';

/** One limit for one parameter code. */
export type Limit = {
  /** `welldot` parameter code. */
  code: string;
  /** Maximum allowed value (inclusive), in the code's canonical unit. */
  max?: number;
  /** Minimum allowed value (inclusive), in the code's canonical unit. */
  min?: number;
  /** `false` for presence/absence parameters that must be absent. */
  presence_allowed?: false;
  /** Restricts the limit to one analytical fraction. */
  fraction?: 'total' | 'dissolved' | 'suspended';
  basis?: LimitBasis;
  /** Provisional values, alternative bases, transition dates, etc. */
  note?: string;
};

/** A selectable set of limits from one jurisdiction or guideline. */
export type LimitSet = {
  id: string;
  name: string;
  /** ISO 3166 code, `EU`, or `INT` for international guidelines. */
  jurisdiction: string;
  /** Citation of the source document. */
  source: string;
  limits: readonly Limit[];
};

/**
 * Turbidity codes that compare against nephelometric turbidity limits.
 * `turbidity_fau` (attenuation) is never compared.
 */
export const NEPHELOMETRIC_TURBIDITY_CODES: readonly string[] = [
  'turbidity',
  'turbidity_ntu',
  'turbidity_fnu',
];

/** WHO Guidelines for Drinking-water Quality, 4th ed. + 1st/2nd addenda (2022). */
export const WHO_GDWQ_2022: LimitSet = {
  id: 'who_gdwq_2022',
  name: 'WHO Guidelines for Drinking-water Quality (2022)',
  jurisdiction: 'INT',
  source:
    'WHO, Guidelines for drinking-water quality: 4th edition incorporating the first and second addenda, 2022',
  limits: [
    { code: 'antimony', max: 0.02, basis: 'health' },
    { code: 'arsenic', max: 0.01, basis: 'health', note: 'provisional' },
    { code: 'barium', max: 1.3, basis: 'health' },
    { code: 'boron', max: 2.4, basis: 'health' },
    { code: 'cadmium', max: 0.003, basis: 'health' },
    { code: 'chromium', max: 0.05, basis: 'health', note: 'provisional' },
    { code: 'copper', max: 2, basis: 'health' },
    { code: 'fluoride', max: 1.5, basis: 'health' },
    { code: 'lead', max: 0.01, basis: 'health', note: 'provisional' },
    { code: 'manganese', max: 0.08, basis: 'health', note: 'provisional' },
    { code: 'mercury', max: 0.006, basis: 'health', note: 'inorganic mercury' },
    { code: 'nickel', max: 0.07, basis: 'health' },
    { code: 'nitrate_as_no3', max: 50, basis: 'health' },
    { code: 'nitrite_as_no2', max: 3, basis: 'health' },
    { code: 'selenium', max: 0.04, basis: 'health', note: 'provisional' },
    { code: 'uranium', max: 0.03, basis: 'health', note: 'provisional' },
    { code: 'e_coli', presence_allowed: false, basis: 'health' },
    {
      code: 'thermotolerant_coliforms',
      presence_allowed: false,
      basis: 'health',
    },
    { code: 'gross_alpha', max: 0.5, basis: 'health', note: 'screening level' },
    { code: 'gross_beta', max: 1, basis: 'health', note: 'screening level' },
  ],
};

/** Brazil — Portaria GM/MS nº 888/2021 (drinking water potability standard). */
export const BR_GM_MS_888_2021: LimitSet = {
  id: 'br_gm_ms_888_2021',
  name: 'Brasil — Portaria GM/MS 888/2021',
  jurisdiction: 'BR',
  source: 'Ministério da Saúde, Portaria GM/MS nº 888, de 4 de maio de 2021',
  limits: [
    // Inorganic substances (health)
    { code: 'antimony', max: 0.006, basis: 'health' },
    { code: 'arsenic', max: 0.01, basis: 'health' },
    { code: 'barium', max: 0.7, basis: 'health' },
    { code: 'cadmium', max: 0.003, basis: 'health' },
    { code: 'lead', max: 0.01, basis: 'health' },
    { code: 'cyanide_total_as_cn', max: 0.07, basis: 'health' },
    { code: 'copper', max: 2, basis: 'health' },
    { code: 'chromium', max: 0.05, basis: 'health' },
    { code: 'fluoride', max: 1.5, basis: 'health' },
    { code: 'mercury', max: 0.001, basis: 'health' },
    { code: 'nickel', max: 0.07, basis: 'health' },
    { code: 'nitrate_as_n', max: 10, basis: 'health' },
    { code: 'nitrite_as_n', max: 1, basis: 'health' },
    { code: 'selenium', max: 0.04, basis: 'health' },
    { code: 'uranium', max: 0.03, basis: 'health' },
    // Organoleptic standard
    { code: 'aluminum', max: 0.2, basis: 'aesthetic' },
    { code: 'ammonia_as_nh3', max: 1.2, basis: 'aesthetic' },
    { code: 'chloride', max: 250, basis: 'aesthetic' },
    { code: 'apparent_color', max: 15, basis: 'aesthetic' },
    { code: 'hardness_total_as_caco3', max: 300, basis: 'aesthetic' },
    { code: 'iron', max: 0.3, basis: 'aesthetic' },
    { code: 'manganese', max: 0.1, basis: 'aesthetic' },
    { code: 'sodium', max: 200, basis: 'aesthetic' },
    { code: 'total_dissolved_solids', max: 500, basis: 'aesthetic' },
    { code: 'sulfate', max: 250, basis: 'aesthetic' },
    {
      code: 'turbidity',
      max: 5,
      basis: 'aesthetic',
      note: 'organoleptic standard (uT)',
    },
    // Operational
    {
      code: 'ph',
      min: 6,
      max: 9,
      basis: 'operational',
      note: 'recommended range',
    },
    {
      code: 'free_chlorine',
      min: 0.2,
      max: 5,
      basis: 'operational',
      note: 'residual in the distribution system',
    },
    // Microbiological
    { code: 'e_coli', presence_allowed: false, basis: 'health' },
    {
      code: 'total_coliforms',
      presence_allowed: false,
      basis: 'indicator',
      note: 'tolerances apply by system size and sampling point',
    },
    // Radioactivity
    { code: 'gross_alpha', max: 0.5, basis: 'health', note: 'screening level' },
    { code: 'gross_beta', max: 1, basis: 'health', note: 'screening level' },
    { code: 'radium_226', max: 1, basis: 'health' },
    { code: 'radium_228', max: 0.1, basis: 'health' },
  ],
};

/** EU — Directive (EU) 2020/2184 on the quality of water intended for human consumption. */
export const EU_2020_2184: LimitSet = {
  id: 'eu_2020_2184',
  name: 'EU Drinking Water Directive 2020/2184',
  jurisdiction: 'EU',
  source:
    'Directive (EU) 2020/2184 of the European Parliament and of the Council, Annex I',
  limits: [
    // Part A — microbiological
    { code: 'e_coli', presence_allowed: false, basis: 'health' },
    // Part B — chemical
    { code: 'antimony', max: 0.01, basis: 'health' },
    { code: 'arsenic', max: 0.01, basis: 'health' },
    {
      code: 'boron',
      max: 1.5,
      basis: 'health',
      note: '2.4 mg/L where desalinated water is the predominant source',
    },
    { code: 'cadmium', max: 0.005, basis: 'health' },
    {
      code: 'chromium',
      max: 0.05,
      basis: 'health',
      note: '0.025 mg/L from 12 January 2036',
    },
    { code: 'copper', max: 2, basis: 'health' },
    { code: 'cyanide_total_as_cn', max: 0.05, basis: 'health' },
    { code: 'fluoride', max: 1.5, basis: 'health' },
    {
      code: 'lead',
      max: 0.01,
      basis: 'health',
      note: '0.005 mg/L from 12 January 2036',
    },
    { code: 'mercury', max: 0.001, basis: 'health' },
    { code: 'nickel', max: 0.02, basis: 'health' },
    { code: 'nitrate_as_no3', max: 50, basis: 'health' },
    { code: 'nitrite_as_no2', max: 0.5, basis: 'health', note: 'at the tap' },
    { code: 'selenium', max: 0.02, basis: 'health' },
    { code: 'uranium', max: 0.03, basis: 'health' },
    // Part C — indicator parameters
    { code: 'aluminum', max: 0.2, basis: 'indicator' },
    { code: 'chloride', max: 250, basis: 'indicator' },
    {
      code: 'specific_conductance',
      max: 2500,
      basis: 'indicator',
      note: 'directive value is at 20 °C',
    },
    { code: 'ph', min: 6.5, max: 9.5, basis: 'indicator' },
    { code: 'iron', max: 0.2, basis: 'indicator' },
    { code: 'manganese', max: 0.05, basis: 'indicator' },
    { code: 'sodium', max: 200, basis: 'indicator' },
    { code: 'sulfate', max: 250, basis: 'indicator' },
    { code: 'total_coliforms', presence_allowed: false, basis: 'indicator' },
  ],
};

/** All bundled limit sets, in display order. */
export const WATER_QUALITY_LIMIT_SETS: readonly LimitSet[] = [
  WHO_GDWQ_2022,
  BR_GM_MS_888_2021,
  EU_2020_2184,
];

/** Finds a bundled limit set by `id`. */
export function getLimitSet(id: string): LimitSet | undefined {
  return WATER_QUALITY_LIMIT_SETS.find(s => s.id === id);
}
