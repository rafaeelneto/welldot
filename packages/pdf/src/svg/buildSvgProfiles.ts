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
import { resolveBodyMargins, resolvePdfPage } from '../context';
import type {
  PdfContext,
  RenderedLegendItem,
  RenderedSvg,
  ResolvedPdfPage,
} from '../types/options.types';

/** Inner margins of the profile SVG panels. */
export const PDF_MARGINS = {
  top: 15,
  right: 30,
  bottom: 30,
  left: 20,
} as const;

/** Vertical inner margins of one panel: outer height minus drawing height. */
const PANEL_PADDING = PDF_MARGINS.top + PDF_MARGINS.bottom;

/**
 * Slack (pt) kept under every panel so float rounding never makes pdfmake
 * see a panel as taller than the space left and push it to the next page.
 */
export const FIT_EPSILON = 1;

/**
 * Smallest drawing height (pt) worth starting the profile with under the
 * content that precedes it. With less room left, the profile starts on the
 * next page instead.
 */
export const MIN_FIRST_PANEL_HEIGHT = 120;

const DEFAULT_PAGE = resolvePdfPage();

/**
 * Height of a profile panel that fills a whole page: the page body (page
 * height minus the margins and header/footer reserve of
 * `resolveBodyMargins`) minus {@link FIT_EPSILON}.
 */
export function computePageSvgHeight(
  page: ResolvedPdfPage = DEFAULT_PAGE,
): number {
  const [, top, , bottom] = resolveBodyMargins(page, true);
  return page.height - top - bottom - FIT_EPSILON;
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
// tables, used to estimate how much of the first page is left for the SVG.
const PT_TO_PX = 1.33;
const SINGLE_ROW_HEIGHT = 15 * PT_TO_PX;
const CELL_ROW_HEIGHT = 26 * PT_TO_PX;

/**
 * Rough estimate of the height left on the first page for the profile once
 * the spacer, heading-info table and "before" metadata table (when present)
 * are accounted for. Fallback for {@link buildSvgProfiles} when the real
 * position from `measureProfileStart` is not available.
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

export interface BuildSvgProfilesOptions {
  /**
   * Height (pt) left on the page where the profile starts, as measured by
   * `measureProfileStart`. Defaults to {@link computeFirstPageAvailableHeight}.
   */
  firstPageRemaining?: number;
}

export interface BuildSvgProfilesResult {
  svgs: RenderedSvg[];
  legendItems: RenderedLegendItem[];
}

/** meters → mm (×1000) → inches (÷25.4) → points (×72), scaled by the 1:N ratio. */
export function computeTotalSvgHeight(
  maxDepthMeters: number,
  scale: number,
): number {
  return ((1 / scale) * maxDepthMeters * 1000 * 72) / 25.4;
}

/** One profile panel: its outer height and whether it starts a new page. */
export interface ProfilePanel {
  height: number;
  breakBefore: boolean;
}

export interface PlanProfilePanelsOptions {
  /** Drawing height of the whole profile at 1:N ({@link computeTotalSvgHeight}). */
  totalHeight: number;
  /** Split the profile across pages. */
  breakPages: boolean;
  /** Outer height of a panel filling a whole page ({@link computePageSvgHeight}). */
  pageHeight: number;
  /**
   * Height left on the page where the profile starts. Omitted: the profile
   * starts at the top of a page.
   */
  firstPageRemaining?: number;
  /** Vertical inner margins of a panel. Defaults to `PDF_MARGINS.top + bottom`. */
  padding?: number;
  /** Defaults to {@link MIN_FIRST_PANEL_HEIGHT}. */
  minFirstPanel?: number;
}

/**
 * Splits the profile into page-sized panels. Drawing heights (outer height
 * minus `padding`) add up to `totalHeight`, so the drawn scale is exactly
 * 1:N. The first panel fills `firstPageRemaining` when at least
 * `minFirstPanel` of drawing fits there (or the whole profile does);
 * otherwise it starts on a new page. Every other panel fills a whole page,
 * and no panel is taller than `pageHeight`.
 */
export function planProfilePanels(
  options: PlanProfilePanelsOptions,
): ProfilePanel[] {
  const {
    totalHeight,
    breakPages,
    pageHeight,
    firstPageRemaining,
    padding = PANEL_PADDING,
    minFirstPanel = MIN_FIRST_PANEL_HEIGHT,
  } = options;
  const total = Math.max(0, totalHeight);

  if (!breakPages) return [{ height: total + padding, breakBefore: false }];

  const fullDrawing = Math.max(1, pageHeight - padding);
  const panels: ProfilePanel[] = [];
  let left = total;

  if (firstPageRemaining == null) {
    const drawing = Math.min(left, fullDrawing);
    panels.push({ height: drawing + padding, breakBefore: false });
    left -= drawing;
  } else {
    const room =
      Math.min(firstPageRemaining - FIT_EPSILON, pageHeight) - padding;
    if (room >= minFirstPanel || (room > 0 && room >= left)) {
      const drawing = Math.min(left, room);
      panels.push({ height: drawing + padding, breakBefore: false });
      left -= drawing;
    }
  }

  // Skip sub-point leftovers from float error rather than emit a sliver.
  while (left > 0.5 || panels.length === 0) {
    const drawing = Math.min(left, fullDrawing);
    panels.push({ height: drawing + padding, breakBefore: true });
    left -= drawing;
  }
  return panels;
}

/** Serializes the `<svg id="{id}">` in `container`, or `null` when it is empty. */
function readSvg(container: HTMLElement, id: string): RenderedSvg | null {
  const svg = container.querySelector<SVGSVGElement>(`#${id}`);
  const width = parseFloat(svg?.getAttribute('width') ?? '0');
  const height = parseFloat(svg?.getAttribute('height') ?? '0');
  if (!svg || width <= 0 || height <= 0) return null;
  return { markup: svg.outerHTML, width, height };
}

/**
 * Draws the profile (split across pages when `breakPages` is set) and its
 * legend symbols into hidden `<svg>` elements appended to `container`, and returns
 * their serialized markup. Browser-only: `container` must be attached to
 * the document, since `WellRenderer` selects by ID.
 *
 * Pass `firstPageRemaining` from `measureProfileStart` so the first panel
 * fills exactly the space left under the preceding content.
 */
export async function buildSvgProfiles(
  well: RenderableWell,
  container: HTMLElement,
  ctx: PdfContext,
  options: BuildSvgProfilesOptions = {},
): Promise<BuildSvgProfilesResult> {
  const { breakPages, scale, locale, page, theme, profile } = ctx;
  const renderLocale: 'en' | 'pt' = locale.toLowerCase().startsWith('en')
    ? 'en'
    : 'pt';
  const profileWidth = computeProfileWidth(page);

  const maxYValues = Math.max(0, ...getProfileLastItemsDepths(well));
  const totalHeight = computeTotalSvgHeight(maxYValues, scale);
  const panels = planProfilePanels({
    totalHeight,
    breakPages,
    pageHeight: computePageSvgHeight(page),
    firstPageRemaining:
      options.firstPageRemaining ??
      computeFirstPageAvailableHeight({
        headingInfoCount: ctx.headingInfo.length,
        metadataPosition: ctx.metadataPosition,
        page,
      }),
  });

  container.replaceChildren();

  // Unique per call so concurrent exports on one page never collide.
  const prefix = `welldot-pdf-${Math.random().toString(36).slice(2, 10)}`;
  const panelIds = panels.map((_, index) => `${prefix}-panel-${index}`);

  const svgNS = 'http://www.w3.org/2000/svg';
  const appendSvg = (id: string) => {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = id;
    container.appendChild(svg);
  };
  panelIds.forEach(appendSvg);

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
    legend: { ...localizedStaticConfig.legend, ...custom.legend },
  };

  const renderer = new WellRenderer(
    panelIds.map((id, index) => ({
      selector: `#${id}`,
      height: panels[index]!.height - PANEL_PADDING,
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

  const legendEntries = renderer.getLegendItems(well).map((item, index) => {
    const id = `${prefix}-legend-${index}`;
    appendSvg(id);
    renderer.renderLegendSymbol(`#${id}`, item);
    return { id, label: item.label };
  });

  await new Promise(resolve => requestAnimationFrame(resolve));

  const svgs: RenderedSvg[] = [];
  panelIds.forEach((id, index) => {
    const svg = readSvg(container, id);
    if (svg) svgs.push({ ...svg, breakBefore: panels[index]!.breakBefore });
  });

  const legendItems: RenderedLegendItem[] = [];
  for (const { id, label } of legendEntries) {
    const symbol = readSvg(container, id);
    if (symbol) legendItems.push({ label, symbol });
  }

  return { svgs, legendItems };
}
