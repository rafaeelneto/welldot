import type { VocabEntry } from './vocab';

/** Recommended `well_type` values — construction method (since v2.1). */
export const WELL_TYPES = [
  { value: 'tubular', label: { en: 'Tubular', pt: 'Tubular' } },
  {
    value: 'hand_dug',
    label: { en: 'Hand dug', pt: 'Cacimba / poço escavado' },
  },
  { value: 'horizontal', label: { en: 'Horizontal', pt: 'Horizontal' } },
  {
    value: 'infiltration_gallery',
    label: { en: 'Infiltration gallery', pt: 'Galeria de infiltração' },
  },
  {
    value: 'artesian',
    label: { en: 'Artesian (deprecated)', pt: 'Artesiano (obsoleto)' },
    deprecated: true,
  },
] as const satisfies readonly VocabEntry[];

export type WellType = (typeof WELL_TYPES)[number]['value'];

/** Recommended `well_purpose[]` values (since v2.1). */
export const WELL_PURPOSES = [
  {
    value: 'production',
    label: { en: 'Production', pt: 'Produção / captação' },
  },
  {
    value: 'monitoring',
    label: { en: 'Monitoring well', pt: 'Poço de monitoramento' },
  },
  { value: 'piezometer', label: { en: 'Piezometer', pt: 'Piezômetro' } },
  {
    value: 'water_level_indicator',
    label: {
      en: 'Water level indicator',
      pt: "INA — indicador de nível d'água",
    },
  },
  {
    value: 'observation',
    label: { en: 'Observation well', pt: 'Poço de observação' },
  },
  {
    value: 'exploration',
    label: { en: 'Exploration', pt: 'Pesquisa / exploratório' },
  },
  {
    value: 'injection',
    label: { en: 'Injection / recharge', pt: 'Injeção / recarga' },
  },
  { value: 'dewatering', label: { en: 'Dewatering', pt: 'Rebaixamento' } },
] as const satisfies readonly VocabEntry[];

export type WellPurpose = (typeof WELL_PURPOSES)[number]['value'];
