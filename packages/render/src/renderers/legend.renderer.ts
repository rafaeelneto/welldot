import * as d3module from 'd3';
import { defu } from 'defu';

import { Well } from '@welldot/core';
import {
  ComponentsClassNames,
  CssVarsConfig,
  LegendRenderConfig,
} from '~/types/render.types';
import {
  CSS_VAR_MAP,
  DEFAULT_COMPONENTS_CLASS_NAMES,
  INTERACTIVE_RENDER_CONFIG,
} from '../configs/render.configs';
import { createWellTextures } from '../configs/render.textures';

const d3 = { ...d3module };

const DEFAULTS_TEXTURES = createWellTextures();

const CSS_VAR_FALLBACKS = {
  fractureDryStroke: '#000000',
  fractureWetStroke: '#1a6fa8',
  caveDryStroke: '#333333',
  caveWetStroke: '#1a6fa8',
};

function resolveCssVar(
  node: Element | null,
  varName: string,
  fallback: string,
): string {
  if (!node) return fallback;
  const val = getComputedStyle(node).getPropertyValue(varName).trim();
  return val || fallback;
}

type LegendItem =
  | { kind: 'fracture'; label: string; swarm: boolean; water_intake: boolean }
  | { kind: 'cave'; label: string; water_intake: boolean };

/**
 * Draws a horizontal legend SVG for the fracture and cave elements present in a well profile.
 * Only legend entries that have matching data in the profile are rendered.
 * The target element (selector) should be an existing <svg> element.
 *
 * @param selector   - CSS selector for the target <svg> element
 * @param profile    - Well profile data (only .fractures and .caves are read)
 * @param options    - Optional render config, CSS variable overrides, and class name overrides
 */
export function drawWellLegend(
  selector: string,
  profile: Well,
  options: {
    config?: Partial<LegendRenderConfig>;
    cssVars?: Partial<CssVarsConfig>;
    classNames?: ComponentsClassNames['legend'];
  } = {},
): void {
  const fractures = profile.fractures ?? [];
  const caves = profile.caves ?? [];

  const hasSimple = fractures.some(f => !f.swarm && !f.water_intake);
  const hasSwarm = fractures.some(f => f.swarm);
  const hasWaterFx = fractures.some(f => f.water_intake);
  const hasCaveDry = caves.some(c => !c.water_intake);
  const hasCaveWet = caves.some(c => c.water_intake);

  const cfg = defu(
    options.config ?? {},
    INTERACTIVE_RENDER_CONFIG.legend,
  ) as LegendRenderConfig;

  const cls: ComponentsClassNames['legend'] = options.classNames
    ? { ...DEFAULT_COMPONENTS_CLASS_NAMES.legend, ...options.classNames }
    : DEFAULT_COMPONENTS_CLASS_NAMES.legend;

  const items: LegendItem[] = [];
  if (hasSimple)
    items.push({
      kind: 'fracture',
      label: cfg.labels.fractureSingle,
      swarm: false,
      water_intake: false,
    });
  if (hasSwarm)
    items.push({
      kind: 'fracture',
      label: cfg.labels.fractureSwarm,
      swarm: true,
      water_intake: false,
    });
  if (hasWaterFx)
    items.push({
      kind: 'fracture',
      label: cfg.labels.fractureWater,
      swarm: false,
      water_intake: true,
    });
  if (hasCaveDry)
    items.push({
      kind: 'cave',
      label: cfg.labels.caveDry,
      water_intake: false,
    });
  if (hasCaveWet)
    items.push({ kind: 'cave', label: cfg.labels.caveWet, water_intake: true });

  const svgEl = d3.select(selector);
  svgEl.selectAll('*').remove();

  if (items.length === 0) {
    svgEl.attr('width', 0).attr('height', 0);
    return;
  }

  // Forward CSS variable overrides onto the SVG element so that
  // resolveCssVar picks them up via getComputedStyle (same pattern as WellDrawer).
  if (options.cssVars) {
    for (const key of Object.keys(options.cssVars) as (keyof CssVarsConfig)[]) {
      const cssVar = CSS_VAR_MAP[key];
      if (cssVar && options.cssVars[key] != null)
        svgEl.style(cssVar, options.cssVars[key] as string);
    }
  }

  // Register textures before any path that uses them
  svgEl.call(DEFAULTS_TEXTURES.cave_dry);
  svgEl.call(DEFAULTS_TEXTURES.cave_wet);

  const totalWidth = cfg.padding * 2 + items.length * cfg.itemWidth;

  svgEl.attr('width', totalWidth).attr('height', cfg.height);

  const node = svgEl.node() as Element | null;

  const fractureDryColor = resolveCssVar(
    node,
    CSS_VAR_MAP.fractureDryStroke,
    CSS_VAR_FALLBACKS.fractureDryStroke,
  );
  const fractureWetColor = resolveCssVar(
    node,
    CSS_VAR_MAP.fractureWetStroke,
    CSS_VAR_FALLBACKS.fractureWetStroke,
  );
  const caveDryColor = resolveCssVar(
    node,
    CSS_VAR_MAP.caveDryStroke,
    CSS_VAR_FALLBACKS.caveDryStroke,
  );
  const caveWetColor = resolveCssVar(
    node,
    CSS_VAR_MAP.caveWetStroke,
    CSS_VAR_FALLBACKS.caveWetStroke,
  );

  const innerH = cfg.height - 4;
  const symY = innerH / 2;
  const RC = 'round' as const;

  const g = svgEl.append('g').attr('transform', `translate(${cfg.padding}, 2)`);

  g.append('rect')
    .attr('class', cls.border)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', totalWidth - cfg.padding)
    .attr('height', innerH)
    .attr('fill', 'white')
    .attr('rx', 3);

  g.append('text')
    .attr('class', cls.title)
    .attr('x', 4)
    .attr('y', 11)
    .attr('font-size', cfg.fontSize)
    .attr('font-weight', 'bold')
    .text(`${cfg.title}:`);

  items.forEach((item, i) => {
    const cx = 10 + i * cfg.itemWidth;
    const symG = g.append('g').attr('class', cls.item);

    if (item.kind === 'fracture') {
      const color = item.water_intake ? fractureWetColor : fractureDryColor;

      if (item.swarm) {
        ([-4, 0, 4] as number[]).forEach(offset => {
          symG
            .append('polyline')
            .attr('class', cls.fracturePoly)
            .attr('data-wet', String(item.water_intake))
            .attr(
              'points',
              `${cx},${symY + offset} ${cx + 6},${symY + offset - 1} ${cx + 12},${symY + offset + 1} ${cx + 18},${symY + offset - 0.5} ${cx + 24},${symY + offset}`,
            )
            .attr('stroke', color)
            .attr('stroke-width', offset === 0 ? 1.5 : 0.8)
            .attr('fill', 'none')
            .attr('stroke-linecap', RC)
            .attr('stroke-linejoin', RC);
        });
      } else {
        symG
          .append('polyline')
          .attr('class', cls.fracturePoly)
          .attr('data-wet', String(item.water_intake))
          .attr(
            'points',
            `${cx},${symY} ${cx + 5},${symY - 1.5} ${cx + 11},${symY + 1} ${cx + 17},${symY - 0.5} ${cx + 24},${symY}`,
          )
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('stroke-linecap', RC)
          .attr('stroke-linejoin', RC);
      }
    } else {
      const color = item.water_intake ? caveWetColor : caveDryColor;
      const texture = item.water_intake
        ? DEFAULTS_TEXTURES.cave_wet
        : DEFAULTS_TEXTURES.cave_dry;
      const rw = 24;
      const rh = 12;

      symG
        .append('rect')
        .attr('class', cls.caveFill)
        .attr('data-wet', String(item.water_intake))
        .attr('x', cx)
        .attr('y', symY - rh / 2)
        .attr('width', rw)
        .attr('height', rh)
        .attr('fill', texture.url())
        .attr('stroke', color)
        .attr('stroke-width', 0.8);
    }

    g.append('text')
      .attr('class', cls.label)
      .attr('x', cx + 28)
      .attr('y', symY + 3)
      .attr('font-size', cfg.fontSize)
      .text(item.label);
  });
}
