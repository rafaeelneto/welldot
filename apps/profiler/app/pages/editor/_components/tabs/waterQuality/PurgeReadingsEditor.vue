<script setup lang="ts">
import { WATER_QUALITY_PARAMETERS } from '@welldot/core';
import {
  parameterUnitSymbol,
  resolveParameterLabel,
} from '~/utils/waterQualityVocab';
import type { PurgeReadingDraft } from './resultDraft';

const rows = defineModel<PurgeReadingDraft[]>({ required: true });

const { t } = useI18n();

/** Field parameters typically logged while purging come first. */
const STABILIZATION_CODES = [
  'ph',
  'specific_conductance',
  'temperature',
  'dissolved_oxygen',
  'orp',
  'turbidity_ntu',
  'turbidity_fnu',
  'turbidity',
];

const parameterOptions = computed(() => {
  const numeric = WATER_QUALITY_PARAMETERS.filter(d => d.form === 'value');
  const first = STABILIZATION_CODES.flatMap(code => {
    const d = numeric.find(p => p.code === code);
    return d ? [d] : [];
  });
  const rest = numeric.filter(d => !STABILIZATION_CODES.includes(d.code));
  return [...first, ...rest].map(d => ({
    value: d.code,
    code: d.code,
    label: resolveParameterLabel({ code: d.code, vocabulary: 'welldot' }, t),
  }));
});

let seq = 0;
function addRow() {
  const last = rows.value.at(-1);
  rows.value = [
    ...rows.value,
    {
      key: `p${Date.now()}-${++seq}`,
      elapsed: null,
      code: last?.code ?? 'ph',
      value: null,
    },
  ];
}

function removeRow(key: string) {
  rows.value = rows.value.filter(r => r.key !== key);
}

function unitOf(code: string | null): string {
  return code
    ? parameterUnitSymbol({ parameter: { code, vocabulary: 'welldot' } })
    : '';
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="rows.length"
      class="grid grid-cols-12 gap-2 text-xs font-semibold tracking-widest uppercase text-content-400"
    >
      <span class="col-span-3">{{
        t('editor.waterQuality.purge.elapsed')
      }}</span>
      <span class="col-span-5">{{
        t('editor.waterQuality.purge.parameter')
      }}</span>
      <span class="col-span-3">{{ t('editor.waterQuality.purge.value') }}</span>
    </div>
    <div
      v-for="row in rows"
      :key="row.key"
      class="grid grid-cols-12 gap-2 items-center"
    >
      <WellInputNumber
        v-model="row.elapsed"
        :min="0"
        :max-fraction-digits="1"
        suffix=" min"
        size="small"
        :invalid="row.elapsed == null"
        class="col-span-3"
        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
      />
      <Select
        v-model="row.code"
        :options="parameterOptions"
        option-label="label"
        option-value="value"
        filter
        :filter-fields="['label', 'code']"
        size="small"
        :invalid="!row.code"
        class="col-span-5"
      />
      <WellInputNumber
        v-model="row.value"
        :max-fraction-digits="4"
        :suffix="unitOf(row.code) ? ` ${unitOf(row.code)}` : undefined"
        size="small"
        :invalid="row.value == null"
        class="col-span-3"
        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
      />
      <Button
        severity="danger"
        text
        size="small"
        class="col-span-1"
        :aria-label="t('editor.waterQuality.purge.removeReading')"
        @click="removeRow(row.key)"
      >
        <template #icon>
          <Icon name="ph:x-bold" />
        </template>
      </Button>
    </div>
    <Button
      severity="secondary"
      text
      size="small"
      class="self-start"
      :label="t('editor.waterQuality.purge.addReading')"
      @click="addRow"
    >
      <template #icon>
        <Icon name="ph:plus" />
      </template>
    </Button>
  </div>
</template>
