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
import { getConflictAreas, mergeConflicts } from '../utils/render.utils';

const d3 = { ...d3module };

const DEFAULTS_TEXTURES = createWellTextures();

function resolveCssVar(node: Element | null, varName: string): string {
  if (!node) return '';
  return getComputedStyle(node).getPropertyValue(varName).trim();
}

type LegendItem =
  | { kind: 'fracture'; label: string; swarm: boolean; water_intake: boolean }
  | { kind: 'cave'; label: string; water_intake: boolean }
  | {
      kind: 'construction';
      label: string;
      subKind:
        | 'boreHole'
        | 'surfaceCase'
        | 'holeFillGravel'
        | 'holeFillSeal'
        | 'wellCase'
        | 'wellScreen'
        | 'cementPad'
        | 'conflict';
    };

/**
 * Draws a legend SVG for the fracture, cave, and constructive elements present
 * in a well profile. Items wrap to new rows when `cfg.maxWidth` is set and
 * exceeded. The target element (selector) should be an existing <svg> element.
 *
 * @param selector   - CSS selector for the target <svg> element
 * @param profile    - Well profile data
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
  const boreHoles = profile.bore_hole ?? [];
  const wellCases = profile.well_case ?? [];
  const wellScreens = profile.well_screen ?? [];
  const holeFills = profile.hole_fill ?? [];

  const hasSimple = fractures.some(f => !f.swarm && !f.water_intake);
  const hasSwarm = fractures.some(f => f.swarm);
  const hasWaterFx = fractures.some(f => f.water_intake);
  const hasCaveDry = caves.some(c => !c.water_intake);
  const hasCaveWet = caves.some(c => c.water_intake);

  const hasBoreHole = boreHoles.length > 0;
  const hasSurfaceCase = (profile.surface_case ?? []).length > 0;
  const hasHoleFillGravel = holeFills.some(h => h.type === 'gravel_pack');
  const hasHoleFillSeal = holeFills.some(h => h.type === 'seal');
  const hasWellCase = wellCases.length > 0;
  const hasWellScreen = wellScreens.length > 0;
  const hasCementPad = !!profile.cement_pad?.thickness;
  const hasConflict =
    mergeConflicts(
      [
        ...getConflictAreas(wellCases, wellScreens),
        ...getConflictAreas(wellScreens, wellCases),
      ],
      1,
    ).length > 0;

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

  if (hasCementPad)
    items.push({
      kind: 'construction',
      label: cfg.labels.cementPad,
      subKind: 'cementPad',
    });
  if (hasBoreHole)
    items.push({
      kind: 'construction',
      label: cfg.labels.boreHole,
      subKind: 'boreHole',
    });
  if (hasSurfaceCase)
    items.push({
      kind: 'construction',
      label: cfg.labels.surfaceCase,
      subKind: 'surfaceCase',
    });
  if (hasHoleFillGravel)
    items.push({
      kind: 'construction',
      label: cfg.labels.holeFillGravel,
      subKind: 'holeFillGravel',
    });
  if (hasHoleFillSeal)
    items.push({
      kind: 'construction',
      label: cfg.labels.holeFillSeal,
      subKind: 'holeFillSeal',
    });
  if (hasWellCase)
    items.push({
      kind: 'construction',
      label: cfg.labels.wellCase,
      subKind: 'wellCase',
    });
  if (hasWellScreen)
    items.push({
      kind: 'construction',
      label: cfg.labels.wellScreen,
      subKind: 'wellScreen',
    });
  if (hasConflict)
    items.push({
      kind: 'construction',
      label: cfg.labels.conflict,
      subKind: 'conflict',
    });

  const svgEl = d3.select(selector);
  svgEl.selectAll('*').remove();

  if (items.length === 0) {
    svgEl.attr('width', 0).attr('height', 0);
    return;
  }

  if (options.cssVars) {
    for (const key of Object.keys(options.cssVars) as (keyof CssVarsConfig)[]) {
      const cssVar = CSS_VAR_MAP[key];
      if (cssVar && options.cssVars[key] != null)
        svgEl.style(cssVar, options.cssVars[key] as string);
    }
  }

  Object.values(DEFAULTS_TEXTURES).forEach(t => svgEl.call(t));

  const itemsPerRow = cfg.maxWidth
    ? Math.max(1, Math.floor((cfg.maxWidth - cfg.padding * 2) / cfg.itemWidth))
    : items.length;
  const numRows = Math.ceil(items.length / itemsPerRow);
  const rowWidth = Math.min(items.length, itemsPerRow) * cfg.itemWidth;
  const totalWidth = cfg.padding * 2 + rowWidth;
  const totalHeight = numRows * cfg.height;

  svgEl.attr('width', totalWidth).attr('height', totalHeight);

  const node = svgEl.node() as Element | null;

  const fractureDryColor = resolveCssVar(node, CSS_VAR_MAP.fractureDryStroke);
  const fractureWetColor = resolveCssVar(node, CSS_VAR_MAP.fractureWetStroke);
  const caveDryColor = resolveCssVar(node, CSS_VAR_MAP.caveDryStroke);
  const caveWetColor = resolveCssVar(node, CSS_VAR_MAP.caveWetStroke);
  const boreHoleFillColor = resolveCssVar(node, CSS_VAR_MAP.boreHoleFill);
  const boreHoleStrokeColor = resolveCssVar(node, CSS_VAR_MAP.boreHoleStroke);
  const surfaceCaseFillColor = resolveCssVar(node, CSS_VAR_MAP.surfaceCaseFill);
  const holeFillStrokeColor = resolveCssVar(node, CSS_VAR_MAP.holeFillStroke);
  const wellCaseFillColor = resolveCssVar(node, CSS_VAR_MAP.wellCaseFill);
  const wellCaseStrokeColor = resolveCssVar(node, CSS_VAR_MAP.wellCaseStroke);
  const wellScreenStrokeColor = resolveCssVar(
    node,
    CSS_VAR_MAP.wellScreenStroke,
  );
  const conflictStrokeColor = resolveCssVar(node, CSS_VAR_MAP.conflictStroke);
  const cementPadStrokeColor = resolveCssVar(node, CSS_VAR_MAP.cementPadStroke);

  const RC = 'round' as const;

  const g = svgEl.append('g').attr('transform', `translate(${cfg.padding}, 2)`);

  g.append('rect')
    .attr('class', cls.border)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', totalWidth - cfg.padding)
    .attr('height', totalHeight - 4)
    .attr('fill', 'white')
    .attr('rx', cfg.borderRadius);

  g.append('text')
    .attr('class', cls.title)
    .attr('x', 4)
    .attr('y', 11)
    .attr('font-size', cfg.fontSize)
    .attr('font-weight', 'bold')
    .text(`${cfg.title}:`);

  const rw = 24;
  const rh = 12;

  items.forEach((item, i) => {
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    const rowSymY = row * cfg.height + (cfg.height - 4) / 2;
    const cx = col * cfg.itemWidth;

    const symG = g.append('g').attr('class', cls.item);

    if (item.kind === 'fracture') {
      const color = item.water_intake ? fractureWetColor : fractureDryColor;

      if (item.swarm) {
        ([-4, 0, 4] as number[]).forEach(offset => {
          symG
            .append('polyline')
            .attr('class', cls.fracturePoly)
            .attr('data-wet', String(item.water_intake))
            .attr('data-side', String(offset !== 0))
            .attr(
              'points',
              `${cx},${rowSymY + offset} ${cx + 6},${rowSymY + offset - 1} ${cx + 12},${rowSymY + offset + 1} ${cx + 18},${rowSymY + offset - 0.5} ${cx + 24},${rowSymY + offset}`,
            )
            .attr('stroke', color)
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
            `${cx},${rowSymY} ${cx + 5},${rowSymY - 1.5} ${cx + 11},${rowSymY + 1} ${cx + 17},${rowSymY - 0.5} ${cx + 24},${rowSymY}`,
          )
          .attr('stroke', color)
          .attr('fill', 'none')
          .attr('stroke-linecap', RC)
          .attr('stroke-linejoin', RC);
      }
    } else if (item.kind === 'cave') {
      const color = item.water_intake ? caveWetColor : caveDryColor;
      const texture = item.water_intake
        ? DEFAULTS_TEXTURES.cave_wet
        : DEFAULTS_TEXTURES.cave_dry;

      symG
        .append('rect')
        .attr('class', cls.caveFill)
        .attr('data-wet', String(item.water_intake))
        .attr('x', cx)
        .attr('y', rowSymY - rh / 2)
        .attr('width', rw)
        .attr('height', rh)
        .attr('fill', texture.url())
        .attr('stroke', color);
    } else {
      const symMap: Record<string, { fill: string; stroke: string }> = {
        boreHole: { fill: boreHoleFillColor, stroke: boreHoleStrokeColor },
        surfaceCase: {
          fill: surfaceCaseFillColor,
          stroke: surfaceCaseFillColor,
        },
        holeFillGravel: {
          fill: DEFAULTS_TEXTURES.gravel_pack.url(),
          stroke: holeFillStrokeColor,
        },
        holeFillSeal: {
          fill: DEFAULTS_TEXTURES.seal.url(),
          stroke: holeFillStrokeColor,
        },
        wellCase: { fill: wellCaseFillColor, stroke: wellCaseStrokeColor },
        wellScreen: {
          fill: DEFAULTS_TEXTURES.well_screen.url(),
          stroke: wellScreenStrokeColor,
        },
        cementPad: {
          fill: DEFAULTS_TEXTURES.pad.url(),
          stroke: cementPadStrokeColor,
        },
        conflict: {
          fill: DEFAULTS_TEXTURES.conflict.url(),
          stroke: conflictStrokeColor,
        },
      };
      const sym = symMap[item.subKind];

      symG
        .append('rect')
        .attr('class', cls.constructionRect)
        .attr('x', cx)
        .attr('y', rowSymY - rh / 2)
        .attr('width', rw)
        .attr('height', rh)
        .attr('fill', sym.fill)
        .attr('stroke', sym.stroke);
    }

    g.append('text')
      .attr('class', cls.label)
      .attr('x', cx + 28)
      .attr('y', rowSymY + 3)
      .attr('font-size', cfg.fontSize)
      .text(item.label);
  });
}
