import textures from 'textures';

import { formatNumber } from '@welldot/utils';

import type { DrawContext, SvgSelection } from '~/types/render.types';
import { getLengthUnit } from '~/utils/format.utils';
import { formatOverlapLabel } from '~/utils/layout.utils';
import { hasDescriptionColumn } from './column-headers.renderer';

/**
 * Hatches the band `[depthFrom, repeatedTo]` a panel repeats from the
 * previous one, from the axis to the description column, with a dashed
 * rule at its bottom and `renderConfig.overlap.label` at its top right.
 * No-op when the panel has no `repeatedTo`.
 */
export function drawOverlap(ctx: DrawContext): void {
  const group = ctx.groups.overlapGroup;
  group.selectAll('*').remove();

  const { repeatedTo, depthFrom } = ctx;
  if (repeatedTo == null || repeatedTo <= depthFrom) return;

  const theme = ctx.theme.overlap;
  const { margins } = ctx.state;
  const overview = ctx.renderConfig.overview;
  const showsDescription = hasDescriptionColumn(ctx);

  const x0 =
    -margins.left + (overview.active ? overview.x + overview.width + 4 : 0);
  const x1 = showsDescription
    ? ctx.geoXRight + ctx.renderConfig.labels.descriptionXOffset - 4
    : ctx.svgWidth - margins.left;
  const y0 = ctx.yScale(depthFrom);
  const y1 = ctx.yScale(repeatedTo);

  const hatch = textures
    .lines()
    .size(theme.size)
    .strokeWidth(theme.strokeWidth)
    .stroke(theme.stroke);
  ctx.svg.call(hatch as unknown as (selection: SvgSelection) => void);

  group
    .append('rect')
    .attr('class', ctx.classes.overlap.band)
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', Math.max(0, x1 - x0))
    .attr('height', Math.max(0, y1 - y0))
    .attr('fill', hatch.url())
    .style('pointer-events', 'none');

  group
    .append('line')
    .attr('x1', x0)
    .attr('x2', ctx.svgWidth - margins.left)
    .attr('y1', y1)
    .attr('y2', y1)
    .attr('stroke', theme.ruleStroke)
    .attr('stroke-width', 0.6)
    .attr('stroke-dasharray', '3, 2');

  // Whole units: the band's edges fall wherever the page ends, so decimals
  // would only add noise.
  const whole = (m: number) =>
    formatNumber(ctx.units.length === 'ft' ? m * 3.28084 : m, {
      maximumFractionDigits: 0,
      locale: ctx.locale,
    });
  const unit = getLengthUnit(ctx.units.length);
  const range = `${whole(depthFrom)}–${whole(repeatedTo)} ${unit}`;
  group
    .append('text')
    .attr('class', ctx.classes.overlap.label)
    .attr('x', ctx.svgWidth - margins.left - 2)
    .attr('y', y0 + theme.fontSize + 1)
    .attr('text-anchor', 'end')
    .attr('font-size', theme.fontSize)
    .attr('font-family', theme.fontFamily ?? 'monospace')
    .attr('fill', theme.labelColor)
    .text(formatOverlapLabel(ctx.renderConfig.overlap.label, range));
}
