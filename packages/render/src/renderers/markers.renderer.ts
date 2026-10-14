import type { Fracture, Lithology } from '@welldot/core';
import type { DrawContext } from '~/types/render.types';
import { getFractureMarkers, getLithologyMarkers } from '~/utils/layout.utils';

/**
 * Draws a circled 1-based index on each lithology layer (at the top of its
 * visible part, so it repeats on every panel the layer crosses) and an
 * `F{n}` tag right of each fracture. Numbers follow the order of the full,
 * unfiltered lists passed in. No-op unless `renderConfig.markers` enables
 * either kind.
 */
export function drawMarkers(
  ctx: DrawContext,
  data: { lithology: Lithology[]; fractures: Fracture[] },
): void {
  const group = ctx.groups.markersGroup;
  group.selectAll('*').remove();

  const cfg = ctx.renderConfig.markers;
  const theme = ctx.theme.markers;
  const r = cfg.radius;

  if (cfg.lithology) {
    const cx = (ctx.geoXLeft + ctx.geoXRight) / 2;
    getLithologyMarkers(data.lithology, ctx.depthFrom, ctx.depthTo).forEach(
      marker => {
        const top = ctx.yScale(marker.from);
        const bottom = ctx.yScale(marker.to);
        if (bottom - top < r) return;
        const cy = bottom - top >= 2 * r + 4 ? top + r + 2 : (top + bottom) / 2;

        const g = group
          .append('g')
          .attr('class', ctx.classes.markers.lithology);
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', theme.fill)
          .attr('stroke', theme.stroke)
          .attr('stroke-width', theme.strokeWidth);
        g.append('text')
          .attr('x', cx)
          .attr('y', cy)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', theme.fontSize)
          .attr('font-family', theme.fontFamily ?? 'sans-serif')
          .attr('font-weight', theme.fontWeight ?? 600)
          .attr('fill', theme.color)
          .text(String(marker.index));
      },
    );
  }

  if (cfg.fractures) {
    const x =
      ctx.pocoCenterX +
      (ctx.POCO_WIDTH * ctx.renderConfig.fractures.widthMultiplier) / 2 +
      3;
    getFractureMarkers(data.fractures, ctx.depthFrom, ctx.depthTo).forEach(
      marker => {
        group
          .append('text')
          .attr('class', ctx.classes.markers.fracture)
          .attr('x', x)
          .attr('y', ctx.yScale(marker.depth))
          .attr('dominant-baseline', 'central')
          .attr('font-size', theme.fontSize)
          .attr('font-family', theme.fontFamily ?? 'sans-serif')
          .attr('font-weight', theme.fontWeight ?? 600)
          .attr('fill', theme.color)
          .text(marker.label);
      },
    );
  }
}
