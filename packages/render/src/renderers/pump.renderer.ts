import * as d3 from 'd3';

import type { PumpInstallation } from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { DrawContext } from '~/types/render.types';

type Interval = { from: number; to: number; diameter: number };

/** Vertical extent (px) of the pump parts inside one panel. */
export type PumpSpans = {
  /** Bottom of the riser, never below the panel. */
  riserBottom: number;
  /** Visible part of the body, or `null` when it is off the panel. */
  body: {
    top: number;
    bottom: number;
    /** Cut by the panel edge (drawn square there, without rounding). */
    cutTop: boolean;
    cutBottom: boolean;
  } | null;
};

/**
 * Clamps the riser and body to the panel's drawing area `[panelTop,
 * panelBottom]`, so neither runs past a page break. The riser hangs from
 * `panelTop` down to the body top (`intakeY − bodyHeight`).
 */
export function getPumpSpans(
  panelTop: number,
  panelBottom: number,
  bodyTop: number,
  intakeY: number,
): PumpSpans {
  const riserBottom = Math.min(Math.max(panelTop, bodyTop), panelBottom);
  const top = Math.max(bodyTop, panelTop);
  const bottom = Math.min(intakeY, panelBottom);
  return {
    riserBottom,
    body:
      bottom > top
        ? { top, bottom, cutTop: top > bodyTop, cutBottom: bottom < intakeY }
        : null,
  };
}

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
  const { riserBottom: yRiserBottom, body } = getPumpSpans(
    yRiserTop,
    ctx.yScale(ctx.depthTo),
    yBodyTop,
    yIntake,
  );
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

  // Rounded corners only where the body is not cut by the panel edge.
  let bodyPath = '';
  if (body) {
    const rt = body.cutTop ? 0 : Math.min(r, (body.bottom - body.top) / 2);
    const rb = body.cutBottom ? 0 : Math.min(r, (body.bottom - body.top) / 2);
    const { top, bottom } = body;
    bodyPath =
      `M${bodyLeft + rt},${top}H${bodyRight - rt}Q${bodyRight},${top} ${bodyRight},${top + rt}` +
      `V${bottom - rb}Q${bodyRight},${bottom} ${bodyRight - rb},${bottom}` +
      `H${bodyLeft + rb}Q${bodyLeft},${bottom} ${bodyLeft},${bottom - rb}` +
      `V${top + rt}Q${bodyLeft},${top} ${bodyLeft + rt},${top}Z`;
  }

  merged
    .select(`.${cls.item}-body`)
    .attr('d', bodyPath)
    .attr('fill', theme.fill)
    .attr('stroke', theme.stroke)
    .attr('stroke-width', theme.strokeWidth);

  // Intake screen (crivo): short horizontal hatches near the bottom of the
  // body, only where the body is drawn.
  const hatchY = [
    yIntake - cfg.bodyHeight * 0.3,
    yIntake - cfg.bodyHeight * 0.15,
  ].filter(y => body && y > body.top && y < body.bottom);
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
