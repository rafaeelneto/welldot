import { Lithology } from '@welldot/core';
import { DrawContext } from '~/types/render.types';
import { getLithologyFill, getYAxisFunctions } from '~/utils/render.utils';

/**
 * Renders lithology rects with FGDC texture fills.
 *
 * Each lithology layer is drawn as a rect spanning `geoXLeft` to `geoXRight`
 * at the depth position determined by `ctx.yScale`. Fill textures are resolved
 * via `getLithologyFill` using the FGDC texture config. Returns early if
 * `data` is empty.
 */
export async function drawLithology(
  ctx: DrawContext,
  data: Lithology[],
): Promise<void> {
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

  const rects = lithologyGroup
    .selectAll(`.${classes.lithology.rect}`)
    .data(data);

  rects.exit().remove();

  const newLayers = rects
    .enter()
    .append('rect')
    .attr('class', classes.lithology.rect)
    .attr('x', geoXLeft)
    .attr('width', geoXRight - geoXLeft)
    .attr('stroke', theme.lithology.stroke)
    .attr('stroke-width', theme.lithology.strokeWidth)
    .on('mouseover', tooltips.geology.show)
    .on('mouseout', tooltips.geology.hide);

  newLayers
    // @ts-ignore
    .merge(rects)
    .attr('y', getYPos)
    // @ts-ignore
    .transition(transition)
    .attr('height', getHeight)
    .attr('fill', getLithologyFill(data, svg, ctx.theme.lithologyTexture));
}
