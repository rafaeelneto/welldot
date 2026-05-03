import { Lithology } from '@welldot/core';
import { DrawContext } from '~/types/render.types';

/**
 * Renders geologic_unit and aquifer_unit strip labels to the left of the
 * lithology column.
 *
 * Adjacent layers sharing the same unit value are merged into a single strip
 * segment. Each segment is drawn as a filled rect with divider lines at its
 * top and bottom edges; a rotated text label is added when the segment is tall
 * enough. Returns early if the feature is disabled via
 * `ctx.renderConfig.unitLabels.active` or if `data` is empty.
 */
export function drawUnitLabels(ctx: DrawContext, data: Lithology[]): void {
  if (!ctx.renderConfig.unitLabels.active || !data.length) return;

  const {
    groups: { unitLabelsGroup },
    depthFrom,
    depthTo,
    yScale,
    renderConfig,
    theme,
    classes,
  } = ctx;

  unitLabelsGroup.selectAll('*').remove();

  const ru = renderConfig.unitLabels;
  const rut = theme.unitLabels;
  const sw = ru.stripWidth;

  const groupByField = (field: 'geologic_unit' | 'aquifer_unit') => {
    const groups: { unit: string; from: number; to: number }[] = [];
    for (const layer of data) {
      const unit = layer[field];
      if (!unit) continue;
      const from = Math.max(layer.from, depthFrom);
      const to = Math.min(layer.to, depthTo);
      if (from >= to) continue;
      const last = groups[groups.length - 1];
      if (last && last.unit === unit) {
        last.to = to;
      } else groups.push({ unit, from, to });
    }
    return groups;
  };

  const hasGeo = data.some(d => d.geologic_unit);
  const hasAq = data.some(d => d.aquifer_unit);

  // Strips start at ru.xOffset (geologic group coordinates).
  // When both exist: geo at xOffset, aq at xOffset + stripWidth + 1.
  const geoX = ru.xOffset;
  const aqX = hasGeo && hasAq ? ru.xOffset + sw + 1 : ru.xOffset;

  const drawStrip = (
    groups: { unit: string; from: number; to: number }[],
    stripX: number,
    rectClass: string,
    fillColor: string,
  ) => {
    groups.forEach((group, idx) => {
      const yTop = yScale(group.from);
      const yBot = yScale(group.to);
      const height = yBot - yTop;
      if (height < 1) return;

      const isFirst = idx === 0;
      const isLast = idx === groups.length - 1;

      unitLabelsGroup
        .append('rect')
        .attr('class', rectClass)
        .attr('x', stripX)
        .attr('y', yTop)
        .attr('width', sw)
        .attr('height', height)
        .attr('fill', fillColor)
        .attr('stroke', rut.stroke)
        .attr('stroke-width', rut.strokeWidth);

      const appendEdge = (y: number, strokeWidth: number) =>
        unitLabelsGroup
          .append('line')
          .attr('class', 'unit-divider-line')
          .attr('x1', stripX)
          .attr('x2', stripX + sw)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', rut.stroke)
          .attr('stroke-width', strokeWidth);

      appendEdge(yTop, isFirst ? ru.outerEdgeWidth : ru.innerDividerWidth);
      appendEdge(yBot, isLast ? ru.outerEdgeWidth : ru.innerDividerWidth);

      if (height >= ru.minHeightForText) {
        const maxChars = Math.floor(height / (rut.fontSize * 0.55));
        const label =
          group.unit.length > maxChars
            ? `${group.unit.slice(0, maxChars - 1)}…`
            : group.unit;

        unitLabelsGroup
          .append('text')
          .attr('class', classes.unitLabels.text)
          .attr(
            'transform',
            `translate(${(stripX + sw / 2).toFixed(1)},${((yTop + yBot) / 2).toFixed(1)}) rotate(-90)`,
          )
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', rut.fontSize)
          .attr('font-family', rut.fontFamily ?? 'sans-serif')
          .attr('font-weight', rut.fontWeight ?? 400)
          .attr('fill', rut.stroke)
          .text(label);
      }
    });
  };

  if (hasGeo)
    drawStrip(
      groupByField('geologic_unit'),
      geoX,
      classes.unitLabels.geoRect,
      rut.geologicFill,
    );
  if (hasAq)
    drawStrip(
      groupByField('aquifer_unit'),
      aqX,
      classes.unitLabels.aqRect,
      rut.aquiferFill,
    );
}
