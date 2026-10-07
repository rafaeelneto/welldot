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
): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: width,
        y2: 0,
        lineWidth: 0.5,
        lineColor: color,
      },
    ],
    margin,
  };
}

/** Short rule separating entries in a flowing (non-table) block listing. */
export function buildEntryDivider(
  ctx: Pick<PdfContext, 'theme' | 'page'>,
): Content {
  return buildRule(
    ctx.page.contentWidth,
    ctx.theme.colors.divider,
    [0, 4, 0, 4],
  );
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
  const columns = content.table.widths?.length ?? 1;
  const titleRow: TableCell[] = [
    { text: title, style: 'title', colSpan: columns },
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
    margin: [0, 16, 0, 0],
  };
}
