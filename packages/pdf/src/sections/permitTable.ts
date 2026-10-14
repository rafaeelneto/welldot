import type { Permit, PermitCondition, Well } from '@welldot/core';
import {
  CONDITION_CATEGORIES,
  PERMIT_HISTORY_TYPES,
  PERMIT_TYPES,
  VOLUME_LIMIT_PERIODS,
  WATER_USES,
} from '@welldot/core';
import {
  CONDITION_DEADLINE_STATUSES,
  formatCalendarDate,
  formatDate,
  formatNumber,
  getConditionDeadlineStates,
  getConditionFulfillments,
  getPermitHistory,
  getPermitStartDate,
  getPermitStatus,
  PERMIT_STATUSES,
  permitLabel,
  todayCalendarDate,
} from '@welldot/utils';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import {
  attachmentName,
  buildEntryHeader,
  buildEntryListing,
  headerCell,
  withTableCaption,
} from '../layout/tables';
import type { PdfContext, PdfLabels } from '../types/options.types';
import type { Content, ContentTable, TableCell } from '../types/pdfmake.types';
import { buildFieldGrid, type MetaField } from './metadataTable';

function formatValidity(
  p: Permit,
  labels: PdfLabels,
  dateFormat: string,
): string {
  const start = formatCalendarDate(getPermitStartDate(p), dateFormat);
  const end = p.valid_until
    ? formatCalendarDate(p.valid_until, dateFormat)
    : labels.operation.permit.noExpiry;
  return start ? `${start} → ${end}` : end;
}

/** Authority, identifiers, dates, uses and granted limits that have a value. */
function specFields(
  p: Permit,
  well: Well,
  fmt: PdfFormatters,
  ctx: PdfContext,
): MetaField[] {
  const date = (value: string) =>
    formatCalendarDate(value, ctx.dateFormats.date);
  const fields = ctx.labels.operation.permit.fields;
  const superseded = well.permits?.find(x => x.id === p.supersedes);

  return [
    { label: fields.authority, value: p.authority },
    p.identifier && { label: fields.identifier, value: p.identifier },
    p.request_identifier && {
      label: fields.requestIdentifier,
      value: p.request_identifier,
    },
    p.issued_at && { label: fields.issuedAt, value: date(p.issued_at) },
    p.renewal_requested_at && {
      label: fields.renewalRequestedAt,
      value: date(p.renewal_requested_at),
    },
    p.supersedes && {
      label: fields.supersedes,
      value: permitLabel(superseded, p.supersedes),
    },
    p.water_use?.length && {
      label: fields.waterUse,
      value: fmt.vocabList(WATER_USES, p.water_use),
    },
    p.flow_rate != null && {
      label: fields.flowRate,
      value: fmt.formatFlow(p.flow_rate, 2),
    },
    p.daily_operating_time != null && {
      label: fields.dailyOperatingTime,
      value: formatNumber(p.daily_operating_time, {
        maximumFractionDigits: 2,
        suffix: 'h',
      }),
    },
    ...(p.volume_limits ?? []).map(v => ({
      label: `${fields.volumeLimits} (${fmt.vocab(VOLUME_LIMIT_PERIODS, v.period)})`,
      value: fmt.formatVolume(v.volume, 0),
    })),
    p.monthly_schedule && {
      label: fields.monthlySchedule,
      value: [...p.monthly_schedule]
        .sort((a, b) => a.month - b.month)
        .map(g =>
          new Intl.DateTimeFormat(ctx.locale, { month: 'short' }).format(
            new Date(2000, g.month - 1, 1),
          ),
        )
        .join(', '),
    },
  ].filter((field): field is MetaField => !!field);
}

/** Notes and attachments, each on its own full-width row. */
function wideFields(p: Permit, labels: PdfLabels): MetaField[] {
  const attachments = p.attachments ?? [];
  return [
    p.notes && { label: labels.operation.permit.fields.notes, value: p.notes },
    attachments.length > 0 && {
      label: labels.operation.attachments,
      value: attachments.map(attachmentName).join('\n'),
    },
  ].filter((field): field is MetaField => !!field);
}

function nestedTable(
  caption: string,
  widths: string[],
  body: TableCell[][],
): ContentTable {
  return withTableCaption(caption, {
    layout: 'lightHorizontalLines',
    table: { widths, headerRows: 1, dontBreakRows: true, body },
  });
}

/** Overdue deadlines, the last fulfilled one and the next one, one per line. */
function conditionStatus(
  p: Permit,
  c: PermitCondition,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): string {
  const date = (value: string | undefined) =>
    formatCalendarDate(value, ctx.dateFormats.date);
  const states = getConditionDeadlineStates(well, p, c, { today });
  const status = (key: string) => fmt.vocab(CONDITION_DEADLINE_STATUSES, key);
  const overdue = states.filter(s => s.status === 'overdue');
  const next = states.find(s => s.status === 'upcoming');
  const lastDone = [...states]
    .reverse()
    .find(s => s.status === 'fulfilled' || s.status === 'fulfilled_late');

  // "Label:" stays on the line of its first date, so the column never
  // shrinks to a lone label.
  const line = (label: string, dates: (string | undefined)[]) =>
    `${label}:\u00a0${dates.map(date).join(', ')}`;

  return [
    overdue.length &&
      line(
        status('overdue'),
        overdue.map(s => s.due_date),
      ),
    lastDone &&
      (lastDone.due_date
        ? line(status(lastDone.status), [lastDone.due_date])
        : status(lastDone.status)),
    next && line(status('upcoming'), [next.due_date]),
    !states.length && ctx.labels.operation.permit.conditions.undated,
  ]
    .filter(Boolean)
    .join('\n');
}

/** One row per condition, numbered so the fulfillments table can refer to it. */
function buildConditionsTable(
  p: Permit,
  conditions: PermitCondition[],
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const words = ctx.labels.operation.permit.conditions;
  const body: TableCell[][] = [
    [
      headerCell(words.number),
      headerCell(words.condition),
      headerCell(words.responsible),
      headerCell(words.status),
    ],
  ];
  conditions.forEach((c, i) => {
    body.push([
      String(i + 1),
      {
        text: [
          { text: c.description },
          ...(c.category
            ? [
                {
                  text: `\n${fmt.vocab(CONDITION_CATEGORIES, c.category)}`,
                  style: 'metadataLabel',
                  color: ctx.theme.colors.tableHeader,
                },
              ]
            : []),
        ],
      },
      c.responsible ?? '',
      conditionStatus(p, c, well, today, fmt, ctx),
    ]);
  });
  return nestedTable(words.title, ['auto', '*', '20%', 'auto'], body);
}

/**
 * Fulfillment records of every condition (condition number, then oldest
 * first). `null` when no condition has been fulfilled yet.
 */
function buildFulfillmentsTable(
  p: Permit,
  conditions: PermitCondition[],
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content | null {
  const words = ctx.labels.operation.permit;
  const dateFormat = ctx.dateFormats.date;
  const rows: TableCell[][] = [];
  conditions.forEach((c, i) => {
    const late = new Set(
      getConditionDeadlineStates(well, p, c, { today })
        .filter(s => s.status === 'fulfilled_late')
        .map(s => s.fulfillment_id),
    );
    getConditionFulfillments(c).forEach(f => {
      const fulfilled = formatDate(f.datetime, dateFormat);
      rows.push([
        String(i + 1),
        late.has(f.id)
          ? `${fulfilled}\n${fmt.vocab(CONDITION_DEADLINE_STATUSES, 'fulfilled_late')}`
          : fulfilled,
        f.due_date ? formatCalendarDate(f.due_date, dateFormat) : '—',
        f.author ?? '',
        f.description ?? '',
      ]);
    });
  });
  if (!rows.length) return null;

  return nestedTable(
    words.fulfill.title,
    ['auto', 'auto', 'auto', '20%', '*'],
    [
      [
        headerCell(words.conditions.number),
        headerCell(words.fulfill.fulfilledAt),
        headerCell(words.fulfill.deadline),
        headerCell(words.fulfill.by),
        headerCell(words.fulfill.description),
      ],
      ...rows,
    ],
  );
}

/** Administrative history, oldest first. `null` when there is none. */
function buildHistoryTable(
  p: Permit,
  fmt: PdfFormatters,
  labels: PdfLabels,
  dateFormat: string,
): Content | null {
  const history = getPermitHistory(p);
  if (!history.length) return null;
  const words = labels.operation.permit.history;

  return nestedTable(
    words.title,
    ['auto', 'auto', '*', 'auto'],
    [
      [
        headerCell(words.date),
        headerCell(words.type),
        headerCell(words.description),
        headerCell(words.situation),
      ],
      ...history.map(h => [
        formatCalendarDate(h.date, dateFormat),
        h.type ? fmt.vocab(PERMIT_HISTORY_TYPES, h.type) : '',
        h.description ?? '',
        h.done === true
          ? words.done
          : h.due_date
            ? `${words.dueDate} ${formatCalendarDate(h.due_date, dateFormat)}`
            : '',
      ]),
    ],
  );
}

function buildBody(
  p: Permit,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content[] {
  const { labels } = ctx;
  const blocks: Content[] = [];

  const grid = buildFieldGrid(
    specFields(p, well, fmt, ctx),
    ctx,
    wideFields(p, labels),
  );
  if (grid) blocks.push(grid);

  const conditions = p.conditions ?? [];
  if (conditions.length) {
    blocks.push(buildConditionsTable(p, conditions, well, today, fmt, ctx));
    const fulfillments = buildFulfillmentsTable(
      p,
      conditions,
      well,
      today,
      fmt,
      ctx,
    );
    if (fulfillments) {
      blocks.push(fulfillments);
    }
  }

  const history = buildHistoryTable(p, fmt, labels, ctx.dateFormats.date);
  if (history) {
    blocks.push(history);
  }
  return blocks;
}

/**
 * Builds the `permits` listing (.well v2.3), most recent start date first,
 * with derived status and condition deadlines evaluated on `today`. Each
 * permit is a header (type, status, validity), a label/value grid, and
 * tables of its conditions, their fulfillments and its administrative
 * history. Returns `null` when there are none.
 */
export function buildPermitSection(
  well: Well,
  ctx: PdfContext,
  today: string = todayCalendarDate(),
): Content | null {
  const permits = well.permits;
  if (!permits?.length) return null;

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);
  const sorted = [...permits].sort((a, b) =>
    (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
  );

  return buildEntryListing(
    labels.operation.permit.title,
    sorted.map(p => ({
      header: buildEntryHeader(
        fmt.vocab(PERMIT_TYPES, p.type),
        fmt.vocab(PERMIT_STATUSES, getPermitStatus(well, p, today)!),
        formatValidity(p, labels, ctx.dateFormats.date),
      ),
      body: buildBody(p, well, today, fmt, ctx),
    })),
    ctx,
  );
}
