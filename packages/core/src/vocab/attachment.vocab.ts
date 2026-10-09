import type { VocabEntry } from './vocab';

/** Recommended `attachments[].document_type` values (since v2.3). */
export const DOCUMENT_TYPES = [
  {
    value: 'drilling_report',
    label: { en: 'Drilling report', pt: 'Relatório de perfuração' },
  },
  {
    value: 'as_built_drawing',
    label: { en: 'As-built drawing', pt: 'Perfil construtivo as-built' },
  },
  {
    value: 'registry_record',
    label: { en: 'Registry record', pt: 'Ficha cadastral' },
  },
  { value: 'photo', label: { en: 'Photo', pt: 'Fotografia' } },
  {
    value: 'permit_document',
    label: { en: 'Permit document', pt: 'Portaria / outorga' },
  },
  {
    value: 'condition_evidence',
    label: { en: 'Condition evidence', pt: 'Comprovante de condicionante' },
  },
  { value: 'pump_curve', label: { en: 'Pump curve', pt: 'Curva da bomba' } },
  {
    value: 'field_sheet',
    label: { en: 'Field sheet', pt: 'Planilha de campo' },
  },
  {
    value: 'test_report',
    label: {
      en: 'Pumping test report',
      pt: 'Relatório de teste de bombeamento',
    },
  },
  {
    value: 'lab_report',
    label: { en: 'Lab report', pt: 'Laudo laboratorial' },
  },
  { value: 'invoice', label: { en: 'Invoice', pt: 'Nota fiscal' } },
] as const satisfies readonly VocabEntry[];

export type AttachmentDocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

/** Document types suggested first for each place an attachment can live. */
export const DOCUMENT_TYPE_SUGGESTIONS = {
  root: ['drilling_report', 'as_built_drawing', 'registry_record', 'photo'],
  pump: ['pump_curve', 'invoice', 'photo'],
  meter: ['photo', 'invoice', 'condition_evidence'],
  permit: ['permit_document', 'photo'],
  condition: ['condition_evidence', 'photo'],
  permit_history: ['permit_document', 'invoice', 'photo'],
  event: ['field_sheet', 'photo'],
  history: ['condition_evidence', 'photo', 'invoice'],
  sample: ['lab_report', 'field_sheet', 'photo', 'condition_evidence'],
} as const satisfies Record<string, readonly AttachmentDocumentType[]>;

export type DocumentTypeContext = keyof typeof DOCUMENT_TYPE_SUGGESTIONS;
