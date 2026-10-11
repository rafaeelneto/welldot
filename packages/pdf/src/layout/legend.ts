import type { PdfContext, RenderedLegendItem } from '../types/options.types';
import type { ContentTable, TableCell } from '../types/pdfmake.types';
import { withTableTitle } from './tables';

/** Legend entries per row. */
export const LEGEND_COLUMNS = 6;

/**
 * Lays the legend out as a full-width table of {@link LEGEND_COLUMNS} equal
 * columns, one entry (symbol + label) per cell, so entries keep the same size
 * whatever their count and long labels wrap inside their cell. Returns `null`
 * when there is nothing to show.
 */
export function buildLegendTable(
  items: RenderedLegendItem[],
  ctx: Pick<PdfContext, 'theme' | 'labels'>,
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
  for (let i = 0; i < cells.length; i += LEGEND_COLUMNS) {
    const row = cells.slice(i, i + LEGEND_COLUMNS);
    while (row.length < LEGEND_COLUMNS) row.push({});
    body.push(row);
  }

  return withTableTitle(labels.document.legendTitle, {
    layout: 'noBorders',
    table: {
      widths: Array<'*'>(LEGEND_COLUMNS).fill('*'),
      dontBreakRows: true,
      body,
    },
  });
}
