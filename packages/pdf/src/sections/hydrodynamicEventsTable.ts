import type { HydrodynamicEvent, Well } from '@welldot/core';
import { HYDRODYNAMIC_EVENT_TYPES, getVocabLabel } from '@welldot/core';
import { lastReading, stepRate } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters } from '../formatters';

import { buildEntryDivider } from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';
import { packLabelValueRows } from './metadataTable';

/** The type/date header line — short and height-bounded, so it's safe to bind to the section title. */
function buildEventHeader(
  event: HydrodynamicEvent,
  ctx: Pick<PdfContext, 'locale' | 'dateFormats'>,
): Content {
  return {
    columns: [
      {
        text: getVocabLabel(HYDRODYNAMIC_EVENT_TYPES, event.type, ctx.locale),
        style: 'tableHeader',
        width: '*',
      },
      {
        text: format(parseISO(event.datetime), ctx.dateFormats.dateTime),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

/** The stats row (static/dynamic level, flow rate, operator) — 0 or 1 blocks depending on which fields apply. */
function buildEventStats(event: HydrodynamicEvent, ctx: PdfContext): Content[] {
  const { labels } = ctx;
  const { formatLength, formatFlow } = createPdfFormatters(ctx);
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
      label: labels.hydrodynamicEvents.stats.ne,
      value: formatLength(staticLevel),
    });
  }
  if (dynamicLevel != null) {
    fields.push({
      label: labels.hydrodynamicEvents.stats.nd,
      value: formatLength(dynamicLevel),
    });
  }
  if (rate != null) {
    fields.push({
      label: labels.hydrodynamicEvents.stats.flowRate,
      value: formatFlow(rate),
    });
  }
  if (operator) {
    fields.push({
      label: labels.hydrodynamicEvents.fields.operator,
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

function buildEventEntry(event: HydrodynamicEvent, ctx: PdfContext): Content {
  return {
    stack: [buildEventHeader(event, ctx), ...buildEventStats(event, ctx)],
  };
}

/**
 * Builds a listing of `well.hydrodynamic_events`, sorted most-recent-first.
 * Returns `null` when there are no events.
 *
 * The title is bound to the first event's header line only (not its stats
 * row) inside an `unbreakable` block, so the heading can never render alone
 * at a page bottom — mirrors the history log section's approach.
 */
export function buildHydrodynamicEventsSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const { labels } = ctx;
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
        { text: labels.hydrodynamicEvents.title, style: 'title' },
        buildEventHeader(first!, ctx),
      ],
      unbreakable: true,
    },
    ...buildEventStats(first!, ctx),
  ];
  rest.forEach(event => {
    items.push(buildEntryDivider(ctx));
    items.push(buildEventEntry(event, ctx));
  });

  return { stack: items };
}
