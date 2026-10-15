/**
 * SIAGAS values → `.well` values. SIAGAS uses controlled lists for most of
 * these fields; the keys are matched on the normalized text (lowercase, no
 * accents), and a value with no match is reported by the converter.
 */
import { labelKey } from './html';

/** Normalized text used to match SIAGAS values. */
export const norm = labelKey;

function firstMatch<T>(
  value: string | undefined,
  rules: [RegExp, T][],
): T | undefined {
  if (!value) return undefined;
  const key = norm(value);
  return rules.find(([re]) => re.test(key))?.[1];
}

/** "Método" of the Perfuração table → `drilling_method`. */
export function mapDrillingMethod(value: string | undefined) {
  return firstMatch(value, [
    [/jato/, undefined],
    [/roto.?pneumatic|roto.?percuss|martelo|dth/, 'air_hammer'],
    [/rotativ|rotary/, 'rotary'],
    [/percuss|cabo/, 'percussion'],
    [/trado|auger/, 'auger'],
  ]);
}

/** Pipe "Material" → construction material (casing and screen `type`). */
export function mapPipeMaterial(value: string | undefined) {
  return firstMatch(value, [
    [/nao especificad/, ''],
    [/inox/, 'stainless_steel'],
    [/geomecanic/, 'geomechanical_pvc'],
    [/p\.?v\.?c/, 'pvc'],
    [/fibra|fiberglass|prfv/, 'fiberglass'],
    [/nold preto/, 'carbon_steel'],
    [/galvaniz/, 'galvanized_steel'],
    [/aco|ferro|nold/, 'carbon_steel'],
  ]);
}

/** Screen "Material" → `slot_type`, when the text names one. */
export function mapSlotType(value: string | undefined) {
  return firstMatch(value, [
    [/nold/, 'nold'],
    [/espiral|trapez|continu/, 'continuous_slot'],
    [/ponte/, 'bridge_slot'],
    [/persian|louver/, 'louver'],
    [/ranhur|fendid|slot/, 'slotted'],
    [/perfurad/, 'perforated'],
  ]);
}

/** "Espaço Anular" material → `hole_fill.type`. */
export function mapAnnulus(value: string | undefined) {
  return firstMatch<'seal' | 'gravel_pack'>(value, [
    [/ciment|calda|bentonit|selo|argamassa|concreto/, 'seal'],
    [/areia|brita|cascalho|pre.?filtro|pedregulho|seixo|grav/, 'gravel_pack'],
  ]);
}

/** "Natureza do Ponto" → `well_type` and an implied purpose. */
export function mapNature(value: string | undefined) {
  return firstMatch<{ type?: string; purpose?: string }>(value, [
    [/monitoramento/, { type: 'tubular', purpose: 'monitoring' }],
    [/piezometro/, { type: 'tubular', purpose: 'piezometer' }],
    [/tubular/, { type: 'tubular' }],
    [/escavado|cacimba|amazonas|cisterna/, { type: 'hand_dug' }],
  ]);
}

/** "Uso da Água" → `well_purpose`; `null` means "no use" (no purpose). */
export function mapWaterUse(value: string | undefined) {
  return firstMatch<string | null>(value, [
    [/sem uso/, null],
    [/pesquisa/, 'exploration'],
    [/monitoramento/, 'monitoring'],
    [
      /abastecimento|industrial|irriga|pecuaria|dessedenta|multiplo|lazer|comercial/,
      'production',
    ],
  ]);
}

/** "Situação" → well status of a `status_change` log. */
export function mapStatus(value: string | undefined) {
  return firstMatch<'active' | 'inactive' | 'abandoned' | 'decommissioned'>(
    value,
    [
      [/desativad|desinstalad/, 'decommissioned'],
      [/abandonad|tamponad|obstruid/, 'abandoned'],
      [/equipad|bombeando|em uso|em operacao/, 'active'],
      [/parad|fechad|colmatad|seco|nao instalad|nao equipad/, 'inactive'],
    ],
  );
}

/** FGDC texture code and a display color for a lithology. */
export interface LithologyStyle {
  code: number;
  color: string;
}

/**
 * The SIAGAS "Litologia" list, most specific first. Colors follow the ones
 * used by the example wells for the same textures.
 */
const LITHOLOGY_RULES: [RegExp, LithologyStyle][] = [
  [/^solo arenoso/, { code: 607, color: '#d8a878' }],
  [/^solo (areno.?)?argiloso/, { code: 612, color: '#c9a27a' }],
  [/^solo/, { code: 612, color: '#9c7a55' }],
  [/^aterro/, { code: 612, color: '#a8a29a' }],
  [/^argila calc/, { code: 623, color: '#b9a27c' }],
  [/^argila (areno|silt|arenosa)/, { code: 619, color: '#cdb98a' }],
  [/^argil/, { code: 620, color: '#8d8d88' }],
  [/^folhelho|^argilito/, { code: 620, color: '#6b6b70' }],
  [/^silt/, { code: 616, color: '#b3a58c' }],
  [
    /^areia conglomer|^areia com seixo|^cascalho|^seixo|^pedregulho/,
    { code: 601, color: '#c8c2b4' },
  ],
  [/^areia calc/, { code: 613, color: '#d9c7a0' }],
  [/^areia (argilosa|silto)/, { code: 612, color: '#c9a77c' }],
  [/^areia/, { code: 607, color: '#e3d9c0' }],
  [/^arenito com seixo|^conglomerado/, { code: 601, color: '#a8a69e' }],
  [/^arenito argil/, { code: 612, color: '#cdb88f' }],
  [/^arenito calc/, { code: 613, color: '#b9785a' }],
  [/^arenito/, { code: 608, color: '#dcc27a' }],
  [/^calcarenito|^calcario|^marmore/, { code: 627, color: '#7d8b99' }],
  [/^dolomit/, { code: 642, color: '#a3a7a8' }],
  [/^marga/, { code: 623, color: '#b9a27c' }],
  [/^turfa/, { code: 657, color: '#4b4038' }],
  [/^laterit|^canga/, { code: 664, color: '#9c5a3c' }],
  [/^basalto|^diabasio|^gabro/, { code: 717, color: '#5a5a60' }],
  [
    /^granit|^granodiorit|^tonalit|^sienit|^pegmatit/,
    { code: 718, color: '#d8d2c6' },
  ],
  [/^gnaiss|^migmatit/, { code: 708, color: '#8a8a86' }],
  [/^xisto|^filito/, { code: 705, color: '#6f7466' }],
  [/^quartzito alterado/, { code: 702, color: '#d9cdb4' }],
  [/^quartzito/, { code: 702, color: '#e8e4dc' }],
  [/^ardosia/, { code: 703, color: '#5f5f5c' }],
  [
    /^rocha (intemperizada|alterada|decomposta)|^saprolit|^manto/,
    { code: 707, color: '#b59a7a' },
  ],
];

/** FGDC texture and color for a SIAGAS "Litologia"; `undefined` if unknown. */
export function mapLithology(value: string | undefined) {
  return firstMatch(value, LITHOLOGY_RULES);
}

/** `welldot` water quality code of a SIAGAS result parameter. */
const PARAMETER_RULES: [RegExp, string][] = [
  [/^bicarbonato/, 'bicarbonate'],
  [/^carbonato/, 'carbonate'],
  [/^calcio/, 'calcium'],
  [/^magnesio/, 'magnesium'],
  [/^sodio/, 'sodium'],
  [/^potassio/, 'potassium'],
  [/^cloreto/, 'chloride'],
  [/^sulfato/, 'sulfate'],
  [/^fluoret/, 'fluoride'],
  [/^nitrato/, 'nitrate_as_no3'],
  [/^nitrito/, 'nitrite_as_no2'],
  [/^nh3n$|^nitrogenio amoniacal/, 'ammonia_as_n'],
  [/^amonia/, 'ammonia_as_nh3'],
  [/^dureza total/, 'hardness_total_as_caco3'],
  [/^alcalinidade total/, 'alkalinity_total_as_caco3'],
  [/^solidos dissolvidos totais|^std$/, 'total_dissolved_solids'],
  [/^po4$|^fosfato/, 'orthophosphate_as_po4'],
  [/^ferro total|^ferro \(fe\)|^ferro$/, 'iron'],
  [/^manganes/, 'manganese'],
  [/^bario/, 'barium'],
  [/^estroncio/, 'strontium'],
  [/^zinco/, 'zinc'],
  [/^cobre/, 'copper'],
  [/^aluminio/, 'aluminum'],
  [/^chumbo/, 'lead'],
  [/^cadmio/, 'cadmium'],
  [/^cromo/, 'chromium'],
  [/^arsenio/, 'arsenic'],
  [/^boro/, 'boron'],
  [/^litio/, 'lithium'],
  [/^niquel/, 'nickel'],
  [/^ph$/, 'ph'],
];

export function mapParameter(name: string) {
  return firstMatch(name, PARAMETER_RULES);
}

/** Slug used for `x-siagas` parameter codes. */
export function slug(value: string): string {
  return norm(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** UTC offset of the civil time in a Brazilian state (no DST since 2019). */
export function utcOffset(uf: string | undefined): string {
  switch ((uf ?? '').toUpperCase()) {
    case 'AC':
      return '-05:00';
    case 'AM':
    case 'RR':
    case 'RO':
    case 'MT':
    case 'MS':
      return '-04:00';
    default:
      return '-03:00';
  }
}
