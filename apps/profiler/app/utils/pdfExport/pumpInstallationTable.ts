import type { Attachment, PumpInstallation, Well } from '@welldot/core';
import { getCurrentPump } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { resolvePowerSourceLabel, resolvePumpTypeLabel } from '../pumpVocab';
import { createPdfFormatters, type PdfFormatters } from './formatters';
import type { Content } from './pdfmake.types';
import { buildEntryDivider } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').at(-1) ?? attachment.uri
  );
}

function formatPeriod(p: PumpInstallation): string {
  const from = format(parseISO(p.installed_at), 'dd/MM/yyyy');
  return p.removed_at
    ? `${from} → ${format(parseISO(p.removed_at), 'dd/MM/yyyy')}`
    : from;
}

/** Type label, a "current" marker for the open installation, and the period. */
function buildHeader(
  p: PumpInstallation,
  isCurrent: boolean,
  t: PdfTranslate,
): Content {
  return {
    columns: [
      {
        text: [
          { text: resolvePumpTypeLabel(p.type, t), style: 'tableHeader' },
          {
            text: isCurrent ? `   ${t('editor.operation.pump.current')}` : '',
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatPeriod(p),
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
  const field = (key: string) => t(`editor.operation.pump.fields.${key}`);
  const equipment = [p.manufacturer, p.model].filter(Boolean).join(' ');

  return [
    equipment && `${field('model')}: ${equipment}`,
    p.serial && `${field('serial')}: ${p.serial}`,
    p.installed_by && `${field('installedBy')}: ${p.installed_by}`,
    p.removed_at && p.removed_by && `${field('removedBy')}: ${p.removed_by}`,
    p.power_source &&
      `${field('powerSource')}: ${resolvePowerSourceLabel(p.power_source, t)}`,
    p.intake_depth != null &&
      `${field('intakeDepth')}: ${fmt.formatLength(p.intake_depth)}`,
    p.rated_flow_rate != null &&
      `${field('ratedFlowRate')}: ${fmt.formatFlow(p.rated_flow_rate, 2)}`,
    p.rated_head != null &&
      `${field('ratedHead')}: ${fmt.formatLength(p.rated_head)}`,
    p.rated_power != null &&
      `${field('ratedPower')}: ${fmt.formatPower(p.rated_power)}`,
    p.riser_diameter != null &&
      `${field('riserDiameter')}: ${fmt.formatDiameter(p.riser_diameter)}${p.riser_material ? ` · ${p.riser_material}` : ''}`,
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
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const pumps = well.pump_installations;
  if (!pumps?.length) return null;

  const fmt = createPdfFormatters(options);
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
        { text: t('editor.operation.pump.title'), style: 'title' },
        buildHeader(first!, first!.id === currentId, t),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, fmt, t),
  ];
  rest.forEach(p => {
    items.push(buildEntryDivider());
    items.push({
      stack: [buildHeader(p, p.id === currentId, t), ...buildBody(p, fmt, t)],
    });
  });

  return { stack: items };
}
