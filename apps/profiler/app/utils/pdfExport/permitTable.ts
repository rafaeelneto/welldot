import type { Attachment, Permit, PermitCondition, Well } from '@welldot/core';
import {
  CONDITION_CATEGORIES,
  PERMIT_HISTORY_TYPES,
  PERMIT_TYPES,
  WATER_USES,
} from '@welldot/core';
import {
  formatNumber,
  getConditionDeadlineStates,
  getPermitHistory,
  getPermitStartDate,
  getPermitStatus,
  todayCalendarDate,
} from '@welldot/utils';
import { formatCalendarDate, formatDate } from '../date';
import { permitLabel } from '../permitVocab';
import { createPdfFormatters, type PdfFormatters } from './formatters';
import type { Content } from './pdfmake.types';
import { buildEntryDivider } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').at(-1) ?? attachment.uri
  );
}

function formatValidity(p: Permit, t: PdfTranslate): string {
  const start = formatCalendarDate(getPermitStartDate(p));
  const end = p.valid_until
    ? formatCalendarDate(p.valid_until)
    : t('editor.operation.permit.noExpiry');
  return start ? `${start} → ${end}` : end;
}

/** Type label, derived status and validity period. */
function buildHeader(
  p: Permit,
  well: Well,
  today: string,
  fmt: PdfFormatters,
  t: PdfTranslate,
): Content {
  const status = getPermitStatus(well, p, today)!;
  return {
    columns: [
      {
        text: [
          { text: fmt.vocab(PERMIT_TYPES, p.type), style: 'tableHeader' },
          {
            text: `   ${t(`editor.operation.permit.status.${status}`)}`,
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: formatValidity(p, t),
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
  options: PdfExportOptions,
  t: PdfTranslate,
): string[] {
  const field = (key: string) => t(`editor.operation.permit.fields.${key}`);
  const superseded = well.permits?.find(x => x.id === p.supersedes);

  return [
    `${field('authority')}: ${p.authority}`,
    p.identifier && `${field('identifier')}: ${p.identifier}`,
    p.request_identifier &&
      `${field('requestIdentifier')}: ${p.request_identifier}`,
    p.issued_at && `${field('issuedAt')}: ${formatCalendarDate(p.issued_at)}`,
    p.renewal_requested_at &&
      `${field('renewalRequestedAt')}: ${formatCalendarDate(p.renewal_requested_at)}`,
    p.supersedes &&
      `${field('supersedes')}: ${permitLabel(superseded, p.supersedes)}`,
    p.water_use?.length &&
      `${field('waterUse')}: ${fmt.vocabList(WATER_USES, p.water_use)}`,
    p.flow_rate != null &&
      `${field('flowRate')}: ${fmt.formatFlow(p.flow_rate, 2)}`,
    p.daily_operating_time != null &&
      `${field('dailyOperatingTime')}: ${formatNumber(p.daily_operating_time, { maximumFractionDigits: 2, suffix: 'h' })}`,
    ...(p.volume_limits ?? []).map(
      v =>
        `${field('volumeLimits')} (${field(`volumePeriods.${v.period}`)}): ${fmt.formatVolume(v.volume, 0)}`,
    ),
    p.monthly_schedule &&
      `${field('monthlySchedule')}: ${[...p.monthly_schedule]
        .sort((a, b) => a.month - b.month)
        .map(g =>
          new Intl.DateTimeFormat(options.locale, { month: 'short' }).format(
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
  t: PdfTranslate,
): string {
  const states = getConditionDeadlineStates(well, p, c, { today });
  const status = (key: string) =>
    t(`editor.operation.permit.conditions.deadlineStatus.${key}`);
  const overdue = states.filter(s => s.status === 'overdue');
  const next = states.find(s => s.status === 'upcoming');
  const lastDone = [...states]
    .reverse()
    .find(s => s.status === 'fulfilled' || s.status === 'fulfilled_late');

  const summary = [
    overdue.length &&
      `${status('overdue')}: ${overdue.map(s => formatCalendarDate(s.due_date)).join(', ')}`,
    lastDone &&
      `${status(lastDone.status)}${lastDone.due_date ? ` ${formatCalendarDate(lastDone.due_date)}` : ''}`,
    next && `${status('upcoming')}: ${formatCalendarDate(next.due_date)}`,
    !states.length && t('editor.operation.permit.conditions.undated'),
  ].filter(Boolean);

  const meta = [
    c.category && fmt.vocab(CONDITION_CATEGORIES, c.category),
    c.responsible &&
      `${t('editor.operation.permit.conditions.responsible')}: ${c.responsible}`,
  ].filter(Boolean);
  const category = meta.length ? ` (${meta.join(' · ')})` : '';
  return `•  ${c.description}${category}${summary.length ? ` — ${summary.join(' · ')}` : ''}`;
}

/** Fulfillment records of a condition, one indented line each. */
function fulfillmentLines(c: PermitCondition, t: PdfTranslate): string[] {
  return [...(c.fulfillments ?? [])]
    .sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    )
    .map(f =>
      [
        `      ✓ ${formatDate(f.datetime, 'dd/MM/yyyy')}`,
        f.due_date &&
          `${t('editor.operation.permit.fulfill.deadline')} ${formatCalendarDate(f.due_date)}`,
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
  t: PdfTranslate,
): string {
  const state =
    h.done === true
      ? t('editor.operation.permit.history.done')
      : h.due_date
        ? `${t('editor.operation.permit.history.dueDate')} ${formatCalendarDate(h.due_date)}`
        : null;
  return [
    `•  ${formatCalendarDate(h.date)}`,
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
  options: PdfExportOptions,
  t: PdfTranslate,
): Content[] {
  const blocks: Content[] = [
    {
      text: specLines(p, well, fmt, options, t).join('   ·   '),
      fontSize: 9,
      margin: [0, 4, 0, 0],
    },
  ];
  const conditions = p.conditions ?? [];
  if (conditions.length) {
    blocks.push({
      stack: [
        {
          text: t('editor.operation.permit.conditions.title'),
          style: 'metadataLabel',
        },
        ...conditions.flatMap(c => [
          { text: conditionLine(p, c, well, today, fmt, t), fontSize: 9 },
          ...fulfillmentLines(c, t).map(text => ({
            text,
            fontSize: 8,
            color: '#555555',
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
          text: t('editor.operation.permit.history.title'),
          style: 'metadataLabel',
        },
        ...history.map(h => ({ text: historyLine(h, fmt, t), fontSize: 9 })),
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
  options: PdfExportOptions,
  t: PdfTranslate,
  today: string = todayCalendarDate(),
): Content | null {
  const permits = well.permits;
  if (!permits?.length) return null;

  const fmt = createPdfFormatters(options);
  const sorted = [...permits].sort((a, b) =>
    (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: t('editor.operation.permit.title'), style: 'title' },
        buildHeader(first!, well, today, fmt, t),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, well, today, fmt, options, t),
  ];
  rest.forEach(p => {
    items.push(buildEntryDivider());
    items.push({
      stack: [
        buildHeader(p, well, today, fmt, t),
        ...buildBody(p, well, today, fmt, options, t),
      ],
    });
  });

  return { stack: items };
}
