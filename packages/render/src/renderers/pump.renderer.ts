import * as d3 from 'd3';

import type { PumpInstallation } from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { DrawContext } from '~/types/render.types';

type Interval = { from: number; to: number; diameter: number };

/** Diameter of the first interval covering `depth`, or `undefined`. */
function diameterAt(items: Interval[], depth: number): number | undefined {
  return items.find(i => depth >= i.from && depth <= i.to)?.diameter;
}

/**
 * Renders the current pump (`.well` v2.3 `pump_installations`) as a body
 * ending at `intake_depth`, hung from a riser pipe that runs from the
 * surface. The riser uses `riser_diameter` when present, otherwise a fraction
 * of the casing diameter. Pass `undefined` to clear the layer.
 *
 * Paths only (no `rect`), so the generic rect rescale on zoom never touches
 * it; safe to call on every zoom event — geometry is recomputed from
 * `ctx.yScale` without transitions. The body keeps a constant pixel height.
 */
export function drawPump(
  ctx: DrawContext,
  pump: PumpInstallation | undefined,
): void {
  const group = ctx.groups.pumpGroup;
  const cls = ctx.classes.pump;
  const cfg = ctx.renderConfig.construction.pump;
  const theme = ctx.theme.pump;

  const intake = pump?.intake_depth;
  const visible =
    !!pump &&
    cfg.active &&
    intake !== undefined &&
    intake > 0 &&
    // the riser crosses this panel when the panel starts above the intake
    ctx.depthFrom < intake;

  const data = visible ? [pump] : [];

  const selection = group
    .selectAll<SVGGElement, PumpInstallation>(`g.${cls.item}`)
    .data(data, d => d.id);

  selection.exit().remove();
  if (!visible) return;

  const maxXValue = d3.max(getProfileDiamValues(ctx.constructionData)) || 0;
  const xScale = d3
    .scaleLinear()
    .domain([0, maxXValue])
    .range([0, ctx.POCO_WIDTH]);

  const pipes: Interval[] = [
    ...ctx.constructionData.well_case,
    ...ctx.constructionData.well_screen,
  ];
  const casingD =
    diameterAt(pipes, intake) ??
    diameterAt(ctx.constructionData.bore_hole, intake) ??
    maxXValue;

  const riserD = pump.riser_diameter ?? casingD * cfg.riserWidthRatio;
  const bodyD = Math.max(casingD * cfg.bodyWidthRatio, riserD * 1.4);

  const riserLeft = (ctx.POCO_CENTER - xScale(riserD)) / 2;
  const riserRight = (ctx.POCO_CENTER + xScale(riserD)) / 2;
  const bodyLeft = (ctx.POCO_CENTER - xScale(bodyD)) / 2;
  const bodyRight = (ctx.POCO_CENTER + xScale(bodyD)) / 2;

  const yIntake = ctx.yScale(intake);
  const yBodyTop = yIntake - cfg.bodyHeight;
  const yRiserTop = ctx.yScale(Math.max(0, ctx.depthFrom));
  const yRiserBottom = Math.max(yRiserTop, yBodyTop);
  const r = Math.min(3, (bodyRight - bodyLeft) / 4);

  const entered = selection
    .enter()
    .append('g')
    .attr('class', cls.item)
    .on('mouseover', ctx.tooltips.pump.show)
    .on('mouseout', ctx.tooltips.pump.hide);

  entered.append('path').attr('class', `${cls.item}-riser`);
  entered.append('path').attr('class', `${cls.item}-body`);
  entered.append('path').attr('class', `${cls.item}-intake`);

  const merged = entered.merge(selection);

  merged
    .select(`.${cls.item}-riser`)
    .attr(
      'd',
      `M${riserLeft},${yRiserTop}V${yRiserBottom}M${riserRight},${yRiserTop}V${yRiserBottom}`,
    )
    .attr('fill', 'none')
    .attr('stroke', theme.riserStroke)
    .attr('stroke-width', theme.riserStrokeWidth);

  merged
    .select(`.${cls.item}-body`)
    .attr(
      'd',
      `M${bodyLeft + r},${yBodyTop}H${bodyRight - r}Q${bodyRight},${yBodyTop} ${bodyRight},${yBodyTop + r}` +
        `V${yIntake - r}Q${bodyRight},${yIntake} ${bodyRight - r},${yIntake}` +
        `H${bodyLeft + r}Q${bodyLeft},${yIntake} ${bodyLeft},${yIntake - r}` +
        `V${yBodyTop + r}Q${bodyLeft},${yBodyTop} ${bodyLeft + r},${yBodyTop}Z`,
    )
    .attr('fill', theme.fill)
    .attr('stroke', theme.stroke)
    .attr('stroke-width', theme.strokeWidth);

  // Intake screen (crivo): short horizontal hatches near the bottom of the body.
  const hatchY = [
    yIntake - cfg.bodyHeight * 0.3,
    yIntake - cfg.bodyHeight * 0.15,
  ];
  merged
    .select(`.${cls.item}-intake`)
    .attr(
      'd',
      hatchY.map(y => `M${bodyLeft + 1.5},${y}H${bodyRight - 1.5}`).join(''),
    )
    .attr('fill', 'none')
    .attr('stroke', theme.stroke)
    .attr('stroke-width', 0.8);
}
