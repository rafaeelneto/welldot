<script setup lang="ts">
import {
  axisBottom,
  axisLeft,
  line as d3Line,
  pointer,
  scaleLinear,
  scaleLog,
  scaleTime,
  select,
  type ScaleLinear,
  type ScaleLogarithmic,
  type Selection,
} from 'd3';
import type {
  AxisKind,
  ChartBand,
  ChartHLine,
  ChartPoint,
  ChartSeries,
  ChartVLine,
} from './types';

// Shared x/y plot for the pumping-test charts, drawn with d3 into the SVG
// once the container width is known (SSR renders only the sized
// placeholder). Every series is its own path: points of different series are
// never joined. The legend and the tooltip are HTML around the SVG.

const props = withDefaults(
  defineProps<{
    series: ChartSeries[];
    xLabel: string;
    yLabel: string;
    xScale?: AxisKind;
    yScale?: AxisKind;
    /** Larger x values to the left. */
    xReversed?: boolean;
    /** Larger y values lower (depths, drawdowns). */
    yReversed?: boolean;
    /** Exact domains; the auto domains are padded and niced. */
    xDomain?: [number, number];
    yDomain?: [number, number];
    /** Values the auto domains must contain (e.g. `[0]`). */
    xInclude?: number[];
    yInclude?: number[];
    hLines?: ChartHLine[];
    vLines?: ChartVLine[];
    bands?: ChartBand[];
    /** Plot height in px (legend excluded). */
    height?: number;
    /** Short names of x / y in the tooltip (`t`, `s`…). */
    xName?: string;
    yName?: string;
    /** Value formatters for the tooltip and the reference-line labels. */
    formatX?: (_x: number) => string;
    formatY?: (_y: number) => string;
    /** Labels of the x ticks of a `time` axis (default: numeric). */
    formatXTick?: (_x: number) => string;
    /** Show the legend (only drawn for 2+ series). */
    legend?: boolean;
    ariaLabel?: string;
  }>(),
  {
    xScale: 'linear',
    yScale: 'linear',
    xReversed: false,
    yReversed: false,
    xDomain: undefined,
    yDomain: undefined,
    xInclude: () => [],
    yInclude: () => [],
    hLines: () => [],
    vLines: () => [],
    bands: () => [],
    height: 260,
    xName: 'x',
    yName: 'y',
    formatX: undefined,
    formatY: undefined,
    formatXTick: undefined,
    legend: true,
    ariaLabel: undefined,
  },
);

const { formatNumber } = useNumberFormat();
const clipId = `chart-clip-${useId()}`;

const plotEl = ref<HTMLElement | null>(null);
const svgEl = ref<SVGSVGElement | null>(null);
const { width } = useElementSize(plotEl);

const fmtX = (v: number) =>
  props.formatX?.(v) ?? formatNumber(v, { maximumFractionDigits: 2 });
const fmtY = (v: number) =>
  props.formatY?.(v) ?? formatNumber(v, { maximumFractionDigits: 2 });

// ─── Domains ─────────────────────────────────────────────────────────────────

const PAD = 0.05;

function autoDomain(
  kind: AxisKind,
  values: number[],
  include: number[],
): [number, number] {
  const all = [...values, ...include].filter(
    v => Number.isFinite(v) && (kind !== 'log' || v > 0),
  );
  if (!all.length) return kind === 'log' ? [1, 10] : [0, 1];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (kind === 'log') {
    // Whole decades, so the labelled ticks sit on the plot edges.
    const a = 10 ** Math.floor(Math.log10(lo));
    let b = 10 ** Math.ceil(Math.log10(hi));
    if (b <= a) b = a * 10;
    return [a, b];
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    return [lo - pad, hi + pad];
  }
  // Pad the free ends only: an included value (e.g. 0) stays on the edge.
  const pad = (hi - lo) * PAD;
  if (!include.includes(lo)) lo -= pad;
  if (!include.includes(hi)) hi += pad;
  return [lo, hi];
}

const xValues = computed(() => [
  ...props.series.flatMap(s => s.points.map(p => p.x)),
  ...props.vLines.map(v => v.x),
]);
const yValues = computed(() => [
  ...props.series.flatMap(s => s.points.map(p => p.y)),
  ...props.hLines.map(h => h.y),
]);

// ─── Scales and ticks ────────────────────────────────────────────────────────

/** Fewest decimals that write every tick exactly. */
function tickDigits(ticks: number[]): number {
  for (let d = 0; d < 6; d++) {
    const f = 10 ** d;
    if (ticks.every(v => Math.abs(Math.round(v * f) - v * f) < 1e-6)) return d;
  }
  return 6;
}

type Scale = ScaleLinear<number, number> | ScaleLogarithmic<number, number>;

type Axis = {
  scale: Scale;
  ticks: number[];
  minor: number[];
  labels: string[];
};

function buildAxis(
  kind: AxisKind,
  domain: [number, number],
  range: [number, number],
  count: number,
  exact: boolean,
  formatTick?: (_v: number) => string,
): Axis {
  if (kind === 'log') {
    const scale = scaleLog().domain(domain).range(range);
    const [a, b] = [Math.min(...domain), Math.max(...domain)];
    const decades: number[] = [];
    for (
      let e = Math.ceil(Math.log10(a) - 1e-9);
      e <= Math.floor(Math.log10(b) + 1e-9);
      e++
    )
      decades.push(10 ** e);
    // Less than two decades in view: label the 1-2-5 ticks instead.
    const ticks =
      decades.length >= 2
        ? decades
        : scale.ticks(count).filter(v => {
            const m = v / 10 ** Math.floor(Math.log10(v) + 1e-9);
            return [1, 2, 5].some(k => Math.abs(m - k) < 1e-6);
          });
    const minor =
      decades.length >= 2 && decades.length <= 6
        ? scale
            .ticks()
            .filter(v => !ticks.some(t => Math.abs(t - v) < 1e-9 * v))
        : [];
    return {
      scale,
      ticks,
      minor,
      labels: ticks.map(v => formatNumber(v, { maximumFractionDigits: 3 })),
    };
  }
  if (kind === 'time' && formatTick) {
    const scale = scaleLinear().domain(domain).range(range);
    const ticks = scaleTime()
      .domain(domain.map(v => new Date(v)))
      .ticks(count)
      .map(Number);
    return { scale, ticks, minor: [], labels: ticks.map(v => formatTick(v)) };
  }
  const scale = scaleLinear().domain(domain).range(range);
  if (!exact) scale.nice(count);
  const ticks = scale.ticks(count);
  const digits = tickDigits(ticks);
  return {
    scale,
    ticks,
    minor: [],
    labels: ticks.map(v =>
      formatNumber(v, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    ),
  };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const TICK_CHAR = 6.2; // px per character of the 10px mono tick labels

const hasBandLabels = computed(() => props.bands.some(b => b.label));

const plot = computed(() => {
  const w = width.value;
  if (w <= 0) return null;
  const h = props.height;
  const top = hasBandLabels.value ? 18 : 10;
  const bottom = 40;
  const innerH = Math.max(40, h - top - bottom);

  const yDom =
    props.yDomain ?? autoDomain(props.yScale, yValues.value, props.yInclude);
  const y = buildAxis(
    props.yScale,
    yDom,
    props.yReversed ? [0, innerH] : [innerH, 0],
    Math.max(2, Math.floor(innerH / 36)),
    !!props.yDomain,
  );

  const longest = Math.max(1, ...y.labels.map(l => l.length));
  const left = 18 + 6 + Math.ceil(longest * TICK_CHAR) + 4;
  const xDom =
    props.xDomain ?? autoDomain(props.xScale, xValues.value, props.xInclude);
  const xAxis = (innerW: number) =>
    buildAxis(
      props.xScale,
      xDom,
      props.xReversed ? [innerW, 0] : [0, innerW],
      Math.max(2, Math.floor(innerW / 72)),
      !!props.xDomain,
      props.formatXTick,
    );
  // Tick labels are centred on their tick: leave room for half of the
  // label that sits on the right edge.
  const draft = xAxis(Math.max(40, w - left - 14));
  const edge = draft.labels[props.xReversed ? 0 : draft.labels.length - 1];
  const right = Math.max(
    14,
    Math.ceil(((edge?.length ?? 0) * TICK_CHAR) / 2) + 4,
  );
  const innerW = Math.max(40, w - left - right);
  const x = xAxis(innerW);

  return { w, h, top, left, innerW, innerH, x, y };
});

type Plot = NonNullable<typeof plot.value>;

const valid = (p: ChartPoint) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  (props.xScale !== 'log' || p.x > 0) &&
  (props.yScale !== 'log' || p.y > 0);

type Px = { px: number; py: number; p: ChartPoint };

/** Series with their points in pixels. */
const drawn = computed(() => {
  const P = plot.value;
  if (!P) return [];
  return props.series.map(s => ({
    s,
    pts: s.points
      .filter(valid)
      .map<Px>(p => ({ px: P.x.scale(p.x), py: P.y.scale(p.y), p })),
  }));
});

// ─── Legend ──────────────────────────────────────────────────────────────────

const showLegend = computed(() => props.legend && props.series.length >= 2);

// ─── Hover / keyboard ────────────────────────────────────────────────────────

type Hit = { si: number; px: number; py: number; p: ChartPoint };

const hits = computed<Hit[]>(() =>
  drawn.value
    .flatMap((d, si) => d.pts.map(q => ({ si, px: q.px, py: q.py, p: q.p })))
    .sort((a, b) => a.px - b.px || a.si - b.si),
);

const active = ref<number | null>(null);

watch(hits, () => (active.value = null));

/** Nearest point to the pointer: x first, y only breaks ties. */
function nearest(mx: number, my: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  hits.value.forEach((h, i) => {
    const d = (h.px - mx) ** 2 + ((h.py - my) / 3) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function onKeydown(e: KeyboardEvent) {
  const n = hits.value.length;
  if (!n) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    active.value = active.value == null ? 0 : (active.value + step + n) % n;
  } else if (e.key === 'Escape') {
    active.value = null;
  }
}

const tooltip = computed(() => {
  const P = plot.value;
  const i = active.value;
  if (!P || i == null) return null;
  const a = hits.value[i];
  if (!a) return null;
  // Every series with a point at the same x.
  const rows = hits.value
    .filter(h => Math.abs(h.px - a.px) < 0.5)
    .sort((h1, h2) => h1.si - h2.si)
    .map(h => {
      const s = props.series[h.si]!;
      return {
        key: `${s.id}-${h.p.x}-${h.p.y}`,
        color: s.color,
        dashed: !!s.dashed,
        label: s.label,
        value: fmtY(h.p.y),
        note: h.p.note,
        px: h.px,
        py: h.py,
      };
    });
  const flip = P.left + a.px > P.w * 0.6;
  return {
    px: a.px,
    rows,
    header: `${props.xName} ${fmtX(a.p.x)}`,
    style: {
      left: `${P.left + a.px + (flip ? -12 : 12)}px`,
      top: `${Math.max(0, Math.min(P.top + a.py - 16, P.h - 72))}px`,
      transform: flip ? 'translateX(-100%)' : undefined,
    },
  };
});

// ─── d3 drawing ──────────────────────────────────────────────────────────────

type G = Selection<SVGGElement, unknown, null, undefined>;

/** Layer groups, created once per SVG element, in paint order. */
let layers: Record<
  | 'bands'
  | 'grid'
  | 'refs'
  | 'data'
  | 'crosshair'
  | 'xAxis'
  | 'yAxis'
  | 'labels',
  G
> | null = null;

function setup(svg: SVGSVGElement) {
  const root = select(svg);
  root.selectAll('*').remove();
  root
    .append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', -6)
    .attr('y', -6);
  const body = root.append('g').attr('class', 'chart-body');
  const layer = (cls: string) => body.append('g').attr('class', cls);
  layers = {
    bands: layer('chart-bands'),
    grid: layer('chart-grid-layer'),
    refs: layer('chart-refs'),
    data: layer('chart-data').attr('clip-path', `url(#${clipId})`),
    crosshair: layer('chart-crosshair-layer').attr('pointer-events', 'none'),
    xAxis: layer('chart-axis chart-axis--x'),
    yAxis: layer('chart-axis chart-axis--y'),
    labels: layer('chart-labels'),
  };
  // Hover target over the whole plot, on top of everything.
  root
    .append('rect')
    .attr('class', 'chart-hover')
    .attr('fill', 'transparent')
    .on('pointermove', (e: PointerEvent) => {
      const [mx, my] = pointer(e, body.node());
      active.value = nearest(mx, my);
    })
    .on('pointerleave', () => (active.value = null));
}

function draw(P: Plot) {
  const svg = svgEl.value;
  if (!svg) return;
  if (!layers || !svg.contains(layers.bands.node())) setup(svg);
  const L = layers!;
  const root = select(svg).attr('width', P.w).attr('height', P.h);
  const { innerW, innerH } = P;
  const x = P.x.scale;
  const y = P.y.scale;

  root.select('.chart-body').attr('transform', `translate(${P.left},${P.top})`);
  root
    .select(`#${clipId} rect`)
    .attr('width', innerW + 12)
    .attr('height', innerH + 12);
  root
    .select('.chart-hover')
    .attr('x', P.left)
    .attr('y', P.top)
    .attr('width', innerW)
    .attr('height', innerH);

  // Step bands: every other one tinted, labelled when the label fits.
  const bands = props.bands.map((b, i) => {
    const a = x(b.x0);
    const c = x(b.x1);
    const bx = Math.max(0, Math.min(a, c));
    const bw = Math.max(0, Math.min(innerW, Math.max(a, c)) - bx);
    return {
      i,
      bx,
      bw,
      tinted: i % 2 === 1,
      label: b.label && bw > b.label.length * 6 + 8 ? b.label : '',
    };
  });
  L.bands
    .selectAll<SVGRectElement, (typeof bands)[number]>('rect')
    .data(bands.filter(b => b.tinted))
    .join('rect')
    .attr('class', 'chart-band')
    .attr('x', b => b.bx)
    .attr('y', 0)
    .attr('width', b => b.bw)
    .attr('height', innerH);
  L.bands
    .selectAll<SVGTextElement, (typeof bands)[number]>('text')
    .data(bands.filter(b => b.label))
    .join('text')
    .attr('class', 'chart-band-label')
    .attr('x', b => b.bx + 4)
    .attr('y', -5)
    .text(b => b.label);

  // Grid: minor lines, major lines at the ticks, then the frame.
  const grid = [
    ...P.x.minor.map(v => ({ k: `xm${v}`, v, axis: 'x', minor: true })),
    ...P.y.minor.map(v => ({ k: `ym${v}`, v, axis: 'y', minor: true })),
    ...P.x.ticks.map(v => ({ k: `x${v}`, v, axis: 'x', minor: false })),
    ...P.y.ticks.map(v => ({ k: `y${v}`, v, axis: 'y', minor: false })),
  ];
  L.grid
    .selectAll<SVGLineElement, (typeof grid)[number]>('line')
    .data(grid, d => d.k)
    .join('line')
    .attr('class', d =>
      d.minor ? 'chart-grid chart-grid--minor' : 'chart-grid',
    )
    .attr('x1', d => (d.axis === 'x' ? x(d.v) : 0))
    .attr('x2', d => (d.axis === 'x' ? x(d.v) : innerW))
    .attr('y1', d => (d.axis === 'y' ? y(d.v) : 0))
    .attr('y2', d => (d.axis === 'y' ? y(d.v) : innerH));
  L.grid
    .selectAll('rect')
    .data([null])
    .join('rect')
    .attr('class', 'chart-border')
    .attr('width', innerW)
    .attr('height', innerH);

  // Reference lines: step changes / pump stop (x) and the static level (y).
  const inX = (px: number) =>
    Number.isFinite(px) && px >= -0.5 && px <= innerW + 0.5;
  const inY = (py: number) =>
    Number.isFinite(py) && py >= -0.5 && py <= innerH + 0.5;
  const vLines = props.vLines
    .map(l => ({ ...l, px: x(l.x) }))
    .filter(l => inX(l.px));
  const hLines = props.hLines
    .map(l => ({ ...l, py: y(l.y) }))
    .filter(l => inY(l.py));

  L.refs
    .selectAll<SVGGElement, (typeof vLines)[number]>('g.chart-vref')
    .data(vLines)
    .join(enter => {
      const g = enter.append('g').attr('class', 'chart-vref');
      g.append('line');
      g.append('text').attr('class', 'chart-ref-label').attr('y', 10);
      return g;
    })
    .call(g => {
      g.select('line')
        .attr('class', l => (l.label ? 'chart-vline--strong' : 'chart-vline'))
        .attr('x1', l => l.px)
        .attr('x2', l => l.px)
        .attr('y1', 0)
        .attr('y2', innerH);
      const nearEnd = (l: { px: number }) => l.px > innerW - 90;
      g.select('text')
        .attr('x', l => (nearEnd(l) ? l.px - 4 : l.px + 4))
        .attr('text-anchor', l => (nearEnd(l) ? 'end' : 'start'))
        .text(l => l.label ?? '');
    });

  L.refs
    .selectAll<SVGGElement, (typeof hLines)[number]>('g.chart-href')
    .data(hLines)
    .join(enter => {
      const g = enter.append('g').attr('class', 'chart-href');
      g.append('line').attr('class', 'chart-hline');
      g.append('text')
        .attr('class', 'chart-ref-label')
        .attr('text-anchor', 'end');
      return g;
    })
    .call(g => {
      g.select('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', l => l.py)
        .attr('y2', l => l.py)
        .style('stroke', l => l.color ?? null);
      g.select('text')
        .attr('x', innerW - 4)
        .attr('y', l => (l.py < 14 ? l.py + 12 : l.py - 4))
        .text(l => l.label);
    });

  // Data: one group per series, its own path and dots.
  const line = d3Line<Px>()
    .x(q => q.px)
    .y(q => q.py);
  const series = L.data
    .selectAll<SVGGElement, (typeof drawn.value)[number]>('g.chart-series')
    .data(drawn.value, d => d.s.id)
    .join(enter => {
      const g = enter.append('g').attr('class', 'chart-series');
      g.append('path')
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');
      return g;
    })
    .attr('opacity', d => (d.s.muted ? 0.75 : 1));
  series
    .select('path')
    .attr('d', d => (!d.s.noLine && d.pts.length >= 2 ? line(d.pts) : null))
    .attr('stroke', d => d.s.color)
    .attr('stroke-width', d => (d.s.muted ? 1.5 : 2))
    .attr('stroke-dasharray', d => (d.s.dashed ? '5 4' : null));
  series
    .selectAll<SVGCircleElement, Px & { color: string }>('circle')
    .data(d =>
      d.s.markers || d.s.noLine || d.pts.length === 1
        ? d.pts.map(q => ({ ...q, color: d.s.color }))
        : [],
    )
    .join('circle')
    .attr('class', 'chart-dot')
    .attr('r', 4)
    .attr('cx', q => q.px)
    .attr('cy', q => q.py)
    .attr('fill', q => q.color);

  // Axes: d3 axes with the computed ticks; the grid draws the lines.
  L.xAxis
    .attr('transform', `translate(0,${innerH})`)
    .call(
      axisBottom(x as ScaleLinear<number, number>)
        .tickValues(P.x.ticks)
        .tickFormat((_, i) => P.x.labels[i] ?? '')
        .tickSize(0)
        .tickPadding(8),
    )
    .call(g => g.select('.domain').remove());
  L.yAxis
    .call(
      axisLeft(y as ScaleLinear<number, number>)
        .tickValues(P.y.ticks)
        .tickFormat((_, i) => P.y.labels[i] ?? '')
        .tickSize(0)
        .tickPadding(6),
    )
    .call(g => g.select('.domain').remove());

  // Axis titles.
  L.labels
    .selectAll<SVGTextElement, { k: string; text: string; transform: string }>(
      'text',
    )
    .data([
      {
        k: 'x',
        text: props.xLabel,
        transform: `translate(${innerW / 2},${innerH + 32})`,
      },
      {
        k: 'y',
        text: props.yLabel,
        transform: `translate(${-P.left + 12},${innerH / 2}) rotate(-90)`,
      },
    ])
    .join('text')
    .attr('class', 'chart-axis-label')
    .attr('text-anchor', 'middle')
    .attr('transform', d => d.transform)
    .text(d => d.text);

  drawCrosshair();
}

/** Crosshair and highlighted dots of the active point. */
function drawCrosshair() {
  if (!layers || !plot.value) return;
  const tip = tooltip.value;
  const L = layers.crosshair;
  L.selectAll('line')
    .data(tip ? [tip.px] : [])
    .join('line')
    .attr('class', 'chart-crosshair')
    .attr('x1', px => px)
    .attr('x2', px => px)
    .attr('y1', 0)
    .attr('y2', plot.value.innerH);
  L.selectAll<SVGCircleElement, NonNullable<typeof tip>['rows'][number]>(
    'circle',
  )
    .data(tip?.rows ?? [], r => r.key)
    .join('circle')
    .attr('class', 'chart-dot')
    .attr('r', 5)
    .attr('cx', r => r.px)
    .attr('cy', r => r.py)
    .attr('fill', r => r.color);
}

watch(
  [
    plot,
    drawn,
    svgEl,
    () => props.bands,
    () => props.hLines,
    () => props.vLines,
    () => props.xLabel,
    () => props.yLabel,
  ],
  () => {
    if (plot.value) draw(plot.value);
  },
  { flush: 'post' },
);
watch(tooltip, drawCrosshair, { flush: 'post' });
</script>

<template>
  <div class="chart-frame">
    <ul v-if="showLegend" class="chart-legend">
      <li v-for="s in series" :key="s.id" class="chart-legend-item">
        <svg width="18" height="10" aria-hidden="true">
          <line
            v-if="!s.noLine"
            x1="1"
            y1="5"
            x2="17"
            y2="5"
            :stroke="s.color"
            stroke-width="2"
            stroke-linecap="round"
            :stroke-dasharray="s.dashed ? '4 3' : undefined"
            :opacity="s.muted ? 0.75 : 1"
          />
          <circle
            v-if="s.markers || s.noLine"
            cx="9"
            cy="5"
            r="3.5"
            :fill="s.color"
          />
        </svg>
        <span>{{ s.label }}</span>
        <span v-if="s.detail" class="chart-legend-detail">{{ s.detail }}</span>
      </li>
    </ul>

    <div ref="plotEl" class="chart-plot" :style="{ height: `${height}px` }">
      <!-- Drawn by d3 (see `draw`). -->
      <svg
        v-if="plot"
        ref="svgEl"
        class="chart-svg"
        role="img"
        :aria-label="ariaLabel ?? `${yLabel} × ${xLabel}`"
        tabindex="0"
        @keydown="onKeydown"
        @blur="active = null"
      />

      <div
        v-if="tooltip"
        class="chart-tooltip"
        :style="tooltip.style"
        aria-live="polite"
      >
        <div class="chart-tooltip-header">{{ tooltip.header }}</div>
        <div v-for="r in tooltip.rows" :key="r.key" class="chart-tooltip-row">
          <svg width="12" height="8" aria-hidden="true">
            <line
              x1="1"
              y1="4"
              x2="11"
              y2="4"
              :stroke="r.color"
              stroke-width="2"
              stroke-linecap="round"
              :stroke-dasharray="r.dashed ? '3 2' : undefined"
            />
          </svg>
          <span class="chart-tooltip-value">{{ yName }} {{ r.value }}</span>
          <span class="chart-tooltip-label">{{ r.label }}</span>
          <span v-if="r.note" class="chart-tooltip-note">{{ r.note }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-frame {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  color: var(--color-content-200);
}

.chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.chart-legend-detail {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-content-400);
}

.chart-plot {
  position: relative;
  width: 100%;
  min-width: 0;
}

.chart-svg {
  display: block;
  overflow: visible;
  outline: none;
  touch-action: pan-y;
}

.chart-svg:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-radius: 4px;
}

.chart-svg :deep(.chart-band) {
  fill: color-mix(in srgb, var(--color-content-0) 4%, transparent);
}

.chart-svg :deep(.chart-band-label) {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--color-content-400);
}

.chart-svg :deep(.chart-grid) {
  stroke: var(--color-surface-100);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.chart-svg :deep(.chart-grid--minor) {
  stroke-opacity: 0.55;
}

.chart-svg :deep(.chart-border) {
  fill: none;
  stroke: var(--color-surface-300);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.chart-svg :deep(.chart-vline) {
  stroke: var(--color-surface-300);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.chart-svg :deep(.chart-vline--strong) {
  stroke: var(--color-content-400);
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.chart-svg :deep(.chart-hline) {
  stroke: var(--color-content-300);
  stroke-width: 1;
  stroke-dasharray: 6 4;
}

.chart-svg :deep(.chart-ref-label) {
  font-size: 10px;
  fill: var(--color-content-300);
  paint-order: stroke;
  stroke: var(--color-surface-0);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.chart-svg :deep(.chart-dot) {
  stroke: var(--color-surface-0);
  stroke-width: 2;
}

.chart-svg :deep(.chart-crosshair) {
  stroke: var(--color-content-400);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.chart-svg :deep(.chart-axis text) {
  font-family: var(--font-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  fill: var(--color-content-400);
}

.chart-svg :deep(.chart-axis-label) {
  font-size: 11px;
  fill: var(--color-content-300);
}

.chart-tooltip {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 120px;
  max-width: 240px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--color-surface-0);
  border: 1px solid var(--color-surface-200);
  box-shadow: 0 6px 18px -8px rgb(0 0 0 / 0.3);
  font-size: 11px;
  white-space: nowrap;
}

.chart-tooltip-header {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-content-400);
}

.chart-tooltip-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  column-gap: 6px;
}

.chart-tooltip-value {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-content-0);
}

.chart-tooltip-label {
  color: var(--color-content-300);
}

.chart-tooltip-note {
  grid-column: 2 / -1;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-content-400);
}
</style>
