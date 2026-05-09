import * as d3 from 'd3';

import type {
  BoreHole,
  CementPad,
  Constructive,
  HoleFill,
  SurfaceCase,
  WellCase,
  WellScreen,
} from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { Conflict, DrawContext } from '~/types/render.types';
import { stableLayerKey, withTransition } from '~/utils/d3.utils';
import {
  getConflictAreas,
  getYAxisFunctions,
  mergeConflicts,
} from '~/utils/render.utils';

/**
 * Renders all well construction components in order: cement pad, bore holes,
 * surface casing, hole fill, well casing, well screen, and conflict zones.
 * The x-scale domain is computed from ctx.constructionData for consistent
 * widths across multi-SVG panels.
 */
export function drawConstructive(ctx: DrawContext, data: Constructive): void {
  const { getHeight, getYPos } = getYAxisFunctions(ctx.yScale, {
    from: ctx.depthFrom,
    to: ctx.depthTo,
  });

  const maxXValues = getProfileDiamValues(ctx.constructionData);
  const maxXValueConstruction = d3.max(maxXValues) || 0;

  const xScale = d3
    .scaleLinear()
    .domain([0, maxXValueConstruction])
    .range([0, ctx.POCO_WIDTH]);

  const rcc = ctx.renderConfig.construction;

  ctx.groups.constructionGroup
    .selectAll(`.${ctx.classes.cementPad.item}`)
    .remove();

  if (data.cement_pad && data.cement_pad.thickness && ctx.depthFrom === 0) {
    const cementPad = ctx.groups.cementPadGroup
      .selectAll('rect')
      .data([data.cement_pad]);

    cementPad.exit().remove();

    const newCementPad = cementPad
      .enter()
      .append('rect')
      .attr('class', ctx.classes.cementPad.item)
      .attr(
        'x',
        (d: CementPad) =>
          (ctx.POCO_CENTER -
            xScale((d.width * rcc.cementPad.widthMultiplier * 1000) / 2)) /
          2,
      )
      .attr('y', (d: CementPad) => {
        return (
          ctx.yScale(0) -
          ctx.yScale(d.thickness * rcc.cementPad.thicknessMultiplier)
        );
      })
      .attr('width', (d: CementPad) =>
        xScale((d.width * rcc.cementPad.widthMultiplier * 1000) / 2),
      )
      .attr('height', (d: CementPad) => {
        return ctx.yScale(d.thickness * rcc.cementPad.thicknessMultiplier);
      })
      .attr('fill', ctx.textures.pad.url())
      .attr('stroke', ctx.theme.cementPad.stroke)
      .attr('stroke-width', ctx.theme.cementPad.strokeWidth);

    newCementPad
      .on('mouseover', ctx.tooltips.cementPad.show)
      .on('mouseout', ctx.tooltips.cementPad.hide);
  }

  // --- bore_hole ---
  // Key by diameter (identity of the hole segment, not its position).
  // reorderComponentsDepth changes from/to after any mutation, so depth-based
  // keys would prevent smooth UPDATE transitions for unchanged segments.

  const hole = ctx.groups.holeGroup
    .selectAll<SVGRectElement, BoreHole>(`.${ctx.classes.boreHole.rect}`)
    .data(data.bore_hole, stableLayerKey);

  hole.exit().transition(ctx.transition).attr('height', 0).remove();

  const newHole = hole
    .enter()
    .append('rect')
    .attr('class', ctx.classes.boreHole.rect)
    .attr('fill', ctx.theme.boreHole.fill)
    .attr('stroke', ctx.theme.boreHole.stroke)
    .attr('stroke-width', ctx.theme.boreHole.strokeWidth)
    .attr('stroke-dasharray', ctx.theme.boreHole.strokeDasharray)
    .attr('x', (d: BoreHole) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: BoreHole) => xScale(d.diameter))
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('opacity', 0)
    .on('mouseover', ctx.tooltips.hole.show)
    .on('mouseout', ctx.tooltips.hole.hide);

  withTransition(newHole, ctx.transition).attr(
    'opacity',
    ctx.theme.boreHole.opacity,
  );

  // x/width set immediately (diameter unchanged for updates); only y/height animate
  hole
    .attr('x', (d: BoreHole) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: BoreHole) => xScale(d.diameter));
  withTransition(hole, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  // --- surface_case ---

  const surfaceCaseGs = ctx.groups.surfaceCaseGroup
    .selectAll<SVGGElement, SurfaceCase>(`g.${ctx.classes.surfaceCase.rect}`)
    .data(data.surface_case, stableLayerKey);

  surfaceCaseGs.exit().transition(ctx.transition).style('opacity', 0).remove();

  const newSC = surfaceCaseGs
    .enter()
    .append('g')
    .attr('class', ctx.classes.surfaceCase.rect)
    .style('opacity', 0)
    .on('mouseover', ctx.tooltips.surfaceCase.show)
    .on('mouseout', ctx.tooltips.surfaceCase.hide);

  newSC
    .append('rect')
    .attr('class', 'surface-case-fill')
    .attr('stroke', 'none');
  newSC
    .append('line')
    .attr('class', 'surface-case-side')
    .attr('stroke', ctx.theme.surfaceCase.stroke)
    .attr('stroke-width', ctx.theme.surfaceCase.strokeWidth);
  newSC
    .append('line')
    .attr('class', 'surface-case-side')
    .attr('stroke', ctx.theme.surfaceCase.stroke)
    .attr('stroke-width', ctx.theme.surfaceCase.strokeWidth);

  newSC.each((d: SurfaceCase, i, nodes) => {
    const x =
      (ctx.POCO_CENTER -
        xScale(
          d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
        )) /
      2;
    const w = xScale(
      d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
    );
    const g = d3.select(nodes[i] as Element);
    g.select('.surface-case-fill')
      .attr('x', x)
      .attr('width', w)
      .attr('fill', ctx.textures.surface_case.url())
      .attr('y', getYPos(d))
      .attr('height', getHeight(d));
    const sideNodes = g.selectAll('.surface-case-side').nodes();
    d3.select(sideNodes[0] as Element)
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', getYPos(d))
      .attr('y2', getYPos(d) + getHeight(d));
    d3.select(sideNodes[1] as Element)
      .attr('x1', x + w)
      .attr('x2', x + w)
      .attr('y1', getYPos(d))
      .attr('y2', getYPos(d) + getHeight(d));
  });

  withTransition(newSC, ctx.transition).style('opacity', 1);

  surfaceCaseGs.each((d: SurfaceCase, i, nodes) => {
    const x =
      (ctx.POCO_CENTER -
        xScale(
          d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
        )) /
      2;
    const w = xScale(
      d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
    );
    const g = d3.select(nodes[i] as Element);
    g.select('.surface-case-fill')
      .attr('x', x)
      .attr('width', w)
      .attr('fill', ctx.textures.surface_case.url());
    const sideNodes = g.selectAll('.surface-case-side').nodes();
    d3.select(sideNodes[0] as Element)
      .attr('x1', x)
      .attr('x2', x);
    d3.select(sideNodes[1] as Element)
      .attr('x1', x + w)
      .attr('x2', x + w);
  });

  withTransition(
    surfaceCaseGs.select<SVGRectElement>('.surface-case-fill'),
    ctx.transition,
  )
    .attr('y', (d: SurfaceCase) => getYPos(d))
    .attr('height', (d: SurfaceCase) => getHeight(d));

  withTransition(
    surfaceCaseGs.selectAll<SVGLineElement, SurfaceCase>('.surface-case-side'),
    ctx.transition,
  )
    .attr('y1', (d: unknown) => getYPos(d as SurfaceCase))
    .attr(
      'y2',
      (d: unknown) => getYPos(d as SurfaceCase) + getHeight(d as SurfaceCase),
    );

  // --- hole_fill ---

  const holeFill = ctx.groups.holeFillGroup
    .selectAll<SVGRectElement, HoleFill>(`.${ctx.classes.holeFill.rect}`)
    .data(data.hole_fill, stableLayerKey);

  holeFill.exit().transition(ctx.transition).attr('height', 0).remove();

  const newHoleFill = holeFill
    .enter()
    .append('rect')
    .attr('class', ctx.classes.holeFill.rect)
    .attr('stroke', ctx.theme.holeFill.stroke)
    .attr('stroke-width', ctx.theme.holeFill.strokeWidth)
    .attr('x', (d: HoleFill) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: HoleFill) => xScale(d.diameter))
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('fill', (d: HoleFill) => ctx.textures[d.type].url())
    .attr('opacity', 0)
    .on('mouseover', ctx.tooltips.holeFill.show)
    .on('mouseout', ctx.tooltips.holeFill.hide);

  withTransition(newHoleFill, ctx.transition).attr('opacity', 1);

  holeFill
    .attr('x', (d: HoleFill) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: HoleFill) => xScale(d.diameter))
    .attr('fill', (d: HoleFill) => ctx.textures[d.type].url());
  withTransition(holeFill, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  // --- well_case ---

  const wellCase = ctx.groups.wellCaseGroup
    .selectAll<SVGRectElement, WellCase>(`.${ctx.classes.wellCase.rect}`)
    .data(data.well_case, stableLayerKey);

  wellCase.exit().transition(ctx.transition).attr('height', 0).remove();

  const newWellCase = wellCase
    .enter()
    .append('rect')
    .attr('class', ctx.classes.wellCase.rect)
    .attr('fill', ctx.theme.wellCase.fill)
    .attr('stroke', ctx.theme.wellCase.stroke)
    .attr('stroke-width', ctx.theme.wellCase.strokeWidth)
    .attr('x', (d: WellCase) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellCase) => xScale(d.diameter))
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('opacity', 0)
    .on('mouseover', ctx.tooltips.wellCase.show)
    .on('mouseout', ctx.tooltips.wellCase.hide);

  withTransition(newWellCase, ctx.transition).attr('opacity', 1);

  wellCase
    .attr('x', (d: WellCase) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellCase) => xScale(d.diameter));
  withTransition(wellCase, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  // --- well_screen ---

  const wellScreen = ctx.groups.wellScreenGroup
    .selectAll<SVGRectElement, WellScreen>(`.${ctx.classes.wellScreen.rect}`)
    .data(data.well_screen, stableLayerKey);

  wellScreen.exit().transition(ctx.transition).attr('height', 0).remove();

  const newWellScreen = wellScreen
    .enter()
    .append('rect')
    .attr('class', ctx.classes.wellScreen.rect)
    .attr('fill', ctx.textures.well_screen.url())
    .attr('stroke', ctx.theme.wellScreen.stroke)
    .attr('stroke-width', ctx.theme.wellScreen.strokeWidth)
    .attr('x', (d: WellScreen) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellScreen) => xScale(d.diameter))
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('opacity', 0)
    .on('mouseover', ctx.tooltips.wellScreen.show)
    .on('mouseout', ctx.tooltips.wellScreen.hide);

  withTransition(newWellScreen, ctx.transition).attr('opacity', 1);

  wellScreen
    .attr('x', (d: WellScreen) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellScreen) => xScale(d.diameter));
  withTransition(wellScreen, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  // --- conflict zones ---
  // Conflicts are derived data (not directly edited), so depth-based keys are fine here.

  const conflictAreas: Conflict[] = [];
  conflictAreas.push(...getConflictAreas(data.well_case, data.well_screen));
  conflictAreas.push(...getConflictAreas(data.well_screen, data.well_case));

  const mergedConflicts = mergeConflicts(conflictAreas, 1);

  const conflict = ctx.groups.conflictGroup
    .selectAll<SVGRectElement, Conflict>(`.${ctx.classes.conflict.rect}`)
    .data(mergedConflicts, (d: Conflict) => `${d.from}_${d.to}_${d.diameter}`);

  conflict.exit().transition(ctx.transition).attr('height', 0).remove();

  const newConflict = conflict
    .enter()
    .append('rect')
    .attr('class', ctx.classes.conflict.rect)
    .attr('fill', ctx.textures.conflict.url())
    .attr('stroke', ctx.theme.conflict.stroke)
    .attr('stroke-width', ctx.theme.conflict.strokeWidth)
    .attr('x', (d: Conflict) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: Conflict) => xScale(d.diameter))
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('opacity', 0)
    .on('mouseover', ctx.tooltips.conflict.show)
    .on('mouseout', ctx.tooltips.conflict.hide);

  withTransition(newConflict, ctx.transition).attr('opacity', 1);

  conflict
    .attr('x', (d: Conflict) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: Conflict) => xScale(d.diameter));
  withTransition(conflict, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);
}
