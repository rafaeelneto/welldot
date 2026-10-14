<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import ChartFrame from './ChartFrame.vue';
import { stepColor, type ChartSeries } from './types';

// Theis recovery plot: residual drawdown s′ against log t/t′, reversed so
// t/t′ → 1 (full recovery) sits on the right. Without a static level the
// depth is plotted instead, growing downward.

const props = defineProps<{ event: HydrodynamicEvent; compact?: boolean }>();

const { t } = useI18n();
const { formatNumber } = useNumberFormat();
const k = 'editor.hydrodynamicEvents.charts';

const m = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: 'm' });
const ratio = (v: number) => formatNumber(v, { maximumFractionDigits: 2 });

const points = computed(() => theisRecoverySeries(props.event));
const residual = computed(() => points.value[0]?.residual ?? true);

const series = computed<ChartSeries[]>(() => [
  {
    id: 'recovery',
    label: t(`${k}.legend.recovery`),
    color: stepColor(0),
    markers: points.value.length <= 60,
    points: points.value.map(p => ({ x: p.ratio, y: p.value })),
  },
]);
</script>

<template>
  <ChartFrame
    :series="series"
    :x-label="t(`${k}.axes.ratio`)"
    :y-label="t(`${k}.axes.${residual ? 'residualDrawdown' : 'level'}`)"
    x-scale="log"
    x-reversed
    :y-reversed="!residual"
    :y-include="residual ? [0] : []"
    :height="compact ? 200 : 260"
    :x-name="t(`${k}.tooltip.ratio`)"
    :y-name="t(`${k}.tooltip.${residual ? 'drawdown' : 'level'}`)"
    :format-x="ratio"
    :format-y="m"
    :aria-label="t(`${k}.kinds.recovery`)"
  />
</template>
