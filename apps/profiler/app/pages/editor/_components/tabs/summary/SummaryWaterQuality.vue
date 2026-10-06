<script setup lang="ts">
import { getLimitSet } from '@welldot/core';
import {
  getExceedances,
  getHydrochemicalFacies,
  getIonBalance,
} from '@welldot/utils';
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import SummaryField from './SummaryField.vue';
import { getLatestWellSample } from './derive';
import { EDITOR_TAB } from './navigate';

const { t } = useI18n();
const profileStore = useProfileStore();
const uiStore = useUiStore();
const { formatNumber } = useNumberFormat();

const fmt = (n: number, digits = 4) =>
  formatNumber(n, { maximumFractionDigits: digits });

const sample = computed(() => getLatestWellSample(profileStore.well));

const limitSet = computed(() =>
  uiStore.waterQualityLimitSet
    ? getLimitSet(uiStore.waterQualityLimitSet)
    : undefined,
);

const facies = computed(() => {
  const f = sample.value && getHydrochemicalFacies(sample.value);
  if (!f) return null;
  const ion = (code: string) =>
    t(`editor.waterQuality.derived.faciesIons.${code}`);
  return `${ion(f.cation)} – ${ion(f.anion)}`;
});

const ionBalance = computed(() =>
  sample.value ? getIonBalance(sample.value) : undefined,
);

const exceedances = computed(() => {
  const s = sample.value;
  if (!s || !limitSet.value) return [];
  const seen = new Set<number>();
  return getExceedances(s, limitSet.value).flatMap(e => {
    if (seen.has(e.result_index)) return [];
    seen.add(e.result_index);
    const r = s.results[e.result_index]!;
    const unit = parameterUnitSymbol(r);
    const limit =
      e.kind === 'presence'
        ? t('editor.waterQuality.exceedsPresence')
        : e.kind === 'above_max'
          ? t('editor.waterQuality.exceedsMax', {
              limit: `${fmt(e.limit.max ?? 0, 6)} ${unit}`.trim(),
            })
          : t('editor.waterQuality.exceedsMin', {
              limit: `${fmt(e.limit.min ?? 0, 6)} ${unit}`.trim(),
            });
    return [
      {
        index: e.result_index,
        name: resolveParameterLabel(r.parameter, t),
        value: `${formatResultValue(r, t, n => fmt(n, 6))} ${
          r.value !== undefined ? unit : ''
        }`.trim(),
        limit,
      },
    ];
  });
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.waterQuality.title')"
    icon="ph:flask-duotone"
    :tag="t('editor.summary.waterQuality.tag')"
    :tab="EDITOR_TAB.waterQuality"
    :link-label="
      t('editor.summary.seeIn', { tab: t('editor.tabs.waterQuality') })
    "
  >
    <template v-if="sample">
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <SummaryField
          :label="t('editor.summary.waterQuality.collectedAt')"
          :value="formatDate(sample.datetime, 'dd/MM/yyyy')"
          mono
        />
        <SummaryField
          :label="t('editor.summary.waterQuality.sampleType')"
          :value="resolveSampleTypeLabel(sample.sample_type, t)"
        />
        <SummaryField
          :label="t('editor.summary.waterQuality.laboratory')"
          :value="sample.laboratory?.name"
        />
        <SummaryField
          :label="t('editor.summary.waterQuality.results')"
          :value="String(sample.results.length)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.waterQuality.facies')"
          :value="facies"
        />
        <SummaryField :label="t('editor.summary.waterQuality.ionBalance')" mono>
          <span
            v-if="ionBalance"
            :class="
              Math.abs(ionBalance.error_pct) > 10
                ? 'text-warning-600 dark:text-warning-400'
                : ''
            "
          >
            {{ fmt(ionBalance.error_pct, 1) }}%
          </span>
          <template v-else>—</template>
        </SummaryField>
      </dl>

      <div v-if="limitSet" class="flex flex-col gap-2">
        <span
          class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
        >
          {{
            t('editor.summary.waterQuality.compliance', { set: limitSet.name })
          }}
        </span>
        <ul v-if="exceedances.length" class="m-0 flex list-none flex-col p-0">
          <li
            v-for="e in exceedances"
            :key="e.index"
            class="flex items-baseline justify-between gap-3 border-b border-surface-200 py-1.5 text-xs last:border-b-0"
          >
            <span class="flex items-center gap-1.5 text-content-0">
              <Icon
                name="ph:warning-duotone"
                class="size-3.5 shrink-0 text-error-500"
              />
              {{ e.name }}
            </span>
            <span class="text-right font-mono text-[11px] text-content-300">
              <span class="text-error-600 dark:text-error-400">{{
                e.value
              }}</span>
              · {{ e.limit }}
            </span>
          </li>
        </ul>
        <span v-else class="flex items-center gap-1.5 text-xs text-content-300">
          <Icon
            name="ph:check-circle-duotone"
            class="size-4 text-success-500"
          />
          {{ t('editor.summary.waterQuality.noExceedances') }}
        </span>
      </div>
      <p v-else class="m-0 text-xs text-content-400">
        {{ t('editor.summary.waterQuality.noLimitSet') }}
      </p>
    </template>
    <SummaryEmpty v-else :text="t('editor.summary.waterQuality.empty')" />
  </SummaryCard>
</template>
