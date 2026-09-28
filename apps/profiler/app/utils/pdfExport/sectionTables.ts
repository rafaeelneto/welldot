import type { Well } from '@welldot/core';
import { calculateHoleFillVolume } from '@welldot/utils';
import { resolveDiameterUnitLabel } from '~/utils/unitLabel';
import { createPdfFormatters } from './formatters';
import type {
  Content,
  ContentTable,
  TableCell,
  TableLayout,
} from './pdfmake.types';
import type { PdfExportOptions, PdfTranslate } from './types';

/** Shared `pdfmake` table styling/layout helpers, reused by other `pdfExport/*` section builders. */
export const LIGHT_LINES_LAYOUT: TableLayout = {
  hLineWidth: (i, node) => (i === node.table.body.length || i === 0 ? 1 : 0),
  vLineWidth: () => 0,
  hLineColor: () => '#3d3d3d',
};

/**
 * Short horizontal rule separating entries in a flowing (non-table) block
 * listing. A factory, not a shared constant — `pdfmake` mutates canvas
 * nodes in place during layout, so reusing one object instance at multiple
 * positions in the content tree corrupts it after the first occurrence.
 */
export function buildEntryDivider(): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 535,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#e5e5e5',
      },
    ],
    margin: [0, 4, 0, 4],
  };
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

function buildCementPadSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const pad = well.cement_pad;
  if (!pad?.thickness || !pad?.width) return null;

  const { formatLength } = createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.wellhead.thickness')),
      rightCell(formatLength(pad.thickness)),
    ],
    [
      headerCell(t('editor.construction.wellhead.width')),
      rightCell(formatLength(pad.width)),
    ],
    [
      headerCell(t('editor.construction.wellhead.length')),
      rightCell(formatLength(pad.length)),
    ],
    [
      headerCell(t('editor.construction.wellhead.type')),
      rightCell(pad.type ?? '—'),
    ],
  ];

  return withTableTitle(t('editor.construction.wellhead.cementPad'), {
    layout: LIGHT_LINES_LAYOUT,
    table: { widths: ['*', '*'], dontBreakRows: true, body },
  });
}

function buildIntervalSection(
  items: { from: number; to: number; diameter: number }[],
  title: string,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(
        `${t('editor.construction.boreHole.diameter')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
      ),
      headerCell(
        `${t('editor.construction.boreHole.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.boreHole.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];
  for (const item of items) {
    body.push([
      { text: formatDiameter(item.diameter) },
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);
  }

  return withTableTitle(title, {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildHoleFillSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const items = well.hole_fill;
  if (items.length === 0) return null;

  const {
    formatLength,
    formatDiameter,
    formatVolume,
    diameterUnit,
    lengthUnit,
  } = createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.holeFill.description')),
      headerCell(
        `${t('editor.construction.holeFill.diameter')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.holeFill.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.holeFill.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];

  items.forEach((item, index) => {
    body.push([
      item.description || item.type,
      rightCell(formatDiameter(item.diameter)),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);

    const next = items[index + 1];
    if (!next || next.type !== item.type) {
      const volumeM3 = calculateHoleFillVolume(item.type, well);
      body.push([
        {
          text: t('editor.exportPdfDialog.content.volumeTotal'),
          style: 'sumRow',
          colSpan: 3,
        },
        {},
        {},
        { text: formatVolume(volumeM3), style: 'sumRow', alignment: 'right' },
      ]);
    }
  });

  return withTableTitle(t('editor.construction.holeFill.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildWellCaseSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const items = well.well_case;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.wellCase.type')),
      headerCell(
        `${t('editor.construction.wellCase.diameter')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.wellCase.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.wellCase.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];

  items.forEach((item, index) => {
    body.push([
      item.type,
      rightCell(formatDiameter(item.diameter)),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);

    const next = items[index + 1];
    if (!next || next.type !== item.type || next.diameter !== item.diameter) {
      const totalLength = items
        .filter(el => el.type === item.type && el.diameter === item.diameter)
        .reduce((sum, el) => sum + (el.to - el.from), 0);
      body.push([
        {
          text: t('editor.exportPdfDialog.content.total'),
          style: 'sumRow',
          colSpan: 3,
        },
        {},
        {},
        {
          text: formatLength(totalLength),
          style: 'sumRow',
          alignment: 'right',
        },
      ]);
    }
  });

  return withTableTitle(t('editor.construction.wellCase.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildReductionSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const items = well.reduction;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.reduction.type')),
      headerCell(
        `${t('editor.construction.reduction.diamFrom')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.reduction.diamTo')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.reduction.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.reduction.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];

  for (const item of items) {
    body.push([
      item.type,
      rightCell(formatDiameter(item.diam_from)),
      rightCell(formatDiameter(item.diam_to)),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);
  }

  return withTableTitle(t('editor.construction.reduction.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildWellScreenSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const items = well.well_screen;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.wellScreen.type')),
      headerCell(
        `${t('editor.construction.wellScreen.diameter')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.exportPdfDialog.content.slot')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.wellScreen.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.wellScreen.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];

  items.forEach((item, index) => {
    body.push([
      item.type,
      rightCell(formatDiameter(item.diameter)),
      rightCell(formatDiameter(item.screen_slot)),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);

    const next = items[index + 1];
    if (!next || next.type !== item.type || next.diameter !== item.diameter) {
      const totalLength = items
        .filter(el => el.type === item.type && el.diameter === item.diameter)
        .reduce((sum, el) => sum + (el.to - el.from), 0);
      body.push([
        {
          text: t('editor.exportPdfDialog.content.total'),
          style: 'sumRow',
          colSpan: 4,
        },
        {},
        {},
        {},
        {
          text: formatLength(totalLength),
          style: 'sumRow',
          alignment: 'right',
        },
      ]);
    }
  });

  return withTableTitle(t('editor.construction.wellScreen.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildCentralizerSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  const items = well.centralizers ?? [];
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(options);
  const body: TableCell[][] = [
    [
      headerCell(t('editor.construction.centralizer.type')),
      headerCell(
        `${t('editor.construction.centralizer.diameter')} (${resolveDiameterUnitLabel(diameterUnit, options.locale)})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.centralizer.spacing')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.centralizer.from')} (${lengthUnit})`,
        true,
      ),
      headerCell(
        `${t('editor.construction.centralizer.to')} (${lengthUnit})`,
        true,
      ),
    ],
  ];

  for (const item of items) {
    body.push([
      item.description ? `${item.type} — ${item.description}` : item.type,
      rightCell(item.diameter != null ? formatDiameter(item.diameter) : '—'),
      rightCell(item.spacing != null ? formatLength(item.spacing) : '—'),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);
  }

  return withTableTitle(t('editor.construction.centralizer.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

/**
 * Builds the per-feature summary tables (cement pad, bore hole, surface
 * casing, hole fill w/ gravel-pack volume, casing, reduction, screen,
 * centralizers), each
 * omitted when its corresponding `well.*` array/field is empty.
 */
export function buildSectionTables(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content[] {
  const sections = [
    buildCementPadSection(well, options, t),
    buildIntervalSection(
      well.bore_hole,
      t('editor.construction.boreHole.title'),
      options,
      t,
    ),
    buildIntervalSection(
      well.surface_case,
      t('editor.construction.surfaceCase.title'),
      options,
      t,
    ),
    buildHoleFillSection(well, options, t),
    buildWellCaseSection(well, options, t),
    buildReductionSection(well, options, t),
    buildWellScreenSection(well, options, t),
    buildCentralizerSection(well, options, t),
  ];

  return sections.filter((section): section is Content => section !== null);
}
