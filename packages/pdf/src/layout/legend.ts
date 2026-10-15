import type { PdfContext, RenderedLegendItem } from '../types/options.types';
import type {
  Content,
  ContentStack,
  ContentTable,
  TableCell,
} from '../types/pdfmake.types';
import { buildRule, withTableTitle } from './tables';

/** Legend entries per row. */
export const LEGEND_COLUMNS = 6;

/**
 * Lays the legend out as a full-width table of `columns` (default
 * {@link LEGEND_COLUMNS}) equal columns, one entry (symbol + label) per
 * cell, so entries keep the same size whatever their count and long labels
 * wrap inside their cell. Returns `null` when there is nothing to show.
 */
export function buildLegendTable(
  items: RenderedLegendItem[],
  ctx: Pick<PdfContext, 'theme' | 'labels'>,
  columns = LEGEND_COLUMNS,
): ContentTable | null {
  if (items.length === 0) return null;

  const { theme, labels } = ctx;
  const cells: TableCell[] = items.map(({ label, symbol }) => ({
    columns: [
      { svg: symbol.markup, width: symbol.width, height: symbol.height },
      {
        text: label,
        width: '*',
        font: theme.fonts.label,
        fontSize: theme.fontSizes.metadataLabel,
        margin: [0, 3, 0, 0],
      },
    ],
    columnGap: 4,
  }));

  const body: TableCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const row = cells.slice(i, i + columns);
    while (row.length < columns) row.push({});
    body.push(row);
  }

  return withTableTitle(labels.document.legendTitle, {
    layout: 'noBorders',
    table: {
      widths: Array<'*'>(columns).fill('*'),
      dontBreakRows: true,
      body,
    },
  });
}

/** Height (pt) of one row of the legend strip. */
export const LEGEND_ROW_HEIGHT = 16;

/** Space (pt) between the strip's rule and its first row. */
const STRIP_RULE_GAP = 5;

/** Space (pt) under the strip's last row. */
const STRIP_BOTTOM_PAD = 2;

/** Width (pt) the legend symbols are scaled to in the strip. */
const SYMBOL_WIDTH = 20;
const SYMBOL_GAP = 4;
const ITEM_GAP = 10;

/**
 * The symbol scaled to {@link SYMBOL_WIDTH}, keeping its proportions. A
 * `viewBox` (added when missing) makes the drawing scale with the box
 * instead of being cropped.
 */
function scaledSymbol(symbol: RenderedLegendItem['symbol']): Content {
  const markup = /viewBox=/.test(symbol.markup)
    ? symbol.markup
    : symbol.markup.replace(
        '<svg',
        `<svg viewBox="0 0 ${symbol.width} ${symbol.height}"`,
      );
  return {
    svg: markup,
    width: SYMBOL_WIDTH,
    height: (SYMBOL_WIDTH * symbol.height) / symbol.width,
  };
}
/** Average glyph width as a share of the font size; on the safe side. */
const CHAR_WIDTH_RATIO = 0.6;

/**
 * Packs legend labels into the rows of the legend strip, greedily, by an
 * estimated width: the title opens the first row, each item takes its
 * symbol, a gap and its label. Returns the item indices of each row.
 * Shared by {@link buildLegendStrip} and {@link computeLegendStripHeight},
 * so the height reserved for the strip is the height it is drawn at.
 */
export function packLegendRows(
  labels: string[],
  ctx: Pick<PdfContext, 'theme' | 'labels' | 'page'>,
): number[][] {
  if (labels.length === 0) return [];
  const charWidth = ctx.theme.fontSizes.metadataLabel * CHAR_WIDTH_RATIO;
  const width = ctx.page.contentWidth;
  const titleWidth =
    ctx.labels.document.legendTitle.length * charWidth * 1.15 + ITEM_GAP;

  const rows: number[][] = [[]];
  let used = titleWidth;
  labels.forEach((label, index) => {
    const itemWidth =
      SYMBOL_WIDTH + SYMBOL_GAP + label.length * charWidth + ITEM_GAP;
    const row = rows[rows.length - 1]!;
    if (row.length > 0 && used + itemWidth > width) {
      rows.push([index]);
      used = itemWidth;
    } else {
      row.push(index);
      used += itemWidth;
    }
  });
  return rows;
}

/**
 * Height (pt) of the legend strip for these labels: the rule gap, one
 * {@link LEGEND_ROW_HEIGHT} per row and a small padding; `0` without
 * labels.
 */
export function computeLegendStripHeight(
  labels: string[],
  ctx: Pick<PdfContext, 'theme' | 'labels' | 'page'>,
): number {
  const rows = packLegendRows(labels, ctx).length;
  return rows === 0
    ? 0
    : STRIP_RULE_GAP + rows * LEGEND_ROW_HEIGHT + STRIP_BOTTOM_PAD;
}

/**
 * The compact legend strip drawn at the foot of the first profile page: a
 * rule, then rows opening with the uppercase legend title, each item its
 * symbol (scaled to 20 pt wide) followed by its label on one line. Rows come from
 * {@link packLegendRows}, so its height is {@link computeLegendStripHeight}.
 * Returns `null` when there is nothing to show.
 */
export function buildLegendStrip(
  items: RenderedLegendItem[],
  ctx: Pick<PdfContext, 'theme' | 'labels' | 'page' | 'locale'>,
): ContentStack | null {
  const rows = packLegendRows(
    items.map(item => item.label),
    ctx,
  );
  if (rows.length === 0) return null;

  const { theme } = ctx;
  const textStyle = {
    font: theme.fonts.label,
    fontSize: theme.fontSizes.metadataLabel,
    noWrap: true,
  };

  const rowContent = (indices: number[], first: boolean): Content => {
    const columns: Content[] = [];
    if (first) {
      columns.push({
        ...textStyle,
        text: ctx.labels.document.legendTitle.toLocaleUpperCase(ctx.locale),
        bold: true,
        color: theme.colors.tableHeader,
        width: 'auto',
        margin: [0, 1.5, ITEM_GAP, 0],
      });
    }
    for (const index of indices) {
      const { symbol, label } = items[index]!;
      columns.push(scaledSymbol(symbol), {
        ...textStyle,
        text: label,
        width: 'auto',
        margin: [SYMBOL_GAP, 1.5, ITEM_GAP, 0],
      });
    }
    // Symbols are about 11 pt tall; the margin pads each row to the row height.
    return {
      columns,
      columnGap: 0,
      margin: [0, 0, 0, LEGEND_ROW_HEIGHT - 12],
    };
  };

  return {
    stack: [
      buildRule(ctx.page.contentWidth, theme.colors.pageRule, [
        0,
        0,
        0,
        STRIP_RULE_GAP,
      ]),
      ...rows.map((indices, i) => rowContent(indices, i === 0)),
    ],
  };
}
