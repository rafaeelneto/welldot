// @vitest-environment jsdom

import type { RenderableWell } from '@welldot/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveBodyMargins, resolvePdfPage } from '../context';
import { computeLegendStripHeight } from '../layout/legend';
import { makeTestContext } from '../test-utils';
import {
  buildSvgProfiles,
  computePageSvgHeight,
  computeProfileWidth,
  computeTotalSvgHeight,
  FIT_EPSILON,
  LEGEND_GAP,
  PDF_CONTENT_WIDTH,
  PDF_MARGINS,
  planProfilePanels,
} from './buildSvgProfiles';

// `WellRenderer` relies on SVG geometry APIs (`createSVGPoint`, etc.) jsdom
// doesn't implement. Mock it so this test exercises buildSvgProfiles' own
// wiring (panel count, selectors, attribute readback) instead of the real
// D3 draw pipeline, which @welldot/render already owns test coverage for.
const drawnSelectors: string[] = [];
const rendererOptions: unknown[] = [];
const panelWidths: number[] = [];
const panelHeights: number[] = [];
const panelInstances: {
  depthRange?: [number, number];
  repeatedTo?: number;
}[] = [];
const wellLegendLabels: string[] = [];
vi.mock('@welldot/render', () => ({
  STATIC_RENDER_CONFIG: { legend: { height: 44, labels: {} } },
  getWellLegendItems: () => wellLegendLabels.map(label => ({ label })),
  applyRenderLocale: (config: unknown) => config,
  getProfileTopDepth: () => 0,
  WellRenderer: class {
    private svgs: { selector: string }[];
    constructor(
      svgs: {
        selector: string;
        width: number;
        height: number;
        depthRange?: [number, number];
        repeatedTo?: number;
      }[],
      options: unknown,
    ) {
      this.svgs = svgs;
      panelInstances.push(...svgs);
      drawnSelectors.push(...svgs.map(s => s.selector));
      panelWidths.push(...svgs.map(s => s.width));
      panelHeights.push(...svgs.map(s => s.height));
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
    getLegendItems() {
      return [{ label: 'Perfuração' }, { label: 'Bomba e edutor' }];
    }
    renderLegendSymbol(selector: string) {
      const el = document.querySelector(selector);
      el?.setAttribute('width', '28');
      el?.setAttribute('height', '16');
    }
    renderLithologySwatch(selector: string, _layer: unknown, size: number) {
      const el = document.querySelector(selector);
      el?.setAttribute('width', String(size));
      el?.setAttribute('height', String(size));
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

describe('planProfilePanels', () => {
  const padding = PDF_MARGINS.top + PDF_MARGINS.bottom;
  const pageHeight = 700;
  const fullDrawing = pageHeight - padding;
  const drawingSum = (panels: { height: number }[]) =>
    panels.reduce((sum, panel) => sum + panel.height - padding, 0);

  it('yields one panel holding the whole profile when breakPages is off', () => {
    expect(
      planProfilePanels({ totalHeight: 2000, breakPages: false, pageHeight }),
    ).toEqual([{ height: 2000 + padding, breakBefore: false }]);
  });

  it('fills whole pages when the profile starts at the top of a page', () => {
    const panels = planProfilePanels({
      totalHeight: fullDrawing * 2.5,
      breakPages: true,
      pageHeight,
    });
    expect(panels.map(p => p.breakBefore)).toEqual([false, true, true]);
    expect(panels[0]!.height).toBeCloseTo(pageHeight);
    expect(panels[1]!.height).toBeCloseTo(pageHeight);
    expect(panels[2]!.height).toBeCloseTo(fullDrawing * 0.5 + padding);
  });

  it('fills the space left on the first page, then whole pages', () => {
    const panels = planProfilePanels({
      totalHeight: fullDrawing * 2,
      breakPages: true,
      pageHeight,
      firstPageRemaining: 400,
    });
    expect(panels[0]).toEqual({
      height: 400 - FIT_EPSILON,
      breakBefore: false,
    });
    expect(panels.slice(1).every(p => p.breakBefore)).toBe(true);
    expect(panels[1]!.height).toBeCloseTo(pageHeight);
  });

  it('starts on a new page when too little room is left', () => {
    const panels = planProfilePanels({
      totalHeight: fullDrawing * 2,
      breakPages: true,
      pageHeight,
      firstPageRemaining: padding + 50,
    });
    expect(panels[0]).toEqual({ height: pageHeight, breakBefore: true });
  });

  it('keeps a short profile under the preceding content when it fits', () => {
    const panels = planProfilePanels({
      totalHeight: 40,
      breakPages: true,
      pageHeight,
      firstPageRemaining: padding + 60,
    });
    expect(panels).toEqual([{ height: 40 + padding, breakBefore: false }]);
  });

  it('keeps the exact 1:N scale and never exceeds the page', () => {
    for (const remaining of [undefined, 90, 300, 699, 5000]) {
      const panels = planProfilePanels({
        totalHeight: 3487,
        breakPages: true,
        pageHeight,
        firstPageRemaining: remaining,
      });
      expect(drawingSum(panels)).toBeCloseTo(3487);
      expect(panels.every(p => p.height <= pageHeight)).toBe(true);
    }
  });

  it('keeps the first-panel reserve free and only on the first panel', () => {
    const panels = planProfilePanels({
      totalHeight: fullDrawing * 2,
      breakPages: true,
      pageHeight,
      firstPageRemaining: 400,
      firstPanelReserve: 30,
    });
    expect(panels[0]!.height).toBeCloseTo(400 - FIT_EPSILON - 30);
    expect(panels[1]!.height).toBeCloseTo(pageHeight);
    expect(drawingSum(panels)).toBeCloseTo(fullDrawing * 2);

    const pushed = planProfilePanels({
      totalHeight: fullDrawing * 2,
      breakPages: true,
      pageHeight,
      firstPageRemaining: padding + 50,
      firstPanelReserve: 30,
    });
    expect(pushed[0]).toEqual({ height: pageHeight - 30, breakBefore: true });
  });

  it('emits one panel for an empty profile', () => {
    expect(
      planProfilePanels({ totalHeight: 0, breakPages: true, pageHeight }),
    ).toEqual([{ height: padding, breakBefore: false }]);
  });
});

describe('buildSvgProfiles', () => {
  beforeEach(() => {
    drawnSelectors.length = 0;
    rendererOptions.length = 0;
    panelWidths.length = 0;
    panelHeights.length = 0;
    panelInstances.length = 0;
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
    expect(result.legendItems).toEqual([
      {
        label: 'Perfuração',
        symbol: expect.objectContaining({ width: 28, height: 16 }),
      },
      {
        label: 'Bomba e edutor',
        symbol: expect.objectContaining({ width: 28, height: 16 }),
      },
    ]);
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

    // One panel + one symbol per legend entry, from the second call only.
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  it('sizes the first panel to firstPageRemaining and flags page breaks', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const well = {
      ...makeWell(),
      bore_hole: [{ from: 0, to: 300, diameter: 200 }],
    } as unknown as RenderableWell;
    const ctx = makeTestContext({ locale: 'pt', breakPages: true, scale: 500 });

    const result = await buildSvgProfiles(well, container, ctx, {
      firstPageRemaining: 300,
    });

    const padding = PDF_MARGINS.top + PDF_MARGINS.bottom;
    const fullDrawing = computePageSvgHeight(ctx.page) - padding;
    expect(panelHeights[0]).toBeCloseTo(300 - FIT_EPSILON - padding);
    expect(panelHeights[1]).toBeCloseTo(fullDrawing);
    expect(result.svgs.map(svg => svg.breakBefore)).toEqual(
      panelHeights.map((_, index) => index > 0),
    );
  });
});

describe('page-aware geometry', () => {
  it('fills the whole page body of the default A4 page', () => {
    // 841.89 − (30 + 10) − (30 + 30) − FIT_EPSILON
    expect(computePageSvgHeight()).toBeCloseTo(841.89 - 100 - FIT_EPSILON);
    expect(PDF_CONTENT_WIDTH).toBeCloseTo(
      595.28 - 60 - PDF_MARGINS.left - PDF_MARGINS.right,
    );
  });

  it('matches the document body margins for any page', () => {
    for (const page of [
      resolvePdfPage({ size: 'A3' }),
      resolvePdfPage({ size: 'LETTER', orientation: 'landscape' }),
      resolvePdfPage({ margins: [20, 40, 20, 60] }),
    ]) {
      const [, top, , bottom] = resolveBodyMargins(page, true);
      expect(computePageSvgHeight(page)).toBeCloseTo(
        page.height - top - bottom - FIT_EPSILON,
      );
    }
    const a3 = resolvePdfPage({ size: 'A3' });
    expect(computeProfileWidth(a3)).toBeCloseTo(
      841.89 - 60 - PDF_MARGINS.left - PDF_MARGINS.right,
    );
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

    expect(panelWidths[0]).toBeCloseTo(
      841.89 - 60 - PDF_MARGINS.left - PDF_MARGINS.right,
    );
    expect(rendererOptions[0]).toMatchObject({
      locale: 'en',
      renderConfig: {
        zoom: false,
        pan: false,
        legend: { height: 60 },
      },
      theme: {
        labels: { bodyFont: 'Roboto', headerFont: 'Roboto' },
        constructionLabels: { fontFamily: 'Inter' },
      },
    });
  });
});

describe('buildSvgProfiles formats', () => {
  const lithology = [
    { from: 0, to: 12, color: '#7a3b2e', texture: { code: 607 } },
    { from: 12, to: 455, color: '#3d3d3d', texture: { code: 701 } },
    { from: 455, to: 615, color: '#e5a98c', texture: { code: 607 } },
  ];
  const well = {
    ...makeWell(),
    lithology,
    bore_hole: [{ from: 0, to: 615, diameter: 300 }],
  } as unknown as RenderableWell;

  beforeEach(() => {
    panelInstances.length = 0;
    panelWidths.length = 0;
  });

  const mount = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return container;
  };

  it('pages the detailed profile with overlaps and a caption per break', async () => {
    const container = mount();
    const ctx = makeTestContext({ locale: 'pt', breakPages: true, scale: 700 });
    const result = await buildSvgProfiles(well, container, ctx, {
      firstPageRemaining: 500,
    });

    expect(panelInstances.length).toBeGreaterThan(1);
    expect(panelInstances[0]!.depthRange![0]).toBe(0);
    expect(panelInstances[0]!.repeatedTo).toBeUndefined();
    expect(panelInstances[1]!.repeatedTo).toBe(
      panelInstances[0]!.depthRange![1],
    );
    expect(panelInstances[panelInstances.length - 1]!.depthRange![1]).toBe(615);
    expect(result.lithologySwatches).toEqual([]);
    expect(result.svgs[0]!.markup).toMatch(/continua ↓ até|quebra ajustada/);
  });

  it('draws the compact column, its captions and one swatch per layer', async () => {
    const container = mount();
    const ctx = makeTestContext({
      locale: 'pt',
      format: 'compact',
      breakPages: true,
      scale: 2000,
    });
    const result = await buildSvgProfiles(well, container, ctx, {
      firstPageRemaining: 300,
      startPage: 1,
    });

    expect(panelWidths[0]).toBeLessThan(ctx.page.contentWidth / 2);
    expect(result.scale).toBe(2000);
    expect(result.lithologySwatches).toHaveLength(3);
    expect(result.lithologySwatches[0]).toMatchObject({ width: 9, height: 9 });
    const last = result.svgs[result.svgs.length - 1]!;
    expect(last.markup).toContain('>1:2.000</text>');
    if (result.svgs.length > 1) {
      expect(result.svgs[0]!.markup).toContain('continua na pág. 2');
    }
  });

  it('fits the compact profile to the given drawing height', async () => {
    const container = mount();
    const ctx = makeTestContext({
      format: 'compact',
      breakPages: false,
      profileFit: 'content',
    });
    const result = await buildSvgProfiles(well, container, ctx, {
      drawingHeight: 400,
    });

    expect(panelInstances).toHaveLength(1);
    expect(panelHeights[panelHeights.length - 1]).toBeCloseTo(400);
    expect(result.scale).toBeCloseTo(computeTotalSvgHeight(615, 1) / 400);
  });

  it('fits the detailed profile to one page without page breaks', async () => {
    const container = mount();
    const ctx = makeTestContext({ breakPages: false, profileFit: 'page' });
    const result = await buildSvgProfiles(well, container, ctx, {
      drawingHeight: 500,
    });

    expect(panelInstances).toHaveLength(1);
    expect(panelInstances[0]!.depthRange).toEqual([0, 615]);
    expect(panelHeights[panelHeights.length - 1]).toBeCloseTo(500);
    expect(result.scale).toBeCloseTo(computeTotalSvgHeight(615, 1) / 500);
  });

  it('ignores drawingHeight at a fixed scale', async () => {
    const container = mount();
    const ctx = makeTestContext({ breakPages: true, scale: 700 });
    const result = await buildSvgProfiles(well, container, ctx, {
      drawingHeight: 500,
    });
    expect(result.scale).toBe(700);
  });

  it('keeps a page-fitted profile on one page when pages break', async () => {
    const container = mount();
    const ctx = makeTestContext({ breakPages: true, profileFit: 'page' });
    const result = await buildSvgProfiles(well, container, ctx, {
      firstPageRemaining: 400,
      drawingHeight: 400 - FIT_EPSILON - PDF_MARGINS.top - PDF_MARGINS.bottom,
    });

    expect(panelInstances).toHaveLength(1);
    expect(panelInstances[0]!.depthRange).toEqual([0, 615]);
    expect(result.svgs[0]!.breakBefore).toBe(false);
  });

  it('keeps the legend strip height free under the first panel', async () => {
    const container = mount();
    const ctx = makeTestContext({ breakPages: true, scale: 700 });
    const labels = ['Perfuração', 'Revestimento'];
    wellLegendLabels.push(...labels);
    try {
      await buildSvgProfiles(well, container, ctx, { firstPageRemaining: 500 });
    } finally {
      wellLegendLabels.length = 0;
    }
    const reserve = computeLegendStripHeight(labels, ctx) + LEGEND_GAP;
    expect(
      panelHeights[panelHeights.length - panelInstances.length],
    ).toBeCloseTo(
      500 - FIT_EPSILON - PDF_MARGINS.top - PDF_MARGINS.bottom - reserve,
    );
  });
});
