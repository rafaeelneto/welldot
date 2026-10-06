/**
 * Recommended `Attachment.document_type` vocabulary (.well spec v2.3) —
 * suggestions only; non-canonical values SHOULD use the `x-` prefix.
 */
export const DOCUMENT_TYPE_VALUES = [
  'drilling_report',
  'as_built_drawing',
  'registry_record',
  'photo',
  'permit_document',
  'condition_evidence',
  'pump_curve',
  'field_sheet',
  'test_report',
  'lab_report',
  'invoice',
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPE_VALUES)[number];

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
} as const satisfies Record<string, readonly DocumentTypeValue[]>;

export type DocumentTypeContext = keyof typeof DOCUMENT_TYPE_SUGGESTIONS;

/**
 * Resolves a `document_type` to its translated label, falling back to the raw
 * value for free-text or `x-` prefixed values.
 */
export function resolveDocumentTypeLabel(
  value: string,
  t: (_key: string) => string,
): string {
  return (DOCUMENT_TYPE_VALUES as readonly string[]).includes(value)
    ? t(`editor.attachments.documentTypes.${value}`)
    : value;
}
