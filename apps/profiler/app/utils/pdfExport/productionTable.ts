import type {
  DeclaredVolume,
  MeterReading,
  ProductionEntry,
  Well,
} from '@welldot/core';
import { DECLARED_METHODS, READING_SOURCES } from '@welldot/core';
import {
  getProductionByPeriod,
  getProductionTotal,
  getRetractedProductionIds,
  todayCalendarDate,
} from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { meterLabel } from '../operationVocab';
import { getActivePermit } from '../permitVocab';
import { createPdfFormatters, type PdfFormatters } from './formatters';
import { packLabelValueRows } from './metadataTable';
import type { Content, TableCell } from './pdfmake.types';
import { headerCell, rightCell, withTableTitle } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

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
function buildTotals(well: Well, fmt: PdfFormatters, t: PdfTranslate): Content {
  const totals = getProductionTotal(well);
  const label = (key: string) => t(`editor.operation.production.totals.${key}`);
  const items = [
    { label: label('total'), value: fmt.formatVolume(totals.total, 1) },
    { label: label('metered'), value: fmt.formatVolume(totals.metered, 1) },
    { label: label('estimated'), value: fmt.formatVolume(totals.estimated, 1) },
    { label: label('reported'), value: fmt.formatVolume(totals.reported, 1) },
  ];
  if (totals.unknown_intervals) {
    items.push({
      label: t('editor.operation.production.unknownIntervalsLabel'),
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
  t: PdfTranslate,
): Content | null {
  const buckets = [...getProductionByPeriod(well, 'year')].reverse();
  if (!buckets.length) return null;
  const limit = getActivePermit(well, todayCalendarDate())?.volume_limits?.find(
    v => v.period === 'annual',
  )?.volume;
  const label = (key: string) => t(`editor.operation.production.totals.${key}`);

  const header: TableCell[] = [
    headerCell(t('editor.operation.production.periods.year')),
    headerCell(label('metered'), true),
    headerCell(label('estimated'), true),
    headerCell(label('total'), true),
    headerCell(label('reported'), true),
  ];
  if (limit)
    header.push(headerCell(t('editor.operation.production.ofLimit'), true));

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

  return withTableTitle(t('editor.operation.production.annual'), {
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
  t: PdfTranslate,
  locale: string,
): Content {
  const retracted = getRetractedProductionIds(well);
  const entries = [...(well.production ?? [])].sort(
    (a, b) =>
      new Date(entryInstant(b)).getTime() -
        new Date(entryInstant(a)).getTime() ||
      (b.sequence ?? 0) - (a.sequence ?? 0),
  );
  const field = (key: string) => t(`editor.operation.production.fields.${key}`);

  const body: TableCell[][] = [
    [
      headerCell(field('datetime')),
      headerCell(t('editor.operation.production.fields.type')),
      headerCell(t('editor.operation.production.fields.details')),
      headerCell(t('editor.operation.production.fields.value'), true),
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
        meter ? meterLabel(meter, t, locale) : r.meter_id,
        r.source ? fmt.vocab(READING_SOURCES, r.source) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      value = fmt.formatVolume(r.reading, 3);
    } else if (e.type === 'declared_volume') {
      const d = e as DeclaredVolume;
      details = [
        `${format(parseISO(d.period_start), 'dd/MM/yyyy')} → ${format(parseISO(d.period_end), 'dd/MM/yyyy')}`,
        fmt.vocab(DECLARED_METHODS, d.method ?? 'estimated'),
      ].join(' · ');
      value = fmt.formatVolume(d.volume, 1);
    } else {
      details = '';
      value = '—';
    }
    const marks = [
      isRetracted ? t('editor.operation.production.retracted') : null,
      e.corrects ? t('editor.operation.production.correction') : null,
    ].filter(Boolean);
    const typeLabel =
      e.type === 'meter_reading' || e.type === 'declared_volume'
        ? t(`editor.operation.production.types.${e.type}`)
        : (e as { type: string }).type;
    const decoration = isRetracted ? { decoration: 'lineThrough' } : {};

    body.push([
      format(parseISO(entryInstant(e)), 'dd/MM/yyyy HH:mm'),
      marks.length ? `${typeLabel} (${marks.join(', ')})` : typeLabel,
      { text: [details, e.notes].filter(Boolean).join('\n') },
      { text: value, style: 'columnRight', ...decoration } as TableCell,
    ]);
  });

  return withTableTitle(t('editor.operation.production.ledger'), {
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
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  if (!well.production?.length) return null;
  const fmt = createPdfFormatters(options);

  const annual = buildAnnualTable(well, fmt, t);
  return {
    stack: [
      {
        stack: [
          { text: ' ' },
          { text: t('editor.operation.production.title'), style: 'title' },
          buildTotals(well, fmt, t),
        ],
        unbreakable: true,
      },
      ...(annual ? [{ text: ' ' }, annual] : []),
      { text: ' ' },
      buildLedgerTable(well, fmt, t, options.locale),
    ],
  };
}
