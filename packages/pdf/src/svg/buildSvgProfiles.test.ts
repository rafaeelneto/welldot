// @vitest-environment jsdom

import type { RenderableWell } from '@welldot/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePdfPage } from '../context';
import { makeTestContext } from '../test-utils';
import {
  A4_SVG_HEIGHT,
  buildSvgProfiles,
  computePageHeights,
  computePageSvgHeight,
  computeProfileWidth,
  computeTotalSvgHeight,
  PDF_CONTENT_WIDTH,
} from './buildSvgProfiles';

// `WellRenderer` relies on SVG geometry APIs (`createSVGPoint`, etc.) jsdom
// doesn't implement. Mock it so this test exercises buildSvgProfiles' own
// wiring (panel count, selectors, attribute readback) instead of the real
// D3 draw pipeline, which @welldot/render already owns test coverage for.
const drawnSelectors: string[] = [];
const rendererOptions: unknown[] = [];
const panelWidths: number[] = [];
vi.mock('@welldot/render', () => ({
  STATIC_RENDER_CONFIG: { legend: { height: 44, maxWidth: 700 } },
  applyRenderLocale: (config: unknown) => config,
  WellRenderer: class {
    private svgs: { selector: string }[];
    constructor(svgs: { selector: string; width: number }[], options: unknown) {
      this.svgs = svgs;
      drawnSelectors.push(...svgs.map(s => s.selector));
      panelWidths.push(...svgs.map(s => s.width));
      rendererOptions.push(options);
    }
    async prepareSvg() {
      for (const { selector } of this.svgs) {
        const el = document.querySelector(selector);
        el?.setAttribute('width', '485.28');
        el?.setAttribute('height', '200');
      }
    }
    draw() {}
    renderLegend(selector: string) {
      const el = document.querySelector(selector);
      el?.setAttribute('width', '535.28');
      el?.setAttribute('height', '40');
    }
  },
}));

function makeWell(): RenderableWell {
  return {
    version: 2,
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
  } as unknown as RenderableWell;
}

describe('computeTotalSvgHeight', () => {
  it('scales linearly with depth', () => {
    expect(computeTotalSvgHeight(20, 500)).toBeCloseTo(
      computeTotalSvgHeight(10, 500) * 2,
    );
  });

  it('scales inversely with the 1:N ratio', () => {
    expect(computeTotalSvgHeight(10, 1000)).toBeCloseTo(
      computeTotalSvgHeight(10, 500) / 2,
    );
  });
});

describe('computePageHeights', () => {
  it('breakPages=false always yields exactly one page', () => {
    expect(computePageHeights(2000, false)).toEqual([2000]);
    expect(computePageHeights(0, false)).toEqual([0]);
  });

  it('breakPages=true splits into A4-height pages', () => {
    const heights = computePageHeights(A4_SVG_HEIGHT * 2.5, true);
    expect(heights).toHaveLength(3);
    expect(heights[0]).toBeCloseTo(A4_SVG_HEIGHT);
    expect(heights[1]).toBeCloseTo(A4_SVG_HEIGHT);
    expect(heights[2]).toBeCloseTo(A4_SVG_HEIGHT * 0.5);
  });

  it('reduces the first page by firstPageAvailableHeight', () => {
    const reducedFirst = A4_SVG_HEIGHT / 2;
    const heights = computePageHeights(A4_SVG_HEIGHT * 1.5, true, reducedFirst);
    expect(heights[0]).toBeCloseTo(reducedFirst);
    expect(heights.reduce((a, b) => a + b, 0)).toBeCloseTo(A4_SVG_HEIGHT * 1.5);
  });
});

describe('buildSvgProfiles', () => {
  beforeEach(() => {
    drawnSelectors.length = 0;
    rendererOptions.length = 0;
    panelWidths.length = 0;
  });

  it('creates one panel per computed page height and reads back their markup', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const result = await buildSvgProfiles(
      makeWell(),
      container,
      makeTestContext({ locale: 'pt' }),
    );

    expect(result.svgs).toHaveLength(1);
    expect(result.svgs[0]?.width).toBe(485.28);
    expect(result.svgs[0]?.markup).toContain('<svg');
    expect(result.legendSvg).not.toBeNull();
    expect(drawnSelectors).toHaveLength(1);
    expect(drawnSelectors[0]).toMatch(/^#welldot-pdf-[a-z0-9]+-panel-0$/);
  });

  it('clears previously drawn panels between calls', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await buildSvgProfiles(
      makeWell(),
      container,
      makeTestContext({ locale: 'pt' }),
    );
    await buildSvgProfiles(
      makeWell(),
      container,
      makeTestContext({ locale: 'pt' }),
    );

    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });
});

describe('page-aware geometry', () => {
  it('keeps the legacy A4 budget for the default page', () => {
    expect(computePageSvgHeight()).toBeCloseTo(A4_SVG_HEIGHT);
    expect(PDF_CONTENT_WIDTH).toBeCloseTo(595.28 - 60 - 50);
  });

  it('scales the per-page SVG height and width with the page', () => {
    const a3 = resolvePdfPage({ size: 'A3' });
    expect(computePageSvgHeight(a3)).toBeGreaterThan(A4_SVG_HEIGHT);
    expect(computeProfileWidth(a3)).toBeCloseTo(841.89 - 60 - 50);
  });

  it('passes theme fonts, page width and profile overrides to the renderer', async () => {
    rendererOptions.length = 0;
    panelWidths.length = 0;
    const container = document.createElement('div');
    document.body.appendChild(container);

    await buildSvgProfiles(
      makeWell(),
      container,
      makeTestContext({
        locale: 'en',
        page: { size: 'A4', orientation: 'landscape' },
        theme: { fonts: { body: 'Roboto', label: 'Inter' } },
        profile: { renderConfig: { legend: { height: 60 } } },
      }),
    );

    expect(panelWidths[0]).toBeCloseTo(841.89 - 60 - 50);
    expect(rendererOptions[0]).toMatchObject({
      locale: 'en',
      renderConfig: {
        zoom: false,
        pan: false,
        legend: { height: 60, maxWidth: 841.89 - 60 },
      },
      theme: {
        labels: { bodyFont: 'Roboto', headerFont: 'Roboto' },
        constructionLabels: { fontFamily: 'Inter' },
      },
    });
  });
});
