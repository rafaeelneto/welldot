<script setup lang="ts">
import {
  calculateSubmergence,
  getCurrentPump,
  getCurrentRegime,
  getPumpServiceTime,
} from '@welldot/utils';
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import SummaryField from './SummaryField.vue';
import { EDITOR_TAB } from './navigate';

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatLength, formatFlow, formatPower } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const pump = computed(() => getCurrentPump(profileStore.well));
const submergence = computed(() => calculateSubmergence(profileStore.well));

const equipment = computed(() =>
  pump.value
    ? [pump.value.manufacturer, pump.value.model].filter(Boolean).join(' ')
    : '',
);

/** Time in service of the current unit: by serial, else this installation. */
const serviceTime = computed(() => {
  const p = pump.value;
  if (!p) return null;
  const minutes = p.serial
    ? getPumpServiceTime(profileStore.well, p.serial)
    : (Date.now() - new Date(p.installed_at).getTime()) / 60_000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const days = minutes / 1440;
  return days >= 365
    ? t('editor.summary.pump.years', {
        n: formatNumber(days / 365, { maximumFractionDigits: 1 }),
      })
    : t('editor.summary.pump.days', {
        n: formatNumber(days, { maximumFractionDigits: 0 }),
      });
});

const regime = computed(() => getCurrentRegime(profileStore.well));

/** "12 m³/h · 20 h/day · 6 days/week" for the regime in force. */
const regimeSummary = computed(() => {
  const r = regime.value;
  if (!r) return null;
  return (
    [
      r.flow_rate != null ? formatFlow(r.flow_rate) : null,
      r.daily_operating_time != null
        ? t('editor.operation.regime.hoursPerDay', {
            n: formatNumber(r.daily_operating_time, {
              maximumFractionDigits: 2,
            }),
          })
        : null,
      r.days_per_week != null
        ? t('editor.operation.regime.daysPerWeekShort', {
            n: r.days_per_week,
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || t('editor.operation.regime.noValues')
  );
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.pump.title')"
    icon="ph:engine-duotone"
    :tag="t('editor.summary.pump.tag')"
    :tab="EDITOR_TAB.operation"
    :link-label="t('editor.summary.seeIn', { tab: t('editor.tabs.operation') })"
  >
    <template v-if="pump">
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-content-0">
          {{ resolvePumpTypeLabel(pump.type, t) }}
          <span v-if="equipment" class="font-normal text-content-300">
            · {{ equipment }}
          </span>
        </span>
        <span class="font-mono text-[11px] text-content-400">
          {{
            t('editor.summary.pump.installedAt', {
              date: formatDate(pump.installed_at, 'dd/MM/yyyy'),
            })
          }}
          <template v-if="pump.serial"> · S/N {{ pump.serial }}</template>
        </span>
      </div>
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <SummaryField
          :label="t('editor.summary.pump.intakeDepth')"
          :value="formatLength(pump.intake_depth)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.pump.submergence')"
          :value="formatLength(submergence)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.pump.ratedFlow')"
          :value="formatFlow(pump.rated_flow_rate)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.pump.ratedHead')"
          :value="formatLength(pump.rated_head)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.pump.ratedPower')"
          :value="formatPower(pump.rated_power)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.pump.serviceTime')"
          :value="serviceTime"
          mono
        />
      </dl>
    </template>
    <SummaryEmpty v-else :text="t('editor.summary.pump.empty')" />

    <div
      class="flex flex-col gap-0.5 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2"
    >
      <span
        class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
      >
        {{ t('editor.operation.regime.inForce') }}
      </span>
      <span v-if="regimeSummary" class="font-mono text-[13px] text-content-0">
        {{ regimeSummary }}
      </span>
      <span v-else class="text-xs text-content-400">
        {{ t('editor.operation.regime.none') }}
      </span>
    </div>
  </SummaryCard>
</template>
