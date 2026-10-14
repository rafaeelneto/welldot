import type { HydrodynamicEvent, Well } from '@welldot/core';
import { HYDRODYNAMIC_EVENT_TYPES } from '@welldot/core';
import { lastReading, stepRate } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { headerCell, valueCell, withTableTitle } from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

/** Static level, last dynamic level and pumping rate of an event, when known. */
function eventStats(event: HydrodynamicEvent): {
  staticLevel: number | null;
  dynamicLevel: number | null;
  rate: number | null;
} {
  const ev = event as unknown as Record<string, unknown>;
  return {
    staticLevel: typeof ev.static_level === 'number' ? ev.static_level : null,
    dynamicLevel: lastReading(event)?.depth ?? null,
    rate:
      event.type === 'recovery_only'
        ? ((ev.pumping_rate as number | undefined) ?? null)
        : stepRate(event, 0),
  };
}

function eventRow(
  event: HydrodynamicEvent,
  fmt: PdfFormatters,
  ctx: PdfContext,
  withNotes: boolean,
): TableCell[] {
  const { staticLevel, dynamicLevel, rate } = eventStats(event);
  const row: TableCell[] = [
    format(parseISO(event.datetime), ctx.dateFormats.dateTime),
    fmt.vocab(HYDRODYNAMIC_EVENT_TYPES, event.type),
    valueCell(staticLevel != null ? fmt.formatLength(staticLevel) : '—'),
    valueCell(dynamicLevel != null ? fmt.formatLength(dynamicLevel) : '—'),
    valueCell(rate != null ? fmt.formatFlow(rate) : '—'),
    event.operator ?? '',
  ];
  if (withNotes) row.push(event.notes ?? '');
  return row;
}

/**
 * Builds the `hydrodynamic_events` table, most recent first: date/time,
 * type, static level, last dynamic level, flow rate and operator, plus a
 * notes column when an event has notes. Unknown values print as "—".
 * Returns `null` when there are no events.
 */
export function buildHydrodynamicEventsSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const events = well.hydrodynamic_events;
  if (!events?.length) return null;

  const { labels } = ctx;
  const words = labels.hydrodynamicEvents;
  const fmt = createPdfFormatters(ctx);
  const sorted = [...events].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
  const withNotes = sorted.some(e => !!e.notes);

  const header: TableCell[] = [
    headerCell(words.fields.datetime),
    headerCell(words.fields.type),
    headerCell(words.stats.ne, true),
    headerCell(words.stats.nd, true),
    headerCell(words.stats.flowRate, true),
    headerCell(words.fields.operator),
  ];
  if (withNotes) header.push(headerCell(words.fields.notes));

  return {
    stack: [
      { text: ' ' },
      withTableTitle(words.title, {
        layout: 'lightHorizontalLines',
        table: {
          widths: withNotes
            ? ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*']
            : ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
          headerRows: 1,
          dontBreakRows: true,
          body: [header, ...sorted.map(e => eventRow(e, fmt, ctx, withNotes))],
        },
      }),
    ],
  };
}
