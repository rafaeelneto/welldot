import type { Attachment } from '@welldot/core';
import type { PdfContext } from '../types/options.types';
import type {
  Content,
  ContentTable,
  TableCell,
  TableLayout,
} from '../types/pdfmake.types';

/** Table layout with a rule above the first row and below the last, colored by `theme.colors.tableRule`. */
export function lightLinesLayout(ctx: Pick<PdfContext, 'theme'>): TableLayout {
  return {
    hLineWidth: (i, node) => (i === node.table.body.length || i === 0 ? 1 : 0),
    vLineWidth: () => 0,
    hLineColor: () => ctx.theme.colors.tableRule,
  };
}

/** Full-width horizontal rule. A factory: pdfmake mutates canvas nodes in place, so never share one instance. */
export function buildRule(
  width: number,
  color: string,
  margin: [number, number, number, number] = [0, 0, 0, 0],
  lineWidth = 0.5,
): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: width,
        y2: 0,
        lineWidth,
        lineColor: color,
      },
    ],
    margin,
  };
}

/** Rule separating entries in a flowing (non-table) block listing. */
export function buildEntryDivider(
  ctx: Pick<PdfContext, 'theme' | 'page'>,
): Content {
  return buildRule(
    ctx.page.contentWidth,
    ctx.theme.colors.pageRule,
    [0, 8, 0, 8],
    0.75,
  );
}

/** Display name of an attachment: its filename, else the last URI segment. */
export function attachmentName(attachment: Attachment): string {
  return (
    attachment.filename ?? attachment.uri.split('/').pop() ?? attachment.uri
  );
}

/**
 * Header line of a listing entry: `title` in the table-header style, an
 * optional `marker` (status, "current"…) in the label style, and `right`
 * (date or period) right-aligned. Short and height-bounded, so it is safe to
 * bind to the section title.
 */
export function buildEntryHeader(
  title: string,
  marker: string | null | undefined,
  right: string,
): Content {
  return {
    columns: [
      {
        text: [
          { text: title, style: 'tableHeader' },
          ...(marker ? [{ text: `   ${marker}`, style: 'metadataLabel' }] : []),
        ],
        width: '*',
      },
      {
        text: right,
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

/** One entry of {@link buildEntryListing}: a bounded header and a free-height body. */
export interface ListingEntry {
  header: Content;
  body: Content[];
}

/**
 * A titled listing of entries separated by {@link buildEntryDivider}. The
 * title is bound to the first entry's header only, inside an `unbreakable`
 * block, so the heading never renders alone at a page bottom; bodies stay
 * breakable (pdfmake drops `unbreakable` content taller than a page).
 * Returns `null` for an empty list.
 */
export function buildEntryListing(
  title: string,
  entries: ListingEntry[],
  ctx: Pick<PdfContext, 'theme' | 'page'>,
): Content | null {
  const [first, ...rest] = entries;
  if (!first) return null;

  const items: Content[] = [
    {
      stack: [{ text: ' ' }, { text: title, style: 'title' }, first.header],
      unbreakable: true,
    },
    ...first.body,
  ];
  rest.forEach(entry => {
    items.push(buildEntryDivider(ctx));
    items.push({ stack: [entry.header, ...entry.body] });
  });
  return { stack: items };
}

export function headerCell(text: string, alignRight = false): TableCell {
  return {
    text,
    style: alignRight ? ['tableHeader', 'columnRight'] : 'tableHeader',
  };
}

export function rightCell(text: string): TableCell {
  return { text, style: 'columnRight' };
}

/**
 * Right-aligned measured value kept on one line, so pdfmake never wraps a
 * number away from its unit (`12.50 m`, `17.6 m³/h`).
 */
export function valueCell(text: string): TableCell {
  return { text, style: 'columnRight', noWrap: true };
}

/** Prepends `cell` as a full-width row folded into the table's header rows. */
function withTitleRow(
  cell: TableCell & object,
  content: ContentTable,
  keepWithFirstRows: number,
): ContentTable {
  const columns = content.table.widths?.length ?? 1;
  const titleRow: TableCell[] = [
    { ...cell, colSpan: columns },
    ...Array(Math.max(0, columns - 1)).fill({}),
  ];
  return {
    ...content,
    table: {
      ...content.table,
      body: [titleRow, ...content.table.body],
      headerRows: (content.table.headerRows ?? 0) + 1,
      keepWithHeaderRows: keepWithFirstRows,
    },
  };
}

/**
 * Prepends a colSpan title row to a table's body and folds it into
 * `headerRows`/`keepWithHeaderRows`, so the title repeats (with the rest of
 * the header) on every page the table spans and stays bound to the first
 * data row — the section heading can never render alone at a page bottom.
 */
export function withTableTitle(
  title: string,
  content: ContentTable,
  keepWithFirstRows = 1,
): ContentTable {
  return {
    ...withTitleRow(
      { text: title, style: 'title' },
      content,
      keepWithFirstRows,
    ),
    margin: [0, 16, 0, 0],
  };
}

/**
 * {@link withTableTitle} for a table nested inside a listing entry
 * (conditions, history…): a small bold caption instead of a section title,
 * likewise repeated on each page and never left alone at a page bottom.
 */
export function withTableCaption(
  caption: string,
  content: ContentTable,
): ContentTable {
  return {
    ...withTitleRow(
      { text: caption, style: 'metadataLabel', bold: true },
      content,
      1,
    ),
    margin: [0, 6, 0, 0],
  };
}
