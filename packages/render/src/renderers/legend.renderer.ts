import type { Selection } from 'd3';
import * as d3module from 'd3';
import { defu } from 'defu';

import { Well } from '@welldot/core';
import { getCurrentPump } from '@welldot/utils';
import {
  ComponentsClassNames,
  LegendRenderConfig,
  WellTheme,
} from '~/types/render.types';
import { DEFAULT_COMPONENTS_CLASS_NAMES } from '../configs/render.classnames';
import {
  DEFAULT_WELL_THEME,
  INTERACTIVE_RENDER_CONFIG,
} from '../configs/render.configs';
import {
  TexturesConfig,
  WellTextures,
  createWellTextures,
} from '../configs/render.textures';
import { getConflictAreas, mergeConflicts } from '../utils/render.utils';

const d3 = { ...d3module };

type LegendLabelKey = keyof LegendRenderConfig['labels'];

/**
 * One entry of a well's legend: `key` names the entry (and its label in
 * `LegendRenderConfig['labels']`), the other fields select its symbol.
 */
export type WellLegendItem =
  | {
      kind: 'fracture';
      key: 'fractureSingle' | 'fractureSwarm' | 'fractureWater';
      label: string;
      swarm: boolean;
      water_intake: boolean;
    }
  | {
      kind: 'cave';
      key: 'caveDry' | 'caveWet';
      label: string;
      water_intake: boolean;
    }
  | {
      kind: 'construction';
      key: ConstructionSubKind;
      label: string;
      subKind: ConstructionSubKind;
    };

type ConstructionSubKind = Exclude<
  LegendLabelKey,
  'fractureSingle' | 'fractureSwarm' | 'fractureWater' | 'caveDry' | 'caveWet'
>;

type LegendStyle = {
  theme: WellTheme;
  cls: ComponentsClassNames['legend'];
  textures: WellTextures;
};

// Symbol box, in px.
const SYMBOL_WIDTH = 24;
const SYMBOL_HEIGHT = 12;
// Room around a standalone symbol for strokes and the fracture swarm's offsets.
const SYMBOL_MARGIN = 2;

/**
 * Lists the legend entries `profile` needs, in display order, labeled from
 * `labels` (defaults to the built-in Portuguese labels).
 */
export function getWellLegendItems(
  profile: Well,
  labels: LegendRenderConfig['labels'] = INTERACTIVE_RENDER_CONFIG.legend
    .labels,
): WellLegendItem[] {
  const fractures = profile.fractures ?? [];
  const caves = profile.caves ?? [];
  const boreHoles = profile.bore_hole ?? [];
  const wellCases = profile.well_case ?? [];
  const wellScreens = profile.well_screen ?? [];
  const reductions = profile.reduction ?? [];
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
  const hasReduction = reductions.length > 0;
  const hasCentralizer = (profile.centralizers ?? []).length > 0;
  const hasPump = getCurrentPump(profile)?.intake_depth !== undefined;
  const hasCementPad = !!profile.cement_pad?.thickness;
  const hasConflict =
    mergeConflicts(
      [
        ...getConflictAreas(wellCases, wellScreens),
        ...getConflictAreas(wellScreens, wellCases),
      ],
      1,
    ).length > 0;

  const items: WellLegendItem[] = [];
  if (hasSimple)
    items.push({
      kind: 'fracture',
      key: 'fractureSingle',
      label: labels.fractureSingle,
      swarm: false,
      water_intake: false,
    });
  if (hasSwarm)
    items.push({
      kind: 'fracture',
      key: 'fractureSwarm',
      label: labels.fractureSwarm,
      swarm: true,
      water_intake: false,
    });
  if (hasWaterFx)
    items.push({
      kind: 'fracture',
      key: 'fractureWater',
      label: labels.fractureWater,
      swarm: false,
      water_intake: true,
    });
  if (hasCaveDry)
    items.push({
      kind: 'cave',
      key: 'caveDry',
      label: labels.caveDry,
      water_intake: false,
    });
  if (hasCaveWet)
    items.push({
      kind: 'cave',
      key: 'caveWet',
      label: labels.caveWet,
      water_intake: true,
    });

  if (hasCementPad)
    items.push({
      kind: 'construction',
      key: 'cementPad',
      label: labels.cementPad,
      subKind: 'cementPad',
    });
  if (hasBoreHole)
    items.push({
      kind: 'construction',
      key: 'boreHole',
      label: labels.boreHole,
      subKind: 'boreHole',
    });
  if (hasSurfaceCase)
    items.push({
      kind: 'construction',
      key: 'surfaceCase',
      label: labels.surfaceCase,
      subKind: 'surfaceCase',
    });
  if (hasHoleFillGravel)
    items.push({
      kind: 'construction',
      key: 'holeFillGravel',
      label: labels.holeFillGravel,
      subKind: 'holeFillGravel',
    });
  if (hasHoleFillSeal)
    items.push({
      kind: 'construction',
      key: 'holeFillSeal',
      label: labels.holeFillSeal,
      subKind: 'holeFillSeal',
    });
  if (hasWellCase)
    items.push({
      kind: 'construction',
      key: 'wellCase',
      label: labels.wellCase,
      subKind: 'wellCase',
    });
  if (hasWellScreen)
    items.push({
      kind: 'construction',
      key: 'wellScreen',
      label: labels.wellScreen,
      subKind: 'wellScreen',
    });
  if (hasReduction)
    items.push({
      kind: 'construction',
      key: 'reduction',
      label: labels.reduction,
      subKind: 'reduction',
    });
  if (hasCentralizer)
    items.push({
      kind: 'construction',
      key: 'centralizer',
      label: labels.centralizer,
      subKind: 'centralizer',
    });
  if (hasPump)
    items.push({
      kind: 'construction',
      key: 'pump',
      label: labels.pump,
      subKind: 'pump',
    });
  if (hasConflict)
    items.push({
      kind: 'construction',
      key: 'conflict',
      label: labels.conflict,
      subKind: 'conflict',
    });

  return items;
}

/** Draws `item`'s symbol into `symG`, its box starting at `cx` and centered on `rowSymY`. */
function drawLegendSymbol(
  symG: Selection<SVGGElement, unknown, HTMLElement, unknown>,
  item: WellLegendItem,
  cx: number,
  rowSymY: number,
  { theme, cls, textures: legendTextures }: LegendStyle,
): void {
  const RC = 'round' as const;
  const rw = SYMBOL_WIDTH;
  const rh = SYMBOL_HEIGHT;

  if (item.kind === 'fracture') {
    const color = item.water_intake
      ? theme.fracture.wetStroke
      : theme.fracture.dryStroke;

    if (item.swarm) {
      ([-4, 0, 4] as number[]).forEach(offset => {
        symG
          .append('polyline')
          .attr('class', cls.fracturePoly)
          .attr(
            'points',
            `${cx},${rowSymY + offset} ${cx + 6},${rowSymY + offset - 1} ${cx + 12},${rowSymY + offset + 1} ${cx + 18},${rowSymY + offset - 0.5} ${cx + 24},${rowSymY + offset}`,
          )
          .attr('stroke', color)
          .attr(
            'stroke-width',
            offset !== 0
              ? theme.legend.fractureSideStrokeWidth
              : theme.legend.fractureStrokeWidth,
          )
          .attr('fill', 'none')
          .attr('stroke-linecap', RC)
          .attr('stroke-linejoin', RC);
      });
    } else {
      symG
        .append('polyline')
        .attr('class', cls.fracturePoly)
        .attr(
          'points',
          `${cx},${rowSymY} ${cx + 5},${rowSymY - 1.5} ${cx + 11},${rowSymY + 1} ${cx + 17},${rowSymY - 0.5} ${cx + 24},${rowSymY}`,
        )
        .attr('stroke', color)
        .attr('stroke-width', theme.legend.fractureStrokeWidth)
        .attr('fill', 'none')
        .attr('stroke-linecap', RC)
        .attr('stroke-linejoin', RC);
    }
  } else if (item.kind === 'cave') {
    const color = item.water_intake
      ? theme.cave.wetStroke
      : theme.cave.dryStroke;
    const texture = item.water_intake
      ? legendTextures.cave_wet
      : legendTextures.cave_dry;

    symG
      .append('rect')
      .attr('class', cls.caveFill)
      .attr('x', cx)
      .attr('y', rowSymY - rh / 2)
      .attr('width', rw)
      .attr('height', rh)
      .attr('fill', texture.url())
      .attr('stroke', color)
      .attr('stroke-width', theme.legend.itemStrokeWidth);
  } else if (item.subKind === 'surfaceCase') {
    symG
      .append('rect')
      .attr('class', cls.constructionRect)
      .attr('x', cx)
      .attr('y', rowSymY - rh / 2)
      .attr('width', rw)
      .attr('height', rh)
      .attr('fill', legendTextures.surface_case.url())
      .attr('stroke', 'none');
    symG
      .append('line')
      .attr('class', cls.constructionRect)
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', rowSymY - rh / 2)
      .attr('y2', rowSymY + rh / 2)
      .attr('stroke', theme.surfaceCase.stroke)
      .attr('stroke-width', 2);
    symG
      .append('line')
      .attr('class', cls.constructionRect)
      .attr('x1', cx + rw)
      .attr('x2', cx + rw)
      .attr('y1', rowSymY - rh / 2)
      .attr('y2', rowSymY + rh / 2)
      .attr('stroke', theme.surfaceCase.stroke)
      .attr('stroke-width', 2);
  } else if (item.subKind === 'centralizer') {
    // Pipe walls with a bow on each side, matching the profile marker.
    const pipeW = rw * 0.4;
    const pipeL = cx + (rw - pipeW) / 2;
    const pipeR = pipeL + pipeW;
    const y1 = rowSymY - rh / 2;
    const y2 = rowSymY + rh / 2;
    const bowH = rh * 0.3;
    for (const x of [pipeL, pipeR]) {
      symG
        .append('line')
        .attr('class', cls.constructionRect)
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y1)
        .attr('y2', y2)
        .attr('stroke', theme.wellCase.stroke)
        .attr('stroke-width', theme.legend.itemStrokeWidth);
    }
    for (const [from, to] of [
      [pipeL, cx],
      [pipeR, cx + rw],
    ] as const) {
      symG
        .append('polyline')
        .attr('class', cls.constructionRect)
        .attr(
          'points',
          `${from},${rowSymY - bowH} ${to},${rowSymY} ${from},${rowSymY + bowH}`,
        )
        .attr('fill', theme.centralizer.fill)
        .attr('stroke', theme.centralizer.stroke)
        .attr('stroke-width', theme.centralizer.strokeWidth);
    }
  } else if (item.subKind === 'pump') {
    // Riser from the top, pump body at the bottom — matching the profile layer.
    const y1 = rowSymY - rh / 2;
    const y2 = rowSymY + rh / 2;
    const midX = cx + rw / 2;
    const riserHalf = rw * 0.12;
    const bodyHalf = rw * 0.28;
    const bodyTop = y1 + rh * 0.4;
    for (const x of [midX - riserHalf, midX + riserHalf]) {
      symG
        .append('line')
        .attr('class', cls.constructionRect)
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y1)
        .attr('y2', bodyTop)
        .attr('stroke', theme.pump.riserStroke)
        .attr('stroke-width', theme.pump.riserStrokeWidth);
    }
    symG
      .append('path')
      .attr('class', cls.constructionRect)
      .attr(
        'd',
        `M${midX - bodyHalf},${bodyTop}H${midX + bodyHalf}V${y2}H${midX - bodyHalf}Z`,
      )
      .attr('fill', theme.pump.fill)
      .attr('stroke', theme.pump.stroke)
      .attr('stroke-width', theme.pump.strokeWidth);
  } else if (item.subKind === 'reduction') {
    const topW = rw * 0.5;
    const y1 = rowSymY - rh / 2;
    const y2 = rowSymY + rh / 2;
    const midX = cx + rw / 2;
    symG
      .append('polygon')
      .attr('class', cls.constructionRect)
      .attr(
        'points',
        `${midX - topW / 2},${y1} ${midX + topW / 2},${y1} ${cx + rw},${y2} ${cx},${y2}`,
      )
      .attr('fill', theme.reduction.fill)
      .attr('stroke', theme.reduction.stroke)
      .attr('stroke-width', theme.legend.itemStrokeWidth);
  } else {
    const symMap: Record<
      string,
      { fill: string; stroke: string; dasharray?: string }
    > = {
      boreHole: {
        fill: theme.boreHole.fill,
        stroke: theme.boreHole.stroke,
        dasharray: theme.boreHole.strokeDasharray,
      },
      holeFillGravel: {
        fill: legendTextures.gravel_pack.url(),
        stroke: theme.holeFill.stroke,
      },
      holeFillSeal: {
        fill: legendTextures.seal.url(),
        stroke: theme.holeFill.stroke,
      },
      wellCase: { fill: theme.wellCase.fill, stroke: theme.wellCase.stroke },
      wellScreen: {
        fill: legendTextures.well_screen.url(),
        stroke: theme.wellScreen.stroke,
      },
      cementPad: {
        fill: legendTextures.pad.url(),
        stroke: theme.cementPad.stroke,
      },
      conflict: {
        fill: legendTextures.conflict.url(),
        stroke: theme.conflict.stroke,
      },
    };
    const sym = symMap[item.subKind];

    const symRect = symG
      .append('rect')
      .attr('class', cls.constructionRect)
      .attr('x', cx)
      .attr('y', rowSymY - rh / 2)
      .attr('width', rw)
      .attr('height', rh)
      .attr('fill', sym.fill)
      .attr('stroke', sym.stroke)
      .attr('stroke-width', theme.legend.itemStrokeWidth);
    if (sym.dasharray) symRect.attr('stroke-dasharray', sym.dasharray);
  }
}

type LegendOptions = {
  config?: Partial<LegendRenderConfig>;
  theme?: Partial<WellTheme>;
  classNames?: ComponentsClassNames['legend'];
  textures?: TexturesConfig;
};

function resolveStyle(options: LegendOptions): LegendStyle {
  return {
    theme: defu(options.theme ?? {}, DEFAULT_WELL_THEME) as WellTheme,
    cls: options.classNames
      ? { ...DEFAULT_COMPONENTS_CLASS_NAMES.legend, ...options.classNames }
      : DEFAULT_COMPONENTS_CLASS_NAMES.legend,
    textures: createWellTextures(options.textures),
  };
}

/**
 * Draws a single legend symbol into its own `<svg>` (matched by `selector`),
 * sized to the symbol plus a small margin, with the textures it needs
 * defined inside — so the markup renders standalone, e.g. in a PDF table.
 */
export function drawWellLegendSymbol(
  selector: string,
  item: WellLegendItem,
  options: Omit<LegendOptions, 'config'> = {},
): void {
  const style = resolveStyle(options);
  const svgEl = d3.select(selector);
  svgEl.selectAll('*').remove();
  svgEl
    .attr('width', SYMBOL_WIDTH + SYMBOL_MARGIN * 2)
    .attr('height', SYMBOL_HEIGHT + SYMBOL_MARGIN * 2);
  Object.values(style.textures).forEach(t => svgEl.call(t));

  const symG = svgEl.append('g').attr('class', style.cls.item);
  drawLegendSymbol(
    symG,
    item,
    SYMBOL_MARGIN,
    SYMBOL_MARGIN + SYMBOL_HEIGHT / 2,
    style,
  );
}

export function drawWellLegend(
  selector: string,
  profile: Well,
  options: LegendOptions = {},
): void {
  const cfg = defu(
    options.config ?? {},
    INTERACTIVE_RENDER_CONFIG.legend,
  ) as LegendRenderConfig;

  const items = getWellLegendItems(profile, cfg.labels);

  const svgEl = d3.select(selector);
  svgEl.selectAll('*').remove();

  if (items.length === 0) {
    svgEl.attr('width', 0).attr('height', 0);
    return;
  }

  const style = resolveStyle(options);
  const { theme, cls } = style;
  Object.values(style.textures).forEach(t => svgEl.call(t));
  const itemsPerRow = cfg.maxWidth
    ? Math.max(1, Math.floor((cfg.maxWidth - cfg.padding * 2) / cfg.itemWidth))
    : items.length;
  const numRows = Math.ceil(items.length / itemsPerRow);
  const rowWidth = Math.min(items.length, itemsPerRow) * cfg.itemWidth;
  const totalWidth = cfg.padding * 2 + rowWidth;
  const totalHeight = numRows * cfg.height;

  svgEl.attr('width', totalWidth).attr('height', totalHeight);

  const g = svgEl.append('g').attr('transform', `translate(${cfg.padding}, 2)`);

  g.append('rect')
    .attr('class', cls.border)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', totalWidth - cfg.padding)
    .attr('height', totalHeight - 4)
    .attr('fill', 'white')
    .attr('rx', cfg.borderRadius)
    .attr('stroke-width', theme.legend.borderStrokeWidth);

  g.append('text')
    .attr('class', cls.title)
    .attr('x', 4)
    .attr('y', 11)
    .attr('font-size', theme.legend.fontSize)
    .attr('font-family', theme.legend.fontFamily ?? 'sans-serif')
    .attr('font-weight', theme.legend.titleFontWeight ?? 'bold')
    .text(`${cfg.title}:`);

  items.forEach((item, i) => {
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    const rowSymY = row * cfg.height + (cfg.height - 4) / 2;
    const cx = col * cfg.itemWidth;

    const symG = g.append('g').attr('class', cls.item);
    drawLegendSymbol(symG, item, cx, rowSymY, style);

    g.append('text')
      .attr('class', cls.label)
      .attr('x', cx + 28)
      .attr('y', rowSymY + 3)
      .attr('font-size', theme.legend.fontSize)
      .attr('font-family', theme.legend.fontFamily ?? 'sans-serif')
      .attr('font-weight', theme.legend.labelFontWeight ?? 400)
      .text(item.label);
  });
}
