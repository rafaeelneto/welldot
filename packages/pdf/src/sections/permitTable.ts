import type { Attachment, Permit, PermitCondition, Well } from '@welldot/core';
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
  getPermitHistory,
  getPermitStartDate,
  getPermitStatus,
  PERMIT_STATUSES,
  permitLabel,
  todayCalendarDate,
} from '@welldot/utils';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { buildEntryDivider } from '../layout/tables';
import type { PdfContext, PdfLabels } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').pop() ?? attachment.uri
  );
}

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

/** Type label, derived status and validity period. */
function buildHeader(
  p: Permit,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const { labels } = ctx;
  const status = getPermitStatus(well, p, today)!;
  return {
    columns: [
      {
        text: [
          { text: fmt.vocab(PERMIT_TYPES, p.type), style: 'tableHeader' },
          {
            text: `   ${fmt.vocab(PERMIT_STATUSES, status)}`,
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatValidity(p, labels, ctx.dateFormats.date),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

function specLines(
  p: Permit,
  well: Well,
  fmt: PdfFormatters,
  ctx: PdfContext,
): string[] {
  const { labels } = ctx;
  const date = (value: string) =>
    formatCalendarDate(value, ctx.dateFormats.date);
  const fields = labels.operation.permit.fields;
  const superseded = well.permits?.find(x => x.id === p.supersedes);

  return [
    `${fields.authority}: ${p.authority}`,
    p.identifier && `${fields.identifier}: ${p.identifier}`,
    p.request_identifier &&
      `${fields.requestIdentifier}: ${p.request_identifier}`,
    p.issued_at && `${fields.issuedAt}: ${date(p.issued_at)}`,
    p.renewal_requested_at &&
      `${fields.renewalRequestedAt}: ${date(p.renewal_requested_at)}`,
    p.supersedes &&
      `${fields.supersedes}: ${permitLabel(superseded, p.supersedes)}`,
    p.water_use?.length &&
      `${fields.waterUse}: ${fmt.vocabList(WATER_USES, p.water_use)}`,
    p.flow_rate != null &&
      `${fields.flowRate}: ${fmt.formatFlow(p.flow_rate, 2)}`,
    p.daily_operating_time != null &&
      `${fields.dailyOperatingTime}: ${formatNumber(p.daily_operating_time, { maximumFractionDigits: 2, suffix: 'h' })}`,
    ...(p.volume_limits ?? []).map(
      v =>
        `${fields.volumeLimits} (${fmt.vocab(VOLUME_LIMIT_PERIODS, v.period)}): ${fmt.formatVolume(v.volume, 0)}`,
    ),
    p.monthly_schedule &&
      `${fields.monthlySchedule}: ${[...p.monthly_schedule]
        .sort((a, b) => a.month - b.month)
        .map(g =>
          new Intl.DateTimeFormat(ctx.locale, { month: 'short' }).format(
            new Date(2000, g.month - 1, 1),
          ),
        )
        .join(', ')}`,
  ].filter((line): line is string => !!line);
}

/** One line per condition: description, category and the deadline summary. */
function conditionLine(
  p: Permit,
  c: PermitCondition,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  labels: PdfLabels,
  dateFormat: string,
): string {
  const date = (value: string | undefined) =>
    formatCalendarDate(value, dateFormat);
  const states = getConditionDeadlineStates(well, p, c, { today });
  const status = (key: string) => fmt.vocab(CONDITION_DEADLINE_STATUSES, key);
  const overdue = states.filter(s => s.status === 'overdue');
  const next = states.find(s => s.status === 'upcoming');
  const lastDone = [...states]
    .reverse()
    .find(s => s.status === 'fulfilled' || s.status === 'fulfilled_late');

  const summary = [
    overdue.length &&
      `${status('overdue')}: ${overdue.map(s => date(s.due_date)).join(', ')}`,
    lastDone &&
      `${status(lastDone.status)}${lastDone.due_date ? ` ${date(lastDone.due_date)}` : ''}`,
    next && `${status('upcoming')}: ${date(next.due_date)}`,
    !states.length && labels.operation.permit.conditions.undated,
  ].filter(Boolean);

  const meta = [
    c.category && fmt.vocab(CONDITION_CATEGORIES, c.category),
    c.responsible &&
      `${labels.operation.permit.conditions.responsible}: ${c.responsible}`,
  ].filter(Boolean);
  const category = meta.length ? ` (${meta.join(' · ')})` : '';
  return `•  ${c.description}${category}${summary.length ? ` — ${summary.join(' · ')}` : ''}`;
}

/** Fulfillment records of a condition, one indented line each. */
function fulfillmentLines(
  c: PermitCondition,
  labels: PdfLabels,
  dateFormat: string,
): string[] {
  return [...(c.fulfillments ?? [])]
    .sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    )
    .map(f =>
      [
        `      ✓ ${formatDate(f.datetime, dateFormat)}`,
        f.due_date &&
          `${labels.operation.permit.fulfill.deadline} ${formatCalendarDate(f.due_date, dateFormat)}`,
        f.author,
        f.description,
      ]
        .filter(Boolean)
        .join(' · '),
    );
}

/** One line per administrative history step, oldest first. */
function historyLine(
  h: ReturnType<typeof getPermitHistory>[number],
  fmt: PdfFormatters,
  labels: PdfLabels,
  dateFormat: string,
): string {
  const state =
    h.done === true
      ? labels.operation.permit.history.done
      : h.due_date
        ? `${labels.operation.permit.history.dueDate} ${formatCalendarDate(h.due_date, dateFormat)}`
        : null;
  return [
    `•  ${formatCalendarDate(h.date, dateFormat)}`,
    h.type && fmt.vocab(PERMIT_HISTORY_TYPES, h.type),
    h.description,
    state && `(${state})`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function buildBody(
  p: Permit,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content[] {
  const { labels } = ctx;
  const dateFormat = ctx.dateFormats.date;
  const blocks: Content[] = [
    {
      text: specLines(p, well, fmt, ctx).join('   ·   '),
      fontSize: 9,
      margin: [0, 4, 0, 0],
    },
  ];
  const conditions = p.conditions ?? [];
  if (conditions.length) {
    blocks.push({
      stack: [
        {
          text: labels.operation.permit.conditions.title,
          style: 'metadataLabel',
        },
        ...conditions.flatMap(c => [
          {
            text: conditionLine(p, c, well, today, fmt, labels, dateFormat),
            fontSize: 9,
          },
          ...fulfillmentLines(c, labels, dateFormat).map(text => ({
            text,
            fontSize: 8,
            color: ctx.theme.colors.tableHeader,
          })),
        ]),
      ],
      margin: [0, 4, 0, 0],
    });
  }
  const history = getPermitHistory(p);
  if (history.length) {
    blocks.push({
      stack: [
        {
          text: labels.operation.permit.history.title,
          style: 'metadataLabel',
        },
        ...history.map(h => ({
          text: historyLine(h, fmt, labels, dateFormat),
          fontSize: 9,
        })),
      ],
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
 * Builds the `permits` listing (.well v2.3), most recent start date first,
 * with derived status and condition deadlines evaluated on `today`. Returns
 * `null` when there are none. The title is bound to the first entry's header
 * inside an `unbreakable` block, as in the history log section.
 */
export function buildPermitSection(
  well: Well,
  ctx: PdfContext,
  today: string = todayCalendarDate(),
): Content | null {
  const permits = well.permits;
  if (!permits?.length) return null;

  const fmt = createPdfFormatters(ctx);
  const sorted = [...permits].sort((a, b) =>
    (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: ctx.labels.operation.permit.title, style: 'title' },
        buildHeader(first!, well, today, fmt, ctx),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, well, today, fmt, ctx),
  ];
  rest.forEach(p => {
    items.push(buildEntryDivider(ctx));
    items.push({
      stack: [
        buildHeader(p, well, today, fmt, ctx),
        ...buildBody(p, well, today, fmt, ctx),
      ],
    });
  });

  return { stack: items };
}
