import * as d3 from 'd3';

import type { Constructive, WellCase, WellScreen } from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { DrawContext } from '~/types/render.types';
import { formatDiameter, getDiameterUnit } from '~/utils/format.utils';
import { wrapText } from '~/utils/render.utils';

/**
 * Renders dimension labels for well cases and screens.
 * Text is word-wrapped if labelMaxWidth is set.
 * An occupancy list prevents overlap between adjacent labels.
 */
export function drawConstructionLabels(
  ctx: DrawContext,
  data: { well_case: WellCase[]; well_screen: WellScreen[] },
): void {
  if (!ctx.renderConfig.constructionLabels.active) return;

  ctx.groups.constructionLabelsGroup.selectAll('*').remove();

  const clc = ctx.renderConfig.constructionLabels;
  const clct = ctx.theme.constructionLabels;
  const fmtD = (mm: number) => formatDiameter(mm, ctx.units.diameter);
  const dUnit = getDiameterUnit(ctx.units.diameter);

  const maxXValues = getProfileDiamValues(ctx.constructionData);
  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(maxXValues) || 0])
    .range([0, ctx.POCO_WIDTH]);

  const occupied: { top: number; bot: number }[] = [];

  const placeLabel = (d: WellCase | WellScreen, text: string) => {
    const clampedFrom = Math.max(d.from, ctx.depthFrom);
    const clampedTo = Math.min(d.to, ctx.depthTo);
    if (clampedFrom >= clampedTo) return;

    const midY = ctx.yScale((clampedFrom + clampedTo) / 2);
    const leftEdgeX = (ctx.POCO_CENTER - xScale(d.diameter)) / 2;
    const labelRightX = leftEdgeX - clc.xOffset;
    const charW = clct.fontSize * 0.52;
    const lineH = clct.fontSize * 1.35;
    const vertPad = 6;

    let lines: string[];
    let boxW: number;
    if (clc.labelMaxWidth !== undefined) {
      const maxChars = Math.max(
        1,
        Math.floor((clc.labelMaxWidth! - 8) / charW),
      );
      lines = wrapText(text, maxChars);
      boxW = clc.labelMaxWidth;
    } else {
      lines = [text];
      boxW = text.length * charW + 8;
    }

    const labelH = lines.length * lineH + vertPad;
    let labelY = midY - labelH / 2;

    for (const pos of occupied) {
      if (labelY < pos.bot && labelY + labelH > pos.top)
        labelY = pos.bot + 2;
    }
    occupied.push({ top: labelY, bot: labelY + labelH });

    ctx.groups.constructionLabelsGroup
      .append('rect')
      .attr('x', labelRightX - boxW)
      .attr('y', labelY)
      .attr('width', boxW)
      .attr('height', labelH)
      .attr('rx', clc.labelRadius)
      .attr('fill', clct.labelFill ?? 'white')
      .attr('stroke', clct.labelColor ?? '#303030')
      .attr('stroke-width', 0.5);

    const textEl = ctx.groups.constructionLabelsGroup
      .append('text')
      .attr('x', labelRightX - 4)
      .attr('y', labelY + lineH * 0.85)
      .attr('font-size', clct.fontSize)
      .attr('font-family', clct.fontFamily ?? 'sans-serif')
      .attr('font-weight', clct.fontWeight ?? 400)
      .attr('text-anchor', 'end')
      .attr('fill', clct.labelColor ?? '#303030');

    lines.forEach((line, i) => {
      textEl
        .append('tspan')
        .attr('x', labelRightX - 4)
        .attr('dy', i === 0 ? 0 : lineH)
        .text(line);
    });
  };

  let lastDiam = 0;
  data.well_case
    .filter(item => {
      if (item.diameter !== lastDiam) {
        lastDiam = item.diameter;
        return true;
      }
      return false;
    })
    .forEach(d =>
      placeLabel(
        d,
        `${clc.labels.wellCasePrefix} ${fmtD(d.diameter)}${dUnit} ${d.type}`,
      ),
    );

  lastDiam = 0;
  data.well_screen
    .filter(item => {
      if (item.diameter !== lastDiam) {
        lastDiam = item.diameter;
        return true;
      }
      return false;
    })
    .forEach((d: WellScreen) =>
      placeLabel(
        d,
        `${clc.labels.wellScreenPrefix} ${fmtD(d.diameter)}${dUnit} ${d.type} ${clc.labels.wellScreenSlotPrefix} ${fmtD((d as WellScreen).screen_slot_mm)}${dUnit}`,
      ),
    );
}
