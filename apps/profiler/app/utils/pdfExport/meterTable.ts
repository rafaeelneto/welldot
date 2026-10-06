import type { Attachment, Meter, Well } from '@welldot/core';
import { getCurrentMeters } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { resolveMeterTypeLabel } from '../operationVocab';
import { createPdfFormatters, type PdfFormatters } from './formatters';
import type { Content } from './pdfmake.types';
import { buildEntryDivider } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').at(-1) ?? attachment.uri
  );
}

function formatPeriod(m: Meter): string {
  const from = format(parseISO(m.installed_at), 'dd/MM/yyyy');
  return m.removed_at
    ? `${from} → ${format(parseISO(m.removed_at), 'dd/MM/yyyy')}`
    : from;
}

/** Type label, a "current" marker for open installations, and the period. */
function buildHeader(m: Meter, isCurrent: boolean, t: PdfTranslate): Content {
  return {
    columns: [
      {
        text: [
          {
            text: m.type
              ? resolveMeterTypeLabel(m.type, t)
              : t('editor.operation.meter.untyped'),
            style: 'tableHeader',
          },
          {
            text: isCurrent ? `   ${t('editor.operation.meter.current')}` : '',
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatPeriod(m),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

function specLines(m: Meter, fmt: PdfFormatters, t: PdfTranslate): string[] {
  const field = (key: string) => t(`editor.operation.meter.fields.${key}`);
  const equipment = [m.manufacturer, m.model].filter(Boolean).join(' ');

  return [
    equipment && `${field('model')}: ${equipment}`,
    m.serial && `${field('serial')}: ${m.serial}`,
    m.installed_by && `${field('installedBy')}: ${m.installed_by}`,
    m.removed_at && m.removed_by && `${field('removedBy')}: ${m.removed_by}`,
    m.nominal_diameter != null &&
      `${field('nominalDiameter')}: ${fmt.formatDiameter(m.nominal_diameter)}`,
    m.max_reading != null &&
      `${field('maxReading')}: ${fmt.formatVolume(m.max_reading, 0)}`,
  ].filter((line): line is string => !!line);
}

function buildBody(m: Meter, fmt: PdfFormatters, t: PdfTranslate): Content[] {
  const blocks: Content[] = [];
  const lines = specLines(m, fmt, t);
  if (lines.length) {
    blocks.push({
      text: lines.join('   ·   '),
      fontSize: 9,
      margin: [0, 4, 0, 0],
    });
  }
  if (m.notes) {
    blocks.push({ text: m.notes, fontSize: 10, margin: [0, 4, 0, 0] });
  }
  const attachments = m.attachments ?? [];
  if (attachments.length) {
    blocks.push({
      stack: attachments.map(a => ({
        text: `•  ${attachmentName(a)}`,
        style: 'metadataLabel',
      })),
      margin: [10, 4, 0, 0],
    });
  }
  return blocks;
}

/**
 * Builds the `meters` listing (.well v2.3), most recent installation first.
 * Returns `null` when there are none. The title is bound to the first
 * entry's header inside an `unbreakable` block, as in the pump section.
 */
export function buildMeterSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const meters = well.meters;
  if (!meters?.length) return null;

  const fmt = createPdfFormatters(options);
  const currentIds = new Set(getCurrentMeters(well).map(m => m.id));
  const sorted = [...meters].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: t('editor.operation.meter.title'), style: 'title' },
        buildHeader(first!, currentIds.has(first!.id), t),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, fmt, t),
  ];
  rest.forEach(m => {
    items.push(buildEntryDivider());
    items.push({
      stack: [buildHeader(m, currentIds.has(m.id), t), ...buildBody(m, fmt, t)],
    });
  });

  return { stack: items };
}
