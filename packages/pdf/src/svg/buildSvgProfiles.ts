import type {
  DeepPartial,
  RenderableWell,
  RenderConfig,
} from '@welldot/render';
import {
  applyRenderLocale,
  STATIC_RENDER_CONFIG,
  WellRenderer,
} from '@welldot/render';
import { getProfileLastItemsDepths } from '@welldot/utils';
import { resolvePdfPage } from '../context';
import type {
  PdfContext,
  RenderedSvg,
  ResolvedPdfPage,
} from '../types/options.types';

/** Profile SVG height per page on A4 with the default margins (legacy value, points→px `× 1.33`). */
export const A4_SVG_HEIGHT = 480 * 1.33;

/** Inner margins of the profile SVG panels. */
export const PDF_MARGINS = {
  top: 15,
  right: 30,
  bottom: 30,
  left: 20,
} as const;

// Header (10pt) + footer (30pt) reserve added to the page margins when
// `breakPages` is on — see `buildDocDefinition`'s `pageMargins`.
const PAGE_CHROME = 40;
const DEFAULT_PAGE = resolvePdfPage();
const A4_BODY_HEIGHT =
  DEFAULT_PAGE.height -
  DEFAULT_PAGE.margins[1] -
  DEFAULT_PAGE.margins[3] -
  PAGE_CHROME;

/** Profile SVG height available on one page, scaled from the A4 budget. */
export function computePageSvgHeight(
  page: ResolvedPdfPage = DEFAULT_PAGE,
): number {
  const body = page.height - page.margins[1] - page.margins[3] - PAGE_CHROME;
  return (A4_SVG_HEIGHT * body) / A4_BODY_HEIGHT;
}

/** Width of the profile SVG panels for a page. */
export function computeProfileWidth(
  page: ResolvedPdfPage = DEFAULT_PAGE,
): number {
  return page.contentWidth - PDF_MARGINS.left - PDF_MARGINS.right;
}

/** Default A4 profile panel width. */
export const PDF_CONTENT_WIDTH = computeProfileWidth();

// pt → px, and per-row heights for the heading-info / "before" metadata
// tables, used to budget how much of the first page is left for the SVG.
const PT_TO_PX = 1.33;
const SINGLE_ROW_HEIGHT = 15 * PT_TO_PX;
const CELL_ROW_HEIGHT = 26 * PT_TO_PX;

/**
 * Height left on the first page for the profile SVG once the spacer,
 * heading-info table and "before" metadata table (when present) are
 * accounted for.
 */
export function computeFirstPageAvailableHeight(options: {
  headingInfoCount: number;
  metadataPosition: 'before' | 'after' | null;
  page?: ResolvedPdfPage;
}): number {
  let used = SINGLE_ROW_HEIGHT;
  if (options.headingInfoCount > 0) {
    used += Math.ceil(options.headingInfoCount / 4) * CELL_ROW_HEIGHT;
  }
  if (options.metadataPosition === 'before') {
    used += SINGLE_ROW_HEIGHT;
    used += 3 * CELL_ROW_HEIGHT;
  }
  return computePageSvgHeight(options.page) - used;
}

export interface BuildSvgProfilesResult {
  svgs: RenderedSvg[];
  legendSvg: RenderedSvg | null;
}

/** meters → mm (×1000) → inches (÷25.4) → points (×72), scaled by the 1:N ratio. */
export function computeTotalSvgHeight(
  maxDepthMeters: number,
  scale: number,
): number {
  return ((1 / scale) * maxDepthMeters * 1000 * 72) / 25.4;
}

/** Splits a total SVG height into per-page heights. */
export function computePageHeights(
  totalHeight: number,
  breakPages: boolean,
  firstPageAvailableHeight?: number,
  pageSvgHeight: number = A4_SVG_HEIGHT,
): number[] {
  if (!breakPages) return [totalHeight];

  const heights: number[] = [];
  let heightLeft = totalHeight;
  let index = 0;
  while (heightLeft > 0) {
    const pageHeight =
      index === 0 && firstPageAvailableHeight != null
        ? Math.max(firstPageAvailableHeight, 50)
        : pageSvgHeight;
    heights.push(Math.min(heightLeft, pageHeight));
    heightLeft -= pageHeight;
    index += 1;
  }
  return heights;
}

/**
 * Draws the profile (split across pages when `breakPages` is set) and its
 * legend into hidden `<svg>` elements appended to `container`, and returns
 * their serialized markup. Browser-only: `container` must be attached to
 * the document, since `WellRenderer` selects by ID.
 */
export async function buildSvgProfiles(
  well: RenderableWell,
  container: HTMLElement,
  ctx: PdfContext,
): Promise<BuildSvgProfilesResult> {
  const { breakPages, scale, locale, page, theme, profile } = ctx;
  const renderLocale: 'en' | 'pt' = locale.toLowerCase().startsWith('en')
    ? 'en'
    : 'pt';
  const profileWidth = computeProfileWidth(page);
  const legendMaxWidth = page.contentWidth;

  const maxYValues = Math.max(0, ...getProfileLastItemsDepths(well));
  const totalHeight = computeTotalSvgHeight(maxYValues, scale);
  const pageHeights = computePageHeights(
    totalHeight,
    breakPages,
    computeFirstPageAvailableHeight({
      headingInfoCount: ctx.headingInfo.length,
      metadataPosition: ctx.metadataPosition,
      page,
    }),
    computePageSvgHeight(page),
  );

  container.replaceChildren();

  // Unique per call so concurrent exports on one page never collide.
  const prefix = `welldot-pdf-${Math.random().toString(36).slice(2, 10)}`;
  const panelIds = pageHeights.map((_, index) => `${prefix}-panel-${index}`);
  const legendId = `${prefix}-legend`;

  const svgNS = 'http://www.w3.org/2000/svg';
  for (const id of [...panelIds, legendId]) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = id;
    container.appendChild(svg);
  }

  const localizedStaticConfig = applyRenderLocale(
    STATIC_RENDER_CONFIG,
    renderLocale,
  );
  const custom = profile.renderConfig ?? {};
  const renderConfig: DeepPartial<RenderConfig> = {
    ...localizedStaticConfig,
    ...custom,
    zoom: false,
    pan: false,
    animation: { duration: 0 },
    legend: {
      ...localizedStaticConfig.legend,
      ...custom.legend,
      maxWidth: legendMaxWidth,
    },
  };

  const renderer = new WellRenderer(
    panelIds.map((id, index) => ({
      selector: `#${id}`,
      height: pageHeights[index]! - PDF_MARGINS.top - PDF_MARGINS.bottom,
      width: profileWidth,
      margins: { ...PDF_MARGINS, left: PDF_MARGINS.left + 10 },
    })),
    {
      renderConfig,
      units: {
        length: ctx.units.length,
        diameter: ctx.units.diameter,
        power: ctx.units.power,
      },
      locale: renderLocale,
      theme: {
        ...profile.theme,
        labels: {
          headerFont: theme.fonts.body,
          bodyFont: theme.fonts.body,
          scaleFont: theme.fonts.body,
          ...profile.theme?.labels,
        },
        constructionLabels: {
          fontFamily: theme.fonts.label,
          ...profile.theme?.constructionLabels,
        },
      },
    },
  );

  await renderer.prepareSvg();
  renderer.draw(well);
  renderer.renderLegend(`#${legendId}`, well);

  await new Promise(resolve => requestAnimationFrame(resolve));

  const svgs: RenderedSvg[] = [];
  for (const id of panelIds) {
    const svg = container.querySelector<SVGSVGElement>(`#${id}`);
    const width = parseFloat(svg?.getAttribute('width') ?? '0');
    const height = parseFloat(svg?.getAttribute('height') ?? '0');
    if (!svg || width <= 0 || height <= 0) continue;
    svgs.push({ markup: svg.outerHTML, width, height });
  }

  const legendEl = container.querySelector<SVGSVGElement>(`#${legendId}`);
  const legendWidth = parseFloat(legendEl?.getAttribute('width') ?? '0');
  const legendHeight = parseFloat(legendEl?.getAttribute('height') ?? '0');
  const legendSvg: RenderedSvg | null =
    legendEl && legendWidth > 0 && legendHeight > 0
      ? {
          markup: legendEl.outerHTML,
          width: legendMaxWidth,
          height: legendHeight * (legendMaxWidth / legendWidth),
        }
      : null;

  return { svgs, legendSvg };
}
