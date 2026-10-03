import type { HydrodynamicEvent, Well } from '@welldot/core';
import { format, parseISO } from 'date-fns';
import { lastReading, stepRate } from '~/utils/hydrodynamicEvent';
import { createPdfFormatters } from './formatters';
import { packLabelValueRows } from './metadataTable';
import type { Content } from './pdfmake.types';
import { buildEntryDivider } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

const KNOWN_EVENT_TYPES = [
  'spot_measurement',
  'constant_rate',
  'step_drawdown',
  'airlift',
  'recovery_only',
];

function eventTypeLabel(type: string, t: PdfTranslate): string {
  return KNOWN_EVENT_TYPES.includes(type)
    ? t(`editor.hydrodynamicEvents.eventTypes.${type}`)
    : type;
}

/** The type/date header line — short and height-bounded, so it's safe to bind to the section title. */
function buildEventHeader(event: HydrodynamicEvent, t: PdfTranslate): Content {
  return {
    columns: [
      { text: eventTypeLabel(event.type, t), style: 'tableHeader', width: '*' },
      {
        text: format(parseISO(event.datetime), 'dd/MM/yyyy HH:mm'),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

/** The stats row (static/dynamic level, flow rate, operator) — 0 or 1 blocks depending on which fields apply. */
function buildEventStats(
  event: HydrodynamicEvent,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content[] {
  const { formatLength, formatFlow } = createPdfFormatters(options);
  const ev = event as unknown as Record<string, unknown>;
  const staticLevel =
    typeof ev.static_level === 'number' ? ev.static_level : null;
  const dynamicLevel = lastReading(event)?.depth ?? null;
  const rate =
    event.type === 'recovery_only'
      ? ((ev.pumping_rate as number | undefined) ?? null)
      : stepRate(event, 0);
  const operator = ev.operator as string | undefined;

  const fields: { label: string; value: string }[] = [];
  if (staticLevel != null) {
    fields.push({
      label: t('editor.hydrodynamicEvents.stats.ne'),
      value: formatLength(staticLevel),
    });
  }
  if (dynamicLevel != null) {
    fields.push({
      label: t('editor.hydrodynamicEvents.stats.nd'),
      value: formatLength(dynamicLevel),
    });
  }
  if (rate != null) {
    fields.push({
      label: t('editor.hydrodynamicEvents.stats.flowRate'),
      value: formatFlow(rate),
    });
  }
  if (operator) {
    fields.push({
      label: t('editor.hydrodynamicEvents.fields.operator'),
      value: operator,
    });
  }

  if (fields.length === 0) return [];
  return [
    {
      layout: 'noBorders',
      table: {
        widths: ['*', '*', '*', '*'],
        body: packLabelValueRows(fields, 4),
      },
      margin: [0, 4, 0, 0],
    },
  ];
}

function buildEventEntry(
  event: HydrodynamicEvent,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content {
  return {
    stack: [buildEventHeader(event, t), ...buildEventStats(event, options, t)],
  };
}

/**
 * Builds a listing of `well.hydrodynamic_events`, sorted most-recent-first
 * to match the editor's ledger ordering. Returns `null` when there are no
 * events.
 *
 * The title is bound to the first event's header line only (not its stats
 * row) inside an `unbreakable` block, so the heading can never render alone
 * at a page bottom — mirrors `historyLogTable.ts`'s approach.
 */
export function buildHydrodynamicEventsSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const events = well.hydrodynamic_events;
  if (!events?.length) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: t('editor.hydrodynamicEvents.title'), style: 'title' },
        buildEventHeader(first!, t),
      ],
      unbreakable: true,
    },
    ...buildEventStats(first!, options, t),
  ];
  rest.forEach(event => {
    items.push(buildEntryDivider());
    items.push(buildEventEntry(event, options, t));
  });

  return { stack: items };
}
