<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import type { PumpingChartKind } from '@welldot/utils';
import type { Component } from 'vue';
import HydrographChart from './HydrographChart.vue';
import SemilogDrawdownChart from './SemilogDrawdownChart.vue';
import StepTestChart from './StepTestChart.vue';
import TheisRecoveryChart from './TheisRecoveryChart.vue';

// Entry point of the pumping-test charts: picks among the plots the event
// has data for.

const props = defineProps<{ event: HydrodynamicEvent; compact?: boolean }>();

const { t } = useI18n();
const k = 'editor.hydrodynamicEvents.charts';

const available = computed(() => availablePumpingCharts(props.event));

const options = computed(() =>
  available.value.map(kind => ({
    label: t(`${k}.kinds.${kind}`),
    value: kind,
  })),
);

const selected = ref<PumpingChartKind | null>(null);

// Keep the selection valid when the event (and its plots) change.
watch(
  available,
  kinds => {
    if (!selected.value || !kinds.includes(selected.value))
      selected.value = kinds[0] ?? null;
  },
  { immediate: true },
);

const charts = {
  hydrograph: HydrographChart,
  semilog: SemilogDrawdownChart,
  recovery: TheisRecoveryChart,
  stepTest: StepTestChart,
} satisfies Record<PumpingChartKind, Component>;
</script>

<template>
  <div class="pumping-charts">
    <template v-if="selected">
      <SelectButton
        v-if="options.length > 1"
        v-model="selected"
        class="self-start"
        :options="options"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        :aria-label="t(`${k}.title`)"
      />
      <span v-else class="pumping-charts-kind">{{ options[0]?.label }}</span>
      <component
        :is="charts[selected]"
        :key="selected"
        :event="event"
        :compact="compact"
      />
    </template>
    <p v-else class="pumping-charts-empty">
      {{ t(`${k}.empty`) }}
    </p>
  </div>
</template>

<style scoped>
.pumping-charts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.pumping-charts-kind {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}

.pumping-charts-empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-content-400);
}
</style>
