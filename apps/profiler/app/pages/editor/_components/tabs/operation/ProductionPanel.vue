<script setup lang="ts">
import type {
  DeclaredVolume,
  MeterReading,
  Permit,
  ProductionEntry,
} from '@welldot/core';
import {
  getOperationWarnings,
  getProductionByPeriod,
  getProductionTotal,
  getRetractedProductionIds,
  todayCalendarDate,
  type OperationWarningCode,
  type ProductionPeriod,
} from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
import {
  meterLabel,
  resolveDeclaredMethodLabel,
  resolveReadingSourceLabel,
} from '~/utils/operationVocab';
import { getActivePermit } from '~/utils/permitVocab';
import ProductionEntryDialog from './ProductionEntryDialog.vue';

const { t } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { formatVolume } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const PRODUCTION_WARNING_CODES: readonly OperationWarningCode[] = [
  'reading_meter_unresolved',
  'reading_outside_installation',
  'reading_rollover_unknown',
  'duplicate_production_id',
  'corrects_unresolved',
  'corrects_cycle',
  'declared_period_invalid',
  'estimated_overlaps_meter',
];

// ─── Ledger ───────────────────────────────────────────────────────────────────

/** Instant an entry is filed under: the reading time or the period end. */
function entryInstant(e: ProductionEntry): string {
  return e.type === 'meter_reading'
    ? (e as MeterReading).datetime
    : (e as DeclaredVolume).period_end;
}

const retractedIds = computed(() =>
  getRetractedProductionIds(profileStore.well),
);

/** Ids referenced by some `corrects` — those entries cannot be deleted. */
const correctedIds = computed(
  () =>
    new Set(
      (profileStore.well.production ?? [])
        .map(e => e.corrects)
        .filter((id): id is string => !!id),
    ),
);

const meterFilter = ref<string | null>(null);
const meterFilterOptions = computed(() =>
  (profileStore.well.meters ?? []).map(m => ({
    value: m.id,
    label: meterLabel(m, t),
  })),
);

const hideRetracted = ref(false);

const entries = computed<ProductionEntry[]>(() => {
  const all = profileStore.well.production ?? [];
  const fileIndex = new Map(all.map((e, i) => [e.id, i]));
  const retracted = retractedIds.value;
  let list = [...all];
  if (hideRetracted.value) list = list.filter(e => !retracted.has(e.id));
  if (meterFilter.value) {
    list = list.filter(
      e =>
        e.type === 'meter_reading' &&
        (e as MeterReading).meter_id === meterFilter.value,
    );
  }
  // Newest first. At the same instant, the entry in force sits above the
  // ones it retracts, and later additions above earlier ones.
  return list.sort(
    (a, b) =>
      new Date(entryInstant(b)).getTime() -
        new Date(entryInstant(a)).getTime() ||
      Number(retracted.has(a.id)) - Number(retracted.has(b.id)) ||
      (b.sequence ?? 0) - (a.sequence ?? 0) ||
      fileIndex.get(b.id)! - fileIndex.get(a.id)!,
  );
});

/** Warning messages per production id. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of getOperationWarnings(profileStore.well)) {
    if (!PRODUCTION_WARNING_CODES.includes(w.code)) continue;
    for (const id of w.ids) {
      const list = map.get(id) ?? [];
      const msg = t(`editor.operation.warnings.${w.code}`);
      if (!list.includes(msg)) list.push(msg);
      map.set(id, list);
    }
  }
  return map;
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const totals = computed(() => getProductionTotal(profileStore.well));

const period = ref<Exclude<ProductionPeriod, 'day'>>('month');
const periodOptions = computed(() => [
  { value: 'month', label: t('editor.operation.production.periods.month') },
  { value: 'year', label: t('editor.operation.production.periods.year') },
]);

/** Newest period first for display. */
const buckets = computed(() =>
  [...getProductionByPeriod(profileStore.well, period.value)].reverse(),
);

const today = todayCalendarDate();

/** The active permit with the latest start — the one compliance is judged by. */
const activePermit = computed<Permit | undefined>(() =>
  getActivePermit(profileStore.well, today),
);

function permitLimit(kind: 'annual' | 'monthly'): number | undefined {
  return activePermit.value?.volume_limits?.find(v => v.period === kind)
    ?.volume;
}

/** Limit applying to one bucket of the period table. */
const bucketLimit = computed(() =>
  permitLimit(period.value === 'year' ? 'annual' : 'monthly'),
);

function bucketTotal(kind: ProductionPeriod, key: string): number {
  return (
    getProductionByPeriod(profileStore.well, kind).find(b => b.period === key)
      ?.total ?? 0
  );
}

/** Current year / month against the permit's annual / monthly limits. */
const compliance = computed(() => {
  const rows = [
    {
      key: 'annual' as const,
      kind: 'year' as const,
      bucket: today.slice(0, 4),
    },
    {
      key: 'monthly' as const,
      kind: 'month' as const,
      bucket: today.slice(0, 7),
    },
  ];
  return rows.flatMap(r => {
    const limit = permitLimit(r.key);
    if (limit == null || limit <= 0) return [];
    const used = bucketTotal(r.kind, r.bucket);
    const pct = (used / limit) * 100;
    return [
      {
        key: r.key,
        label: t(`editor.operation.production.compliance.${r.key}`, {
          period: formatPeriodKey(r.bucket),
        }),
        used,
        limit,
        pct,
      },
    ];
  });
});

function percentOf(value: number, limit: number | undefined): string {
  if (limit == null || limit <= 0) return '—';
  return `${formatNumber((value / limit) * 100, { maximumFractionDigits: 0 })}%`;
}

function formatPeriodKey(key: string): string {
  const [y, m, d] = key.split('-');
  return [d, m, y].filter(Boolean).join('/');
}

const kpis = computed(() => [
  {
    key: 'total',
    label: t('editor.operation.production.totals.total'),
    value: formatVolume(totals.value.total, 1),
    info: t('editor.operation.production.totals.totalInfo'),
  },
  {
    key: 'metered',
    label: t('editor.operation.production.totals.metered'),
    value: formatVolume(totals.value.metered, 1),
  },
  {
    key: 'estimated',
    label: t('editor.operation.production.totals.estimated'),
    value: formatVolume(totals.value.estimated, 1),
  },
  {
    key: 'reported',
    label: t('editor.operation.production.totals.reported'),
    value: formatVolume(totals.value.reported, 1),
    info: t('editor.operation.production.totals.reportedInfo'),
  },
]);

// ─── Dialog ───────────────────────────────────────────────────────────────────

const entryDraft = ref<ProductionEntry | null>(null);
const entryDialogVisible = ref(false);

function addEntry() {
  entryDraft.value = null;
  entryDialogVisible.value = true;
}

function correctEntry(e: ProductionEntry) {
  entryDraft.value = e;
  entryDialogVisible.value = true;
}

/** Ledger: always appends. Corrections are new entries with `corrects`. */
function appendEntry(e: ProductionEntry) {
  profileStore.updateWell(draft => {
    if (!draft.production) draft.production = [];
    draft.production.push(e);
  });
}

function deleteEntry(id: string) {
  if (correctedIds.value.has(id)) return;
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.operation.production.deleteConfirm'),
    message: t('editor.operation.production.deleteInfo'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.production = draft.production?.filter(e => e.id !== id);
        if (!draft.production?.length) delete draft.production;
      });
    },
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function meterName(meterId: string): string {
  const meter = profileStore.well.meters?.find(m => m.id === meterId);
  return meter ? meterLabel(meter, t) : meterId;
}

function details(e: ProductionEntry): string {
  if (e.type === 'meter_reading') {
    const r = e as MeterReading;
    return [
      meterName(r.meter_id),
      r.source ? resolveReadingSourceLabel(r.source, t) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const d = e as DeclaredVolume;
  return [
    `${formatDate(d.period_start, 'dd/MM/yyyy')} → ${formatDate(d.period_end, 'dd/MM/yyyy')}`,
    resolveDeclaredMethodLabel(d.method ?? 'estimated', t),
  ]
    .filter(Boolean)
    .join(' · ');
}

function value(e: ProductionEntry): string {
  return e.type === 'meter_reading'
    ? formatVolume((e as MeterReading).reading, 3)
    : formatVolume((e as DeclaredVolume).volume, 1);
}

function typeLabel(e: ProductionEntry): string {
  return e.type === 'meter_reading' || e.type === 'declared_volume'
    ? t(`editor.operation.production.types.${e.type}`)
    : // Unknown (`x-…`) entry types are kept and shown raw.
      (e as { type: string }).type;
}

function actions(e: ProductionEntry): RecordAction[] {
  const list: RecordAction[] = [];
  if (!retractedIds.value.has(e.id)) {
    list.push({
      key: 'correct',
      label: t('editor.operation.production.correct'),
      icon: 'ph:arrow-u-up-left-duotone',
      onClick: () => correctEntry(e),
    });
  }
  if (!correctedIds.value.has(e.id)) {
    list.push({
      key: 'delete',
      label: t('editor.operation.production.deleteConfirm'),
      icon: 'ph:x-bold',
      severity: 'danger',
      onClick: () => deleteEntry(e.id),
    });
  }
  return list;
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <h3
      class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
    >
      {{ t('editor.operation.production.title') }}
    </h3>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.operation.production.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.operation.production.add')"
        @click="addEntry"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!profileStore.well.production?.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:drop-half-bottom-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.operation.production.empty') }}</p>
    </div>

    <template v-else>
      <!-- ── Totals ──────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          v-for="k in kpis"
          :key="k.key"
          v-tooltip.top="k.info"
          class="rounded-xl border border-surface-200/70 bg-surface-50 px-4 py-3 flex flex-col"
        >
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ k.label }}
          </span>
          <span class="font-mono text-sm text-content-0">{{ k.value }}</span>
        </div>
      </div>
      <Message
        v-if="totals.unknown_intervals"
        severity="warn"
        size="small"
        variant="simple"
      >
        {{
          t(
            'editor.operation.production.unknownIntervals',
            { n: totals.unknown_intervals },
            totals.unknown_intervals,
          )
        }}
      </Message>

      <!-- ── Compliance ──────────────────────────────────────────────────── -->
      <div
        v-if="compliance.length"
        class="rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
      >
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
        >
          {{
            t('editor.operation.production.compliance.title', {
              number:
                activePermit?.identifier ??
                activePermit?.request_identifier ??
                '',
            })
          }}
        </span>
        <div v-for="c in compliance" :key="c.key" class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="text-content-200">{{ c.label }}</span>
            <span
              class="font-mono"
              :class="c.pct > 100 ? 'text-error-500' : 'text-content-300'"
            >
              {{ formatVolume(c.used, 0) }} / {{ formatVolume(c.limit, 0) }} ·
              {{ formatNumber(c.pct, { maximumFractionDigits: 0 }) }}%
            </span>
          </div>
          <ProgressBar
            :value="Math.min(100, c.pct)"
            :show-value="false"
            class="h-1.5"
          />
        </div>
      </div>

      <!-- ── Period table ───────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ t('editor.operation.production.byPeriod') }}
          </span>
          <SelectButton
            v-model="period"
            :options="periodOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
          />
        </div>
        <div
          v-if="buckets.length"
          class="overflow-x-auto rounded-xl border border-surface-200/70"
        >
          <table class="w-full text-xs font-mono">
            <thead class="bg-surface-50 text-content-400">
              <tr>
                <th class="text-left font-medium px-3 py-2">
                  {{ t('editor.operation.production.periods.period') }}
                </th>
                <th class="text-right font-medium px-3 py-2">
                  {{ t('editor.operation.production.totals.metered') }}
                </th>
                <th class="text-right font-medium px-3 py-2">
                  {{ t('editor.operation.production.totals.estimated') }}
                </th>
                <th class="text-right font-medium px-3 py-2">
                  {{ t('editor.operation.production.totals.total') }}
                </th>
                <th class="text-right font-medium px-3 py-2">
                  {{ t('editor.operation.production.totals.reported') }}
                </th>
                <th v-if="bucketLimit" class="text-right font-medium px-3 py-2">
                  {{ t('editor.operation.production.ofLimit') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in buckets"
                :key="b.period"
                class="border-t border-surface-100 text-content-100"
              >
                <td class="px-3 py-1.5">
                  {{ formatPeriodKey(b.period) }}
                  <Icon
                    v-if="b.unknown_intervals"
                    v-tooltip.top="
                      t(
                        'editor.operation.production.unknownIntervals',
                        { n: b.unknown_intervals },
                        b.unknown_intervals,
                      )
                    "
                    name="ph:warning-duotone"
                    class="size-3.5 text-warning-500 align-middle"
                  />
                </td>
                <td class="text-right px-3 py-1.5">
                  {{ formatVolume(b.metered, 1) }}
                </td>
                <td class="text-right px-3 py-1.5">
                  {{ formatVolume(b.estimated, 1) }}
                </td>
                <td class="text-right px-3 py-1.5 text-content-0">
                  {{ formatVolume(b.total, 1) }}
                </td>
                <td class="text-right px-3 py-1.5 text-content-300">
                  {{ b.reported ? formatVolume(b.reported, 1) : '—' }}
                </td>
                <td
                  v-if="bucketLimit"
                  class="text-right px-3 py-1.5"
                  :class="
                    b.total > bucketLimit
                      ? 'text-error-500'
                      : 'text-content-300'
                  "
                >
                  {{ percentOf(b.total, bucketLimit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-xs text-content-400 m-0">
          {{ t('editor.operation.production.noPeriods') }}
        </p>
      </div>

      <!-- ── Ledger ──────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ t('editor.operation.production.ledger') }}
          </span>
          <div class="flex items-center gap-3 flex-wrap">
            <label
              v-if="retractedIds.size"
              class="flex items-center gap-2 text-xs text-content-500 cursor-pointer"
            >
              <ToggleSwitch v-model="hideRetracted" />
              {{ t('editor.operation.production.hideRetracted') }}
            </label>
            <Select
              v-if="meterFilterOptions.length"
              v-model="meterFilter"
              :options="meterFilterOptions"
              option-label="label"
              option-value="value"
              show-clear
              size="small"
              :placeholder="t('editor.operation.production.allEntries')"
              class="min-w-48"
            />
          </div>
        </div>

        <RecordCard
          v-for="e in entries"
          :key="e.id"
          :dimmed="retractedIds.has(e.id) && 'strong'"
          :date="formatDate(entryInstant(e), 'dd/MM/yyyy HH:mm')"
          :actions="actions(e)"
        >
          <template #tags>
            <Tag
              :value="typeLabel(e)"
              :severity="e.type === 'meter_reading' ? 'info' : 'secondary'"
              class="text-[11px]"
            />
            <Tag
              v-if="retractedIds.has(e.id)"
              v-tooltip.top="t('editor.operation.production.retractedInfo')"
              :value="t('editor.operation.production.retracted')"
              severity="secondary"
              class="text-[11px]"
            />
            <Tag
              v-if="e.corrects"
              v-tooltip.top="t('editor.operation.production.correctionInfo')"
              :value="t('editor.operation.production.correction')"
              severity="info"
              class="text-[11px]"
            />
            <span class="font-mono text-sm text-content-0">
              {{ value(e) }}
            </span>
          </template>
          <span class="text-xs text-content-400">{{ details(e) }}</span>
          <p
            v-if="e.notes"
            class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
          >
            {{ e.notes }}
          </p>
          <Message
            v-for="msg in warningsById.get(e.id) ?? []"
            :key="msg"
            severity="warn"
            size="small"
            variant="simple"
          >
            {{ msg }}
          </Message>
        </RecordCard>
      </div>
    </template>
  </div>

  <ProductionEntryDialog
    v-if="entryDialogVisible"
    v-model="entryDraft"
    v-model:visible="entryDialogVisible"
    @save="appendEntry"
  />
</template>

<style scoped>
.add-entry-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.add-entry-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.add-entry-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}
</style>
