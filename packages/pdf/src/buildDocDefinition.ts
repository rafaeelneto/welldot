import type { Well } from '@welldot/core';
import { resolveBodyMargins, resolvePdfContext } from './context';
import { buildFooterContent } from './layout/footer';
import { buildHeaderContent } from './layout/header';
import { buildLegendTable } from './layout/legend';
import { withTableTitle } from './layout/tables';
import { buildImageWatermark, buildTextWatermark } from './layout/watermark';
import { buildHistoryLogSection } from './sections/historyLogTable';
import { buildHydrodynamicEventsSection } from './sections/hydrodynamicEventsTable';
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
import type {
  PdfContext,
  PdfExportOptions,
  PdfSectionKey,
  RenderedLegendItem,
  RenderedSvg,
} from './types/options.types';
import type {
  Content,
  ContentTable,
  TDocumentDefinition,
} from './types/pdfmake.types';

type SectionBuilder = (well: Well, ctx: PdfContext) => Content[];

const single =
  (fn: (well: Well, ctx: PdfContext) => Content | null): SectionBuilder =>
  (well, ctx) => {
    const content = fn(well, ctx);
    return content ? [content] : [];
  };

/** Builder of each content section, keyed by {@link PdfSectionKey}. */
export const PDF_SECTION_BUILDERS: Record<PdfSectionKey, SectionBuilder> = {
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

/**
 * Content that precedes the profile: a spacer line, the heading-info grid
 * and the general-info table when `metadataPosition` is `'before'`.
 * `measureProfileStart` lays out exactly these nodes to find where the
 * profile begins.
 */
export function buildLeadContent(
  well: Well,
  options: PdfExportOptions | PdfContext = {},
): Content[] {
  const ctx = toPdfContext(options);
  const content: Content[] = [{ text: ' ' }];

  if (ctx.headingInfo.length > 0) {
    content.push(infoTable(ctx.headingInfo));
  }

  const beforeMetadataTable =
    ctx.metadataPosition === 'before' ? buildMetadataTable(well, ctx) : null;
  if (beforeMetadataTable) {
    content.push(
      withTableTitle(ctx.labels.general.generalInfo, beforeMetadataTable),
    );
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

/**
 * Pure assembly of the full `pdfmake` document definition from
 * already-rendered profile SVGs and legend symbols, the well's metadata/sections and
 * the export options. No DOM access.
 */
export function buildDocDefinition(
  well: Well,
  svgs: RenderedSvg[],
  legend: RenderedLegendItem[],
  options: PdfExportOptions | PdfContext = {},
): TDocumentDefinition {
  const ctx = toPdfContext(options);
  const { breakPages, endInfo, metadataPosition, labels } = ctx;

  const content: Content[] = buildLeadContent(well, ctx);

  svgs.forEach((svg, index) => {
    content.push({
      svg: svg.markup,
      width: svg.width,
      height: svg.height,
      ...((svg.breakBefore ?? (breakPages && index > 0))
        ? { pageBreak: 'before' }
        : {}),
    });
  });

  const legendTable = buildLegendTable(legend, ctx);
  if (legendTable) content.push(legendTable);

  if (endInfo.length > 0) {
    content.push(
      withTableTitle(labels.document.finalInfoTitle, infoTable(endInfo)),
    );
  }

  const afterMetadataTable =
    metadataPosition === 'after' ? buildMetadataTable(well, ctx) : null;
  if (afterMetadataTable) {
    content.push(
      withTableTitle(labels.general.generalInfo, afterMetadataTable),
    );
  }

  for (const key of ctx.sections.order) {
    if (!ctx.sections.include[key]) continue;
    content.push(...PDF_SECTION_BUILDERS[key](well, ctx));
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
