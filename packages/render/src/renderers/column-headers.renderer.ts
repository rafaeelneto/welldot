import type { DrawContext } from '~/types/render.types';
import { getColumnHeaderPositions } from '~/utils/layout.utils';

/** Whether lithology description annotations are drawn with this config. */
export function hasDescriptionColumn(ctx: DrawContext): boolean {
  const { active, lithology } = ctx.renderConfig.labels;
  if (active === false) return false;
  if (Array.isArray(active) && !active.includes('lithology')) return false;
  if (lithology === false) return false;
  return !Array.isArray(lithology) || lithology.includes('description');
}

/**
 * Draws the column titles (depth, lithology, construction and, when
 * annotations are drawn, description) in the top margin, over a rule just
 * above the drawing area. No-op unless `renderConfig.columnHeaders.active`.
 */
export function drawColumnHeaders(ctx: DrawContext): void {
  const group = ctx.groups.columnHeadersGroup;
  group.selectAll('*').remove();

  const cfg = ctx.renderConfig.columnHeaders;
  if (!cfg.active) return;

  const theme = ctx.theme.columnHeaders;
  const { margins } = ctx.state;
  const positions = getColumnHeaderPositions({
    marginLeft: margins.left,
    geoXLeft: ctx.geoXLeft,
    geoXRight: ctx.geoXRight,
    pocoCenterX: ctx.pocoCenterX,
    descriptionX: hasDescriptionColumn(ctx)
      ? ctx.geoXRight + ctx.renderConfig.labels.descriptionXOffset
      : undefined,
  });

  // Above the cement pad, which sits on the surface line of the first panel.
  const ruleY =
    margins.top - 2 - ctx.renderConfig.construction.cementPad.height;
  const textY = ruleY - 4;

  const addText = (x: number, text: string, anchor: string) =>
    group
      .append('text')
      .attr('class', ctx.classes.columnHeaders.text)
      .attr('x', x)
      .attr('y', textY)
      .attr('text-anchor', anchor)
      .attr('font-size', theme.fontSize)
      .attr('font-family', theme.fontFamily ?? 'sans-serif')
      .attr('font-weight', theme.fontWeight ?? 600)
      .attr('fill', theme.color)
      .text(text);

  addText(positions.depth, cfg.labels.depth, 'end');
  addText(positions.lithology, cfg.labels.lithology, 'middle');
  addText(positions.construction, cfg.labels.construction, 'middle');
  if (positions.description != null) {
    addText(positions.description, cfg.labels.description, 'start');
  }

  const overview = ctx.renderConfig.overview;
  group
    .append('line')
    .attr('class', ctx.classes.columnHeaders.rule)
    .attr('x1', overview.active ? overview.x : 0)
    .attr('x2', ctx.svgWidth)
    .attr('y1', ruleY)
    .attr('y2', ruleY)
    .attr('stroke', theme.ruleStroke)
    .attr('stroke-width', theme.ruleStrokeWidth);
}
