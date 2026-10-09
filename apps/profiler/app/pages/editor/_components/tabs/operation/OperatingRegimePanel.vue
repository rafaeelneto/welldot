<script setup lang="ts">
import type { OperatingRegime } from '@welldot/core';
import {
  getCurrentRegime,
  getOperationWarnings,
  type OperationWarningCode,
} from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
import RegimeDialog from './RegimeDialog.vue';

const { t } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { formatFlow, formatVolume } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const REGIME_WARNING_CODES: readonly OperationWarningCode[] = [
  'duplicate_regime_id',
  'regime_duplicate_effective_from',
  'regime_exceeds_permit',
];

// ─── Regimes ──────────────────────────────────────────────────────────────────

const regimes = computed<OperatingRegime[]>(() =>
  [...(profileStore.well.operating_regime ?? [])].sort(
    (a, b) =>
      new Date(b.effective_from).getTime() -
      new Date(a.effective_from).getTime(),
  ),
);

const currentRegimeId = computed(() => getCurrentRegime(profileStore.well)?.id);

/** Regimes not yet in effect are "scheduled"; earlier ones are superseded. */
const nowMs = Date.now();
const isScheduled = (r: OperatingRegime) =>
  new Date(r.effective_from).getTime() > nowMs;

/** Warning messages per regime id, for the card badges. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of getOperationWarnings(profileStore.well)) {
    if (!REGIME_WARNING_CODES.includes(w.code)) continue;
    for (const id of w.ids) {
      const list = map.get(id) ?? [];
      const msg = t(`editor.operation.warnings.${w.code}`);
      if (!list.includes(msg)) list.push(msg);
      map.set(id, list);
    }
  }
  return map;
});

// ─── Dialog ───────────────────────────────────────────────────────────────────

const regimeDraft = ref<OperatingRegime | null>(null);
const regimeDialogVisible = ref(false);

function addRegime() {
  regimeDraft.value = null;
  regimeDialogVisible.value = true;
}

function editRegime(r: OperatingRegime) {
  regimeDraft.value = r;
  regimeDialogVisible.value = true;
}

function upsertRegime(r: OperatingRegime) {
  profileStore.updateWell(draft => {
    if (!draft.operating_regime) draft.operating_regime = [];
    const idx = draft.operating_regime.findIndex(e => e.id === r.id);
    if (idx === -1) draft.operating_regime.push(r);
    else draft.operating_regime[idx] = r;
  });
}

function deleteRegime(id: string) {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.operation.regime.deleteConfirm'),
    message: t('editor.operation.regime.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.operating_regime = draft.operating_regime?.filter(
          e => e.id !== id,
        );
        if (!draft.operating_regime?.length) delete draft.operating_regime;
      });
    },
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function specs(r: OperatingRegime) {
  return [
    {
      label: t('editor.operation.regime.fields.flowRate'),
      value: r.flow_rate != null ? formatFlow(r.flow_rate) : null,
    },
    {
      label: t('editor.operation.regime.fields.dailyOperatingTime'),
      value:
        r.daily_operating_time != null
          ? `${formatNumber(r.daily_operating_time, { maximumFractionDigits: 2 })} h`
          : null,
    },
    {
      label: t('editor.operation.regime.fields.daysPerWeek'),
      value: r.days_per_week != null ? String(r.days_per_week) : null,
    },
    {
      label: t('editor.operation.regime.dailyVolume'),
      value:
        r.flow_rate != null && r.daily_operating_time != null
          ? formatVolume(r.flow_rate * r.daily_operating_time, 1)
          : null,
    },
  ].filter(s => s.value);
}

function actions(r: OperatingRegime): RecordAction[] {
  return [
    {
      key: 'edit',
      label: t('editor.edit'),
      ariaLabel: t('editor.operation.regime.edit'),
      icon: 'ph:pencil-simple-duotone',
      onClick: () => editRegime(r),
    },
    {
      key: 'delete',
      label: t('editor.operation.regime.deleteConfirm'),
      icon: 'ph:x-bold',
      severity: 'danger',
      onClick: () => deleteRegime(r.id),
    },
  ];
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <h3
      class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
    >
      {{ t('editor.operation.regime.title') }}
    </h3>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.operation.regime.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.operation.regime.add')"
        @click="addRegime"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!regimes.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:clock-clockwise-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.operation.regime.empty') }}</p>
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-3">
      <RecordCard
        v-for="r in regimes"
        :key="r.id"
        :dimmed="r.id !== currentRegimeId && !isScheduled(r)"
        :actions="actions(r)"
      >
        <template #tags>
          <Tag
            v-if="r.id === currentRegimeId"
            :value="t('editor.operation.regime.inForce')"
            severity="success"
            class="text-[11px]"
          />
          <Tag
            v-else-if="isScheduled(r)"
            :value="t('editor.operation.regime.scheduled')"
            severity="info"
            class="text-[11px]"
          />
          <span class="text-sm font-medium text-content-0">
            {{ t('editor.operation.regime.from') }}
            {{ formatDate(r.effective_from, 'dd/MM/yyyy HH:mm') }}
          </span>
        </template>

        <!-- specs -->
        <div
          v-if="specs(r).length"
          class="grid grid-cols-2 @lg:grid-cols-4 gap-x-4 gap-y-2"
        >
          <div v-for="s in specs(r)" :key="s.label" class="flex flex-col">
            <span
              class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
            >
              {{ s.label }}
            </span>
            <span class="font-mono text-sm text-content-100">
              {{ s.value }}
            </span>
          </div>
        </div>

        <p
          v-if="r.notes"
          class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
        >
          {{ r.notes }}
        </p>

        <!-- warnings -->
        <Message
          v-for="msg in warningsById.get(r.id) ?? []"
          :key="msg"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ msg }}
        </Message>
      </RecordCard>
    </div>
  </div>

  <RegimeDialog
    v-if="regimeDialogVisible"
    v-model="regimeDraft"
    v-model:visible="regimeDialogVisible"
    @save="upsertRegime"
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
