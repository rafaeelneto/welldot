import type { Attachment, HistoryLogEntry, Well } from '@welldot/core';
import {
  HISTORY_LOG_CATEGORIES,
  HISTORY_LOG_SEVERITIES,
  MAINTENANCE_TYPES,
  getVocabLabel,
} from '@welldot/core';
import { format, parseISO } from 'date-fns';
import { resolveWellStatusLabel } from '../helpers/operationVocab';
import { buildEntryDivider } from '../layout/tables';
import type { PdfContext, PdfTranslate } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';

/** `maintenance_type` or `status_change` status, when present (.well v2.3). */
function categoryDetail(
  entry: HistoryLogEntry,
  t: PdfTranslate,
  locale: string,
): string {
  if (entry.category === 'maintenance' && entry.maintenance_type) {
    return getVocabLabel(MAINTENANCE_TYPES, entry.maintenance_type, locale);
  }
  if (entry.category === 'status_change' && entry.status) {
    return resolveWellStatusLabel(entry.status, t);
  }
  return '';
}

function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').pop() ?? attachment.uri
  );
}

/** The category/severity/date header line — short and height-bounded, so it's safe to bind to the section title. */
function buildLogEntryHeader(entry: HistoryLogEntry, ctx: PdfContext): Content {
  const { t, locale } = ctx;
  const detail = categoryDetail(entry, t, locale);
  return {
    columns: [
      {
        text: [
          {
            text: getVocabLabel(HISTORY_LOG_CATEGORIES, entry.category, locale),
            style: 'tableHeader',
          },
          {
            text: detail ? ` · ${detail}` : '',
            style: 'tableHeader',
          },
          {
            text: entry.severity
              ? `   ${getVocabLabel(HISTORY_LOG_SEVERITIES, entry.severity, locale)}`
              : '',
            style: 'metadataLabel',
          },
        ],
        width: '*',
      },
      {
        text: format(parseISO(entry.datetime), ctx.dateFormats.dateTime),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

/**
 * The (possibly multi-paragraph) description, an indented bullet list of
 * attachment filenames, and an author line — as separate flowing blocks
 * rather than fixed-height table cells, so long free-text descriptions
 * paginate naturally instead of forcing a whole rigid row onto the next
 * page and leaving the previous page half-blank. Unbounded in height, so
 * never bind this to the section title/header via `unbreakable`.
 */
function buildLogEntryBody(entry: HistoryLogEntry, t: PdfTranslate): Content[] {
  const blocks: Content[] = [
    { text: entry.description, margin: [0, 4, 0, 0], fontSize: 10 },
  ];

  const attachments = entry.attachments ?? [];
  if (attachments.length > 0) {
    blocks.push({
      stack: attachments.map(attachment => ({
        text: `•  ${attachmentName(attachment)}`,
        style: 'metadataLabel',
      })),
      margin: [10, 4, 0, 0],
    });
  }

  if (entry.author) {
    blocks.push({
      text: `${t('historyLog.logs.by')} ${entry.author}`,
      style: 'metadataLabel',
      margin: [0, 4, 0, 0],
    });
  }

  return blocks;
}

function buildLogEntry(entry: HistoryLogEntry, ctx: PdfContext): Content {
  return {
    stack: [
      buildLogEntryHeader(entry, ctx),
      ...buildLogEntryBody(entry, ctx.t),
    ],
  };
}

/**
 * Builds a chronological (most recent first) listing of `well.history_logs`
 * entries. Returns `null` when there are no entries.
 *
 * The title is bound to the first entry's header line only (not its full
 * body) inside an `unbreakable` block, so the heading can never render
 * alone at a page bottom — pdfmake pushes the whole [title, header] pair to
 * the next page together if it doesn't fit. The first entry's body (and
 * every subsequent entry) stays ordinary breakable content, since
 * `unbreakable` content taller than one page is silently dropped by
 * pdfmake rather than paginated.
 */
export function buildHistoryLogSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const logs = well.history_logs;
  if (!logs?.length) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
  const [first, ...rest] = sorted;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: ctx.t('historyLog.logs.title'), style: 'title' },
        buildLogEntryHeader(first!, ctx),
      ],
      unbreakable: true,
    },
    ...buildLogEntryBody(first!, ctx.t),
  ];
  rest.forEach(entry => {
    items.push(buildEntryDivider(ctx));
    items.push(buildLogEntry(entry, ctx));
  });

  return { stack: items };
}
