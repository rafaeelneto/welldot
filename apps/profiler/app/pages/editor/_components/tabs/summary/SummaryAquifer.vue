<script setup lang="ts">
import type { AquiferValue } from '~/composables/useAquiferState';
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import SummaryField from './SummaryField.vue';
import { EDITOR_TAB } from './navigate';

const { t } = useI18n();
const { formatLength, formatFlow, formatSpecificCapacity } = useUnitFormat();
const { formatNumber } = useNumberFormat();
const { state, latestAnalysis } = useAquiferState();

const hasData = computed(() => Object.values(state.value).some(v => v != null));

function sub(v: AquiferValue | null, withMethod = true): string | undefined {
  if (!v) return undefined;
  return [
    formatDate(v.datetime, 'dd/MM/yyyy'),
    withMethod ? aquiferMethodLabel(v.method) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

type Field = {
  key: string;
  label: string;
  value: AquiferValue | null;
  text?: string;
  scientific?: { unit: string };
};

const fields = computed<Field[]>(() => {
  const s = state.value;
  return [
    {
      key: 'ne',
      label: t('editor.summary.aquifer.staticLevel'),
      value: s.ne,
      text: formatLength(s.ne?.value),
    },
    {
      key: 'nd',
      label: t('editor.summary.aquifer.dynamicLevel'),
      value: s.dynamicLevel,
      text: formatLength(s.dynamicLevel?.value),
    },
    {
      key: 'q',
      label: t('editor.summary.aquifer.flowRate'),
      value: s.flowRate,
      text: formatFlow(s.flowRate?.value),
    },
    {
      key: 'qmax',
      label: t('editor.summary.aquifer.maxFlowRate'),
      value: s.maxFlowRate,
      text: formatFlow(s.maxFlowRate?.value),
    },
    {
      key: 'sc',
      label: t('editor.summary.aquifer.specificCapacity'),
      value: s.specificCapacity,
      text: formatSpecificCapacity(s.specificCapacity?.value),
    },
    {
      key: 't',
      label: t('editor.summary.aquifer.transmissivity'),
      value: s.transmissivity,
      scientific: { unit: 'm²/s' },
    },
    {
      key: 'k',
      label: t('editor.summary.aquifer.hydraulicConductivity'),
      value: s.hydraulicConductivity,
      scientific: { unit: 'm/s' },
    },
    {
      key: 's',
      label: t('editor.summary.aquifer.storativity'),
      value: s.storativity,
      scientific: { unit: '' },
    },
    {
      key: 'b',
      label: t('editor.summary.aquifer.aquiferThickness'),
      value: s.aquiferThickness,
      text: formatLength(s.aquiferThickness?.value),
    },
    {
      key: 'eff',
      label: t('editor.summary.aquifer.wellEfficiency'),
      value: s.wellEfficiency,
      text: formatNumber(s.wellEfficiency?.value, {
        maximumFractionDigits: 1,
        suffix: '%',
      }),
    },
  ].filter(f => f.value != null || ['ne', 'nd', 'q', 'sc'].includes(f.key));
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.aquifer.title')"
    icon="ph:waves-duotone"
    :tag="t('editor.summary.aquifer.tag')"
    :tab="EDITOR_TAB.hydrodynamicEvents"
    :link-label="
      t('editor.summary.seeIn', { tab: t('editor.tabs.hydrodynamicEvents') })
    "
  >
    <template v-if="hasData">
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <SummaryField v-for="f in fields" :key="f.key" :label="f.label" mono>
          <template v-if="f.value && f.scientific">
            {{ scientificParts(f.value.value).mantissa
            }}<template v-if="scientificParts(f.value.value).exp">
              · 10<sup>{{ scientificParts(f.value.value).exp }}</sup>
            </template>
            <span v-if="f.scientific.unit" class="text-content-400">
              {{ f.scientific.unit }}
            </span>
          </template>
          <template v-else>{{ f.text ?? '—' }}</template>
          <span
            v-if="f.value"
            class="block font-mono text-[10px] text-content-400"
          >
            {{ sub(f.value, f.key !== 'ne') }}
          </span>
        </SummaryField>
      </dl>
      <p
        v-if="latestAnalysis"
        class="m-0 font-mono text-[10.5px] text-content-400"
      >
        {{
          t('editor.summary.aquifer.latestAnalysis', {
            date: formatDate(latestAnalysis.datetime, 'dd/MM/yyyy'),
          })
        }}
        <template v-if="latestAnalysis.analyst">
          · {{ latestAnalysis.analyst }}
        </template>
      </p>
    </template>
    <SummaryEmpty v-else :text="t('editor.summary.aquifer.empty')" />
  </SummaryCard>
</template>
