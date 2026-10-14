<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import ChartFrame from './ChartFrame.vue';
import { stepColor, type ChartSeries } from './types';

// Cooper–Jacob plot: drawdown (growing downward) against log elapsed time,
// one series per step.

const props = defineProps<{ event: HydrodynamicEvent; compact?: boolean }>();

const { t } = useI18n();
const { formatNumber } = useNumberFormat();
const { toFlow, flowUnit } = useUnitFormat();
const k = 'editor.hydrodynamicEvents.charts';

const m = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: 'm' });
const min = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 1, suffix: 'min' });

const series = computed<ChartSeries[]>(() => {
  const all = semilogDrawdownSeries(props.event);
  const multi = pumpingTimeline(props.event).steps.length > 1;
  return all.map(s => ({
    id: `step-${s.step}`,
    label: multi
      ? t(`${k}.legend.step`, { n: s.step + 1 })
      : t(`${k}.legend.pumping`),
    color: stepColor(s.step),
    markers: s.points.length <= 40,
    points: s.points.map(p => ({
      x: p.elapsed,
      y: p.drawdown,
      note:
        s.rate != null
          ? `${t(`${k}.tooltip.rate`)} ${formatNumber(toFlow(s.rate), {
              maximumFractionDigits: 2,
              suffix: flowUnit.value,
            })}`
          : undefined,
    })),
  }));
});
</script>

<template>
  <ChartFrame
    :series="series"
    :x-label="t(`${k}.axes.elapsed`)"
    :y-label="t(`${k}.axes.drawdown`)"
    x-scale="log"
    y-reversed
    :y-include="[0]"
    :height="compact ? 200 : 260"
    :x-name="t(`${k}.tooltip.elapsed`)"
    :y-name="t(`${k}.tooltip.drawdown`)"
    :format-x="min"
    :format-y="m"
    :aria-label="t(`${k}.kinds.semilog`)"
  />
</template>
