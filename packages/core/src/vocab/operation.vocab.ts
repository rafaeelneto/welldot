import type { VocabEntry } from './vocab';

/** Recommended `pump_installations[].type` values (since v2.3). */
export const PUMP_TYPES = [
  {
    value: 'submersible',
    label: { en: 'Submersible pump', pt: 'Bomba submersa' },
  },
  {
    value: 'vertical_turbine',
    label: { en: 'Vertical turbine pump', pt: 'Bomba de eixo vertical' },
  },
  { value: 'jet', label: { en: 'Jet pump', pt: 'Bomba injetora' } },
  {
    value: 'progressive_cavity',
    label: { en: 'Progressive cavity pump', pt: 'Bomba helicoidal' },
  },
  { value: 'hand_pump', label: { en: 'Hand pump', pt: 'Bomba manual' } },
  {
    value: 'compressor_airlift',
    label: { en: 'Compressor (air-lift)', pt: 'Compressor (air-lift)' },
  },
] as const satisfies readonly VocabEntry[];

export type PumpType = (typeof PUMP_TYPES)[number]['value'];

/** Recommended `pump_installations[].power_source` values (since v2.3). */
export const POWER_SOURCES = [
  { value: 'grid', label: { en: 'Grid', pt: 'Rede elétrica' } },
  { value: 'solar', label: { en: 'Solar', pt: 'Solar' } },
  { value: 'diesel', label: { en: 'Diesel', pt: 'Diesel' } },
  { value: 'hybrid', label: { en: 'Hybrid', pt: 'Híbrido' } },
] as const satisfies readonly VocabEntry[];

export type PowerSource = (typeof POWER_SOURCES)[number]['value'];

/** Recommended `meters[].type` values (since v2.3). */
export const METER_TYPES = [
  { value: 'mechanical', label: { en: 'Mechanical', pt: 'Mecânico' } },
  {
    value: 'electromagnetic',
    label: { en: 'Electromagnetic', pt: 'Eletromagnético' },
  },
  { value: 'ultrasonic', label: { en: 'Ultrasonic', pt: 'Ultrassônico' } },
] as const satisfies readonly VocabEntry[];

export type MeterType = (typeof METER_TYPES)[number]['value'];

/** Recommended `production[].source` values of a `meter_reading` (since v2.3). */
export const READING_SOURCES = [
  { value: 'manual', label: { en: 'Manual', pt: 'Manual' } },
  { value: 'telemetry', label: { en: 'Telemetry', pt: 'Telemetria' } },
] as const satisfies readonly VocabEntry[];

export type ReadingSource = (typeof READING_SOURCES)[number]['value'];

/** Recommended `production[].method` values of a `declared_volume` (since v2.3). */
export const DECLARED_METHODS = [
  { value: 'estimated', label: { en: 'Estimated', pt: 'Estimado' } },
  { value: 'reported', label: { en: 'Reported', pt: 'Declarado' } },
] as const satisfies readonly VocabEntry[];

export type DeclaredMethod = (typeof DECLARED_METHODS)[number]['value'];

/** Recommended `history_logs[].maintenance_type` values (since v2.3). */
export const MAINTENANCE_TYPES = [
  { value: 'inspection', label: { en: 'Inspection', pt: 'Inspeção' } },
  { value: 'cleaning', label: { en: 'Cleaning', pt: 'Limpeza' } },
  {
    value: 'redevelopment',
    label: { en: 'Redevelopment', pt: 'Redesenvolvimento' },
  },
  { value: 'disinfection', label: { en: 'Disinfection', pt: 'Desinfecção' } },
  {
    value: 'pump_service',
    label: { en: 'Pump service', pt: 'Manutenção da bomba' },
  },
  {
    value: 'meter_calibration',
    label: { en: 'Meter calibration', pt: 'Aferição do hidrômetro' },
  },
  {
    value: 'video_inspection',
    label: {
      en: 'Video inspection / optical logging',
      pt: 'Filmagem / perfilagem ótica',
    },
  },
  {
    value: 'level_measurement',
    label: { en: 'Level measurement', pt: 'Medição de nível' },
  },
  {
    value: 'pump_test',
    label: { en: 'Pumping test', pt: 'Teste de bombeamento' },
  },
  {
    value: 'water_sampling',
    label: { en: 'Water sampling', pt: 'Coleta de água' },
  },
] as const satisfies readonly VocabEntry[];

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]['value'];
