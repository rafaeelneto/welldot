import * as d3module from 'd3';
import { defu } from 'defu';

import { Well } from '@welldot/core';
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
import { TexturesConfig, createWellTextures } from '../configs/render.textures';
import { getConflictAreas, mergeConflicts } from '../utils/render.utils';

const d3 = { ...d3module };

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

export function drawWellLegend(
  selector: string,
  profile: Well,
  options: {
    config?: Partial<LegendRenderConfig>;
    theme?: Partial<WellTheme>;
    classNames?: ComponentsClassNames['legend'];
    textures?: TexturesConfig;
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

  const theme = defu(options.theme ?? {}, DEFAULT_WELL_THEME) as WellTheme;

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

  const legendTextures = createWellTextures(options.textures);
  Object.values(legendTextures).forEach(t => svgEl.call(t));

  const itemsPerRow = cfg.maxWidth
    ? Math.max(1, Math.floor((cfg.maxWidth - cfg.padding * 2) / cfg.itemWidth))
    : items.length;
  const numRows = Math.ceil(items.length / itemsPerRow);
  const rowWidth = Math.min(items.length, itemsPerRow) * cfg.itemWidth;
  const totalWidth = cfg.padding * 2 + rowWidth;
  const totalHeight = numRows * cfg.height;

  svgEl.attr('width', totalWidth).attr('height', totalHeight);

  const RC = 'round' as const;

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
    .attr('font-size', cfg.fontSize)
    .attr('font-family', cfg.fontFamily ?? 'sans-serif')
    .attr('font-weight', cfg.titleFontWeight ?? 'bold')
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
      const color = item.water_intake ? theme.fracture.wetStroke : theme.fracture.dryStroke;

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
            .attr('stroke-width', offset !== 0 ? theme.legend.fractureSideStrokeWidth : theme.legend.fractureStrokeWidth)
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
      const color = item.water_intake ? theme.cave.wetStroke : theme.cave.dryStroke;
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

    g.append('text')
      .attr('class', cls.label)
      .attr('x', cx + 28)
      .attr('y', rowSymY + 3)
      .attr('font-size', cfg.fontSize)
      .attr('font-family', cfg.fontFamily ?? 'sans-serif')
      .attr('font-weight', cfg.labelFontWeight ?? 400)
      .text(item.label);
  });
}
