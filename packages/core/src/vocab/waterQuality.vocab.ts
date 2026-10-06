import type { Parameter } from '../types/well.types';

/**
 * Version of the published `welldot` water quality parameter vocabulary.
 * Bumped whenever a code is added or a definition changes.
 */
export const WATER_QUALITY_VOCABULARY_VERSION = '1.0.0';

/** Grouping used to organize the vocabulary (display only). */
export type ParameterGroup =
  | 'physical'
  | 'aggregate'
  | 'major_ion'
  | 'nutrient'
  | 'organic'
  | 'disinfection'
  | 'mining_redox'
  | 'metal'
  | 'microbiology'
  | 'radioactivity';

/** Which value form a parameter's results use. */
export type ParameterForm = 'value' | 'presence' | 'text';

/** Canonical unit of a parameter. `ucum` is absent where UCUM has no code. */
export type ParameterUnit = {
  /** Display symbol (e.g. `mg/L`, `µS/cm`, `NTU`). Empty for dimensionless. */
  symbol: string;
  /** UCUM code, when one exists. */
  ucum?: string;
};

/** One entry of the `welldot` parameter vocabulary. */
export type ParameterDefinition = {
  code: string;
  group: ParameterGroup;
  /** Canonical English label. */
  label: string;
  /** Translations of `label`, keyed by BCP 47 language tag. */
  labels: Record<string, string>;
  unit: ParameterUnit;
  form: ParameterForm;
  /** Published CAS equivalence: a `cas` result with this code is this parameter. */
  cas?: string;
  /**
   * Molar mass (g/mol) of the species the code is expressed as (e.g. N for
   * `nitrate_as_n`, CaCO₃ for alkalinities). Present for ions used in
   * ion-balance and hydrochemical derivations.
   */
  molar_mass?: number;
  /** Ionic charge of that species (signed). */
  charge?: number;
};

export const WATER_QUALITY_UNITS = {
  mg_l: { symbol: 'mg/L', ucum: 'mg/L' },
  us_cm: { symbol: 'µS/cm', ucum: 'uS/cm' },
  celsius: { symbol: '°C', ucum: 'Cel' },
  mv: { symbol: 'mV', ucum: 'mV' },
  ph: { symbol: '', ucum: '[pH]' },
  ftu: { symbol: 'FTU' },
  ntu: { symbol: 'NTU' },
  fnu: { symbol: 'FNU' },
  fau: { symbol: 'FAU' },
  hazen: { symbol: 'uH' },
  mpn_100ml: { symbol: 'MPN/100 mL', ucum: '{MPN}/(100.mL)' },
  cfu_100ml: { symbol: 'CFU/100 mL', ucum: '{CFU}/(100.mL)' },
  cfu_ml: { symbol: 'CFU/mL', ucum: '{CFU}/mL' },
  bq_l: { symbol: 'Bq/L', ucum: 'Bq/L' },
  none: { symbol: '' },
} as const satisfies Record<string, ParameterUnit>;

const U = WATER_QUALITY_UNITS;

type OptionalParameterFields = Partial<
  Pick<ParameterDefinition, 'cas' | 'molar_mass' | 'charge' | 'form'>
>;

/** Builds one vocabulary entry; `form` defaults to `value`. */
function defineParameter(
  code: string,
  group: ParameterGroup,
  label: string,
  pt: string,
  unit: ParameterUnit,
  extra: OptionalParameterFields = {},
): ParameterDefinition {
  return {
    code,
    group,
    label,
    labels: { pt },
    unit,
    form: extra.form ?? 'value',
    ...(extra.cas !== undefined && { cas: extra.cas }),
    ...(extra.molar_mass !== undefined && { molar_mass: extra.molar_mass }),
    ...(extra.charge !== undefined && { charge: extra.charge }),
  };
}

/** The core `welldot` parameter vocabulary (98 codes). */
export const WATER_QUALITY_PARAMETERS: readonly ParameterDefinition[] = [
  // Physical / field
  defineParameter(
    'temperature',
    'physical',
    'Temperature',
    'Temperatura',
    U.celsius,
  ),
  defineParameter('ph', 'physical', 'pH', 'pH', U.ph),
  defineParameter(
    'specific_conductance',
    'physical',
    'Specific conductance at 25 °C',
    'Condutividade elétrica a 25 °C',
    U.us_cm,
  ),
  defineParameter(
    'conductivity_uncompensated',
    'physical',
    'Electrical conductivity, uncompensated',
    'Condutividade sem compensação',
    U.us_cm,
  ),
  defineParameter(
    'dissolved_oxygen',
    'physical',
    'Dissolved oxygen',
    'Oxigênio dissolvido',
    U.mg_l,
  ),
  defineParameter(
    'orp',
    'physical',
    'Oxidation-reduction potential vs. reference electrode',
    'Potencial redox vs. eletrodo de referência',
    U.mv,
  ),
  defineParameter(
    'eh',
    'physical',
    'Redox potential vs. SHE',
    'Potencial redox corrigido vs. EPH',
    U.mv,
  ),
  defineParameter(
    'turbidity',
    'physical',
    'Turbidity, formazin, method unspecified',
    'Turbidez, formazina sem método identificado',
    U.ftu,
  ),
  defineParameter(
    'turbidity_ntu',
    'physical',
    'Turbidity, nephelometric white light',
    'Turbidez nefelométrica, luz branca',
    U.ntu,
  ),
  defineParameter(
    'turbidity_fnu',
    'physical',
    'Turbidity, nephelometric infrared (ISO 7027)',
    'Turbidez nefelométrica, infravermelho',
    U.fnu,
  ),
  defineParameter(
    'turbidity_fau',
    'physical',
    'Turbidity, attenuation (ISO 7027)',
    'Turbidez por atenuação',
    U.fau,
  ),
  defineParameter(
    'apparent_color',
    'physical',
    'Apparent color',
    'Cor aparente',
    U.hazen,
  ),
  defineParameter(
    'true_color',
    'physical',
    'True color',
    'Cor verdadeira',
    U.hazen,
  ),
  defineParameter('odor', 'physical', 'Odor', 'Odor', U.none, { form: 'text' }),
  defineParameter('taste', 'physical', 'Taste', 'Gosto', U.none, {
    form: 'text',
  }),
  defineParameter(
    'total_dissolved_solids',
    'physical',
    'Total dissolved solids',
    'Sólidos totais dissolvidos',
    U.mg_l,
  ),
  defineParameter(
    'total_suspended_solids',
    'physical',
    'Total suspended solids',
    'Sólidos suspensos totais',
    U.mg_l,
  ),
  defineParameter(
    'total_solids',
    'physical',
    'Total solids',
    'Sólidos totais',
    U.mg_l,
  ),
  defineParameter(
    'free_co2',
    'physical',
    'Free carbon dioxide',
    'Gás carbônico livre',
    U.mg_l,
  ),

  // Aggregate (expressed as CaCO₃: 100.087 g/mol, divalent → 50.04 mg/meq)
  defineParameter(
    'alkalinity_total_as_caco3',
    'aggregate',
    'Total alkalinity as CaCO₃',
    'Alcalinidade total como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: -2 },
  ),
  defineParameter(
    'alkalinity_bicarbonate_as_caco3',
    'aggregate',
    'Bicarbonate alkalinity as CaCO₃',
    'Alcalinidade de bicarbonatos como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: -2 },
  ),
  defineParameter(
    'alkalinity_carbonate_as_caco3',
    'aggregate',
    'Carbonate alkalinity as CaCO₃',
    'Alcalinidade de carbonatos como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: -2 },
  ),
  defineParameter(
    'alkalinity_hydroxide_as_caco3',
    'aggregate',
    'Hydroxide alkalinity as CaCO₃',
    'Alcalinidade de hidróxidos como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: -2 },
  ),
  defineParameter(
    'acidity_total_as_caco3',
    'aggregate',
    'Total acidity as CaCO₃',
    'Acidez total como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: 2 },
  ),
  defineParameter(
    'hardness_total_as_caco3',
    'aggregate',
    'Total hardness as CaCO₃',
    'Dureza total como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: 2 },
  ),
  defineParameter(
    'hardness_calcium_as_caco3',
    'aggregate',
    'Calcium hardness as CaCO₃',
    'Dureza de cálcio como CaCO₃',
    U.mg_l,
    { molar_mass: 100.087, charge: 2 },
  ),

  // Major ions
  defineParameter('calcium', 'major_ion', 'Calcium', 'Cálcio', U.mg_l, {
    cas: '7440-70-2',
    molar_mass: 40.078,
    charge: 2,
  }),
  defineParameter('magnesium', 'major_ion', 'Magnesium', 'Magnésio', U.mg_l, {
    cas: '7439-95-4',
    molar_mass: 24.305,
    charge: 2,
  }),
  defineParameter('sodium', 'major_ion', 'Sodium', 'Sódio', U.mg_l, {
    cas: '7440-23-5',
    molar_mass: 22.99,
    charge: 1,
  }),
  defineParameter('potassium', 'major_ion', 'Potassium', 'Potássio', U.mg_l, {
    cas: '7440-09-7',
    molar_mass: 39.098,
    charge: 1,
  }),
  defineParameter(
    'bicarbonate',
    'major_ion',
    'Bicarbonate as HCO₃⁻',
    'Bicarbonato como HCO₃⁻',
    U.mg_l,
    { cas: '71-52-3', molar_mass: 61.017, charge: -1 },
  ),
  defineParameter(
    'carbonate',
    'major_ion',
    'Carbonate as CO₃²⁻',
    'Carbonato como CO₃²⁻',
    U.mg_l,
    { cas: '3812-32-6', molar_mass: 60.009, charge: -2 },
  ),
  defineParameter('chloride', 'major_ion', 'Chloride', 'Cloreto', U.mg_l, {
    cas: '16887-00-6',
    molar_mass: 35.453,
    charge: -1,
  }),
  defineParameter('sulfate', 'major_ion', 'Sulfate', 'Sulfato', U.mg_l, {
    cas: '14808-79-8',
    molar_mass: 96.06,
    charge: -2,
  }),
  defineParameter('fluoride', 'major_ion', 'Fluoride', 'Fluoreto', U.mg_l, {
    cas: '16984-48-8',
    molar_mass: 18.998,
    charge: -1,
  }),
  defineParameter(
    'silica_as_sio2',
    'major_ion',
    'Silica as SiO₂',
    'Sílica como SiO₂',
    U.mg_l,
    { cas: '7631-86-9' },
  ),

  // Nutrients
  defineParameter(
    'nitrate_as_n',
    'nutrient',
    'Nitrate as N',
    'Nitrato como N',
    U.mg_l,
    {
      molar_mass: 14.007,
      charge: -1,
    },
  ),
  defineParameter(
    'nitrate_as_no3',
    'nutrient',
    'Nitrate as NO₃⁻',
    'Nitrato como NO₃⁻',
    U.mg_l,
    { cas: '14797-55-8', molar_mass: 62.004, charge: -1 },
  ),
  defineParameter(
    'nitrite_as_n',
    'nutrient',
    'Nitrite as N',
    'Nitrito como N',
    U.mg_l,
    {
      molar_mass: 14.007,
      charge: -1,
    },
  ),
  defineParameter(
    'nitrite_as_no2',
    'nutrient',
    'Nitrite as NO₂⁻',
    'Nitrito como NO₂⁻',
    U.mg_l,
    { cas: '14797-65-0', molar_mass: 46.005, charge: -1 },
  ),
  defineParameter(
    'ammonia_as_n',
    'nutrient',
    'Ammonia nitrogen as N',
    'Nitrogênio amoniacal como N',
    U.mg_l,
    { molar_mass: 14.007, charge: 1 },
  ),
  defineParameter(
    'ammonia_as_nh3',
    'nutrient',
    'Ammonia as NH₃',
    'Amônia como NH₃',
    U.mg_l,
    {
      cas: '7664-41-7',
    },
  ),
  defineParameter(
    'kjeldahl_nitrogen_as_n',
    'nutrient',
    'Total Kjeldahl nitrogen as N',
    'Nitrogênio Kjeldahl total como N',
    U.mg_l,
  ),
  defineParameter(
    'phosphorus_total_as_p',
    'nutrient',
    'Total phosphorus as P',
    'Fósforo total como P',
    U.mg_l,
  ),
  defineParameter(
    'orthophosphate_as_po4',
    'nutrient',
    'Orthophosphate as PO₄³⁻',
    'Ortofosfato como PO₄³⁻',
    U.mg_l,
    { molar_mass: 94.971, charge: -3 },
  ),

  // Organic
  defineParameter(
    'total_organic_carbon',
    'organic',
    'Total organic carbon',
    'Carbono orgânico total',
    U.mg_l,
  ),
  defineParameter(
    'cod',
    'organic',
    'Chemical oxygen demand',
    'Demanda química de oxigênio (DQO)',
    U.mg_l,
  ),
  defineParameter(
    'bod5',
    'organic',
    'Biochemical oxygen demand, 5-day',
    'Demanda bioquímica de oxigênio (DBO₅)',
    U.mg_l,
  ),
  defineParameter(
    'total_petroleum_hydrocarbons',
    'organic',
    'Total petroleum hydrocarbons (range per method)',
    'Hidrocarbonetos totais de petróleo',
    U.mg_l,
  ),
  defineParameter(
    'oil_and_grease',
    'organic',
    'Oil and grease',
    'Óleos e graxas',
    U.mg_l,
  ),

  // Disinfection
  defineParameter(
    'free_chlorine',
    'disinfection',
    'Free chlorine residual',
    'Cloro residual livre',
    U.mg_l,
  ),
  defineParameter(
    'total_chlorine',
    'disinfection',
    'Total chlorine residual',
    'Cloro residual total',
    U.mg_l,
  ),

  // Mining and redox
  defineParameter(
    'ferrous_iron',
    'mining_redox',
    'Ferrous iron (Fe²⁺)',
    'Ferro ferroso (Fe²⁺)',
    U.mg_l,
  ),
  defineParameter(
    'chromium_hexavalent',
    'mining_redox',
    'Hexavalent chromium',
    'Cromo hexavalente',
    U.mg_l,
    { cas: '18540-29-9' },
  ),
  defineParameter(
    'cyanide_total_as_cn',
    'mining_redox',
    'Total cyanide as CN⁻',
    'Cianeto total como CN⁻',
    U.mg_l,
  ),
  defineParameter(
    'cyanide_wad_as_cn',
    'mining_redox',
    'Weak acid dissociable cyanide as CN⁻',
    'Cianeto WAD como CN⁻',
    U.mg_l,
  ),
  defineParameter(
    'cyanide_free_as_cn',
    'mining_redox',
    'Free cyanide as CN⁻',
    'Cianeto livre como CN⁻',
    U.mg_l,
  ),
  defineParameter(
    'thiocyanate',
    'mining_redox',
    'Thiocyanate',
    'Tiocianato',
    U.mg_l,
    {
      cas: '302-04-5',
    },
  ),
  defineParameter(
    'sulfide_total_as_s',
    'mining_redox',
    'Total sulfide as S',
    'Sulfeto total como S',
    U.mg_l,
  ),

  // Metals / trace
  defineParameter('iron', 'metal', 'Iron', 'Ferro', U.mg_l, {
    cas: '7439-89-6',
    molar_mass: 55.845,
    charge: 2,
  }),
  defineParameter('manganese', 'metal', 'Manganese', 'Manganês', U.mg_l, {
    cas: '7439-96-5',
    molar_mass: 54.938,
    charge: 2,
  }),
  defineParameter('aluminum', 'metal', 'Aluminium', 'Alumínio', U.mg_l, {
    cas: '7429-90-5',
  }),
  defineParameter('antimony', 'metal', 'Antimony', 'Antimônio', U.mg_l, {
    cas: '7440-36-0',
  }),
  defineParameter('arsenic', 'metal', 'Arsenic', 'Arsênio', U.mg_l, {
    cas: '7440-38-2',
  }),
  defineParameter('barium', 'metal', 'Barium', 'Bário', U.mg_l, {
    cas: '7440-39-3',
  }),
  defineParameter('beryllium', 'metal', 'Beryllium', 'Berílio', U.mg_l, {
    cas: '7440-41-7',
  }),
  defineParameter('boron', 'metal', 'Boron', 'Boro', U.mg_l, {
    cas: '7440-42-8',
  }),
  defineParameter('cadmium', 'metal', 'Cadmium', 'Cádmio', U.mg_l, {
    cas: '7440-43-9',
  }),
  defineParameter(
    'chromium',
    'metal',
    'Chromium, total',
    'Cromo total',
    U.mg_l,
    {
      cas: '7440-47-3',
    },
  ),
  defineParameter('cobalt', 'metal', 'Cobalt', 'Cobalto', U.mg_l, {
    cas: '7440-48-4',
  }),
  defineParameter('copper', 'metal', 'Copper', 'Cobre', U.mg_l, {
    cas: '7440-50-8',
  }),
  defineParameter('lead', 'metal', 'Lead', 'Chumbo', U.mg_l, {
    cas: '7439-92-1',
  }),
  defineParameter('lithium', 'metal', 'Lithium', 'Lítio', U.mg_l, {
    cas: '7439-93-2',
    molar_mass: 6.94,
    charge: 1,
  }),
  defineParameter('mercury', 'metal', 'Mercury', 'Mercúrio', U.mg_l, {
    cas: '7439-97-6',
  }),
  defineParameter('molybdenum', 'metal', 'Molybdenum', 'Molibdênio', U.mg_l, {
    cas: '7439-98-7',
  }),
  defineParameter('nickel', 'metal', 'Nickel', 'Níquel', U.mg_l, {
    cas: '7440-02-0',
  }),
  defineParameter('selenium', 'metal', 'Selenium', 'Selênio', U.mg_l, {
    cas: '7782-49-2',
  }),
  defineParameter('silver', 'metal', 'Silver', 'Prata', U.mg_l, {
    cas: '7440-22-4',
  }),
  defineParameter('strontium', 'metal', 'Strontium', 'Estrôncio', U.mg_l, {
    cas: '7440-24-6',
    molar_mass: 87.62,
    charge: 2,
  }),
  defineParameter('thallium', 'metal', 'Thallium', 'Tálio', U.mg_l, {
    cas: '7440-28-0',
  }),
  defineParameter('uranium', 'metal', 'Uranium', 'Urânio', U.mg_l, {
    cas: '7440-61-1',
  }),
  defineParameter('vanadium', 'metal', 'Vanadium', 'Vanádio', U.mg_l, {
    cas: '7440-62-2',
  }),
  defineParameter('zinc', 'metal', 'Zinc', 'Zinco', U.mg_l, {
    cas: '7440-66-6',
  }),

  // Microbiology
  defineParameter(
    'total_coliforms',
    'microbiology',
    'Total coliforms in 100 mL',
    'Coliformes totais em 100 mL',
    U.none,
    { form: 'presence' },
  ),
  defineParameter(
    'total_coliforms_mpn',
    'microbiology',
    'Total coliforms, count',
    'Coliformes totais, contagem',
    U.mpn_100ml,
  ),
  defineParameter(
    'total_coliforms_cfu',
    'microbiology',
    'Total coliforms, count',
    'Coliformes totais, contagem',
    U.cfu_100ml,
  ),
  defineParameter(
    'e_coli',
    'microbiology',
    'E. coli in 100 mL',
    'E. coli em 100 mL',
    U.none,
    { form: 'presence' },
  ),
  defineParameter(
    'e_coli_mpn',
    'microbiology',
    'E. coli, count',
    'E. coli, contagem',
    U.mpn_100ml,
  ),
  defineParameter(
    'e_coli_cfu',
    'microbiology',
    'E. coli, count',
    'E. coli, contagem',
    U.cfu_100ml,
  ),
  defineParameter(
    'thermotolerant_coliforms',
    'microbiology',
    'Thermotolerant coliforms in 100 mL',
    'Coliformes termotolerantes em 100 mL',
    U.none,
    { form: 'presence' },
  ),
  defineParameter(
    'thermotolerant_coliforms_mpn',
    'microbiology',
    'Thermotolerant coliforms, count',
    'Coliformes termotolerantes, contagem',
    U.mpn_100ml,
  ),
  defineParameter(
    'thermotolerant_coliforms_cfu',
    'microbiology',
    'Thermotolerant coliforms, count',
    'Coliformes termotolerantes, contagem',
    U.cfu_100ml,
  ),
  defineParameter(
    'heterotrophic_plate_count',
    'microbiology',
    'Heterotrophic plate count',
    'Bactérias heterotróficas',
    U.cfu_ml,
  ),

  // Radioactivity (Bq/L even where a CAS exists)
  defineParameter(
    'gross_alpha',
    'radioactivity',
    'Gross alpha activity',
    'Atividade alfa total',
    U.bq_l,
  ),
  defineParameter(
    'gross_beta',
    'radioactivity',
    'Gross beta activity',
    'Atividade beta total',
    U.bq_l,
  ),
  defineParameter(
    'radium_226',
    'radioactivity',
    'Radium-226',
    'Rádio-226',
    U.bq_l,
    {
      cas: '13982-63-3',
    },
  ),
  defineParameter(
    'radium_228',
    'radioactivity',
    'Radium-228',
    'Rádio-228',
    U.bq_l,
    {
      cas: '15262-20-1',
    },
  ),
  defineParameter(
    'radon_222',
    'radioactivity',
    'Radon-222',
    'Radônio-222',
    U.bq_l,
    {
      cas: '14859-67-7',
    },
  ),
];

const BY_CODE = new Map(WATER_QUALITY_PARAMETERS.map(d => [d.code, d]));
const BY_CAS = new Map(
  WATER_QUALITY_PARAMETERS.filter(d => d.cas).map(d => [d.cas!, d]),
);

/**
 * Looks up the vocabulary entry for a parameter. A `cas` parameter resolves
 * through the published equivalences to its `welldot` entry. Returns
 * `undefined` for unknown codes, CAS numbers without an equivalent, and
 * `x-` vocabularies.
 */
export function getParameterDefinition(
  parameter: Parameter,
): ParameterDefinition | undefined {
  if (parameter.vocabulary === 'welldot') return BY_CODE.get(parameter.code);
  if (parameter.vocabulary === 'cas') return BY_CAS.get(parameter.code);
  return undefined;
}

/**
 * Canonical identity of a parameter: the `welldot` code when the parameter
 * is (or resolves to) a vocabulary entry, otherwise `vocabulary:code`.
 * A `welldot` code and its CAS equivalent produce the same key.
 */
export function parameterKey(parameter: Parameter): string {
  const def = getParameterDefinition(parameter);
  if (def) return def.code;
  return `${parameter.vocabulary}:${parameter.code}`;
}

/**
 * Whether a parameter's code is defined by its vocabulary version. `cas`
 * codes and `x-` vocabularies are always accepted (CAS numbers outside the
 * equivalence table are substances in mg/L).
 */
export function isKnownParameter(parameter: Parameter): boolean {
  if (parameter.vocabulary !== 'welldot') return true;
  return BY_CODE.has(parameter.code);
}
