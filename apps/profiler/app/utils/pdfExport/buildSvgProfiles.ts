import type { Units } from '@welldot/core';
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
import type { RenderedSvg } from './types';

/** A4 page height available for the profile SVG, in points→px (`× 1.33`). */
export const A4_SVG_HEIGHT = 480 * 1.33;

export const PDF_MARGINS = {
  top: 15,
  right: 30,
  bottom: 30,
  left: 20,
} as const;

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_MARGIN = 30;

export const PDF_CONTENT_WIDTH =
  PDF_PAGE_WIDTH - PDF_PAGE_MARGIN * 2 - PDF_MARGINS.left - PDF_MARGINS.right;

const LEGEND_MAX_WIDTH = PDF_PAGE_WIDTH - PDF_PAGE_MARGIN * 2;

// pt → px, and per-row heights for the heading-info / "before" metadata
// tables, used to budget how much of the first page is left for the SVG.
const PT_TO_PX = 1.33;
const SINGLE_ROW_HEIGHT = 15 * PT_TO_PX;
const CELL_ROW_HEIGHT = 26 * PT_TO_PX;

/**
 * Height left on the first page for the profile SVG once the spacer,
 * heading-info table, and "before" metadata table (when present) are
 * accounted for. Mirrors legacy `pdfGenerate.tsx`'s `firstPageAvailableHeight`.
 */
export function computeFirstPageAvailableHeight(options: {
  headingInfoCount: number;
  metadataPosition: 'before' | 'after' | null;
}): number {
  let used = SINGLE_ROW_HEIGHT;
  if (options.headingInfoCount > 0) {
    used += Math.ceil(options.headingInfoCount / 4) * CELL_ROW_HEIGHT;
  }
  if (options.metadataPosition === 'before') {
    used += SINGLE_ROW_HEIGHT;
    used += 3 * CELL_ROW_HEIGHT;
  }
  return A4_SVG_HEIGHT - used;
}

export interface BuildSvgProfilesOptions {
  breakPages: boolean;
  /** 1:N scale ratio. */
  scale: number;
  /** Height budget already used by heading info / "before" metadata on the first page. */
  firstPageAvailableHeight?: number;
  units: Units;
  /** Active app locale — resolves renderer-drawn text and the diameter unit symbol. Anything other than `'en'` is treated as `'pt'`. */
  locale: string;
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

/** Splits a total SVG height into per-page heights, mirroring legacy's `firstPageAvailableHeight` budget. */
export function computePageHeights(
  totalHeight: number,
  breakPages: boolean,
  firstPageAvailableHeight?: number,
): number[] {
  if (!breakPages) return [totalHeight];

  const heights: number[] = [];
  let heightLeft = totalHeight;
  let index = 0;
  while (heightLeft > 0) {
    const pageHeight =
      index === 0 && firstPageAvailableHeight != null
        ? Math.max(firstPageAvailableHeight, 50)
        : A4_SVG_HEIGHT;
    heights.push(Math.min(heightLeft, pageHeight));
    heightLeft -= pageHeight;
    index += 1;
  }
  return heights;
}

/**
 * Draws the profile (split across N pages when `breakPages` is set) and its legend into
 * hidden `<svg>` elements appended to `container`, and returns their serialized markup.
 * `container` must be attached to the document — `WellRenderer` selects by ID.
 */
export async function buildSvgProfiles(
  well: RenderableWell,
  container: HTMLElement,
  options: BuildSvgProfilesOptions,
): Promise<BuildSvgProfilesResult> {
  const { breakPages, scale, firstPageAvailableHeight, units, locale } =
    options;
  const renderLocale: 'en' | 'pt' = locale === 'en' ? 'en' : 'pt';

  const maxYValues = Math.max(0, ...getProfileLastItemsDepths(well));
  const totalHeight = computeTotalSvgHeight(maxYValues, scale);
  const pageHeights = computePageHeights(
    totalHeight,
    breakPages,
    firstPageAvailableHeight,
  );

  container.replaceChildren();

  const panelIds = pageHeights.map(
    (_, index) => `pdf-export-svg-panel-${index}`,
  );
  const legendId = 'pdf-export-svg-legend';

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
  const renderConfig: DeepPartial<RenderConfig> = {
    ...localizedStaticConfig,
    zoom: false,
    pan: false,
    animation: { duration: 0 },
    legend: {
      ...localizedStaticConfig.legend,
      maxWidth: LEGEND_MAX_WIDTH,
    },
  };

  const renderer = new WellRenderer(
    panelIds.map((id, index) => ({
      selector: `#${id}`,
      height: pageHeights[index]! - PDF_MARGINS.top - PDF_MARGINS.bottom,
      width: PDF_CONTENT_WIDTH,
      margins: { ...PDF_MARGINS, left: PDF_MARGINS.left + 10 },
    })),
    {
      renderConfig,
      units,
      locale: renderLocale,
      theme: {
        labels: {
          headerFont: 'jetBrainsMono',
          bodyFont: 'jetBrainsMono',
          scaleFont: 'jetBrainsMono',
        },
        constructionLabels: { fontFamily: 'spaceGrotesk' },
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
          width: LEGEND_MAX_WIDTH,
          height: legendHeight * (LEGEND_MAX_WIDTH / legendWidth),
        }
      : null;

  return { svgs, legendSvg };
}
