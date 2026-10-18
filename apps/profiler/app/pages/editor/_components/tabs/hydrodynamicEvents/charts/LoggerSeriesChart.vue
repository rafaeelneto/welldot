<script setup lang="ts">
import type { LoggerSeriesEvent } from '@welldot/core';
import { getWellTimeZone } from '@welldot/utils';
import ChartFrame from './ChartFrame.vue';
import { loggerChartSeries, loggerTickFormatter } from './loggerChart';
import type { ChartHLine } from './types';
import { formatReadingLocal } from '../loggerSeriesForm';

// Hydrograph of a logger series: depth against the clock time of each
// reading, shown in the well time zone (the browser's when the well has none),
// like the editor's grid.

const props = defineProps<{ event: LoggerSeriesEvent; compact?: boolean }>();

const { t, locale } = useI18n();
const { formatNumber } = useNumberFormat();
const profileStore = useProfileStore();
const k = 'editor.hydrodynamicEvents.charts';

const timeZone = computed(
  () =>
    getWellTimeZone(profileStore.well) ??
    Intl.DateTimeFormat().resolvedOptions().timeZone,
);

const series = computed(() =>
  loggerChartSeries(props.event, {
    depth: t(`${k}.logger.depth`),
    min: t(`${k}.logger.depthMin`),
    max: t(`${k}.logger.depthMax`),
  }),
);

const m = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: 'm' });
const formatX = (ms: number) =>
  formatReadingLocal(new Date(ms).toISOString(), timeZone.value);

const formatXTick = computed(() => {
  const xs = series.value[0]?.points.map(p => p.x) ?? [0];
  return loggerTickFormatter(
    Math.max(...xs) - Math.min(...xs),
    timeZone.value,
    locale.value,
  );
});

const hLines = computed<ChartHLine[]>(() =>
  props.event.sensor_depth == null
    ? []
    : [
        {
          y: props.event.sensor_depth,
          label: `${t(`${k}.logger.sensor`)} ${m(props.event.sensor_depth)}`,
        },
      ],
);

// Spec item 10: a pumping well mixes static and pumping levels.
const pumps = computed(
  () =>
    (profileStore.well.pump_installations?.length ?? 0) > 0 ||
    (profileStore.well.production?.length ?? 0) > 0,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="!series.length" class="m-0 text-sm text-content-400">
      {{ t(`${k}.empty`) }}
    </p>
    <template v-else>
      <ChartFrame
        :series="series"
        :x-label="t(`${k}.logger.axisTime`, { zone: timeZone })"
        :y-label="t(`${k}.logger.axisDepth`)"
        x-scale="time"
        :y-reversed="true"
        :h-lines="hLines"
        :y-include="event.sensor_depth == null ? [] : [event.sensor_depth]"
        :height="compact ? 200 : 260"
        :x-name="t(`${k}.tooltip.time`)"
        :y-name="t(`${k}.logger.tooltipDepth`)"
        :format-x="formatX"
        :format-x-tick="formatXTick"
        :format-y="m"
        :aria-label="t(`${k}.logger.ariaLabel`)"
      />
      <p v-if="pumps" class="m-0 text-xs text-content-400">
        {{ t(`${k}.logger.mixedLevels`) }}
      </p>
    </template>
  </div>
</template>
