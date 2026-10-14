import * as d3 from 'd3';

import type { PumpInstallation } from '@welldot/core';
import { getProfileDiamValues } from '@welldot/utils';
import type { DrawContext } from '~/types/render.types';
import { diameterAt, type Interval } from '~/utils/construction.geometry';

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

/** Height (px) of the riser's break zigzag above and below its line. */
const riserBreakAmplitude = (width: number) => Math.min(2, width / 3);

/**
 * Top of the riser bar from `xLeft` to `xRight` at `y`. With `broken` (the
 * wellhead is on the panel) it is a break line, a zigzag across the pipe
 * marking that it goes on to the discharge line: `edge` continues the fill
 * outline from (xLeft, y) to (xRight, y) along it and `breakLine` strokes
 * it. Otherwise (a panel cut) the top is a plain open edge.
 */
export function getRiserTop(
  xLeft: number,
  xRight: number,
  y: number,
  broken: boolean,
): { edge: string; breakLine: string } {
  if (!broken) return { edge: `H${xRight}`, breakLine: '' };
  const a = riserBreakAmplitude(xRight - xLeft);
  const w = xRight - xLeft;
  const zigzag =
    `L${xLeft + w / 3},${y - a}` +
    `L${xLeft + (2 * w) / 3},${y + a}L${xRight},${y}`;
  return { edge: zigzag, breakLine: `M${xLeft},${y}${zigzag}` };
}

/** Share of the pipe at the intake the body may fill, so a gap shows around it. */
const BODY_MAX_FILL = 0.85;
/** Riser width relative to the room it has, so it stays narrower than the body and clear of the casing. */
const RISER_MAX_FILL = 0.7;

/**
 * Drawn diameters (mm) of the riser and pump body. Both always fit the well:
 * the body stays inside the pipe at the intake (`intakeD`), the riser inside
 * the narrowest pipe it hangs through (`narrowestD`) and narrower than the
 * body. A declared `riser_diameter` larger than that room is shrunk to fit.
 */
export function getPumpDiameters(
  intakeD: number,
  narrowestD: number,
  riserDiameter: number | undefined,
  cfg: { bodyWidthRatio: number; riserWidthRatio: number },
): { riser: number; body: number } {
  const maxBody = intakeD * BODY_MAX_FILL;
  const riser = Math.min(
    riserDiameter ?? intakeD * cfg.riserWidthRatio,
    narrowestD * RISER_MAX_FILL,
    maxBody * RISER_MAX_FILL,
  );
  const body = Math.min(
    Math.max(intakeD * cfg.bodyWidthRatio, riser * 1.4),
    maxBody,
  );
  return { riser, body };
}

/**
 * Renders the current pump (`.well` v2.3 `pump_installations`) as a body
 * ending at `intake_depth`, hung from a riser pipe that runs from the
 * wellhead (casing top above the ground, else the pad top), where a break
 * line marks it going on to the discharge line. The riser uses
 * `riser_diameter` when present, otherwise a fraction
 * of the casing diameter; both are kept inside the well (see
 * `getPumpDiameters`). Pass `undefined` to clear the layer.
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

  // Narrowest pipe (or open hole) the riser passes through above the intake.
  const narrowestD = Math.min(
    casingD,
    ...[...pipes, ...ctx.constructionData.bore_hole]
      .filter(i => i.from < intake && i.to > 0)
      .map(i => i.diameter),
  );
  const { riser: riserD, body: bodyD } = getPumpDiameters(
    casingD,
    narrowestD,
    pump.riser_diameter,
    cfg,
  );

  const riserLeft = (ctx.POCO_CENTER - xScale(riserD)) / 2;
  const riserRight = (ctx.POCO_CENTER + xScale(riserD)) / 2;
  const bodyLeft = (ctx.POCO_CENTER - xScale(bodyD)) / 2;
  const bodyRight = (ctx.POCO_CENTER + xScale(bodyD)) / 2;

  const yIntake = ctx.yScale(intake);
  const yBodyTop = yIntake - cfg.bodyHeight;
  // The riser rises to the wellhead: the top of a casing sticking up above
  // the ground, else the top of the cement pad on the surface. There it ends
  // on a break line, the pipe going on to the discharge line. On a panel
  // that starts below the wellhead it runs from the panel top, unbroken.
  const headDepth = Math.min(
    0,
    ...pipes.filter(p => p.from < 0).map(p => p.from),
  );
  const headInPanel = ctx.depthFrom <= headDepth;
  const padOnHead =
    headDepth === 0 && !!ctx.constructionData.cement_pad?.thickness;
  // On the pad, the break stays within its thickness (column titles sit
  // just above it).
  const yRiserTop = headInPanel
    ? ctx.yScale(headDepth) -
      (padOnHead
        ? ctx.renderConfig.construction.cementPad.height -
          riserBreakAmplitude(xScale(riserD))
        : 0)
    : ctx.yScale(ctx.depthFrom);
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

  entered.append('path').attr('class', `${cls.item}-riser-fill`);
  entered.append('path').attr('class', `${cls.item}-riser`);
  entered.append('path').attr('class', `${cls.item}-body`);
  entered.append('path').attr('class', `${cls.item}-intake`);

  const merged = entered.merge(selection);

  const top = getRiserTop(riserLeft, riserRight, yRiserTop, headInPanel);

  // Filled riser: a narrow solid bar, unlike the open white-interior casing.
  merged
    .select(`.${cls.item}-riser-fill`)
    .attr(
      'd',
      yRiserBottom > yRiserTop
        ? `M${riserLeft},${yRiserTop}${top.edge}V${yRiserBottom}H${riserLeft}Z`
        : '',
    )
    .attr('fill', theme.riserFill)
    .attr('stroke', 'none');

  merged
    .select(`.${cls.item}-riser`)
    .attr(
      'd',
      yRiserBottom > yRiserTop
        ? `M${riserLeft},${yRiserTop}V${yRiserBottom}M${riserRight},${yRiserTop}V${yRiserBottom}${top.breakLine}`
        : '',
    )
    .attr('stroke-linejoin', 'round')
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
