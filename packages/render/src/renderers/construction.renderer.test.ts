// @vitest-environment jsdom
import type { Well } from '@welldot/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_COMPONENTS_CLASS_NAMES as classes } from '~/configs/render.classnames';
import { WellRenderer } from '~/Renderer';

const well = {
  version: 2,
  lithology: [],
  fractures: [],
  caves: [],
  bore_hole: [{ from: 0, to: 120, diameter: 311 }],
  hole_fill: [{ from: 0, to: 18, diameter: 311, type: 'seal' }],
  surface_case: [],
  well_case: [
    { from: 0, to: 80, diameter: 219 },
    { from: 100, to: 110, diameter: 219 },
  ],
  well_screen: [{ from: 80, to: 100, diameter: 219 }],
  reduction: [],
  cement_pad: { type: 'concrete', width: 1.5, thickness: 0.2, length: 1.5 },
} as unknown as Well;

beforeAll(() => {
  // jsdom has no SVG geometry; d3-tip asks for it when tooltips are set up.
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  proto.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({}) });
  proto.getScreenCTM = () => ({});
  // d3-zoom reads the zoom extent from the SVG's animated width/height.
  for (const key of ['width', 'height'])
    Object.defineProperty(SVGSVGElement.prototype, key, {
      configurable: true,
      get: () => ({ baseVal: { value: 200 } }),
    });
});

/** Lets the zero-duration transitions run. */
const flush = () => new Promise(r => setTimeout(r, 50));

async function drawPanels(zoom = false) {
  document.body.innerHTML = '<svg id="p0"></svg><svg id="p1"></svg>';
  const panel = (selector: string, depthRange: [number, number]) => ({
    selector,
    width: 200,
    height: 600,
    margins: { top: 20, right: 10, bottom: 10, left: 40 },
    depthRange,
  });
  const renderer = new WellRenderer(
    [panel('#p0', [0, 60]), panel('#p1', [60, 120])],
    {
      renderConfig: {
        zoom,
        pan: false,
        animation: { duration: 0 },
      },
    },
  );
  await renderer.prepareSvg();
  renderer.draw(well);
  await flush();
  return renderer;
}

const attr = (panel: string, selector: string, name = 'd') =>
  document.querySelector(`#${panel} .${selector}`)?.getAttribute(name) ?? null;

/** y of every horizontal segment (`H`) in a path. */
const horizontalYs = (d: string | null) =>
  [...(d ?? '').matchAll(/M[-\d.]+,([-\d.]+)H/g)].map(m => Number(m[1]));

/** Vertical extent of a path's absolute points. */
function yExtent(d: string) {
  const ys = [...d.matchAll(/[ML][-\d.]+,([-\d.]+)/g)].map(m => Number(m[1]));
  return Math.max(...ys) - Math.min(...ys);
}

describe('drawConstructive across panels', () => {
  it('leaves the casing open at cuts and joints and puts the shoe at the string end', async () => {
    await drawPanels();
    const caseCls = classes.wellCase.rect;

    expect(attr('p0', `${caseCls}-outline`)).not.toContain('H');
    expect(attr('p0', `${caseCls}-shoe`)).toBe('');

    expect(attr('p1', `${caseCls}-outline`)).not.toContain('H');
    // 0–80 m joins the screen; the string ends at 110 m.
    const shoes = Array.from(
      document.querySelectorAll(`#p1 .${caseCls}-shoe`),
      e => e.getAttribute('d'),
    );
    expect(shoes).toEqual(['', expect.stringMatching(/Z$/)]);
  });

  it('marks the screen top and base with dashed lines, the outline staying open', async () => {
    await drawPanels();
    const screenCls = classes.wellScreen.rect;
    expect(attr('p1', `${screenCls}-outline`)).not.toContain('H');
    // A dashed line at the top and at the base.
    expect(horizontalYs(attr('p1', `${screenCls}-ends`))).toHaveLength(2);
  });

  it('closes the borehole only at total depth', async () => {
    await drawPanels();
    const holeCls = classes.boreHole.rect;
    expect(horizontalYs(attr('p0', `${holeCls}-outline`))).toEqual([]);
    expect(horizontalYs(attr('p1', `${holeCls}-outline`))).toHaveLength(1);
  });

  it('draws the cement pad as two slabs on the first panel only', async () => {
    await drawPanels();
    const slab = `${classes.cementPad.item}-slab`;
    expect(document.querySelectorAll(`#p0 .${slab}`)).toHaveLength(2);
    expect(document.querySelectorAll(`#p1 .${slab}`)).toHaveLength(0);
  });

  it('keeps the pad height when zooming', async () => {
    const renderer = await drawPanels(true);
    const slab = () =>
      document.querySelector(`#p0 .${classes.cementPad.item}-slab`)!;
    const before = yExtent(slab().getAttribute('d')!);

    renderer.zoomBy(3);
    await flush();

    // The zoom moved the drawing (the casing grew) but not the pad's height.
    const casing = document.querySelector(
      `#p0 .${classes.wellCase.rect}-fill`,
    )!;
    expect(Number(casing.getAttribute('height'))).toBeGreaterThan(600);
    expect(yExtent(slab().getAttribute('d')!)).toBeCloseTo(before);
    expect(before).toBe(6);
  });
});
