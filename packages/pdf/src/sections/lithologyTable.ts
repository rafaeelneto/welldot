import type { Well } from '@welldot/core';
import { createPdfFormatters } from '../formatters';
import { headerCell, withTableTitle } from '../layout/tables';
import type {
  PdfContext,
  PdfRenderedExtras,
  RenderedSvg,
} from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

/** Side of the square swatch drawn when a layer has no rendered swatch. */
const SWATCH_SIZE = 9;

function swatchCell(
  svg: RenderedSvg | null | undefined,
  color: string | undefined,
  ctx: PdfContext,
): Content {
  if (svg) return { svg: svg.markup, width: svg.width, height: svg.height };
  return {
    canvas: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: SWATCH_SIZE,
        h: SWATCH_SIZE,
        color: color || ctx.theme.colors.divider,
        lineColor: ctx.theme.colors.tableRule,
        lineWidth: 0.5,
      },
    ],
  };
}

/**
 * Lithology table of the `compact` format: depth range with the layer's
 * swatch, geologic unit (aquifer unit in italics) and description. Rows
 * follow `well.lithology`, so they match the profile's numbered markers.
 * Returns `[]` in the `detailed` format (the profile shows the
 * descriptions) or when there is no lithology.
 */
export function buildLithologySection(
  well: Well,
  ctx: PdfContext,
  extras: PdfRenderedExtras = {},
): Content[] {
  if (ctx.format !== 'compact' || well.lithology.length === 0) return [];

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);
  const swatches = extras.lithologySwatches ?? [];

  const body: TableCell[][] = [
    [
      headerCell(labels.lithology.fromTo),
      headerCell(labels.lithology.unit),
      headerCell(labels.lithology.description),
    ],
  ];

  well.lithology.forEach((layer, index) => {
    const unit: Content[] = [];
    if (layer.geologic_unit) unit.push({ text: layer.geologic_unit });
    if (layer.aquifer_unit) {
      unit.push({ text: layer.aquifer_unit, italics: true });
    }
    body.push([
      {
        columns: [
          {
            width: 'auto',
            stack: [swatchCell(swatches[index], layer.color, ctx)],
            margin: [0, 1, 0, 0],
          },
          {
            width: '*',
            text: fmt.formatDepthRange(layer.from, layer.to),
            noWrap: true,
          },
        ],
        columnGap: 4,
      },
      unit.length > 0 ? { stack: unit } : '—',
      layer.description || '—',
    ]);
  });

  return [
    withTableTitle(labels.lithology.title, {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*', '*'],
        headerRows: 1,
        dontBreakRows: true,
        body,
      },
    }),
  ];
}
