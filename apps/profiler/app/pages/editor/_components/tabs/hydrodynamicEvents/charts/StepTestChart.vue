<script setup lang="ts">
import type { HydrodynamicEvent } from '@welldot/core';
import ChartFrame from './ChartFrame.vue';
import { stepColor, type ChartSeries } from './types';

// Step-drawdown test: specific drawdown s/Q against Q with the least-squares
// line s/Q = B + C·Q (Hantush–Bierschenk), plus the s × Q curve. Q is in the
// display flow unit, so B and C are per that unit.

const props = defineProps<{ event: HydrodynamicEvent; compact?: boolean }>();

const { t } = useI18n();
const { formatNumber } = useNumberFormat();
const { toFlow, flowUnit } = useUnitFormat();
const k = 'editor.hydrodynamicEvents.charts';

const m = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: 'm' });
const q = (v: number) =>
  formatNumber(v, { maximumFractionDigits: 2, suffix: flowUnit.value });
/** Three significant digits, for the small s/Q, B and C values. */
const sig = (v: number) => {
  if (v === 0 || !Number.isFinite(v)) return formatNumber(v);
  const digits = Math.min(
    8,
    Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v)))),
  );
  return formatNumber(v, { maximumFractionDigits: digits });
};

const rows = computed(() =>
  stepTestSeries(props.event).map(r => {
    const rate = toFlow(r.rate);
    return { step: r.step, rate, drawdown: r.drawdown, sq: r.drawdown / rate };
  }),
);

/** Least-squares s/Q = B + C·Q; `null` with fewer than two distinct Q. */
const fit = computed(() => {
  const pts = rows.value;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.rate, 0) / n;
  const my = pts.reduce((a, p) => a + p.sq, 0) / n;
  const sxx = pts.reduce((a, p) => a + (p.rate - mx) ** 2, 0);
  if (n < 2 || !(sxx > 1e-12 * Math.max(1, mx * mx))) return null;
  const sxy = pts.reduce((a, p) => a + (p.rate - mx) * (p.sq - my), 0);
  const c = sxy / sxx;
  return { b: my - c * mx, c };
});

const stepLabel = (step: number) => t(`${k}.legend.step`, { n: step + 1 });

const specificSeries = computed<ChartSeries[]>(() => {
  const out: ChartSeries[] = rows.value.map(r => ({
    id: `step-${r.step}`,
    label: stepLabel(r.step),
    color: stepColor(r.step),
    noLine: true,
    points: [
      {
        x: r.rate,
        y: r.sq,
        note: `${t(`${k}.tooltip.drawdown`)} ${m(r.drawdown)}`,
      },
    ],
  }));
  const f = fit.value;
  if (f) {
    const qMax = Math.max(...rows.value.map(r => r.rate));
    out.push({
      id: 'fit',
      label: t(`${k}.legend.fit`),
      detail: t(`${k}.legend.fitValues`, { b: sig(f.b), c: sig(f.c) }),
      color: 'var(--color-content-300)',
      dashed: true,
      // From Q = 0 so the intercept B shows on the axis.
      points: [
        { x: 0, y: f.b },
        { x: qMax, y: f.b + f.c * qMax },
      ],
    });
  }
  return out;
});

const drawdownSeries = computed<ChartSeries[]>(() =>
  rows.value.map(r => ({
    id: `step-${r.step}`,
    label: stepLabel(r.step),
    color: stepColor(r.step),
    noLine: true,
    points: [{ x: r.rate, y: r.drawdown }],
  })),
);
</script>

<template>
  <div class="step-test">
    <ChartFrame
      :series="specificSeries"
      :x-label="t(`${k}.axes.flowRate`, { unit: flowUnit })"
      :y-label="t(`${k}.axes.specificDrawdown`, { unit: flowUnit })"
      :x-include="[0]"
      :y-include="[0]"
      :height="compact ? 200 : 260"
      :x-name="t(`${k}.tooltip.rate`)"
      y-name="s/Q"
      :format-x="q"
      :format-y="sig"
      :aria-label="t(`${k}.kinds.stepTest`)"
    />

    <div class="step-test-secondary">
      <span class="step-test-heading">{{
        t(`${k}.legend.drawdownVsRate`)
      }}</span>
      <ChartFrame
        :series="drawdownSeries"
        :x-label="t(`${k}.axes.flowRate`, { unit: flowUnit })"
        :y-label="t(`${k}.axes.drawdown`)"
        :x-include="[0]"
        :y-include="[0]"
        y-reversed
        :legend="false"
        :height="compact ? 150 : 180"
        :x-name="t(`${k}.tooltip.rate`)"
        :y-name="t(`${k}.tooltip.drawdown`)"
        :format-x="q"
        :format-y="m"
        :aria-label="t(`${k}.legend.drawdownVsRate`)"
      />
    </div>
  </div>
</template>

<style scoped>
.step-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-test-secondary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-test-heading {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}
</style>
