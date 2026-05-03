import type { AnnotationData, DrawContext } from '~/types/render.types';
import { wrapText } from '~/utils/render.utils';

type AnnotationItem = {
  sortDepth: number;
  baseY: number;
  originX: number;
  originY: number;
  header: string;
  description: string;
};

function activeLabelsSet(
  cfg: boolean | ('lithology' | 'fractures' | 'caves')[],
): Set<string> {
  if (cfg === false) return new Set<string>();
  if (cfg === true) return new Set(['lithology', 'fractures', 'caves']);
  return new Set(cfg as string[]);
}

function lithologySubSet(
  cfg: boolean | ('depth' | 'description' | 'dividers')[] | undefined,
): Set<string> {
  if (cfg === false) return new Set<string>();
  if (!cfg || cfg === true)
    return new Set(['depth', 'description', 'dividers']);
  return new Set(cfg as string[]);
}

/**
 * Renders stacked annotation boxes for lithology/fractures/caves.
 * Items are sorted by depth with overlap-prevention.
 * Returns early if labels are disabled.
 */
export function drawAnnotationLabels(
  ctx: DrawContext,
  data: AnnotationData,
): void {
  if (ctx.renderConfig.labels.active === false) return;

  const active = activeLabelsSet(ctx.renderConfig.labels.active);
  const show = lithologySubSet(ctx.renderConfig.labels.lithology);
  const s = ctx.renderConfig.labels;
  const st = ctx.theme.labels;

  ctx.groups.lithologyLabelsGroup.selectAll('*').remove();

  // ── Depth tips ────────────────────────────────────────────────────────
  if (active.has('lithology') && show.has('depth')) {
    data.lithology
      .filter(d => d.to <= ctx.depthTo)
      .forEach(d => {
        const text = `${d.to}`;
        const approxW = text.length * (st.fontSize * 0.52) + s.depthTipPadX * 2;
        const y = ctx.yScale(d.to) - s.depthTipHeight / 2;

        const tipG = ctx.groups.lithologyLabelsGroup
          .append('g')
          .attr('class', ctx.classes.labels.lithology.depth);

        tipG
          .append('rect')
          .attr('x', ctx.geoXLeft + 1)
          .attr('y', y)
          .attr('width', approxW)
          .attr('height', s.depthTipHeight)
          .attr('rx', st.depthTipRadius ?? 2)
          .attr('fill', st.depthTipFill ?? 'white')
          .attr('stroke', ctx.theme.lithology.stroke)
          .attr('stroke-width', 0.5);

        tipG
          .append('text')
          .attr('class', 'wp-depth-tip-text')
          .attr('fill', ctx.theme.labels.color)
          .attr('font-family', ctx.theme.labels.bodyFont ?? 'sans-serif')
          .attr('x', ctx.geoXLeft + 1 + s.depthTipPadX)
          .attr('y', y + s.depthTipHeight / 2)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', st.fontSize)
          .text(text);
      });
  }

  // ── Build unified annotation items ────────────────────────────────────
  const items: AnnotationItem[] = [];

  if (active.has('lithology')) {
    data.lithology
      .filter(d => d.from < ctx.depthTo)
      .forEach(d => {
        items.push({
          sortDepth: d.from,
          baseY: ctx.yScale(Math.max(d.from, ctx.depthFrom)),
          originX: ctx.geoXRight,
          originY: ctx.yScale(Math.max(d.from, ctx.depthFrom)),
          header: `${d.from}–${d.to} m`,
          description: d.description || '',
        });
      });
  }

  if (active.has('fractures')) {
    data.fractures
      .filter(d => d.depth >= ctx.depthFrom && d.depth < ctx.depthTo)
      .forEach(d => {
        const typeLabel = d.water_intake ? 'fratura aberta' : 'fratura';
        items.push({
          sortDepth: d.depth,
          baseY: ctx.yScale(d.depth),
          originX: ctx.pocoCenterX,
          originY: ctx.yScale(d.depth),
          header: `${d.depth} m · ${typeLabel}`,
          description: d.description || '',
        });
      });
  }

  if (active.has('caves')) {
    data.caves
      .filter(d => d.from < ctx.depthTo)
      .forEach(d => {
        const midDepth = (d.from + d.to) / 2;
        const typeLabel = d.water_intake ? 'caverna úmida' : 'caverna';
        items.push({
          sortDepth: d.from,
          baseY: ctx.yScale(Math.max(d.from, ctx.depthFrom)),
          originX: ctx.geoXRight,
          originY: ctx.yScale(Math.max(midDepth, ctx.depthFrom)),
          header: `${d.from}–${d.to} m · ${typeLabel}`,
          description: d.description || '',
        });
      });
  }

  items.sort((a, b) => a.sortDepth - b.sortDepth);

  // ── Stacking pass ─────────────────────────────────────────────────────
  type LabelPos = { item: AnnotationItem; yLabel: number; estH: number };
  const labelPositions: LabelPos[] = [];
  let currY = 0;
  const charsPerLine = Math.max(
    1,
    Math.floor(s.descriptionMaxWidth / (st.fontSize * 0.6)),
  );

  items.forEach(item => {
    const descLines = Math.ceil((item.description.length || 1) / charsPerLine);
    const estH = (1 + descLines) * s.stackingLineHeight + 4;
    const yLabel = Math.max(item.baseY, currY + s.stackingGap);
    currY = yLabel + estH;
    labelPositions.push({ item, yLabel, estH });
  });

  const labelX = ctx.geoXRight + s.descriptionXOffset;

  // ── Dividers ──────────────────────────────────────────────────────────
  if (show.has('dividers') && show.has('description')) {
    labelPositions.forEach(({ item, yLabel }) => {
      ctx.groups.lithologyLabelsGroup
        .append('path')
        .attr('class', ctx.classes.labels.lithology.divider)
        .attr('fill', 'none')
        .attr('stroke', ctx.theme.labels.dividerStroke)
        .attr('stroke-width', ctx.theme.labels.dividerStrokeWidth)
        .attr('stroke-dasharray', ctx.theme.labels.dividerStrokeDasharray)
        .attr(
          'd',
          `M ${item.originX},${item.originY} L ${ctx.geoXRight + 3},${item.originY} L ${labelX},${yLabel}`,
        );
    });
  }

  // ── Labels ────────────────────────────────────────────────────────────
  if (show.has('description')) {
    const lineH = s.stackingLineHeight;
    const bgFill = st.annotationBg ?? 'white';

    labelPositions.forEach(({ item, yLabel, estH }) => {
      const labelG = ctx.groups.lithologyLabelsGroup
        .append('g')
        .attr('class', ctx.classes.labels.lithology.label)
        .attr('transform', `translate(${labelX},${yLabel})`);

      labelG
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', s.descriptionMaxWidth)
        .attr('height', estH)
        .attr('rx', st.annotationRadius ?? 2)
        .attr('fill', bgFill)
        .attr('fill-opacity', st.annotationBgOpacity ?? 0.85)
        .attr('stroke', st.annotationBorderColor ?? 'none');

      labelG
        .append('text')
        .attr('class', 'wp-annotation-header')
        .attr('fill', ctx.theme.labels.color)
        .attr('font-weight', st.headerFontWeight ?? 600)
        .attr('font-family', ctx.theme.labels.headerFont)
        .attr('x', 0)
        .attr('y', lineH * 0.85)
        .attr('font-size', st.fontSize)
        .text(item.header);

      if (item.description) {
        const lines = wrapText(item.description, charsPerLine);
        const bodyEl = labelG
          .append('text')
          .attr('class', 'wp-annotation-body')
          .attr('fill', ctx.theme.labels.bodyColor)
          .attr('font-weight', st.bodyFontWeight ?? 400)
          .attr('font-family', ctx.theme.labels.bodyFont ?? 'sans-serif')
          .attr('x', 0)
          .attr('y', lineH * 0.85 + lineH)
          .attr('font-size', st.fontSize);
        lines.forEach((line, i) => {
          bodyEl
            .append('tspan')
            .attr('x', 0)
            .attr('dy', i === 0 ? 0 : lineH)
            .text(line);
        });
      }
    });
  }
}
