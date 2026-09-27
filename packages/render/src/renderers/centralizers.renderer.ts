import * as d3 from 'd3';

import type { Centralizer, Constructive } from '@welldot/core';
import { getCentralizerDepths, getProfileDiamValues } from '@welldot/utils';
import type { DrawContext } from '~/types/render.types';

/** A single centralizer position, carrying its source entry for tooltips. */
export type CentralizerMarker = Centralizer & { depth: number };

type Interval = { from: number; to: number; diameter: number };

/** Diameter of the first interval covering `depth`, or `undefined`. */
function diameterAt(items: Interval[], depth: number): number | undefined {
  return items.find(i => depth >= i.from && depth <= i.to)?.diameter;
}

/**
 * Renders centralizers as bow-shaped markers on both sides of the casing or
 * screen string, spanning the annulus up to the centralizer's outer diameter
 * (or the borehole wall when `diameter` is absent). Positions are derived by
 * `getCentralizerDepths`. Safe to call on every zoom event — markers are
 * joined by depth and repositioned without transitions.
 */
export function drawCentralizers(ctx: DrawContext, data: Constructive): void {
  const group = ctx.groups.centralizerGroup;
  const cls = ctx.classes.centralizer;

  const maxXValue = d3.max(getProfileDiamValues(ctx.constructionData)) || 0;
  const xScale = d3
    .scaleLinear()
    .domain([0, maxXValue])
    .range([0, ctx.POCO_WIDTH]);

  // Pipe and borehole diameters come from the full profile so a marker near a
  // panel boundary still finds the interval it sits in.
  const pipes: Interval[] = [
    ...ctx.constructionData.well_case,
    ...ctx.constructionData.well_screen,
  ];
  const holes: Interval[] = ctx.constructionData.bore_hole;

  const markers: CentralizerMarker[] = (data.centralizers ?? []).flatMap(c =>
    getCentralizerDepths(c)
      // exclusive upper bound: depthTo is the start of the next panel
      .filter(depth => depth >= ctx.depthFrom && depth < ctx.depthTo)
      .map(depth => ({ ...c, depth })),
  );

  const halfH = ctx.renderConfig.construction.centralizer.markerHalfHeight;

  const bowPoints = (m: CentralizerMarker, side: -1 | 1): string => {
    const outerD = m.diameter ?? diameterAt(holes, m.depth) ?? maxXValue;
    const pipeD = diameterAt(pipes, m.depth) ?? outerD * 0.75;
    const pipeX = (ctx.POCO_CENTER + side * xScale(pipeD)) / 2;
    const outerX = (ctx.POCO_CENTER + side * xScale(outerD)) / 2;
    const y = ctx.yScale(m.depth);
    return `${pipeX},${y - halfH} ${outerX},${y} ${pipeX},${y + halfH}`;
  };

  const selection = group
    .selectAll<SVGGElement, CentralizerMarker>(`g.${cls.item}`)
    .data(markers, d => `${d.from}:${d.to}:${d.depth}`);

  selection.exit().remove();

  const entered = selection
    .enter()
    .append('g')
    .attr('class', cls.item)
    .on('mouseover', ctx.tooltips.centralizer.show)
    .on('mouseout', ctx.tooltips.centralizer.hide);

  entered.append('polyline').attr('class', `${cls.item}-left`);
  entered.append('polyline').attr('class', `${cls.item}-right`);

  const merged = entered.merge(selection);

  merged
    .selectAll<SVGPolylineElement, CentralizerMarker>('polyline')
    .attr('fill', ctx.theme.centralizer.fill)
    .attr('stroke', ctx.theme.centralizer.stroke)
    .attr('stroke-width', ctx.theme.centralizer.strokeWidth)
    .attr('stroke-linejoin', 'round');

  merged.each((d, i, nodes) => {
    const g = d3.select(nodes[i]);
    g.select(`.${cls.item}-left`).attr('points', bowPoints(d, -1));
    g.select(`.${cls.item}-right`).attr('points', bowPoints(d, 1));
  });
}
