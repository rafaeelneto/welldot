import type { Attachment, PumpInstallation, Well } from '@welldot/core';
import {
  CONSTRUCTION_MATERIALS,
  POWER_SOURCES,
  PUMP_TYPES,
} from '@welldot/core';
import { getCurrentPump } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { buildEntryDivider } from '../layout/tables';
import type { PdfContext, PdfTranslate } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').pop() ?? attachment.uri
  );
}

function formatPeriod(p: PumpInstallation, dateFormat: string): string {
  const from = format(parseISO(p.installed_at), dateFormat);
  return p.removed_at
    ? `${from} → ${format(parseISO(p.removed_at), dateFormat)}`
    : from;
}

/** Type label, a "current" marker for the open installation, and the period. */
function buildHeader(
  p: PumpInstallation,
  isCurrent: boolean,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const { t } = ctx;
  return {
    columns: [
      {
        text: [
          { text: fmt.vocab(PUMP_TYPES, p.type), style: 'tableHeader' },
          {
            text: isCurrent ? `   ${t('operation.pump.current')}` : '',
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatPeriod(p, ctx.dateFormats.date),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

function specLines(
  p: PumpInstallation,
  fmt: PdfFormatters,
  t: PdfTranslate,
): string[] {
  const field = (key: string) => t(`operation.pump.fields.${key}`);
  const equipment = [p.manufacturer, p.model].filter(Boolean).join(' ');

  return [
    equipment && `${field('model')}: ${equipment}`,
    p.serial && `${field('serial')}: ${p.serial}`,
    p.installed_by && `${field('installedBy')}: ${p.installed_by}`,
    p.removed_at && p.removed_by && `${field('removedBy')}: ${p.removed_by}`,
    p.power_source &&
      `${field('powerSource')}: ${fmt.vocab(POWER_SOURCES, p.power_source)}`,
    p.intake_depth != null &&
      `${field('intakeDepth')}: ${fmt.formatLength(p.intake_depth)}`,
    p.rated_flow_rate != null &&
      `${field('ratedFlowRate')}: ${fmt.formatFlow(p.rated_flow_rate, 2)}`,
    p.rated_head != null &&
      `${field('ratedHead')}: ${fmt.formatLength(p.rated_head)}`,
    p.rated_power != null &&
      `${field('ratedPower')}: ${fmt.formatPower(p.rated_power)}`,
    p.riser_diameter != null &&
      `${field('riserDiameter')}: ${fmt.formatDiameter(p.riser_diameter)}${p.riser_material ? ` · ${fmt.vocab(CONSTRUCTION_MATERIALS, p.riser_material)}` : ''}`,
  ].filter((line): line is string => !!line);
}

function buildBody(
  p: PumpInstallation,
  fmt: PdfFormatters,
  t: PdfTranslate,
): Content[] {
  const blocks: Content[] = [];
  const lines = specLines(p, fmt, t);
  if (lines.length) {
    blocks.push({
      text: lines.join('   ·   '),
      fontSize: 9,
      margin: [0, 4, 0, 0],
    });
  }
  if (p.notes) {
    blocks.push({ text: p.notes, fontSize: 10, margin: [0, 4, 0, 0] });
  }
  const attachments = p.attachments ?? [];
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
 * Builds the `pump_installations` listing (.well v2.3), most recent
 * installation first. Returns `null` when there are none. The title is bound
 * to the first entry's header inside an `unbreakable` block, as in the
 * history log section, so it never renders alone at a page bottom.
 */
export function buildPumpInstallationSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const pumps = well.pump_installations;
  if (!pumps?.length) return null;

  const fmt = createPdfFormatters(ctx);
  const currentId = getCurrentPump(well)?.id;
  const sorted = [...pumps].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: ctx.t('operation.pump.title'), style: 'title' },
        buildHeader(first!, first!.id === currentId, fmt, ctx),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, fmt, ctx.t),
  ];
  rest.forEach(p => {
    items.push(buildEntryDivider(ctx));
    items.push({
      stack: [
        buildHeader(p, p.id === currentId, fmt, ctx),
        ...buildBody(p, fmt, ctx.t),
      ],
    });
  });

  return { stack: items };
}
