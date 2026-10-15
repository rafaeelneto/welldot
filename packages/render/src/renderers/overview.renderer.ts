import type { Lithology } from '@welldot/core';
import type { DrawContext } from '~/types/render.types';
import { getOverviewGeometry } from '~/utils/layout.utils';

/**
 * Draws the mini-map: the whole well's lithology as a thin column at
 * `overview.x` (in the left margin), colored by each layer's `color`, with
 * a window outlining the panel's `[depthFrom, depthTo]`. `lithology` is the
 * full, unfiltered list. No-op unless `renderConfig.overview.active`.
 */
export function drawOverview(ctx: DrawContext, lithology: Lithology[]): void {
  const group = ctx.groups.overviewGroup;
  group.selectAll('*').remove();

  const cfg = ctx.renderConfig.overview;
  if (!cfg.active || lithology.length === 0 || ctx.totalDepth <= 0) return;

  const theme = ctx.theme.overview;
  const height = Math.min(cfg.height, ctx.state.height);
  const { y, window } = getOverviewGeometry(
    ctx.totalDepth,
    height,
    ctx.depthFrom,
    ctx.depthTo,
  );

  lithology.forEach(layer => {
    group
      .append('rect')
      .attr('class', ctx.classes.overview.item)
      .attr('x', cfg.x)
      .attr('y', y(layer.from))
      .attr('width', cfg.width)
      .attr('height', Math.max(0, y(layer.to) - y(layer.from)))
      .attr('fill', layer.color || theme.emptyFill);
  });

  group
    .append('rect')
    .attr('x', cfg.x)
    .attr('y', 0)
    .attr('width', cfg.width)
    .attr('height', y(ctx.totalDepth))
    .attr('fill', 'none')
    .attr('stroke', theme.stroke)
    .attr('stroke-width', theme.strokeWidth);

  group
    .append('rect')
    .attr('class', ctx.classes.overview.window)
    .attr('x', cfg.x - 2)
    .attr('y', window.y)
    .attr('width', cfg.width + 4)
    .attr('height', window.height)
    .attr('fill', 'none')
    .attr('stroke', theme.windowStroke)
    .attr('stroke-width', theme.windowStrokeWidth);
}
