<script setup lang="ts">
import {
  getCurrentRegime,
  getCurrentWellStatus,
  getCurrentWellStatusEntry,
} from '@welldot/utils';
import {
  WELL_STATUS_SEVERITY,
  resolveWellStatusLabel,
} from '~/utils/operationVocab';
import MetersPanel from './operation/MetersPanel.vue';
import OperatingRegimePanel from './operation/OperatingRegimePanel.vue';
import ProductionPanel from './operation/ProductionPanel.vue';
import PumpInstallationsPanel from './operation/PumpInstallationsPanel.vue';

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatFlow } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const status = computed(() => getCurrentWellStatus(profileStore.well));
const statusEntry = computed(() =>
  getCurrentWellStatusEntry(profileStore.well),
);
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
  <div class="flex flex-col">
    <!-- ── Current status strip ─────────────────────────────────────────── -->
    <div class="px-6 pt-6">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-surface-200/70 bg-surface-50 px-4 py-3"
      >
        <div class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ t('editor.operation.wellStatus.title') }}
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            <Tag
              v-if="status"
              :value="resolveWellStatusLabel(status, t)"
              :severity="WELL_STATUS_SEVERITY[status] ?? 'secondary'"
              class="text-[11px]"
            />
            <Tag
              v-else
              v-tooltip.top="t('editor.operation.wellStatus.unknownInfo')"
              :value="t('editor.operation.wellStatus.unknown')"
              severity="secondary"
              class="text-[11px] opacity-70"
            />
            <span v-if="statusEntry" class="font-mono text-xs text-content-300">
              {{
                t('editor.operation.wellStatus.since', {
                  date: formatDate(statusEntry.datetime, 'dd/MM/yyyy'),
                })
              }}
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ t('editor.operation.regime.inForce') }}
          </span>
          <span v-if="regimeSummary" class="font-mono text-sm text-content-0">
            {{ regimeSummary }}
          </span>
          <span v-else class="text-xs text-content-400">
            {{ t('editor.operation.regime.none') }}
          </span>
        </div>
      </div>
    </div>

    <PumpInstallationsPanel />
    <Divider class="my-0" />
    <MetersPanel />
    <Divider class="my-0" />
    <OperatingRegimePanel />
    <Divider class="my-0" />
    <ProductionPanel />
  </div>
</template>
