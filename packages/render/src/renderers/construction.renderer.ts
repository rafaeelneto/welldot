import type { BaseType, Selection } from 'd3';
import * as d3 from 'd3';

import type {
  CementPad,
  Constructive,
  HoleFill,
  Reduction,
} from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { Conflict, DrawContext, SvgSelection } from '~/types/render.types';
import {
  annulusFillPath,
  boreHoleOutlinePath,
  diameterAt,
  getCementPadGeometry,
  getIntervalEnds,
  getPadDiameters,
  holeFillOutlinePath,
  type Interval,
  type OutlineScales,
  pipeWallsPath,
  screenEndPath,
  shoePath,
} from '~/utils/construction.geometry';
import { mergeEnter, withTransition } from '~/utils/d3.utils';
import { makeIntervalKey } from '~/utils/key.utils';
import {
  getConflictAreas,
  getYAxisFunctions,
  mergeConflicts,
} from '~/utils/render.utils';

type Tooltip = { show: (...args: never[]) => void; hide: () => void };

/** Items appended by the current draw; their outlines start collapsed. */
const entering = new WeakSet<Element>();

/** x-scale (diameter mm → px) shared by every construction layer. */
function constructionXScale(ctx: DrawContext) {
  const max = d3.max(getProfileDiamValues(ctx.constructionData)) || 0;
  return d3.scaleLinear().domain([0, max]).range([0, ctx.POCO_WIDTH]);
}

/** Outline scales for `ctx`, clamped to the panel's depth window. */
function outlineScales(ctx: DrawContext): OutlineScales {
  const x = constructionXScale(ctx);
  return {
    y: ctx.yScale,
    left: d => (ctx.POCO_CENTER - x(d)) / 2,
    right: d => (ctx.POCO_CENTER + x(d)) / 2,
    depthFrom: ctx.depthFrom,
    depthTo: ctx.depthTo,
  };
}

/** Surface case diameter as drawn: padded so it shows outside the casing. */
const surfaceCaseDiameter = (ctx: DrawContext, diameter: number) =>
  diameter *
  (1 + ctx.renderConfig.construction.surfaceCase.diameterPaddingRatio);

/**
 * Joins one interval layer as `g.<cls>` items, each holding a fill (a rect,
 * or an even-odd path when `pathFill` is set), an open outline path and,
 * when `shoe` is set, a shoe path. Geometry is set by
 * {@link layoutConstruction}; entering items start collapsed at their top
 * so the layout transition grows them.
 */
function joinIntervalLayer<T extends { from: number; to: number }>(
  ctx: DrawContext,
  group: SvgSelection,
  cls: string,
  data: T[],
  key: string,
  tooltip: Tooltip,
  { shoe = false, pathFill = false, ends = false } = {},
): Selection<SVGGElement, T, BaseType, unknown> {
  const sel = group
    .selectAll<SVGGElement, T>(`g.${cls}`)
    .data(data, makeIntervalKey(key));

  sel.exit().transition(ctx.transition).style('opacity', 0).remove();

  const top = (d: T) => ctx.yScale(Math.max(d.from, ctx.depthFrom));
  const entered = sel
    .enter()
    .append('g')
    .attr('class', cls)
    .each((_d, i, nodes) => entering.add(nodes[i]!))
    .on('mouseover', tooltip.show as never)
    .on('mouseout', tooltip.hide);
  if (pathFill)
    entered
      .append('path')
      .attr('class', `${cls}-fill`)
      .attr('stroke', 'none')
      .attr('fill-rule', 'evenodd')
      .attr('d', '');
  else
    entered
      .append('rect')
      .attr('class', `${cls}-fill`)
      .attr('stroke', 'none')
      .attr('y', top)
      .attr('height', 0);
  entered
    .append('path')
    .attr('class', `${cls}-outline`)
    .attr('fill', 'none')
    .attr('d', '');
  if (shoe)
    entered
      .append('path')
      .attr('class', `${cls}-shoe`)
      .attr('stroke-linejoin', 'round')
      .attr('d', '');
  if (ends)
    entered
      .append('path')
      .attr('class', `${cls}-ends`)
      .attr('fill', 'none')
      .attr('d', '');

  return entered.merge(sel);
}

/**
 * Renders the cement pad as two slabs cast around the casing at the
 * surface, covering the surface case and annulus, with break lines at the outer ends (see
 * `getCementPadGeometry`). Paths only, so the generic rect rescale on zoom
 * never touches it; safe to call on every zoom event.
 */
export function drawCementPad(
  ctx: DrawContext,
  pad: CementPad | undefined,
): void {
  const cls = ctx.classes.cementPad.item;
  // On the panel that holds the surface (it may start above it, at a stick-up).
  const visible = !!pad?.thickness && ctx.depthFrom <= 0 && ctx.depthTo > 0;
  const sel = ctx.groups.cementPadGroup
    .selectAll<SVGGElement, CementPad>(`g.${cls}`)
    .data(visible ? [pad!] : [], () => 'cement_pad');

  sel.exit().remove();
  if (!visible) return;

  const entered = sel
    .enter()
    .append('g')
    .attr('class', cls)
    .on('mouseover', ctx.tooltips.cementPad.show)
    .on('mouseout', ctx.tooltips.cementPad.hide);
  entered.append('path').attr('class', `${cls}-slab`);
  entered.append('path').attr('class', `${cls}-slab`);

  const x = constructionXScale(ctx);
  const { opening, outer } = getPadDiameters(
    ctx.constructionData,
    ctx.renderConfig.construction.surfaceCase.diameterPaddingRatio,
  );
  const { slabs } = getCementPadGeometry(
    ctx.POCO_WIDTH,
    ctx.POCO_CENTER,
    ctx.yScale(0),
    ctx.renderConfig.construction.cementPad,
    x(opening),
    x(outer),
  );

  entered
    .merge(sel)
    .selectAll<SVGPathElement, unknown>('path')
    .attr('d', (_d, i) => slabs[i] ?? '')
    .attr('fill', ctx.textures.pad.url())
    .attr('stroke', ctx.theme.cementPad.stroke)
    .attr('stroke-width', ctx.theme.cementPad.strokeWidth)
    .attr('stroke-linejoin', 'round');
}

/**
 * Sets the geometry of every drawn construction item from `ctx.yScale`:
 * fill rects, open outlines, casing shoes and reductions. `drawConstructive`
 * calls it with `animate` (shared transition; items it just appended grow
 * from their top); the zoom handler calls it with a rescaled `ctx` and no
 * transition.
 */
export function layoutConstruction(ctx: DrawContext, animate = false): void {
  const c = ctx.classes;
  const scales = outlineScales(ctx);
  const data = ctx.constructionData;

  // Selection and Transition share `.attr`; one cast lets callers ignore which.
  const motion = <GEl extends Element, D>(
    sel: Selection<GEl, D, BaseType, unknown>,
  ) =>
    (animate
      ? withTransition(sel, ctx.transition)
      : sel) as unknown as Selection<GEl, D, BaseType, unknown>;

  const yTop = (d: { from: number }) =>
    ctx.yScale(Math.max(d.from, ctx.depthFrom));
  const yBottom = (d: { to: number }) =>
    ctx.yScale(Math.min(d.to, ctx.depthTo));

  /** Scales that map every depth to the item's top: the collapsed shape. */
  const collapsed = (d: { from: number }): OutlineScales => ({
    ...scales,
    y: () => yTop(d),
  });

  /**
   * Sets `attr` of each item's `part` from `shape`. Parts of items this draw
   * appended first take their collapsed shape, so the transition grows them.
   */
  const shapeParts = <T extends { from: number }>(
    items: Selection<SVGGElement, T, BaseType, unknown>,
    part: string,
    attr: string,
    shape: (d: T, s: OutlineScales) => string,
  ) => {
    const parts = items.select<SVGElement>(part);
    if (animate)
      parts
        .filter(function () {
          return entering.has(this.parentNode as Element);
        })
        .attr(attr, d => shape(d, collapsed(d)));
    motion(parts).attr(attr, d => shape(d, scales));
  };

  /**
   * Lays out one `joinIntervalLayer` layer. `fill` shapes a path fill;
   * without it the fill is a rect `diameter` wide.
   */
  const layoutLayer = (
    group: SvgSelection,
    cls: string,
    diameter: (d: Interval) => number,
    outline: (d: Interval, s: OutlineScales) => string,
    {
      shoe,
      ends,
      fill,
    }: {
      shoe?: (d: Interval, s: OutlineScales) => string;
      ends?: (d: Interval, s: OutlineScales) => string;
      fill?: (d: Interval, s: OutlineScales) => string;
    } = {},
  ) => {
    const items = group.selectAll<SVGGElement, Interval>(`g.${cls}`);
    shapeParts(items, `.${cls}-outline`, 'd', outline);
    if (shoe) shapeParts(items, `.${cls}-shoe`, 'd', shoe);
    if (ends) shapeParts(items, `.${cls}-ends`, 'd', ends);
    if (fill) {
      shapeParts(items, `.${cls}-fill`, 'd', fill);
      return;
    }
    motion(
      items
        .select<SVGRectElement>(`.${cls}-fill`)
        .attr('x', d => scales.left(diameter(d)))
        .attr(
          'width',
          d => scales.right(diameter(d)) - scales.left(diameter(d)),
        ),
    )
      .attr('y', yTop)
      .attr('height', d => Math.max(0, yBottom(d) - yTop(d)));
  };

  const walls = (d: Interval, s: OutlineScales, dia = d.diameter) =>
    pipeWallsPath(
      s.left(dia),
      s.right(dia),
      s.y(Math.max(d.from, s.depthFrom)),
      s.y(Math.min(d.to, s.depthTo)),
    );

  layoutLayer(
    ctx.groups.holeGroup,
    c.boreHole.rect,
    d => d.diameter,
    (d, s) => boreHoleOutlinePath(d, data.bore_hole, s),
  );

  const pipes: Interval[] = [...data.well_case, ...data.well_screen];
  const insideSurface = [...data.bore_hole, ...data.hole_fill, ...pipes];
  const scDiameter = (d: Interval) => surfaceCaseDiameter(ctx, d.diameter);
  layoutLayer(
    ctx.groups.surfaceCaseGroup,
    c.surfaceCase.rect,
    scDiameter,
    (d, s) => walls(d, s, scDiameter(d)),
    // Only the ring outside the hole: the texture never shows under the casing.
    {
      fill: (d, s) =>
        annulusFillPath({ ...d, diameter: scDiameter(d) }, insideSurface, s),
    },
  );
  layoutLayer(
    ctx.groups.holeFillGroup,
    c.holeFill.rect,
    d => d.diameter,
    (d, s) => holeFillOutlinePath(d, pipes, s),
    { fill: (d, s) => annulusFillPath(d, pipes, s) },
  );

  // The string a pipe butts against: casing, screens and reductions. Taken
  // from the whole profile, so a joint just past the panel is still a joint.
  const string = [...pipes, ...(data.reduction ?? [])];
  const shoeCfg = ctx.renderConfig.construction.casingShoe;
  const endsCfg = ctx.renderConfig.construction.screenEnds;
  // Room in the annulus beside the pipe at `depth`, so marks stay off the
  // hole wall.
  const room = (d: Interval, depth: number, size: number) => {
    const hole = diameterAt(data.bore_hole, depth);
    const annulus =
      hole !== undefined && hole > d.diameter
        ? scales.left(d.diameter) - scales.left(hole) - 1
        : size;
    return Math.max(2, Math.min(size, annulus));
  };
  const shoe = (d: Interval, s: OutlineScales) => {
    const ends = getIntervalEnds(d, string, ctx.depthFrom, ctx.depthTo);
    if (!shoeCfg.active || ends.cutBottom || ends.joinedBottom) return '';
    return shoePath(
      s.left(d.diameter),
      s.right(d.diameter),
      s.y(Math.min(d.to, s.depthTo)),
      room(d, d.to, shoeCfg.size),
    );
  };
  // Screens also mark their top and base with a dashed line (not at panel
  // cuts, where the screen goes on).
  const screenEnds = (d: Interval, s: OutlineScales) => {
    if (!endsCfg.active) return '';
    const ends = getIntervalEnds(d, string, ctx.depthFrom, ctx.depthTo);
    const mark = (depth: number) =>
      screenEndPath(s.left(d.diameter), s.right(d.diameter), s.y(depth));
    return (
      (ends.cutTop ? '' : mark(d.from)) + (ends.cutBottom ? '' : mark(d.to))
    );
  };
  layoutLayer(
    ctx.groups.wellCaseGroup,
    c.wellCase.rect,
    d => d.diameter,
    walls,
    { shoe },
  );
  layoutLayer(
    ctx.groups.wellScreenGroup,
    c.wellScreen.rect,
    d => d.diameter,
    walls,
    { shoe, ends: screenEnds },
  );

  // Reductions: a trapezoid fill and its two slanted walls, open at both ends.
  const reductions = ctx.groups.reductionGroup.selectAll<
    SVGGElement,
    Reduction
  >(`g.${c.reduction.item}`);
  const corners = (d: Reduction, s: OutlineScales) => {
    const t = s.y(Math.max(d.from, s.depthFrom));
    const b = s.y(Math.min(d.to, s.depthTo));
    return {
      tl: `${s.left(d.diam_from)},${t}`,
      tr: `${s.right(d.diam_from)},${t}`,
      bl: `${s.left(d.diam_to)},${b}`,
      br: `${s.right(d.diam_to)},${b}`,
    };
  };
  shapeParts(reductions, `.${c.reduction.item}-fill`, 'points', (d, s) => {
    const p = corners(d, s);
    return `${p.tl} ${p.tr} ${p.br} ${p.bl}`;
  });
  shapeParts(reductions, `.${c.reduction.item}-outline`, 'd', (d, s) => {
    const p = corners(d, s);
    return `M${p.tl}L${p.bl}M${p.tr}L${p.br}`;
  });

  if (animate) {
    for (const group of [
      ctx.groups.holeGroup,
      ctx.groups.surfaceCaseGroup,
      ctx.groups.holeFillGroup,
      ctx.groups.wellCaseGroup,
      ctx.groups.wellScreenGroup,
      ctx.groups.reductionGroup,
    ])
      group.selectAll<SVGGElement, unknown>('g').each(function () {
        entering.delete(this);
      });
  }
}

/**
 * Renders all well construction components in order: cement pad, bore holes,
 * surface casing, hole fill, well casing, well screen, reductions and
 * conflict zones. Pipes and the borehole are drawn open: walls only, closed
 * where they physically end (casing shoe, total depth, diameter shoulders,
 * annulus interfaces), never at panel cuts or joints. The x-scale domain is
 * computed from ctx.constructionData for consistent widths across panels.
 */
export function drawConstructive(ctx: DrawContext, data: Constructive): void {
  const { getHeight, getYPos } = getYAxisFunctions(ctx.yScale, {
    from: ctx.depthFrom,
    to: ctx.depthTo,
  });
  const c = ctx.classes;
  const theme = ctx.theme;

  drawCementPad(ctx, data.cement_pad);

  // ── Bore hole ──────────────────────────────────────────────────────────────
  joinIntervalLayer(
    ctx,
    ctx.groups.holeGroup,
    c.boreHole.rect,
    data.bore_hole,
    'bore_hole',
    ctx.tooltips.hole,
  )
    .attr('opacity', theme.boreHole.opacity)
    .call(g => {
      g.select(`.${c.boreHole.rect}-fill`).attr('fill', theme.boreHole.fill);
      g.select(`.${c.boreHole.rect}-outline`)
        .attr('stroke', theme.boreHole.stroke)
        .attr('stroke-width', theme.boreHole.strokeWidth)
        .attr('stroke-dasharray', theme.boreHole.strokeDasharray);
    });

  // ── Surface case ───────────────────────────────────────────────────────────
  joinIntervalLayer(
    ctx,
    ctx.groups.surfaceCaseGroup,
    c.surfaceCase.rect,
    data.surface_case,
    'surface_case',
    ctx.tooltips.surfaceCase,
    { pathFill: true },
  ).call(g => {
    g.select(`.${c.surfaceCase.rect}-fill`).attr(
      'fill',
      ctx.textures.surface_case.url(),
    );
    g.select(`.${c.surfaceCase.rect}-outline`)
      .attr('stroke', theme.surfaceCase.stroke)
      .attr('stroke-width', theme.surfaceCase.strokeWidth);
  });

  // ── Hole fill ──────────────────────────────────────────────────────────────
  joinIntervalLayer(
    ctx,
    ctx.groups.holeFillGroup,
    c.holeFill.rect,
    data.hole_fill,
    'hole_fill',
    ctx.tooltips.holeFill,
    { pathFill: true },
  ).call(g => {
    g.select(`.${c.holeFill.rect}-fill`).attr('fill', (d: HoleFill) =>
      ctx.textures[d.type].url(),
    );
    g.select(`.${c.holeFill.rect}-outline`)
      .attr('stroke', theme.holeFill.stroke)
      .attr('stroke-width', theme.holeFill.strokeWidth);
  });

  // ── Well case and screen ───────────────────────────────────────────────────
  for (const [group, cls, items, key, tooltip, fill, stroke] of [
    [
      ctx.groups.wellCaseGroup,
      c.wellCase.rect,
      data.well_case,
      'well_case',
      ctx.tooltips.wellCase,
      theme.wellCase.fill,
      theme.wellCase,
    ],
    [
      ctx.groups.wellScreenGroup,
      c.wellScreen.rect,
      data.well_screen,
      'well_screen',
      ctx.tooltips.wellScreen,
      ctx.textures.well_screen.url(),
      theme.wellScreen,
    ],
  ] as const) {
    joinIntervalLayer(ctx, group, cls, items, key, tooltip, {
      shoe: true,
      ends: cls === c.wellScreen.rect,
    }).call(g => {
      g.select(`.${cls}-fill`).attr('fill', fill);
      g.select(`.${cls}-outline`)
        .attr('stroke', stroke.stroke)
        .attr('stroke-width', stroke.strokeWidth);
      g.select(`.${cls}-shoe`)
        .attr('fill', stroke.stroke)
        .attr('stroke', stroke.stroke)
        .attr('stroke-width', 0.5);
      g.select(`.${cls}-ends`)
        .attr('stroke', stroke.stroke)
        .attr('stroke-width', theme.wellScreen.endStrokeWidth)
        .attr('stroke-dasharray', theme.wellScreen.endDasharray);
    });
  }

  // ── Reduction ──────────────────────────────────────────────────────────────
  const reduction = ctx.groups.reductionGroup
    .selectAll<SVGGElement, Reduction>(`g.${c.reduction.item}`)
    .data(data.reduction ?? [], makeIntervalKey('reduction'));

  reduction.exit().transition(ctx.transition).style('opacity', 0).remove();

  const newReduction = reduction
    .enter()
    .append('g')
    .attr('class', c.reduction.item)
    .each((_d, i, nodes) => entering.add(nodes[i]!))
    .on('mouseover', ctx.tooltips.reduction.show)
    .on('mouseout', ctx.tooltips.reduction.hide);
  newReduction
    .append('polygon')
    .attr('class', `${c.reduction.item}-fill`)
    .attr('stroke', 'none');
  newReduction
    .append('path')
    .attr('class', `${c.reduction.item}-outline`)
    .attr('fill', 'none');
  newReduction.merge(reduction).call(g => {
    g.select(`.${c.reduction.item}-fill`).attr('fill', theme.reduction.fill);
    g.select(`.${c.reduction.item}-outline`)
      .attr('stroke', theme.reduction.stroke)
      .attr('stroke-width', theme.reduction.strokeWidth);
  });

  // ── Conflict zones ─────────────────────────────────────────────────────────
  // A deliberate warning: kept as a closed, hatched box.
  const mergedConflicts = mergeConflicts(
    [
      ...getConflictAreas(data.well_case, data.well_screen),
      ...getConflictAreas(data.well_screen, data.well_case),
    ],
    1,
  );

  const xScale = constructionXScale(ctx);
  const yPos = getYPos as (d: unknown) => number;
  const conflict = ctx.groups.conflictGroup
    .selectAll(`.${c.conflict.rect}`)
    .data(mergedConflicts, makeIntervalKey('conflict'));

  conflict.exit().transition(ctx.transition).attr('height', 0).remove();

  const newConflict = conflict
    .enter()
    .append('rect')
    .attr('class', c.conflict.rect)
    .attr('fill', ctx.textures.conflict.url())
    .attr('stroke', theme.conflict.stroke)
    .attr('stroke-width', theme.conflict.strokeWidth)
    .on('mouseover', ctx.tooltips.conflict.show)
    .on('mouseout', ctx.tooltips.conflict.hide)
    .attr('y', yPos)
    .attr('height', 0);

  const mergedConflict = mergeEnter(newConflict, conflict)
    .attr('x', (d: Conflict) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: Conflict) => xScale(d.diameter));
  withTransition(mergedConflict, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  layoutConstruction(ctx, true);
}
