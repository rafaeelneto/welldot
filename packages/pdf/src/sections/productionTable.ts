import type {
  DeclaredVolume,
  MeterReading,
  ProductionEntry,
  Well,
} from '@welldot/core';
import {
  DECLARED_METHODS,
  PRODUCTION_ENTRY_TYPES,
  READING_SOURCES,
} from '@welldot/core';
import {
  formatMeterLabel,
  getActivePermit,
  getProductionByPeriod,
  getProductionTotal,
  getRetractedProductionIds,
  todayCalendarDate,
} from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { headerCell, rightCell, withTableTitle } from '../layout/tables';
import type { PdfContext, PdfLabels } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';
import { packLabelValueRows } from './metadataTable';

function entryInstant(e: ProductionEntry): string {
  return e.type === 'meter_reading'
    ? (e as MeterReading).datetime
    : (e as DeclaredVolume).period_end;
}

function percent(value: number, limit: number | undefined): string {
  if (limit == null || limit <= 0) return '—';
  return `${Math.round((value / limit) * 100)}%`;
}

/** Total / metered / estimated / reported, plus unknown intervals. */
function buildTotals(
  well: Well,
  fmt: PdfFormatters,
  labels: PdfLabels,
): Content {
  const totals = getProductionTotal(well);
  const totalLabels = labels.operation.production.totals;
  const items = [
    { label: totalLabels.total, value: fmt.formatVolume(totals.total, 1) },
    { label: totalLabels.metered, value: fmt.formatVolume(totals.metered, 1) },
    {
      label: totalLabels.estimated,
      value: fmt.formatVolume(totals.estimated, 1),
    },
    {
      label: totalLabels.reported,
      value: fmt.formatVolume(totals.reported, 1),
    },
  ];
  if (totals.unknown_intervals) {
    items.push({
      label: labels.operation.production.unknownIntervalsLabel,
      value: String(totals.unknown_intervals),
    });
  }
  return {
    layout: 'noBorders',
    table: { widths: ['*', '*', '*', '*'], body: packLabelValueRows(items, 4) },
  };
}

/** Production per year, with the share of the active permit's annual limit. */
function buildAnnualTable(
  well: Well,
  fmt: PdfFormatters,
  labels: PdfLabels,
): Content | null {
  const buckets = [...getProductionByPeriod(well, 'year')].reverse();
  if (!buckets.length) return null;
  const limit = getActivePermit(well, todayCalendarDate())?.volume_limits?.find(
    v => v.period === 'annual',
  )?.volume;
  const totalLabels = labels.operation.production.totals;

  const header: TableCell[] = [
    headerCell(labels.operation.production.periods.year),
    headerCell(totalLabels.metered, true),
    headerCell(totalLabels.estimated, true),
    headerCell(totalLabels.total, true),
    headerCell(totalLabels.reported, true),
  ];
  if (limit) header.push(headerCell(labels.operation.production.ofLimit, true));

  const body: TableCell[][] = [header];
  buckets.forEach(b => {
    const row: TableCell[] = [
      b.period,
      rightCell(fmt.formatVolume(b.metered, 1)),
      rightCell(fmt.formatVolume(b.estimated, 1)),
      rightCell(fmt.formatVolume(b.total, 1)),
      rightCell(b.reported ? fmt.formatVolume(b.reported, 1) : '—'),
    ];
    if (limit) row.push(rightCell(percent(b.total, limit)));
    body.push(row);
  });

  return withTableTitle(labels.operation.production.annual, {
    layout: 'lightHorizontalLines',
    table: {
      widths: limit
        ? ['*', 'auto', 'auto', 'auto', 'auto', 'auto']
        : ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

/** The ledger, newest first. Retracted entries are kept but struck through. */
function buildLedgerTable(
  well: Well,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const { labels, locale, dateFormats } = ctx;
  const retracted = getRetractedProductionIds(well);
  const entries = [...(well.production ?? [])].sort(
    (a, b) =>
      new Date(entryInstant(b)).getTime() -
        new Date(entryInstant(a)).getTime() ||
      (b.sequence ?? 0) - (a.sequence ?? 0),
  );
  const fields = labels.operation.production.fields;

  const body: TableCell[][] = [
    [
      headerCell(fields.datetime),
      headerCell(labels.operation.production.fields.type),
      headerCell(labels.operation.production.fields.details),
      headerCell(labels.operation.production.fields.value, true),
    ],
  ];

  entries.forEach(e => {
    const isRetracted = retracted.has(e.id);
    let details: string;
    let value: string;
    if (e.type === 'meter_reading') {
      const r = e as MeterReading;
      const meter = well.meters?.find(m => m.id === r.meter_id);
      details = [
        meter
          ? formatMeterLabel(meter, {
              locale,
              untypedLabel: labels.operation.meter.untyped,
              dateFormat: dateFormats.date,
            })
          : r.meter_id,
        r.source ? fmt.vocab(READING_SOURCES, r.source) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      value = fmt.formatVolume(r.reading, 3);
    } else if (e.type === 'declared_volume') {
      const d = e as DeclaredVolume;
      details = [
        `${format(parseISO(d.period_start), dateFormats.date)} → ${format(parseISO(d.period_end), dateFormats.date)}`,
        fmt.vocab(DECLARED_METHODS, d.method ?? 'estimated'),
      ].join(' · ');
      value = fmt.formatVolume(d.volume, 1);
    } else {
      details = '';
      value = '—';
    }
    const marks = [
      isRetracted ? labels.operation.production.retracted : null,
      e.corrects ? labels.operation.production.correction : null,
    ].filter(Boolean);
    const typeLabel = fmt.vocab(PRODUCTION_ENTRY_TYPES, e.type);
    const decoration = isRetracted ? { decoration: 'lineThrough' } : {};

    body.push([
      format(parseISO(entryInstant(e)), dateFormats.dateTime),
      marks.length ? `${typeLabel} (${marks.join(', ')})` : typeLabel,
      { text: [details, e.notes].filter(Boolean).join('\n') },
      { text: value, style: 'columnRight', ...decoration } as TableCell,
    ]);
  });

  return withTableTitle(labels.operation.production.ledger, {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['auto', 'auto', '*', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

/**
 * Builds the `production` section (.well v2.3): derived totals, the annual
 * table (with the active permit's annual limit share) and the ledger.
 * Returns `null` when the ledger is empty.
 */
export function buildProductionSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  if (!well.production?.length) return null;
  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);

  const annual = buildAnnualTable(well, fmt, labels);
  return {
    stack: [
      {
        stack: [
          { text: ' ' },
          { text: labels.operation.production.title, style: 'title' },
          buildTotals(well, fmt, labels),
        ],
        unbreakable: true,
      },
      ...(annual ? [{ text: ' ' }, annual] : []),
      { text: ' ' },
      buildLedgerTable(well, fmt, ctx),
    ],
  };
}
