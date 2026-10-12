import type { Well } from '@welldot/core';
import { resolveBodyMargins, resolvePdfContext } from './context';
import { buildFooterContent } from './layout/footer';
import { buildHeaderContent } from './layout/header';
import { buildLegendStrip, computeLegendStripHeight } from './layout/legend';
import { withTableTitle } from './layout/tables';
import { buildImageWatermark, buildTextWatermark } from './layout/watermark';
import { buildCaveSection } from './sections/caveTable';
import { buildFractureSection } from './sections/fractureTable';
import { buildHistoryLogSection } from './sections/historyLogTable';
import { buildHydrodynamicEventsSection } from './sections/hydrodynamicEventsTable';
import { buildLithologySection } from './sections/lithologyTable';
import {
  buildMetadataTable,
  packLabelValueRows,
} from './sections/metadataTable';
import { buildMeterSection } from './sections/meterTable';
import { buildOperatingRegimeSection } from './sections/operatingRegimeTable';
import { buildPermitSection } from './sections/permitTable';
import { buildProductionSection } from './sections/productionTable';
import { buildPumpInstallationSection } from './sections/pumpInstallationTable';
import { buildSectionTables } from './sections/sectionTables';
import { buildWaterSampleSection } from './sections/waterSampleTable';
import {
  COMPACT_COLUMN_GAP,
  computeCompactColumnWidth,
  computeCompactSideWidth,
} from './svg/profileLayouts';
import type {
  PdfContext,
  PdfExportOptions,
  PdfRenderedExtras,
  PdfSectionKey,
  RenderedLegendItem,
  RenderedSvg,
} from './types/options.types';
import type {
  Content,
  ContentStack,
  ContentTable,
  TDocumentDefinition,
} from './types/pdfmake.types';

type SectionBuilder = (
  well: Well,
  ctx: PdfContext,
  extras?: PdfRenderedExtras,
) => Content[];

const single =
  (fn: (well: Well, ctx: PdfContext) => Content | null): SectionBuilder =>
  (well, ctx) => {
    const content = fn(well, ctx);
    return content ? [content] : [];
  };

/** Builder of each content section, keyed by {@link PdfSectionKey}. */
export const PDF_SECTION_BUILDERS: Record<PdfSectionKey, SectionBuilder> = {
  lithology: buildLithologySection,
  caves: buildCaveSection,
  fractures: buildFractureSection,
  construction: buildSectionTables,
  hydrodynamicEvents: single(buildHydrodynamicEventsSection),
  historyLog: single(buildHistoryLogSection),
  pumpInstallations: single(buildPumpInstallationSection),
  meters: single(buildMeterSection),
  operatingRegimes: single(buildOperatingRegimeSection),
  production: single(buildProductionSection),
  permits: single(buildPermitSection),
  waterSamples: single(buildWaterSampleSection),
};

function isContext(value: PdfExportOptions | PdfContext): value is PdfContext {
  return (
    typeof (value as PdfContext).labels === 'object' &&
    typeof (value as PdfContext).page === 'object' &&
    typeof (value as PdfContext).page?.contentWidth === 'number'
  );
}

/** Accepts raw options or an already-resolved context. */
export function toPdfContext(
  options: PdfExportOptions | PdfContext,
): PdfContext {
  return isContext(options) ? options : resolvePdfContext(options);
}

function infoTable(items: { label: string; value: string }[]): ContentTable {
  return {
    layout: 'noBorders',
    table: {
      widths: ['*', '*', '*', '*'],
      body: packLabelValueRows(items, 4),
    },
  };
}

/** Gap (pt) between the page header and the first block under it. */
export const LEAD_TOP_GAP = 6;

/** Label/value columns of the general-info table in the compact side column. */
export const COMPACT_METADATA_COLUMNS = 2;

/** Narrowest content width (pt) that still takes three metadata columns. */
const THREE_METADATA_COLUMNS_MIN_WIDTH = 420;

/** The titled general-info table, or `null` when the well has no metadata. */
function buildGeneralInfo(
  well: Well,
  ctx: PdfContext,
  columns?: number,
): ContentTable | null {
  const table = buildMetadataTable(well, ctx, columns);
  return table ? withTableTitle(ctx.labels.general.generalInfo, table) : null;
}

/**
 * Content that precedes the profile: the heading-info grid and, except in
 * the compact format (where it opens the side column), the general-info
 * table when `metadataPosition` is `'before'`. The first block sits
 * {@link LEAD_TOP_GAP} under the page header. `measureProfileStart` lays
 * out exactly these nodes to find where the profile begins.
 */
export function buildLeadContent(
  well: Well,
  options: PdfExportOptions | PdfContext = {},
): Content[] {
  const ctx = toPdfContext(options);
  const content: Content[] = [];

  if (ctx.headingInfo.length > 0) {
    content.push(infoTable(ctx.headingInfo));
  }

  const generalInfo =
    ctx.metadataPosition === 'before' && ctx.format !== 'compact'
      ? buildGeneralInfo(well, ctx)
      : null;
  if (generalInfo) content.push(generalInfo);

  const first = content[0];
  if (first && typeof first === 'object') {
    content[0] = { ...first, margin: [0, LEAD_TOP_GAP, 0, 0] } as Content;
  }
  return content;
}

/**
 * Page geometry and text styles of the document, without content, header,
 * footer or watermark: `pageSize`, `pageMargins` (from
 * {@link resolveBodyMargins}), `defaultStyle` and `styles`.
 */
export function buildDocShell(
  options: PdfExportOptions | PdfContext = {},
): Omit<TDocumentDefinition, 'content'> {
  const { breakPages, theme, page } = toPdfContext(options);
  return {
    defaultStyle: {
      font: theme.fonts.body,
      fontSize: theme.fontSizes.body,
      color: theme.colors.text,
    },
    pageSize: { width: page.width, height: breakPages ? page.height : 'auto' },
    pageMargins: resolveBodyMargins(page, breakPages),
    styles: {
      title: {
        bold: true,
        fontSize: theme.fontSizes.sectionTitle,
        font: theme.fonts.heading,
        color: theme.colors.title,
      },
      columnRight: { alignment: 'right' },
      sumRow: { bold: true, fontSize: 12, font: theme.fonts.label },
      metadataLabel: {
        fontSize: theme.fontSizes.metadataLabel,
        font: theme.fonts.label,
        color: theme.colors.text,
      },
      metadataValue: {
        fontSize: theme.fontSizes.metadataValue,
        font: theme.fonts.label,
        color: theme.colors.text,
      },
      tableHeader: {
        font: theme.fonts.label,
        bold: true,
        fontSize: theme.fontSizes.tableHeader,
        color: theme.colors.tableHeader,
      },
    },
  };
}

/** Every included section, in `ctx.sections.order`. */
function buildSections(
  well: Well,
  ctx: PdfContext,
  extras: PdfRenderedExtras,
): Content[] {
  const content: Content[] = [];
  for (const key of ctx.sections.order) {
    if (!ctx.sections.include[key]) continue;
    content.push(...PDF_SECTION_BUILDERS[key](well, ctx, extras));
  }
  return content;
}

/** End-info grid and the "after" general-info table, when present. */
function buildTrailingInfo(
  well: Well,
  ctx: PdfContext,
  metadataColumns?: number,
): Content[] {
  const content: Content[] = [];
  if (ctx.endInfo.length > 0) {
    content.push(
      withTableTitle(
        ctx.labels.document.finalInfoTitle,
        infoTable(ctx.endInfo),
      ),
    );
  }
  const generalInfo =
    ctx.metadataPosition === 'after'
      ? buildGeneralInfo(well, ctx, metadataColumns)
      : null;
  if (generalInfo) content.push(generalInfo);
  return content;
}

/**
 * Blocks of the compact format besides the profile: the `'before'`
 * general-info table, the sections (lithology, construction, fractures, …),
 * then the end-info and `'after'` general-info tables, sized to
 * `ctx.page.contentWidth` (the general-info tables drop to
 * {@link COMPACT_METADATA_COLUMNS} columns in the narrow side column). The
 * same well and options always give the same number of blocks, whatever the
 * width.
 */
export function buildCompactBlocks(
  well: Well,
  options: PdfExportOptions | PdfContext = {},
  extras: PdfRenderedExtras = {},
): Content[] {
  const ctx = toPdfContext(options);
  const metadataColumns =
    ctx.page.contentWidth < THREE_METADATA_COLUMNS_MIN_WIDTH
      ? COMPACT_METADATA_COLUMNS
      : undefined;
  const generalInfo =
    ctx.metadataPosition === 'before'
      ? buildGeneralInfo(well, ctx, metadataColumns)
      : null;
  return [
    ...(generalInfo ? [generalInfo] : []),
    ...buildSections(well, ctx, extras),
    ...buildTrailingInfo(well, ctx, metadataColumns),
  ];
}

/**
 * Content of the compact format's side column: {@link buildCompactBlocks}
 * built with the side column as the content width. The first block loses
 * its top margin so it lines up with the profile's column titles.
 */
export function buildCompactSideContent(
  well: Well,
  options: PdfExportOptions | PdfContext = {},
  extras: PdfRenderedExtras = {},
): Content[] {
  const base = toPdfContext(options);
  // Builders size rules and dividers to `page.contentWidth`; here that is
  // the side column.
  const ctx: PdfContext = {
    ...base,
    page: { ...base.page, contentWidth: computeCompactSideWidth(base.page) },
  };
  const content = buildCompactBlocks(well, ctx, extras);

  const first = content[0];
  if (first && typeof first === 'object' && 'margin' in first) {
    content[0] = { ...first, margin: [0, 0, 0, 0] } as Content;
  }
  return content;
}

/** Id of the compact columns block (see {@link buildDocDefinition}). */
export const COMPACT_COLUMNS_ID = 'welldot-compact-columns';

/** Id of the legend strip placed at the foot of the first profile page. */
export const LEGEND_STRIP_ID = 'welldot-legend-strip';

/**
 * Wraps the legend strip in a node drawn at the foot of the current page's
 * body (just above the footer), outside the flow. Place it right after the
 * first profile panel so it lands on that panel's page.
 */
function placeAtPageFoot(
  strip: ContentStack,
  legend: RenderedLegendItem[],
  ctx: PdfContext,
): ContentStack {
  const [left, , , bottom] = resolveBodyMargins(ctx.page, true);
  const height = computeLegendStripHeight(
    legend.map(item => item.label),
    ctx,
  );
  return {
    ...strip,
    id: LEGEND_STRIP_ID,
    absolutePosition: { x: left, y: ctx.page.height - bottom - height },
  };
}

/**
 * Starts `block` on the next page, from its body row (table) or item
 * (stack) `row` on. A table is split there and its title and header rows
 * repeat on the next page; without `row`, or at the first data row, the
 * whole block moves.
 */
export function startOnNextPage(block: Content, row?: number): Content[] {
  if (typeof block === 'string') {
    return [{ stack: [block], pageBreak: 'before' }];
  }
  if ('table' in block) {
    const { body } = block.table;
    const headerRows = block.table.headerRows ?? 0;
    if (row == null || row <= headerRows || row >= body.length) {
      return [{ ...block, pageBreak: 'before' }];
    }
    return [
      { ...block, table: { ...block.table, body: body.slice(0, row) } },
      {
        ...block,
        table: {
          ...block.table,
          body: [...body.slice(0, headerRows), ...body.slice(row)],
        },
        pageBreak: 'before',
      },
    ];
  }
  if ('stack' in block) {
    if (row == null || row <= 0 || row >= block.stack.length) {
      return [{ ...block, pageBreak: 'before' }];
    }
    return [
      { ...block, stack: block.stack.slice(0, row) },
      { ...block, stack: block.stack.slice(row), pageBreak: 'before' },
    ];
  }
  return [{ stack: [block], pageBreak: 'before' }];
}

/** Applies a {@link PdfRenderedExtras.legendBreak} to its list of blocks. */
function applyLegendBreak(
  blocks: Content[],
  { block, row }: NonNullable<PdfRenderedExtras['legendBreak']>,
): Content[] {
  const target = blocks[block];
  if (target == null) return blocks;
  return [
    ...blocks.slice(0, block),
    ...startOnNextPage(target, row),
    ...blocks.slice(block + 1),
  ];
}

/**
 * Pure assembly of the full `pdfmake` document definition from
 * already-rendered profile panels and legend symbols, the well's
 * metadata/sections and the export options. No DOM access.
 *
 * - `detailed`: the panels one under the other (a page break before each
 *   flagged one), then the legend, end info, "after" metadata and sections.
 * - `compact`: two columns — the panels stacked in the profile column (each
 *   sized to its page, so pdfmake moves the next one to the next page) and
 *   {@link buildCompactSideContent} flowing beside them. With
 *   `extras.compactSideSplit`, only that many side blocks stay beside the
 *   profile. The legend follows the two columns, then the remaining blocks
 *   at full width.
 *
 * `extras` carries the lithology swatches of the compact lithology table
 * and the compact side split.
 */
export function buildDocDefinition(
  well: Well,
  svgs: RenderedSvg[],
  legend: RenderedLegendItem[],
  options: PdfExportOptions | PdfContext = {},
  extras: PdfRenderedExtras = {},
): TDocumentDefinition {
  const ctx = toPdfContext(options);
  const { breakPages } = ctx;

  const content: Content[] = buildLeadContent(well, ctx);

  // The legend strip: at the foot of the first profile page when pages
  // break (its room is kept free under the first panel), else right after
  // the profile.
  const strip = buildLegendStrip(legend, ctx);
  const footStrip =
    strip && breakPages ? placeAtPageFoot(strip, legend, ctx) : null;
  const { legendBreak } = extras;
  const withBreak = (blocks: Content[], scope: 'side' | 'after') =>
    legendBreak?.scope === scope
      ? applyLegendBreak(blocks, legendBreak)
      : blocks;

  if (ctx.format === 'compact') {
    const side = buildCompactSideContent(well, ctx, extras);
    const split = extras.compactSideSplit;
    const keep =
      split == null ? side.length : Math.max(0, Math.min(split, side.length));

    let besideProfile = side.slice(0, keep);
    let fullWidth =
      keep < side.length
        ? buildCompactBlocks(well, ctx, extras).slice(keep)
        : [];
    if (legendBreak?.scope === 'side' && svgs.length === 1) {
      // The profile ends on the legend page: what the cut moves to the next
      // page continues there at full width, not beside an empty column.
      const { block, row } = legendBreak;
      const full = buildCompactBlocks(well, ctx, extras);
      const cutSide = startOnNextPage(side[block]!, row);
      const cutFull = startOnNextPage(full[block]!, row);
      besideProfile = [
        ...side.slice(0, block),
        ...(cutSide.length > 1 ? [cutSide[0]!] : []),
      ];
      fullWidth = [cutFull[cutFull.length - 1]!, ...full.slice(block + 1)];
    } else {
      besideProfile = withBreak(besideProfile, 'side');
      fullWidth = withBreak(fullWidth, 'after');
    }

    const panels: Content[] = svgs.map(svg => ({
      svg: svg.markup,
      width: svg.width,
      height: svg.height,
    }));
    if (footStrip) panels.splice(1, 0, footStrip);

    content.push({
      id: COMPACT_COLUMNS_ID,
      columns: [
        { width: computeCompactColumnWidth(ctx.page), stack: panels },
        {
          width: computeCompactSideWidth(ctx.page),
          stack: besideProfile,
        },
      ],
      columnGap: COMPACT_COLUMN_GAP,
    });
    if (strip && !breakPages) content.push(strip);
    // The blocks that start after the profile ends, at full width.
    content.push(...fullWidth);
  } else {
    svgs.forEach((svg, index) => {
      content.push({
        svg: svg.markup,
        width: svg.width,
        height: svg.height,
        ...((svg.breakBefore ?? (breakPages && index > 0))
          ? { pageBreak: 'before' }
          : {}),
      });
      if (index === 0 && footStrip) content.push(footStrip);
    });
    if (strip && !breakPages) content.push(strip);

    content.push(
      ...withBreak(
        [...buildTrailingInfo(well, ctx), ...buildSections(well, ctx, extras)],
        'after',
      ),
    );
  }

  const footerEnabled = ctx.footer.enabled;
  if (!breakPages && footerEnabled) {
    const custom = ctx.footer.content?.(1, 1);
    if (Array.isArray(custom)) content.push(...custom);
    else content.push(custom ?? buildFooterContent(ctx, false));
  }

  const doc: TDocumentDefinition = {
    ...buildDocShell(ctx),
    content,
    info: {
      title: ctx.metadata.title ?? ctx.title,
      author: ctx.metadata.author,
      subject: ctx.metadata.subject,
      keywords: ctx.metadata.keywords,
      creator: ctx.metadata.creator,
    },
  };

  if (ctx.header.enabled) {
    doc.header = (currentPage, pageCount) =>
      ctx.header.content?.(currentPage, pageCount) ??
      buildHeaderContent(ctx, currentPage, pageCount);
  }

  if (breakPages && footerEnabled) {
    doc.footer = (currentPage, pageCount) =>
      ctx.footer.content?.(currentPage, pageCount) ??
      buildFooterContent(ctx, true);
  }

  const watermark = buildTextWatermark(ctx);
  if (watermark) doc.watermark = watermark;
  const background = buildImageWatermark(ctx);
  if (background) doc.background = background;

  return doc;
}
