import type { Well } from '@welldot/core';
import { createPdfFormatters } from '../formatters';
import { headerCell, withTableTitle } from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

/**
 * Fractures table of the `compact` format, by depth: the depth, then the
 * bold `F{n}` marker and kind (open/closed fracture) followed by the
 * description. Fractures are numbered by their order in `well.fractures`,
 * like the profile's `F{n}` markers. Returns `[]` in the `detailed` format
 * or when there are no fractures.
 */
export function buildFractureSection(well: Well, ctx: PdfContext): Content[] {
  const fractures = well.fractures ?? [];
  if (ctx.format !== 'compact' || fractures.length === 0) return [];

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);

  const rows = fractures
    .map((f, index) => ({ f, marker: `F${index + 1}` }))
    .sort((a, b) => a.f.depth - b.f.depth)
    .map(({ f, marker }): TableCell[] => {
      const kind = f.water_intake
        ? labels.fractures.fractureWater
        : labels.fractures.fracture;
      return [
        { text: fmt.formatDepth(f.depth), noWrap: true },
        {
          text: [
            { text: `${marker} · ${kind}`, bold: true },
            ...(f.description ? [{ text: ` — ${f.description}` }] : []),
          ],
        },
      ];
    });

  return [
    withTableTitle(labels.fractures.title, {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*'],
        headerRows: 1,
        dontBreakRows: true,
        body: [
          [
            headerCell(labels.fractures.depth),
            headerCell(labels.fractures.description),
          ],
          ...rows,
        ],
      },
    }),
  ];
}
