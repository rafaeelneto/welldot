import type { Well } from '@welldot/core';
import { createPdfFormatters } from '../formatters';
import { headerCell, withTableTitle } from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

/**
 * Caves table of the `compact` format, by depth: the depth range, then the
 * bold kind (dry or with water) followed by the description. Returns `[]`
 * in the `detailed` format or when there are no caves.
 */
export function buildCaveSection(well: Well, ctx: PdfContext): Content[] {
  const caves = well.caves ?? [];
  if (ctx.format !== 'compact' || caves.length === 0) return [];

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);

  const rows = [...caves]
    .sort((a, b) => a.from - b.from)
    .map((c): TableCell[] => [
      { text: fmt.formatDepthRange(c.from, c.to), noWrap: true },
      {
        text: [
          {
            text: c.water_intake ? labels.caves.wet : labels.caves.dry,
            bold: true,
          },
          ...(c.description ? [{ text: ` — ${c.description}` }] : []),
        ],
      },
    ]);

  return [
    withTableTitle(labels.caves.title, {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*'],
        headerRows: 1,
        dontBreakRows: true,
        body: [
          [
            headerCell(labels.caves.fromTo),
            headerCell(labels.caves.description),
          ],
          ...rows,
        ],
      },
    }),
  ];
}
