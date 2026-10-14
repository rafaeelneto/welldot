<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import type { TimelinePoint } from '@welldot/utils';
import {
  area as d3Area,
  curveMonotoneX,
  line as d3Line,
  scaleLinear,
  select,
} from 'd3';
import { stepColor } from './types';

// Inline level × time glance for the event card, on the same test clock as
// the hydrograph. Each step is its own curve in its legend color (never
// joined to the next), over a wash that fills its drawdown (static level →
// water level); alternate steps are banded, recovery is a muted curve over a
// grey wash (residual drawdown), and the final pumping level gets an end dot. Curves are monotone,
// so they pass through every reading without overshooting. Drawn with d3 in
// real pixels from the measured width, so strokes are never stretched.

const props = defineProps<{ event: HydrodynamicEvent; ariaLabel?: string }>();
const emit = defineEmits<{ click: [] }>();

const { t } = useI18n();
const uid = `spark-${useId()}`;

const HEIGHT = 56;
const PAD_X = 5;
const PAD_Y = 6;

const root = ref<HTMLElement | null>(null);
const svgEl = ref<SVGSVGElement | null>(null);
const { width } = useElementSize(root);

const timeline = computed(() => pumpingTimeline(props.event));

const pointCount = computed(
  () =>
    timeline.value.steps.reduce((n, s) => n + s.points.length, 0) +
    (timeline.value.recovery?.points.length ?? 0),
);

type Pt = Pick<TimelinePoint, 't' | 'depth'>;
type Trace = {
  key: string;
  recovery: boolean;
  color: string;
  points: Pt[];
};

function draw() {
  const svg = svgEl.value;
  const w = width.value;
  const tl = timeline.value;
  if (!svg || w <= 0 || pointCount.value < 2) return;

  const all = [
    ...tl.steps.flatMap(s => s.points),
    ...(tl.recovery?.points ?? []),
  ];
  const t0 = tl.steps.length
    ? 0
    : Math.min(tl.recovery?.start ?? 0, ...all.map(p => p.t));
  const t1 = Math.max(...all.map(p => p.t), ...tl.steps.map(s => s.end));
  const depths = all.map(p => p.depth);
  if (tl.staticLevel != null) depths.push(tl.staticLevel);

  const x = scaleLinear()
    .domain([t0, t1 === t0 ? t0 + 1 : t1])
    .range([PAD_X, w - PAD_X]);
  // Depth grows downward: the shallowest level sits at the top.
  const [d0, d1] = [Math.min(...depths), Math.max(...depths)];
  const y = scaleLinear()
    .domain(d0 === d1 ? [d0 - 1, d1 + 1] : [d0, d1])
    .range([PAD_Y, HEIGHT - PAD_Y]);

  const multiStep = tl.steps.length > 1;
  const traces: Trace[] = [
    ...tl.steps
      .filter(s => s.points.length)
      .map(s => ({
        key: `s${s.index}`,
        recovery: false,
        color: stepColor(multiStep ? s.index : 0),
        points: s.points,
      })),
    ...(tl.recovery?.points.length
      ? [
          {
            key: 'rec',
            recovery: true,
            color: 'var(--color-content-400)',
            points: tl.recovery.points,
          },
        ]
      : []),
  ];
  const steps = traces.filter(d => !d.recovery);

  // Alternate step bands, as in the hydrograph.
  const bands = multiStep
    ? tl.steps
        .filter(s => s.index % 2 === 1 && s.end > s.start)
        .map(s => ({ x0: x(s.start), x1: x(Math.min(s.end, t1)) }))
    : [];
  const dividers = [
    ...tl.steps.slice(1).map(s => s.start),
    ...(tl.recovery?.points.length && tl.pumpingEnd != null
      ? [tl.pumpingEnd]
      : []),
  ].filter(v => v > t0 && v < t1);

  // The final pumping level (the card's "ND f").
  const lastStep = steps[steps.length - 1];
  const endDot = lastStep?.points[lastStep.points.length - 1];

  const svgSel = select(svg).attr('width', w).attr('height', HEIGHT);

  // One vertical gradient per trace: faint at the static level, stronger at
  // the water level.
  const defs = svgSel.selectAll('defs').data([null]).join('defs');
  defs
    .selectAll<SVGLinearGradientElement, Trace>('linearGradient')
    .data(traces, d => d.key)
    .join('linearGradient')
    .attr('id', d => `${uid}-${d.key}`)
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 1)
    .selectAll('stop')
    .data(d => [
      { offset: '0%', opacity: 0.04, color: d.color },
      { offset: '100%', opacity: d.recovery ? 0.12 : 0.2, color: d.color },
    ])
    .join('stop')
    .attr('offset', d => d.offset)
    .attr('stop-opacity', d => d.opacity)
    .style('stop-color', d => d.color);

  svgSel
    .selectAll('rect.sparkline-band')
    .data(bands)
    .join('rect')
    .attr('class', 'sparkline-band')
    .attr('x', b => b.x0)
    .attr('width', b => Math.max(0, b.x1 - b.x0))
    .attr('y', 0)
    .attr('height', HEIGHT);

  svgSel
    .selectAll('line.sparkline-divider')
    .data(dividers)
    .join('line')
    .attr('class', 'sparkline-divider')
    .attr('x1', v => x(v))
    .attr('x2', v => x(v))
    .attr('y1', 0)
    .attr('y2', HEIGHT);

  // Drawdown (and residual drawdown) washes: only with a static level to
  // measure from.
  const area = d3Area<Pt>()
    .curve(curveMonotoneX)
    .x(p => x(p.t))
    .y0(tl.staticLevel != null ? y(tl.staticLevel) : 0)
    .y1(p => y(p.depth));
  svgSel
    .selectAll<SVGPathElement, Trace>('path.sparkline-area')
    .data(
      tl.staticLevel != null ? traces.filter(d => d.points.length >= 2) : [],
      d => d.key,
    )
    .join('path')
    .attr('class', 'sparkline-area')
    .attr('fill', d => `url(#${uid}-${d.key})`)
    .attr('d', d => area(d.points));

  svgSel
    .selectAll('line.sparkline-static')
    .data(tl.staticLevel != null ? [tl.staticLevel] : [])
    .join('line')
    .attr('class', 'sparkline-static')
    .attr('x1', 0)
    .attr('x2', w)
    .attr('y1', v => y(v))
    .attr('y2', v => y(v));

  const line = d3Line<Pt>()
    .curve(curveMonotoneX)
    .x(p => x(p.t))
    .y(p => y(p.depth));
  const groups = svgSel
    .selectAll<SVGGElement, Trace>('g.sparkline-trace')
    .data(traces, d => d.key)
    .join(enter => {
      const g = enter.append('g');
      g.append('path');
      return g;
    })
    .attr('class', d =>
      d.recovery
        ? 'sparkline-trace sparkline-recovery'
        : 'sparkline-trace sparkline-step',
    );
  groups
    .select('path')
    .attr('d', d => line(d.points))
    .style('stroke', d => d.color);
  // A lone reading has no line: mark it with a dot.
  groups
    .selectAll<SVGCircleElement, Pt & { color: string }>('circle')
    .data(d =>
      d.points.length === 1
        ? d.points.map(p => ({ ...p, color: d.color }))
        : [],
    )
    .join('circle')
    .attr('r', 2.5)
    .attr('cx', p => x(p.t))
    .attr('cy', p => y(p.depth))
    .style('fill', p => p.color);

  svgSel
    .selectAll('circle.sparkline-end')
    .data(
      endDot && lastStep && lastStep.points.length > 1
        ? [{ ...endDot, color: lastStep.color }]
        : [],
    )
    .join('circle')
    .attr('class', 'sparkline-end')
    .attr('r', 3)
    .attr('cx', p => x(p.t))
    .attr('cy', p => y(p.depth))
    .style('fill', p => p.color)
    .raise();
}

watch([svgEl, width, timeline], draw, { flush: 'post' });

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    emit('click');
  }
}
</script>

<template>
  <div
    v-if="pointCount >= 2"
    ref="root"
    class="sparkline"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel ?? t('editor.hydrodynamicEvents.charts.title')"
    @click="emit('click')"
    @keydown="onKeydown"
  >
    <!-- Drawn by d3 (see `draw`). -->
    <svg ref="svgEl" class="sparkline-svg" aria-hidden="true" />
  </div>
</template>

<style scoped>
.sparkline {
  width: 100%;
  height: 56px;
  cursor: pointer;
  border-radius: 6px;
  outline: none;
  transition: background-color 120ms ease;
}

.sparkline:hover {
  background: var(--color-surface-50);
}

.sparkline:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.sparkline-svg {
  display: block;
  overflow: visible;
}

.sparkline-svg :deep(.sparkline-band) {
  fill: color-mix(in srgb, var(--color-content-0) 3%, transparent);
}

.sparkline-svg :deep(.sparkline-divider) {
  stroke: var(--color-surface-200);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.sparkline-svg :deep(.sparkline-static) {
  stroke: var(--color-content-400);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  stroke-opacity: 0.7;
  shape-rendering: crispEdges;
}

.sparkline-svg :deep(.sparkline-trace path) {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.sparkline-svg :deep(.sparkline-recovery path) {
  stroke-width: 1.5;
}

.sparkline-svg :deep(.sparkline-end),
.sparkline-svg :deep(.sparkline-trace circle) {
  stroke: var(--color-surface-0);
  stroke-width: 2;
  paint-order: stroke;
}
</style>
