import { Lithology } from '@welldot/core';
import { DrawContext } from '~/types/render.types';
import { stableLayerKey, withTransition } from '~/utils/d3.utils';
import { getLithologyFill, getYAxisFunctions } from '~/utils/render.utils';

export function drawLithology(ctx: DrawContext, data: Lithology[]): void {
  if (!data.length) return;

  const {
    groups: { lithologyGroup },
    svg,
    geoXLeft,
    geoXRight,
    depthFrom,
    depthTo,
    yScale,
    theme,
    classes,
    tooltips,
    transition,
  } = ctx;

  const { getHeight, getYPos } = getYAxisFunctions(yScale, {
    from: depthFrom,
    to: depthTo,
  });

  // Precompute fill before data join so it is available for both enter and update.
  const fillFn = getLithologyFill(data, svg, ctx.theme.lithologyTexture);

  // Key by content (not depth) so layers keep their DOM identity when depths are
  // reordered after an add/delete — depth values change, rock type identity does not.
  const rects = lithologyGroup
    .selectAll<SVGRectElement, Lithology>(`.${classes.lithology.rect}`)
    .data(data, stableLayerKey);

  // EXIT: collapse in place, then remove
  rects.exit().transition(transition).attr('height', 0).remove();

  // ENTER: position and fill set immediately; fade in via opacity only
  const newLayers = rects
    .enter()
    .append('rect')
    .attr('class', classes.lithology.rect)
    .attr('x', geoXLeft)
    .attr('width', geoXRight - geoXLeft)
    .attr('stroke', theme.lithology.stroke)
    .attr('stroke-width', theme.lithology.strokeWidth)
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('fill', fillFn)
    .attr('opacity', 0)
    .on('mouseover', tooltips.geology.show)
    .on('mouseout', tooltips.geology.hide);

  withTransition(newLayers, transition).attr('opacity', 1);

  // UPDATE: fill set immediately (avoids string interpolation glitch); animate y and height
  rects.attr('fill', fillFn);
  withTransition(rects, transition)
    .attr('y', getYPos)
    .attr('height', getHeight);
}
