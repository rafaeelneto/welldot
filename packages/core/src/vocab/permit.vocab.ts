import type { VocabEntry } from './vocab';

/** Recommended `permits[].type` values (since v2.3). */
export const PERMIT_TYPES = [
  {
    value: 'abstraction_permit',
    label: { en: 'Abstraction permit', pt: 'Outorga de direito de uso' },
  },
  {
    value: 'preliminary_permit',
    label: { en: 'Preliminary permit', pt: 'Outorga prévia' },
  },
  {
    value: 'exemption',
    label: { en: 'Exemption', pt: 'Dispensa / uso insignificante' },
  },
  { value: 'registration', label: { en: 'Registration', pt: 'Cadastro' } },
  {
    value: 'dewatering_permit',
    label: { en: 'Dewatering permit', pt: 'Outorga para rebaixamento' },
  },
  {
    value: 'drilling_permit',
    label: { en: 'Drilling permit', pt: 'Autorização de perfuração' },
  },
] as const satisfies readonly VocabEntry[];

export type PermitType = (typeof PERMIT_TYPES)[number]['value'];

/** Recommended `permits[].water_use[]` values (since v2.3). */
export const WATER_USES = [
  {
    value: 'human_supply',
    label: { en: 'Human supply', pt: 'Abastecimento humano' },
  },
  { value: 'industrial', label: { en: 'Industrial', pt: 'Industrial' } },
  { value: 'mining', label: { en: 'Mining', pt: 'Mineração' } },
  { value: 'irrigation', label: { en: 'Irrigation', pt: 'Irrigação' } },
  {
    value: 'livestock',
    label: { en: 'Livestock', pt: 'Dessedentação animal' },
  },
  {
    value: 'commercial',
    label: { en: 'Commercial', pt: 'Comercial / serviços' },
  },
] as const satisfies readonly VocabEntry[];

export type WaterUse = (typeof WATER_USES)[number]['value'];

/** Recommended `permits[].conditions[].category` values (since v2.3). */
export const CONDITION_CATEGORIES = [
  {
    value: 'monitoring',
    label: { en: 'Monitoring', pt: 'Monitoramento' },
    description: {
      en: 'Water level, flow, abstracted volume and water quality monitoring/sampling',
      pt: 'Monitoramento/amostragem de nível, vazão, volume captado e qualidade da água',
    },
  },
  {
    value: 'reporting',
    label: { en: 'Reporting', pt: 'Relatórios e declarações' },
    description: {
      en: 'Periodic reports and volume/flow declarations submitted to the authority',
      pt: 'Relatórios periódicos e declarações de volume/vazão entregues ao órgão',
    },
  },
  {
    value: 'equipment_installation',
    label: { en: 'Equipment installation', pt: 'Instalação de equipamentos' },
    description: {
      en: 'Meters (hidrômetro), level gauges, sampling taps, telemetry',
      pt: 'Hidrômetro, medidor de nível, torneira de amostragem, telemetria',
    },
  },
  {
    value: 'well_protection',
    label: { en: 'Well protection', pt: 'Proteção do poço' },
    description: {
      en: 'Sanitary slab, seal, protection perimeter, wellhead closure',
      pt: 'Laje de proteção, selo sanitário, perímetro de proteção, tampa do poço',
    },
  },
  {
    value: 'environmental',
    label: { en: 'Environmental', pt: 'Ambiental' },
    description: {
      en: 'Environmental measures, compensation, licensing of the activity',
      pt: 'Medidas ambientais, compensação, licenciamento da atividade',
    },
  },
  {
    value: 'legal',
    label: { en: 'Legal / administrative', pt: 'Legal / administrativo' },
    description: {
      en: 'Renewal request, fees, registrations, document submissions',
      pt: 'Pedido de renovação, taxas, cadastros, entrega de documentos',
    },
  },
] as const satisfies readonly VocabEntry[];

export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number]['value'];

/** Recommended `permits[].history[].type` values (since v2.3). */
export const PERMIT_HISTORY_TYPES = [
  { value: 'filing', label: { en: 'Filing', pt: 'Protocolo' } },
  { value: 'process', label: { en: 'Process', pt: 'Andamento' } },
  { value: 'notification', label: { en: 'Notification', pt: 'Notificação' } },
  { value: 'fee', label: { en: 'Fee', pt: 'Taxa' } },
  { value: 'inspection', label: { en: 'Inspection', pt: 'Vistoria' } },
  { value: 'decision', label: { en: 'Decision', pt: 'Decisão' } },
  { value: 'renewal', label: { en: 'Renewal', pt: 'Renovação' } },
] as const satisfies readonly VocabEntry[];

export type PermitHistoryType = (typeof PERMIT_HISTORY_TYPES)[number]['value'];
