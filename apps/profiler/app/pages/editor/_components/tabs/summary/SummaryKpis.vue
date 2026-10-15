<script setup lang="ts">
const { t } = useI18n();
const profileStore = useProfileStore();
const { unit: lengthUnit, toDisplay } = useUnitDisplay('length');
const { formatNumber } = useNumberFormat();
const { toFlow, flowUnit } = useUnitFormat();
const { state: aquifer } = useAquiferState();

const lengthValue = (value: number | null | undefined) =>
  value != null ? formatNumber(toDisplay(value), { fractionDigits: 2 }) : '—';

const screenLength = computed(() =>
  profileStore.well.well_screen.reduce((sum, s) => sum + (s.to - s.from), 0),
);

const kpis = computed(() => [
  {
    key: 'depth',
    label: t('editor.summary.kpis.depth'),
    value: formatNumber(toDisplay(profileStore.maxDepth), {
      fractionDigits: 2,
    }),
    unit: lengthUnit.value,
  },
  {
    key: 'wellDepth',
    label: t('editor.summary.kpis.wellDepth'),
    value: lengthValue(
      profileStore.well.well_depth ?? calculatedWellDepth(profileStore.well),
    ),
    unit: lengthUnit.value,
  },
  {
    key: 'staticLevel',
    label: t('editor.summary.kpis.staticLevel'),
    value: lengthValue(aquifer.value.ne?.value),
    unit: aquifer.value.ne ? lengthUnit.value : '',
  },
  {
    key: 'flowRate',
    label: t('editor.summary.kpis.flowRate'),
    value: aquifer.value.flowRate
      ? formatNumber(toFlow(aquifer.value.flowRate.value), {
          maximumFractionDigits: 2,
        })
      : '—',
    unit: aquifer.value.flowRate ? flowUnit.value : '',
  },
  {
    key: 'layers',
    label: t('editor.summary.kpis.layers'),
    value: String(profileStore.lithologyCount),
    unit: '',
  },
  {
    key: 'screen',
    label: t('editor.summary.kpis.screen'),
    value: formatNumber(toDisplay(screenLength.value), { fractionDigits: 2 }),
    unit: lengthUnit.value,
  },
]);
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-2.5">
    <div
      v-for="kpi in kpis"
      :key="kpi.key"
      class="rounded-[10px] border border-surface-200 bg-gradient-to-b from-surface-0/85 to-surface-50/55 p-3 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
    >
      <div
        class="mb-1 font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
      >
        {{ kpi.label }}
      </div>
      <div
        class="font-serif text-[22px] font-medium tracking-[-0.01em] text-content-0"
      >
        {{ kpi.value }}
        <small
          v-if="kpi.unit"
          class="ml-0.5 font-mono text-[11px] font-normal text-content-400"
        >
          {{ kpi.unit }}
        </small>
      </div>
    </div>
  </div>
</template>
