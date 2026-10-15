import type { VocabEntry } from './vocab';

/** Recommended `water_samples[].sample_type` values (since v2.3). */
export const SAMPLE_TYPES = [
  { value: 'routine', label: { en: 'Routine', pt: 'Rotina' } },
  {
    value: 'field_duplicate',
    label: { en: 'Field duplicate', pt: 'Duplicata de campo' },
  },
  {
    value: 'split_sample',
    label: { en: 'Split sample', pt: 'Amostra dividida (split)' },
  },
  { value: 'field_blank', label: { en: 'Field blank', pt: 'Branco de campo' } },
  {
    value: 'trip_blank',
    label: { en: 'Trip blank', pt: 'Branco de transporte' },
  },
  {
    value: 'equipment_blank',
    label: { en: 'Equipment blank', pt: 'Branco de equipamento' },
  },
] as const satisfies readonly VocabEntry[];

export type SampleType = (typeof SAMPLE_TYPES)[number]['value'];

/** Recommended `water_samples[].sampling_method` values (since v2.3). */
export const SAMPLING_METHODS = [
  {
    value: 'low_flow',
    label: { en: 'Low flow', pt: 'Purga de baixa vazão (micropurga)' },
  },
  {
    value: 'volumetric_purge',
    label: { en: 'Volumetric purge', pt: 'Purga de volume determinado' },
  },
  { value: 'no_purge', label: { en: 'No purge', pt: 'Amostragem sem purga' } },
  {
    value: 'pump_discharge',
    label: { en: 'Pump discharge', pt: 'Bomba de produção em operação' },
  },
] as const satisfies readonly VocabEntry[];

export type SamplingMethod = (typeof SAMPLING_METHODS)[number]['value'];

/** Recommended `water_samples[].sampling_point.type` values (since v2.3). */
export const SAMPLING_POINT_TYPES = [
  {
    value: 'pump_discharge',
    label: { en: 'Pump discharge', pt: 'Saída da bomba de produção' },
  },
  {
    value: 'wellhead_tap',
    label: { en: 'Wellhead tap', pt: 'Torneira do cavalete' },
  },
  { value: 'in_well', label: { en: 'In well', pt: 'Dentro do poço' } },
] as const satisfies readonly VocabEntry[];

export type SamplingPointType = (typeof SAMPLING_POINT_TYPES)[number]['value'];

/** Recommended `water_samples[].sampling_point.device` values (since v2.3). */
export const SAMPLING_DEVICES = [
  {
    value: 'bailer',
    label: { en: 'Bailer', pt: 'Bailer (amostrador de retenção)' },
  },
  {
    value: 'discrete_depth_sampler',
    label: {
      en: 'Discrete depth sampler',
      pt: 'Amostrador pontual de profundidade',
    },
  },
  {
    value: 'passive_diffusion_bag',
    label: { en: 'Passive diffusion bag', pt: 'Bolsa de difusão passiva' },
  },
  {
    value: 'grab_sleeve',
    label: {
      en: 'Grab sleeve (HydraSleeve)',
      pt: 'Amostrador passivo tipo luva (HydraSleeve)',
    },
  },
  {
    value: 'low_flow_pump',
    label: { en: 'Low-flow pump', pt: 'Bomba de baixa vazão' },
  },
  {
    value: 'packer_pump',
    label: { en: 'Packer pump', pt: 'Bomba com obturador (packer)' },
  },
] as const satisfies readonly VocabEntry[];

export type SamplingDevice = (typeof SAMPLING_DEVICES)[number]['value'];
