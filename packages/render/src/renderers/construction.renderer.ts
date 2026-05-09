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
import { mergeEnter, withTransition } from '~/utils/d3.utils';
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

  const hole = ctx.groups.holeGroup
    .selectAll(`.${ctx.classes.boreHole.rect}`)
    .data(data.bore_hole);

  hole.exit().remove();

  const newHole = hole
    .enter()
    .append('rect')
    .attr('class', ctx.classes.boreHole.rect)
    .attr('fill', ctx.theme.boreHole.fill)
    .attr('stroke', ctx.theme.boreHole.stroke)
    .attr('opacity', ctx.theme.boreHole.opacity)
    .attr('stroke-width', ctx.theme.boreHole.strokeWidth)
    .attr('stroke-dasharray', ctx.theme.boreHole.strokeDasharray)
    .on('mouseover', ctx.tooltips.hole.show)
    .on('mouseout', ctx.tooltips.hole.hide);

  const mergedHole = mergeEnter(newHole, hole)
    .attr('x', (d: BoreHole) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: BoreHole) => xScale(d.diameter));
  withTransition(mergedHole, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  const surfaceCaseGs = ctx.groups.surfaceCaseGroup
    .selectAll(`g.${ctx.classes.surfaceCase.rect}`)
    .data(data.surface_case);

  surfaceCaseGs.exit().transition(ctx.transition).style('opacity', 0).remove();

  const newSC = surfaceCaseGs
    .enter()
    .append('g')
    .attr('class', ctx.classes.surfaceCase.rect)
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

  const mergedSC = mergeEnter(newSC, surfaceCaseGs);

  mergedSC.each((d: SurfaceCase, i, nodes) => {
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
    mergedSC.select<SVGRectElement>('.surface-case-fill'),
    ctx.transition,
  )
    .attr('y', (d: SurfaceCase) => getYPos(d))
    .attr('height', (d: SurfaceCase) => getHeight(d));

  mergedSC
    .selectAll('.surface-case-side')
    .attr('y1', (d: unknown) => getYPos(d as SurfaceCase))
    .attr(
      'y2',
      (d: unknown) => getYPos(d as SurfaceCase) + getHeight(d as SurfaceCase),
    );

  const holeFill = ctx.groups.holeFillGroup
    .selectAll(`.${ctx.classes.holeFill.rect}`)
    .data(data.hole_fill);

  holeFill.exit().remove();

  const newHoleFill = holeFill
    .enter()
    .append('rect')
    .attr('class', ctx.classes.holeFill.rect)
    .attr('stroke', ctx.theme.holeFill.stroke)
    .attr('stroke-width', ctx.theme.holeFill.strokeWidth)
    .on('mouseover', ctx.tooltips.holeFill.show)
    .on('mouseout', ctx.tooltips.holeFill.hide);

  const mergedHoleFill = mergeEnter(newHoleFill, holeFill)
    .attr('x', (d: HoleFill) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: HoleFill) => xScale(d.diameter));
  withTransition(mergedHoleFill, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('fill', (d: HoleFill) => ctx.textures[d.type].url());

  const wellCase = ctx.groups.wellCaseGroup
    .selectAll(`.${ctx.classes.wellCase.rect}`)
    .data(data.well_case);

  wellCase.exit().remove();

  const newWellCase = wellCase
    .enter()
    .append('rect')
    .attr('class', ctx.classes.wellCase.rect)
    .attr('fill', ctx.theme.wellCase.fill)
    .attr('stroke', ctx.theme.wellCase.stroke)
    .attr('stroke-width', ctx.theme.wellCase.strokeWidth)
    .on('mouseover', ctx.tooltips.wellCase.show)
    .on('mouseout', ctx.tooltips.wellCase.hide);

  const mergedWellCase = mergeEnter(newWellCase, wellCase)
    .attr('x', (d: WellCase) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellCase) => xScale(d.diameter));
  withTransition(mergedWellCase, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  const wellScreen = ctx.groups.wellScreenGroup
    .selectAll(`.${ctx.classes.wellScreen.rect}`)
    .data(data.well_screen);

  wellScreen.exit().remove();

  const newWellScreen = wellScreen
    .enter()
    .append('rect')
    .attr('class', ctx.classes.wellScreen.rect)
    .attr('fill', ctx.textures.well_screen.url())
    .attr('stroke', ctx.theme.wellScreen.stroke)
    .attr('stroke-width', ctx.theme.wellScreen.strokeWidth)
    .on('mouseover', ctx.tooltips.wellScreen.show)
    .on('mouseout', ctx.tooltips.wellScreen.hide);

  const mergedWellScreen = mergeEnter(newWellScreen, wellScreen)
    .attr('x', (d: WellScreen) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: WellScreen) => xScale(d.diameter));
  withTransition(mergedWellScreen, ctx.transition)
    .attr('y', getYPos)
    .attr('height', getHeight);

  const conflictAreas: Conflict[] = [];
  conflictAreas.push(...getConflictAreas(data.well_case, data.well_screen));
  conflictAreas.push(...getConflictAreas(data.well_screen, data.well_case));

  const mergedConflicts = mergeConflicts(conflictAreas, 1);

  const conflict = ctx.groups.conflictGroup
    .selectAll(`.${ctx.classes.conflict.rect}`)
    .data(mergedConflicts);

  conflict.exit().remove();

  const newConflict = conflict
    .enter()
    .append('rect')
    .attr('class', ctx.classes.conflict.rect)
    .attr('fill', ctx.textures.conflict.url())
    .attr('stroke', ctx.theme.conflict.stroke)
    .attr('stroke-width', ctx.theme.conflict.strokeWidth)
    .on('mouseover', ctx.tooltips.conflict.show)
    .on('mouseout', ctx.tooltips.conflict.hide);

  const mergedConflict = mergeEnter(newConflict, conflict)
    .attr('x', (d: Conflict) => (ctx.POCO_CENTER - xScale(d.diameter)) / 2)
    .attr('width', (d: Conflict) => xScale(d.diameter));
  withTransition(mergedConflict, ctx.transition)
    .attr('y', ctx.yScale(0))
    .attr('height', getHeight);
}
