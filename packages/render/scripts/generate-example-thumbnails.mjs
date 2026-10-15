/**
 * Draws a thumbnail SVG of every example well in `packages/core/examples`
 * with the real renderer: lithology and construction only (no labels,
 * legend or axis), so it reads at ~50 px wide.
 *
 *   pnpm --filter @welldot/core build && pnpm --filter @welldot/render build
 *   pnpm --filter @welldot/render thumbnails:examples
 *
 * Each entry of `examples/index.json` names its output in `thumbnail`
 * (`thumbs/<slug>.svg`). Run again whenever an example is added or changed,
 * or the renderer's drawing changes.
 */
import { JSDOM } from 'jsdom';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 120;
const HEIGHT = 248;
const SVG_NS = 'http://www.w3.org/2000/svg';
const EXAMPLES = new URL('../../core/examples/', import.meta.url);

// ─── Headless DOM ────────────────────────────────────────────────────────────
// jsdom has no SVG geometry. The stubs only feed tooltips and text
// measurement, and a thumbnail draws neither.
const dom = new JSDOM('<!doctype html><body></body>', {
  pretendToBeVisual: true,
});
const { window } = dom;
Object.assign(globalThis, {
  window,
  document: window.document,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  getComputedStyle: window.getComputedStyle.bind(window),
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Node: window.Node,
});
const svgProto = window.SVGElement.prototype;
svgProto.createSVGPoint ??= () => ({
  x: 0,
  y: 0,
  matrixTransform() {
    return this;
  },
});
svgProto.getBBox ??= () => ({ x: 0, y: 0, width: 0, height: 0 });
svgProto.getScreenCTM ??= () => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
});
svgProto.getComputedTextLength ??= () => 0;

// Imported after the DOM globals exist: d3 and textures.js read them on load.
const { WellRenderer } = await import('../dist/index.js');
const { deserializeWell } = await import('@welldot/core');

// ─── Markup cleanup ──────────────────────────────────────────────────────────

/**
 * Makes the drawn SVG a small standalone file: drops what a thumbnail never
 * shows (styles, text, classes, data attributes), merges patterns that only
 * differ by id, renames ids so reruns are stable, and rounds coordinates.
 */
function toStandaloneSvg(markup) {
  let svg = markup;

  const firstIdOfBody = new Map();
  const alias = new Map();
  svg = svg.replace(
    /<pattern\b([^>]*?)\bid="([^"]+)"([^>]*)>([\s\S]*?)<\/pattern>/g,
    (match, before, id, after, body) => {
      const key = before + after + body;
      const first = firstIdOfBody.get(key);
      if (first) {
        alias.set(id, first);
        return '';
      }
      firstIdOfBody.set(key, id);
      return match;
    },
  );

  const renamed = new Map();
  svg = svg.replace(/ id="([^"]+)"/g, (_, id) => {
    const next = `t${renamed.size}`;
    renamed.set(id, next);
    return ` id="${next}"`;
  });
  const ref = id => renamed.get(alias.get(id) ?? id) ?? id;
  svg = svg
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${ref(id)})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${ref(id)}"`);

  svg = svg
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<text\b[\s\S]*?<\/text>/g, '')
    .replace(/ (?:class|data-[\w-]+)="[^"]*"/g, '')
    .replace(/\d+\.\d{2,}/g, n => String(Math.round(Number(n) * 10) / 10))
    .replace(/<defs><\/defs>|<g><\/g>/g, '');

  return svg.replace(
    /^<svg\b[^>]*>/,
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`,
  );
}

// ─── Draw ────────────────────────────────────────────────────────────────────

async function drawThumbnail(well) {
  document.body.replaceChildren();
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'thumbnail';
  document.body.appendChild(svg);

  const renderer = new WellRenderer(
    [
      {
        selector: '#thumbnail',
        width: WIDTH,
        height: HEIGHT,
        margins: { top: 4, right: 0, bottom: 4, left: 0 },
      },
    ],
    {
      renderConfig: {
        zoom: false,
        pan: false,
        animation: { duration: 0 },
        labels: { active: false },
        unitLabels: { active: false },
        constructionLabels: { active: false },
        overview: { active: false },
        columnHeaders: { active: false },
        geologic: { xLeft: 0, xRightInset: 0 },
        layout: { pocoWidthRatio: 0.5, pocoCenterRatio: 0 },
      },
      onError: err => {
        throw err;
      },
    },
  );
  await renderer.prepareSvg();
  renderer.draw(well);
  // d3 transitions run on animation frames even at duration 0: wait until
  // the markup stops changing before reading it.
  let markup = '';
  for (let tick = 0; tick < 100; tick++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const next = svg.outerHTML;
    if (next === markup) break;
    markup = next;
  }
  return toStandaloneSvg(markup);
}

const index = JSON.parse(readFileSync(new URL('index.json', EXAMPLES), 'utf8'));
for (const example of index.examples) {
  if (!example.thumbnail) {
    throw new Error(`${example.slug}: no "thumbnail" in index.json`);
  }
  const well = deserializeWell(
    readFileSync(new URL(example.file, EXAMPLES), 'utf8'),
  );
  const out = fileURLToPath(new URL(example.thumbnail, EXAMPLES));
  mkdirSync(dirname(out), { recursive: true });
  const markup = await drawThumbnail(well);
  writeFileSync(out, `${markup}\n`);
  console.log(`${example.thumbnail}  ${(markup.length / 1024).toFixed(1)} KB`);
}
