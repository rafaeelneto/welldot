import type { Well } from '@welldot/core';
import {
  CEMENT_PAD_TYPES,
  CENTRALIZER_TYPES,
  CONSTRUCTION_MATERIALS,
} from '@welldot/core';
import { calculateHoleFillVolume } from '@welldot/utils';
import { createPdfFormatters } from '../formatters';
import { resolveDiameterUnitLabel } from '../helpers/unitLabel';
import {
  headerCell,
  lightLinesLayout,
  rightCell,
  withTableTitle,
} from '../layout/tables';
import type { PdfContext } from '../types/options.types';
import type { Content, TableCell } from '../types/pdfmake.types';

function buildCementPadSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const pad = well.cement_pad;
  if (!pad?.thickness || !pad?.width) return null;

  const { formatLength, vocab } = createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.wellhead.thickness')),
      rightCell(formatLength(pad.thickness)),
    ],
    [
      headerCell(t('construction.wellhead.width')),
      rightCell(formatLength(pad.width)),
    ],
    [
      headerCell(t('construction.wellhead.length')),
      rightCell(formatLength(pad.length)),
    ],
    [
      headerCell(t('construction.wellhead.type')),
      rightCell(pad.type ? vocab(CEMENT_PAD_TYPES, pad.type) : '—'),
    ],
  ];

  return withTableTitle(t('construction.wellhead.cementPad'), {
    layout: lightLinesLayout(ctx),
    table: { widths: ['*', '*'], dontBreakRows: true, body },
  });
}

function buildIntervalSection(
  items: { from: number; to: number; diameter: number }[],
  title: string,
  ctx: PdfContext,
): Content | null {
  const { t } = ctx;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit } =
    createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(
        `${t('construction.boreHole.diameter')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
      ),
      headerCell(`${t('construction.boreHole.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.boreHole.to')} (${lengthUnit})`, true),
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

function buildHoleFillSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const items = well.hole_fill;
  if (items.length === 0) return null;

  const {
    formatLength,
    formatDiameter,
    formatVolume,
    diameterUnit,
    lengthUnit,
  } = createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.holeFill.description')),
      headerCell(
        `${t('construction.holeFill.diameter')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(`${t('construction.holeFill.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.holeFill.to')} (${lengthUnit})`, true),
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
          text: t('document.volumeTotal'),
          style: 'sumRow',
          colSpan: 3,
        },
        {},
        {},
        { text: formatVolume(volumeM3), style: 'sumRow', alignment: 'right' },
      ]);
    }
  });

  return withTableTitle(t('construction.holeFill.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildWellCaseSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const items = well.well_case;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit, vocab } =
    createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.wellCase.type')),
      headerCell(
        `${t('construction.wellCase.diameter')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(`${t('construction.wellCase.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.wellCase.to')} (${lengthUnit})`, true),
    ],
  ];

  items.forEach((item, index) => {
    body.push([
      vocab(CONSTRUCTION_MATERIALS, item.type),
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
          text: t('document.total'),
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

  return withTableTitle(t('construction.wellCase.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildReductionSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const items = well.reduction;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit, vocab } =
    createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.reduction.type')),
      headerCell(
        `${t('construction.reduction.diamFrom')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(
        `${t('construction.reduction.diamTo')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(`${t('construction.reduction.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.reduction.to')} (${lengthUnit})`, true),
    ],
  ];

  for (const item of items) {
    body.push([
      vocab(CONSTRUCTION_MATERIALS, item.type),
      rightCell(formatDiameter(item.diam_from)),
      rightCell(formatDiameter(item.diam_to)),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);
  }

  return withTableTitle(t('construction.reduction.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildWellScreenSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const items = well.well_screen;
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit, vocab } =
    createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.wellScreen.type')),
      headerCell(
        `${t('construction.wellScreen.diameter')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(
        `${t('document.slot')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(`${t('construction.wellScreen.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.wellScreen.to')} (${lengthUnit})`, true),
    ],
  ];

  items.forEach((item, index) => {
    body.push([
      vocab(CONSTRUCTION_MATERIALS, item.type),
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
          text: t('document.total'),
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

  return withTableTitle(t('construction.wellScreen.title'), {
    layout: 'lightHorizontalLines',
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      headerRows: 1,
      dontBreakRows: true,
      body,
    },
  });
}

function buildCentralizerSection(well: Well, ctx: PdfContext): Content | null {
  const { t } = ctx;
  const items = well.centralizers ?? [];
  if (items.length === 0) return null;

  const { formatLength, formatDiameter, diameterUnit, lengthUnit, vocab } =
    createPdfFormatters(ctx);
  const body: TableCell[][] = [
    [
      headerCell(t('construction.centralizer.type')),
      headerCell(
        `${t('construction.centralizer.diameter')} (${resolveDiameterUnitLabel(diameterUnit, ctx.locale)})`,
        true,
      ),
      headerCell(
        `${t('construction.centralizer.spacing')} (${lengthUnit})`,
        true,
      ),
      headerCell(`${t('construction.centralizer.from')} (${lengthUnit})`, true),
      headerCell(`${t('construction.centralizer.to')} (${lengthUnit})`, true),
    ],
  ];

  for (const item of items) {
    body.push([
      item.description
        ? `${vocab(CENTRALIZER_TYPES, item.type)} — ${item.description}`
        : vocab(CENTRALIZER_TYPES, item.type),
      rightCell(item.diameter != null ? formatDiameter(item.diameter) : '—'),
      rightCell(item.spacing != null ? formatLength(item.spacing) : '—'),
      rightCell(formatLength(item.from)),
      rightCell(formatLength(item.to)),
    ]);
  }

  return withTableTitle(t('construction.centralizer.title'), {
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
export function buildSectionTables(well: Well, ctx: PdfContext): Content[] {
  const { t } = ctx;
  const sections = [
    buildCementPadSection(well, ctx),
    buildIntervalSection(well.bore_hole, t('construction.boreHole.title'), ctx),
    buildIntervalSection(
      well.surface_case,
      t('construction.surfaceCase.title'),
      ctx,
    ),
    buildHoleFillSection(well, ctx),
    buildWellCaseSection(well, ctx),
    buildReductionSection(well, ctx),
    buildWellScreenSection(well, ctx),
    buildCentralizerSection(well, ctx),
  ];

  return sections.filter((section): section is Content => section !== null);
}
