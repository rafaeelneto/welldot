import type { VocabEntry } from './vocab';

/** Recommended `history_logs[].category` values. */
export const HISTORY_LOG_CATEGORIES = [
  { value: 'maintenance', label: { en: 'Maintenance', pt: 'Manutenção' } },
  { value: 'inspection', label: { en: 'Inspection', pt: 'Inspeção' } },
  { value: 'incident', label: { en: 'Incident', pt: 'Incidente' } },
  { value: 'event', label: { en: 'Event', pt: 'Evento' } },
  {
    value: 'status_change',
    label: { en: 'Status change', pt: 'Mudança de situação' },
  },
] as const satisfies readonly VocabEntry[];

export type HistoryLogCategory =
  (typeof HISTORY_LOG_CATEGORIES)[number]['value'];

/** Recommended `history_logs[].severity` values. */
export const HISTORY_LOG_SEVERITIES = [
  { value: 'low', label: { en: 'Low', pt: 'Baixa' } },
  { value: 'medium', label: { en: 'Medium', pt: 'Média' } },
  { value: 'high', label: { en: 'High', pt: 'Alta' } },
  { value: 'critical', label: { en: 'Critical', pt: 'Crítica' } },
] as const satisfies readonly VocabEntry[];

export type HistoryLogSeverity =
  (typeof HISTORY_LOG_SEVERITIES)[number]['value'];
