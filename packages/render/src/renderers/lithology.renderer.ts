import * as d3 from 'd3';

import { Lithology } from '@welldot/core';
import { DrawContext, SvgSelection, WellTheme } from '~/types/render.types';
import { mergeEnter, withTransition } from '~/utils/d3.utils';
import { makeIntervalKey } from '~/utils/key.utils';
import { getLithologyFill, getYAxisFunctions } from '~/utils/render.utils';

/**
 * Renders lithology rects with FGDC texture fills.
 *
 * Each lithology layer is drawn as a rect spanning `geoXLeft` to `geoXRight`
 * at the depth position determined by `ctx.yScale`. Fill textures are resolved
 * via `getLithologyFill` using the FGDC texture config. An empty `data`
 * removes the layers already drawn.
 */
export function drawLithology(ctx: DrawContext, data: Lithology[]): void {
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
    .data(data, makeIntervalKey('lithology'));

  rects.exit().transition(transition).attr('height', 0).remove();

  const newLayers = rects
    .enter()
    .append('rect')
    .attr('class', classes.lithology.rect)
    .attr('x', geoXLeft)
    .attr('width', geoXRight - geoXLeft)
    .attr('stroke', theme.lithology.stroke)
    .attr('stroke-width', theme.lithology.strokeWidth)
    .on('mouseover', tooltips.geology.show)
    .on('mouseout', tooltips.geology.hide)
    .attr('y', getYPos)
    .attr('height', 0);

  const merged = mergeEnter(newLayers, rects);
  withTransition(merged, transition)
    .attr('y', getYPos)
    .attr('height', getHeight)
    .attr('fill', getLithologyFill(data, svg, ctx.theme.lithologyTexture));
}

/**
 * Draws one lithology layer's fill (texture over its `color`) as a
 * `size`×`size` square into its own `<svg>` matched by `selector`, with the
 * texture pattern defined inside so the markup renders standalone. FGDC
 * textures must already be loaded (`WellRenderer.prepareSvg`).
 */
export function drawLithologySwatch(
  selector: string,
  layer: Lithology,
  options: { size: number; theme: WellTheme },
): void {
  const { size, theme } = options;
  const svg = d3.select(selector) as SvgSelection;
  svg.selectAll('*').remove();
  svg.attr('width', size).attr('height', size);

  const fill = getLithologyFill([layer], svg, {
    ...theme.lithologyTexture,
    // Denser pattern so a few strokes show inside the small square.
    size: Math.max(12, size * 3),
  });
  svg
    .append('rect')
    .attr('x', 0.5)
    .attr('y', 0.5)
    .attr('width', size - 1)
    .attr('height', size - 1)
    .attr('fill', fill(layer))
    .attr('stroke', theme.lithology.stroke)
    .attr('stroke-width', 0.5);
}
