<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import ChartFrame from './ChartFrame.vue';
import { stepColor, type ChartBand, type ChartSeries } from './types';

// Water level against the test clock: steps back to back, recovery after
// the pump stops.

const props = defineProps<{ event: HydrodynamicEvent; compact?: boolean }>();

const { t } = useI18n();
const { formatNumber } = useNumberFormat();
const k = 'editor.hydrodynamicEvents.charts';

const timeline = computed(() => pumpingTimeline(props.event));

const m = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: 'm' });
const min = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 1, suffix: 'min' });

function note(p: { elapsed: number; drawdown: number | null }): string {
  const parts = [`${t(`${k}.tooltip.elapsed`)} ${min(p.elapsed)}`];
  if (p.drawdown != null)
    parts.push(`${t(`${k}.tooltip.drawdown`)} ${m(p.drawdown)}`);
  return parts.join(' · ');
}

const series = computed<ChartSeries[]>(() => {
  const tl = timeline.value;
  const multi = tl.steps.length > 1;
  const out: ChartSeries[] = tl.steps
    .filter(s => s.points.length)
    .map(s => ({
      id: `step-${s.index}`,
      label: multi
        ? t(`${k}.legend.step`, { n: s.index + 1 })
        : t(`${k}.legend.pumping`),
      color: stepColor(s.index),
      markers: s.points.length <= 40,
      points: s.points.map(p => ({ x: p.t, y: p.depth, note: note(p) })),
    }));
  if (tl.recovery?.points.length) {
    out.push({
      id: 'recovery',
      label: t(`${k}.legend.recovery`),
      color: 'var(--color-content-400)',
      dashed: true,
      muted: true,
      markers: tl.recovery.points.length <= 40,
      points: tl.recovery.points.map(p => ({
        x: p.t,
        y: p.depth,
        note: note(p),
      })),
    });
  }
  return out;
});

const multiStep = computed(() => timeline.value.steps.length > 1);

const bands = computed<ChartBand[]>(() =>
  multiStep.value
    ? timeline.value.steps.map(s => ({
        x0: s.start,
        x1: s.end,
        label: t(`${k}.legend.step`, { n: s.index + 1 }),
      }))
    : [],
);

const vLines = computed(() => {
  const tl = timeline.value;
  const lines: { x: number; label?: string }[] = tl.steps
    .slice(1)
    .map(s => ({ x: s.start }));
  if (tl.pumpingEnd != null && tl.recovery?.points.length)
    lines.push({ x: tl.pumpingEnd, label: t(`${k}.legend.pumpStop`) });
  return lines;
});

const hLines = computed(() => {
  const level = timeline.value.staticLevel;
  return level == null
    ? []
    : [{ y: level, label: `${t(`${k}.legend.staticLevel`)} ${m(level)}` }];
});

// Exact time range: from the first step (or the pump stop for a recovery-only
// test) to the last reading or step end.
const xDomain = computed<[number, number] | undefined>(() => {
  const tl = timeline.value;
  const xs = series.value.flatMap(s => s.points.map(p => p.x));
  if (!xs.length) return undefined;
  const lo = tl.steps.length ? 0 : Math.min(tl.recovery?.start ?? 0, ...xs);
  const hi = Math.max(...xs, ...tl.steps.map(s => s.end));
  return hi > lo ? [lo, hi] : undefined;
});
</script>

<template>
  <ChartFrame
    :series="series"
    :x-label="t(`${k}.axes.time`)"
    :y-label="t(`${k}.axes.level`)"
    :x-domain="xDomain"
    y-reversed
    :bands="bands"
    :v-lines="vLines"
    :h-lines="hLines"
    :height="compact ? 200 : 260"
    :x-name="t(`${k}.tooltip.time`)"
    :y-name="t(`${k}.tooltip.level`)"
    :format-x="min"
    :format-y="m"
    :aria-label="t(`${k}.kinds.hydrograph`)"
  />
</template>
