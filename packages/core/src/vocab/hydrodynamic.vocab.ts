import type { VocabEntry } from './vocab';

/** Canonical `hydrodynamic_events[].type` values; `x-` types pass through. */
export const HYDRODYNAMIC_EVENT_TYPES = [
  {
    value: 'spot_measurement',
    label: { en: 'Spot measurement', pt: 'Medição pontual' },
  },
  {
    value: 'constant_rate',
    label: { en: 'Constant rate', pt: 'Vazão constante' },
  },
  { value: 'step_drawdown', label: { en: 'Step drawdown', pt: 'Escalonada' } },
  { value: 'airlift', label: { en: 'Air-lift', pt: 'Air-lift' } },
  {
    value: 'recovery_only',
    label: { en: 'Recovery only', pt: 'Recuperação' },
  },
] as const satisfies readonly VocabEntry[];

/** Recommended `spot_measurement.measurement_method` values. */
export const MEASUREMENT_METHODS = [
  {
    value: 'electric_probe',
    label: { en: 'Electric probe', pt: 'Sonda elétrica' },
  },
  {
    value: 'pressure_transducer',
    label: { en: 'Pressure transducer', pt: 'Transdutor de pressão' },
  },
  { value: 'air_line', label: { en: 'Air line', pt: 'Linha de ar' } },
  { value: 'tape', label: { en: 'Tape', pt: 'Trena' } },
] as const satisfies readonly VocabEntry[];

export type MeasurementMethod = (typeof MEASUREMENT_METHODS)[number]['value'];

/** Recommended `aquifer_analysis[].method` values. */
export const AQUIFER_ANALYSIS_METHODS = [
  { value: 'cooper_jacob', label: { en: 'Cooper-Jacob', pt: 'Cooper-Jacob' } },
  { value: 'theis', label: { en: 'Theis', pt: 'Theis' } },
  { value: 'neuman', label: { en: 'Neuman', pt: 'Neuman' } },
  { value: 'hantush', label: { en: 'Hantush', pt: 'Hantush' } },
  {
    value: 'birsoy_summers',
    label: { en: 'Birsoy-Summers', pt: 'Birsoy-Summers' },
  },
  { value: 'eden_hazel', label: { en: 'Eden-Hazel', pt: 'Eden-Hazel' } },
  {
    value: 'visual_inspection',
    label: { en: 'Visual inspection', pt: 'Inspeção visual' },
  },
] as const satisfies readonly VocabEntry[];

export type AquiferAnalysisMethod =
  (typeof AQUIFER_ANALYSIS_METHODS)[number]['value'];
