import * as d3 from 'd3';

import { getProfileDiamValues } from '@welldot/utils';
import type {
  DrawContext,
  HighlightItem,
  Highlights,
  SvgSelection,
} from '~/types/render.types';

/**
 * Renders a single highlight overlay rectangle (and optional label) into the
 * given SVG group. Skips items with zero or negative dimensions.
 */
function drawHighlightItem(
  ctx: DrawContext,
  group: SvgSelection,
  x: number,
  y: number,
  w: number,
  h: number,
  label?: string,
): void {
  if (h <= 0 || w <= 0) return;

  const hlConfig = ctx.renderConfig.highlights;
  const pad = hlConfig.padding;

  const g = group.append('g').attr('class', ctx.classes.highlights.item);

  g.append('rect')
    .attr('class', ctx.classes.highlights.rect)
    .attr('x', x - pad)
    .attr('y', y - pad)
    .attr('width', w + pad * 2)
    .attr('height', h + pad * 2)
    .attr('fill', hlConfig.fill)
    .attr('fill-opacity', hlConfig.fillOpacity)
    .attr('stroke', hlConfig.stroke)
    .attr('stroke-width', hlConfig.strokeWidth)
    .attr('stroke-dasharray', hlConfig.strokeDasharray ?? null)
    .style('pointer-events', 'none');

  if (label) {
    const charW = hlConfig.labelFontSize * 0.55;
    const labelW = label.length * charW + hlConfig.labelPadding * 2;
    const labelH = hlConfig.labelFontSize + hlConfig.labelPadding * 2;
    const lx = x - pad;
    const ly = y - pad - labelH;

    g.append('rect')
      .attr('class', ctx.classes.highlights.labelBg)
      .attr('x', lx)
      .attr('y', ly)
      .attr('width', labelW)
      .attr('height', labelH)
      .attr('rx', hlConfig.labelRadius)
      .attr('fill', hlConfig.labelBackground)
      .style('pointer-events', 'none');

    g.append('text')
      .attr('class', ctx.classes.highlights.label)
      .attr('x', lx + hlConfig.labelPadding)
      .attr('y', ly + labelH - hlConfig.labelPadding)
      .attr('font-size', hlConfig.labelFontSize)
      .attr('fill', hlConfig.labelColor)
      .attr('font-family', 'sans-serif')
      .style('pointer-events', 'none')
      .text(label);
  }
}

/**
 * Renders colored highlight overlays on any component. Always runs to clear
 * groups on zoom redraws, even if hl is empty. The x-scale domain is computed
 * from ctx.constructionData for consistent widths across multi-SVG panels.
 */
export function drawHighlights(ctx: DrawContext, hl: Highlights): void {
  ctx.groups.highlightsGeologicGroup.selectAll('*').remove();
  ctx.groups.highlightsConstructionGroup.selectAll('*').remove();
  ctx.groups.highlightsFracturesGroup.selectAll('*').remove();

  // Geologic highlights
  const drawGeoHighlights = (items: HighlightItem[] | undefined) => {
    items?.forEach(h => {
      if (h.from === undefined || h.to === undefined) return;
      const from = Math.max(h.from, ctx.depthFrom);
      const to = Math.min(h.to, ctx.depthTo);
      if (from >= to) return;
      const y = ctx.yScale(from);
      drawHighlightItem(
        ctx,
        ctx.groups.highlightsGeologicGroup as SvgSelection,
        ctx.geoXLeft,
        y,
        ctx.geoXRight - ctx.geoXLeft,
        ctx.yScale(to) - y,
        h.label,
      );
    });
  };

  drawGeoHighlights(hl.lithology);
  drawGeoHighlights(hl.caves);

  // Fracture highlights
  const fractureConfig = ctx.renderConfig.fractures;
  const halfFractureWidth =
    (ctx.POCO_WIDTH * fractureConfig.widthMultiplier) / 2;
  const fracXa = ctx.pocoCenterX - halfFractureWidth;
  const fracW = halfFractureWidth * 2;

  hl.fractures?.forEach(h => {
    if (h.depth === undefined) return;
    if (h.depth < ctx.depthFrom || h.depth > ctx.depthTo) return;
    const cy = ctx.yScale(h.depth);
    drawHighlightItem(
      ctx,
      ctx.groups.highlightsFracturesGroup as SvgSelection,
      fracXa,
      cy - fractureConfig.hitBuffer.single,
      fracW,
      fractureConfig.hitBuffer.single * 2,
      h.label,
    );
  });

  // Construction highlights
  const maxXVals = getProfileDiamValues(ctx.constructionData);
  const xScaleConstr = d3
    .scaleLinear()
    .domain([0, d3.max(maxXVals) || 0])
    .range([0, ctx.POCO_WIDTH]);

  const constructionConfig = ctx.renderConfig.construction;

  if (
    hl.cement_pad &&
    ctx.depthFrom === 0 &&
    ctx.constructionData.cement_pad?.thickness
  ) {
    const cp = ctx.constructionData.cement_pad;
    const cpPadWidth =
      (cp.width * constructionConfig.cementPad.widthMultiplier * 1000) / 2;
    const cpX = (ctx.POCO_CENTER - xScaleConstr(cpPadWidth)) / 2;
    const cpY =
      ctx.yScale(0) -
      ctx.yScale(
        cp.thickness * constructionConfig.cementPad.thicknessMultiplier,
      );
    const cpW = xScaleConstr(cpPadWidth);
    const cpH = ctx.yScale(
      cp.thickness * constructionConfig.cementPad.thicknessMultiplier,
    );
    drawHighlightItem(
      ctx,
      ctx.groups.highlightsConstructionGroup as SvgSelection,
      cpX,
      cpY,
      cpW,
      cpH,
      hl.cement_pad.label,
    );
  }

  const drawConstrHighlights = (
    items: HighlightItem[] | undefined,
    data: { from: number; to: number; diameter: number }[],
    getX: (d: { diameter: number }) => number,
    getW: (d: { diameter: number }) => number,
  ) => {
    items?.forEach(h => {
      if (h.from === undefined || h.to === undefined) return;
      data
        .filter(
          d =>
            d.from < h.to! &&
            d.to > h.from! &&
            (h.diameter === undefined || d.diameter === h.diameter),
        )
        .forEach(d => {
          const from = Math.max(h.from!, ctx.depthFrom);
          const to = Math.min(h.to!, ctx.depthTo);
          if (from >= to) return;
          const y = ctx.yScale(from);
          drawHighlightItem(
            ctx,
            ctx.groups.highlightsConstructionGroup as SvgSelection,
            getX(d),
            y,
            getW(d),
            ctx.yScale(to) - y,
            h.label,
          );
        });
    });
  };

  const stdX = (d: { diameter: number }) =>
    (ctx.POCO_CENTER - xScaleConstr(d.diameter)) / 2;
  const stdW = (d: { diameter: number }) => xScaleConstr(d.diameter);
  const scPaddingRatio = constructionConfig.surfaceCase.diameterPaddingRatio;
  const scX = (d: { diameter: number }) =>
    (ctx.POCO_CENTER - xScaleConstr(d.diameter + d.diameter * scPaddingRatio)) /
    2;
  const scW = (d: { diameter: number }) =>
    xScaleConstr(d.diameter + d.diameter * scPaddingRatio);

  drawConstrHighlights(
    hl.bore_hole,
    ctx.constructionData.bore_hole,
    stdX,
    stdW,
  );
  drawConstrHighlights(
    hl.surface_case,
    ctx.constructionData.surface_case,
    scX,
    scW,
  );
  drawConstrHighlights(
    hl.hole_fill,
    ctx.constructionData.hole_fill,
    stdX,
    stdW,
  );
  drawConstrHighlights(
    hl.well_case,
    ctx.constructionData.well_case,
    stdX,
    stdW,
  );
  drawConstrHighlights(
    hl.well_screen,
    ctx.constructionData.well_screen,
    stdX,
    stdW,
  );
}
