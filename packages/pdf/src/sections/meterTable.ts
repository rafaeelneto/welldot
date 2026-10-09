import type { Attachment, Meter, Well } from '@welldot/core';
import { METER_TYPES } from '@welldot/core';
import { getCurrentMeters } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { buildEntryDivider } from '../layout/tables';
import type { PdfContext, PdfLabels } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').pop() ?? attachment.uri
  );
}

function formatPeriod(m: Meter, dateFormat: string): string {
  const from = format(parseISO(m.installed_at), dateFormat);
  return m.removed_at
    ? `${from} → ${format(parseISO(m.removed_at), dateFormat)}`
    : from;
}

/** Type label, a "current" marker for open installations, and the period. */
function buildHeader(
  m: Meter,
  isCurrent: boolean,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const { labels } = ctx;
  return {
    columns: [
      {
        text: [
          {
            text: m.type
              ? fmt.vocab(METER_TYPES, m.type)
              : labels.operation.meter.untyped,
            style: 'tableHeader',
          },
          {
            text: isCurrent ? `   ${labels.operation.meter.current}` : '',
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatPeriod(m, ctx.dateFormats.date),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

function specLines(m: Meter, fmt: PdfFormatters, labels: PdfLabels): string[] {
  const fields = labels.operation.meter.fields;
  const equipment = [m.manufacturer, m.model].filter(Boolean).join(' ');

  return [
    equipment && `${fields.model}: ${equipment}`,
    m.serial && `${fields.serial}: ${m.serial}`,
    m.installed_by && `${fields.installedBy}: ${m.installed_by}`,
    m.removed_at && m.removed_by && `${fields.removedBy}: ${m.removed_by}`,
    m.nominal_diameter != null &&
      `${fields.nominalDiameter}: ${fmt.formatDiameter(m.nominal_diameter)}`,
    m.max_reading != null &&
      `${fields.maxReading}: ${fmt.formatVolume(m.max_reading, 0)}`,
  ].filter((line): line is string => !!line);
}

function buildBody(m: Meter, fmt: PdfFormatters, labels: PdfLabels): Content[] {
  const blocks: Content[] = [];
  const lines = specLines(m, fmt, labels);
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
export function buildMeterSection(well: Well, ctx: PdfContext): Content | null {
  const meters = well.meters;
  if (!meters?.length) return null;

  const fmt = createPdfFormatters(ctx);
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
        { text: ctx.labels.operation.meter.title, style: 'title' },
        buildHeader(first!, currentIds.has(first!.id), fmt, ctx),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, fmt, ctx.labels),
  ];
  rest.forEach(m => {
    items.push(buildEntryDivider(ctx));
    items.push({
      stack: [
        buildHeader(m, currentIds.has(m.id), fmt, ctx),
        ...buildBody(m, fmt, ctx.labels),
      ],
    });
  });

  return { stack: items };
}
