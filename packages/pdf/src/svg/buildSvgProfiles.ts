import type { Lithology } from '@welldot/core';
import type {
  DeepPartial,
  RenderableWell,
  RenderConfig,
  WellTheme,
} from '@welldot/render';
import {
  applyRenderLocale,
  getProfileTopDepth,
  getWellLegendItems,
  STATIC_RENDER_CONFIG,
  WellRenderer,
} from '@welldot/render';
import { getProfileLastItemsDepths } from '@welldot/utils';
import { resolveBodyMargins, resolvePdfPage } from '../context';
import { computeLegendStripHeight } from '../layout/legend';
import type {
  PdfContext,
  RenderedLegendItem,
  RenderedProfilePanel,
  RenderedSvg,
  ResolvedPdfPage,
} from '../types/options.types';
import {
  FIT_EPSILON,
  MIN_FIRST_PANEL_HEIGHT,
  planDetailedPanels,
  type DetailedPanel,
} from './planDetailedPanels';
import {
  buildCompactLayout,
  buildDetailedLayout,
  buildPanelCaptions,
  computeCompactColumnWidth,
  getLithologyContacts,
  LITHOLOGY_SWATCH_SIZE,
  mergeDeep,
  PANEL_MARGIN_BOTTOM,
  PANEL_MARGIN_TOP,
  type PanelCaption,
  type ProfileLayout,
} from './profileLayouts';

export { FIT_EPSILON, MIN_FIRST_PANEL_HEIGHT };

/**
 * Inner margins of a full-width profile panel without the mini-map. The
 * top margin holds the column titles, the bottom one the caption.
 */
export const PDF_MARGINS = {
  top: PANEL_MARGIN_TOP,
  right: 6,
  bottom: PANEL_MARGIN_BOTTOM,
  left: 32,
} as const;

/** Vertical inner margins of one panel: outer height minus drawing height. */
const PANEL_PADDING = PDF_MARGINS.top + PDF_MARGINS.bottom;

/** Space (pt) between the first profile panel and the legend strip. */
export const LEGEND_GAP = 4;

/** Share of a full page's drawing height the mini-map takes. */
const OVERVIEW_HEIGHT_RATIO = 0.45;

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

/** Drawing width of a full-width profile panel (without the mini-map) for a page. */
export function computeProfileWidth(
  page: ResolvedPdfPage = DEFAULT_PAGE,
): number {
  return page.contentWidth - PDF_MARGINS.left - PDF_MARGINS.right;
}

/** Default A4 profile panel drawing width. */
export const PDF_CONTENT_WIDTH = computeProfileWidth();

// pt → px, and per-row heights for the heading-info / "before" metadata
// tables, used to estimate how much of the first page is left for the SVG.
const PT_TO_PX = 1.33;
const SINGLE_ROW_HEIGHT = 15 * PT_TO_PX;
const CELL_ROW_HEIGHT = 26 * PT_TO_PX;

/**
 * Rough estimate of the height left on the first page for the profile once
 * the heading-info table and "before" metadata table (when present)
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
  /** Page the profile starts on (`measureProfileStart`), for the compact captions. Defaults to `1`. */
  startPage?: number;
  /**
   * Drawing height (pt) the whole profile must take, which replaces `scale`
   * when `profileFit` is not `scale`. Ignored when not positive.
   */
  drawingHeight?: number;
}

export interface BuildSvgProfilesResult {
  svgs: RenderedProfilePanel[];
  legendItems: RenderedLegendItem[];
  /**
   * Compact format only: fill swatch of each lithology layer, by index in
   * `well.lithology` (`null` when it could not be drawn). Empty otherwise.
   */
  lithologySwatches: (RenderedSvg | null)[];
  /** 1:N scale the profile was drawn at (differs from `scale` under `profileFit`). */
  scale: number;
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
  /**
   * Height (pt) kept free under the first panel, on whichever page it
   * lands (the legend strip). Defaults to `0`.
   */
  firstPanelReserve?: number;
}

/**
 * Splits the profile into page-sized panels. Drawing heights (outer height
 * minus `padding`) add up to `totalHeight`, so the drawn scale is exactly
 * 1:N. The first panel fills `firstPageRemaining` (less
 * `firstPanelReserve`) when at least `minFirstPanel` of drawing fits there
 * (or the whole profile does); otherwise it starts on a new page, still
 * leaving the reserve free. Every other panel fills a whole page, and no
 * panel is taller than `pageHeight`.
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
    firstPanelReserve = 0,
  } = options;
  const total = Math.max(0, totalHeight);

  if (!breakPages) return [{ height: total + padding, breakBefore: false }];

  const fullDrawing = Math.max(1, pageHeight - padding);
  const reserve = Math.max(0, firstPanelReserve);
  const panels: ProfilePanel[] = [];
  let left = total;

  let firstRoom = fullDrawing - reserve;
  let firstBreak = false;
  if (firstPageRemaining != null) {
    const room =
      Math.min(firstPageRemaining - FIT_EPSILON, pageHeight) -
      padding -
      reserve;
    if (room >= minFirstPanel || (room > 0 && room >= left)) {
      firstRoom = room;
    } else {
      firstBreak = true;
    }
  }
  const firstDrawing = Math.min(left, Math.max(1, firstRoom));
  panels.push({ height: firstDrawing + padding, breakBefore: firstBreak });
  left -= firstDrawing;

  // Skip sub-point leftovers from float error rather than emit a sliver.
  while (left > 0.5) {
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

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Draws a caption line (and, for a snap note, a rule) in the panel's bottom margin. */
function appendCaption(
  svg: SVGSVGElement,
  caption: PanelCaption,
  layout: ProfileLayout,
  ctx: PdfContext,
): void {
  const height = parseFloat(svg.getAttribute('height') ?? '0');
  const top = height - layout.margins.bottom;
  const color =
    caption.kind === 'snap'
      ? ctx.theme.colors.snapNote
      : ctx.theme.colors.profileCaption;

  if (caption.kind === 'snap') {
    const rule = document.createElementNS(SVG_NS, 'line');
    rule.setAttribute('x1', '0');
    rule.setAttribute('x2', String(layout.width));
    rule.setAttribute('y1', String(top + 5));
    rule.setAttribute('y2', String(top + 5));
    rule.setAttribute('stroke', color);
    rule.setAttribute('stroke-width', '0.8');
    svg.appendChild(rule);
  }

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute(
    'x',
    String(caption.align === 'end' ? layout.width - layout.margins.right : 2),
  );
  text.setAttribute('y', String(top + 15));
  text.setAttribute('text-anchor', caption.align);
  text.setAttribute('font-size', '6.5');
  text.setAttribute('font-family', ctx.theme.fonts.body);
  text.setAttribute('fill', color);
  text.textContent = caption.text;
  svg.appendChild(text);
}

/** Planned panel of either format, with the depths it draws. */
type PlannedPanel = Pick<
  DetailedPanel,
  'height' | 'breakBefore' | 'depthFrom' | 'depthTo' | 'repeatedTo' | 'snap'
>;

/**
 * Draws the profile panels of `ctx.format` and the legend symbols (plus, in
 * the compact format, one swatch per lithology layer) into hidden `<svg>`
 * elements appended to `container`, and returns their serialized markup.
 * Browser-only: `container` must be attached to the document, since
 * `WellRenderer` selects by ID.
 *
 * - `detailed`: full-width panels planned by `planDetailedPanels` (contact
 *   snap, overlap, mini-map).
 * - `compact`: panels of the profile column planned by
 *   {@link planProfilePanels}.
 *
 * Both draw at `scale` or, with `drawingHeight` and a `profileFit` other than
 * `scale`, at the scale that fits that height.
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
  const { breakPages, locale, page, theme, profile } = ctx;
  const compact = ctx.format === 'compact';
  const renderLocale: 'en' | 'pt' = locale.toLowerCase().startsWith('en')
    ? 'en'
    : 'pt';

  const totalDepth = Math.max(0, ...getProfileLastItemsDepths(well));
  // Negative when pipes stick up above the ground: the first panel starts there.
  const topDepth = getProfileTopDepth(well);
  const drawnDepth = totalDepth - topDepth;
  const pageHeight = computePageSvgHeight(page);

  const localizedStaticConfig = applyRenderLocale(
    STATIC_RENDER_CONFIG,
    renderLocale,
  );
  // The legend strip sits under the first panel: keep its height free there
  // (and out of a page-fitted profile). Same labels as `getLegendItems`.
  const legendLabels = getWellLegendItems(
    well,
    mergeDeep<RenderConfig['legend']['labels']>(
      localizedStaticConfig.legend.labels,
      profile.renderConfig?.legend?.labels,
    ),
  ).map(item => item.label);
  const stripHeight = computeLegendStripHeight(legendLabels, ctx);
  const legendReserve = stripHeight > 0 ? stripHeight + LEGEND_GAP : 0;
  const firstPageRemaining =
    options.firstPageRemaining ??
    computeFirstPageAvailableHeight({
      headingInfoCount: ctx.headingInfo.length,
      metadataPosition: ctx.metadataPosition,
      page,
    });

  // At 1:1, one metre is computeTotalSvgHeight(1, 1) pt of drawing.
  const fitHeight =
    ctx.profileFit === 'page'
      ? (options.drawingHeight ?? 0) - legendReserve
      : (options.drawingHeight ?? 0);
  const scale =
    ctx.profileFit !== 'scale' && fitHeight > 0 && drawnDepth
      ? computeTotalSvgHeight(drawnDepth, 1) / fitHeight
      : ctx.scale;
  const firstPanelReserve = breakPages ? legendReserve : 0;
  const ptPerMeter = computeTotalSvgHeight(1, scale);

  let panels: PlannedPanel[];
  let layout: ProfileLayout;
  if (compact) {
    layout = buildCompactLayout(ctx, computeCompactColumnWidth(page));
    let depth = topDepth;
    panels = planProfilePanels({
      totalHeight: drawnDepth * ptPerMeter,
      breakPages,
      pageHeight,
      firstPageRemaining,
      firstPanelReserve,
    }).map(panel => {
      const depthFrom = depth;
      depth = Math.min(
        totalDepth,
        depthFrom + (panel.height - PANEL_PADDING) / ptPerMeter,
      );
      return { ...panel, depthFrom, depthTo: depth };
    });
  } else {
    layout = buildDetailedLayout(ctx, page.contentWidth, {
      // A profile fitted to one page needs no map of where the page sits.
      overview: breakPages && ctx.profileFit !== 'page',
      overviewHeight: Math.round(
        OVERVIEW_HEIGHT_RATIO * (pageHeight - PANEL_PADDING),
      ),
    });
    panels = planDetailedPanels({
      totalDepth,
      topDepth,
      ptPerMeter,
      contacts: getLithologyContacts(well.lithology as Lithology[]),
      breakPages,
      pageHeight,
      firstPageRemaining,
      padding: PANEL_PADDING,
      firstPanelReserve,
    });
  }

  container.replaceChildren();

  // Unique per call so concurrent exports on one page never collide.
  const prefix = `welldot-pdf-${Math.random().toString(36).slice(2, 10)}`;
  const panelIds = panels.map((_, index) => `${prefix}-panel-${index}`);

  const appendSvg = (id: string) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = id;
    container.appendChild(svg);
  };
  panelIds.forEach(appendSvg);

  const renderConfig = mergeDeep<RenderConfig>(
    localizedStaticConfig,
    layout.renderConfig,
    profile.renderConfig,
    { zoom: false, pan: false, animation: { duration: 0 } },
  );

  const { margins } = layout;
  const renderer = new WellRenderer(
    panelIds.map((id, index) => {
      const panel = panels[index]!;
      return {
        selector: `#${id}`,
        height: panel.height - PANEL_PADDING,
        width: layout.width - margins.left - margins.right,
        margins,
        depthRange: [panel.depthFrom, panel.depthTo] as [number, number],
        ...(panel.repeatedTo != null ? { repeatedTo: panel.repeatedTo } : {}),
      };
    }),
    {
      renderConfig: renderConfig as DeepPartial<RenderConfig>,
      units: {
        length: ctx.units.length,
        diameter: ctx.units.diameter,
        power: ctx.units.power,
      },
      locale: renderLocale,
      theme: mergeDeep<WellTheme>(layout.theme, profile.theme, {
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
      }),
    },
  );

  await renderer.prepareSvg();
  renderer.draw(well);

  const captions = buildPanelCaptions(panels, ctx, {
    lithology: well.lithology as Lithology[],
    scale,
    startPage: options.startPage,
  });
  panelIds.forEach((id, index) => {
    const caption = captions[index];
    const svg = container.querySelector<SVGSVGElement>(`#${id}`);
    if (caption && svg) appendCaption(svg, caption, layout, ctx);
  });

  const legendEntries = renderer.getLegendItems(well).map((item, index) => {
    const id = `${prefix}-legend-${index}`;
    appendSvg(id);
    renderer.renderLegendSymbol(`#${id}`, item);
    return { id, label: item.label };
  });

  const swatchIds = compact
    ? well.lithology.map((layer, index) => {
        const id = `${prefix}-swatch-${index}`;
        appendSvg(id);
        renderer.renderLithologySwatch(
          `#${id}`,
          layer as Lithology,
          LITHOLOGY_SWATCH_SIZE,
        );
        return id;
      })
    : [];

  await new Promise(resolve => requestAnimationFrame(resolve));

  const svgs: RenderedProfilePanel[] = [];
  panelIds.forEach((id, index) => {
    const svg = readSvg(container, id);
    const panel = panels[index]!;
    if (svg) {
      svgs.push({
        ...svg,
        breakBefore: panel.breakBefore,
        depthFrom: panel.depthFrom,
        depthTo: panel.depthTo,
      });
    }
  });

  const legendItems: RenderedLegendItem[] = [];
  for (const { id, label } of legendEntries) {
    const symbol = readSvg(container, id);
    if (symbol) legendItems.push({ label, symbol });
  }

  const lithologySwatches = swatchIds.map(id => readSvg(container, id));

  return { svgs, legendItems, lithologySwatches, scale };
}
