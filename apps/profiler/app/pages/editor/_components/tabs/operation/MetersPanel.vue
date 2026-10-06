<script setup lang="ts">
import type { Attachment, Meter, MeterReading } from '@welldot/core';
import {
  getCurrentMeters,
  getOperationWarnings,
  getRetractedProductionIds,
  type OperationWarningCode,
} from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import { resolveMeterTypeLabel } from '~/utils/operationVocab';
import MeterDialog from './MeterDialog.vue';

const { t } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { formatDiameter, formatVolume } = useUnitFormat();

/** Warning codes shown on the meter cards; reading codes live in Production. */
const METER_WARNING_CODES: readonly OperationWarningCode[] = [
  'meter_removed_before_installed',
  'overlapping_meters',
  'duplicate_meter_id',
];

// ─── Meters ───────────────────────────────────────────────────────────────────

const meters = computed<Meter[]>(() =>
  [...(profileStore.well.meters ?? [])].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  ),
);

const currentIds = computed(
  () => new Set(getCurrentMeters(profileStore.well).map(m => m.id)),
);

/** Effective readings per meter id, newest first. */
const readingsByMeter = computed(() => {
  const retracted = getRetractedProductionIds(profileStore.well);
  const map = new Map<string, MeterReading[]>();
  for (const e of profileStore.well.production ?? []) {
    if (e.type !== 'meter_reading' || retracted.has(e.id)) continue;
    const r = e as MeterReading;
    const list = map.get(r.meter_id) ?? [];
    list.push(r);
    map.set(r.meter_id, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime() ||
        (b.sequence ?? 0) - (a.sequence ?? 0),
    );
  }
  return map;
});

/** Warning messages per meter id, for the card badges. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of getOperationWarnings(profileStore.well)) {
    if (!METER_WARNING_CODES.includes(w.code)) continue;
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

const meterDraft = ref<Meter | null>(null);
const meterDialogVisible = ref(false);

function addMeter() {
  meterDraft.value = null;
  meterDialogVisible.value = true;
}

function editMeter(m: Meter) {
  meterDraft.value = m;
  meterDialogVisible.value = true;
}

function upsertMeter(m: Meter) {
  profileStore.updateWell(draft => {
    if (!draft.meters) draft.meters = [];
    const idx = draft.meters.findIndex(e => e.id === m.id);
    if (idx === -1) draft.meters.push(m);
    else draft.meters[idx] = m;
  });
}

function deleteMeter(id: string) {
  const hasReadings = (profileStore.well.production ?? []).some(
    e => e.type === 'meter_reading' && (e as MeterReading).meter_id === id,
  );
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.operation.meter.deleteConfirm'),
    message: hasReadings
      ? t('editor.operation.meter.deleteConfirmWithReadings')
      : t('editor.operation.meter.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.meters = draft.meters?.filter(e => e.id !== id);
        if (!draft.meters?.length) delete draft.meters;
      });
    },
  });
}

// ─── Attachments on saved meters ──────────────────────────────────────────────

function setAttachments(id: string, list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.meters?.find(m => m.id === id),
      list,
    );
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function specs(m: Meter) {
  const last = readingsByMeter.value.get(m.id)?.[0];
  return [
    {
      label: t('editor.operation.meter.fields.nominalDiameter'),
      value:
        m.nominal_diameter != null ? formatDiameter(m.nominal_diameter) : null,
    },
    {
      label: t('editor.operation.meter.fields.maxReading'),
      value: m.max_reading != null ? formatVolume(m.max_reading, 0) : null,
    },
    {
      label: t('editor.operation.meter.lastReading'),
      value: last
        ? `${formatVolume(last.reading)} · ${formatDate(last.datetime, 'dd/MM/yyyy')}`
        : null,
    },
  ].filter(s => s.value);
}

function equipmentName(m: Meter): string {
  return [m.manufacturer, m.model].filter(Boolean).join(' ');
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <h3
      class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
    >
      {{ t('editor.operation.meter.title') }}
    </h3>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.operation.meter.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.operation.meter.add')"
        @click="addMeter"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!meters.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:gauge-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.operation.meter.empty') }}</p>
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="m in meters"
        :key="m.id"
        class="rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
        :class="{ 'opacity-75': m.removed_at }"
      >
        <!-- header -->
        <div class="flex items-center flex-wrap gap-2">
          <Tag
            v-if="currentIds.has(m.id)"
            :value="t('editor.operation.meter.current')"
            severity="success"
            class="text-[11px]"
          />
          <Tag
            v-else-if="m.removed_at"
            :value="t('editor.operation.meter.removed')"
            severity="secondary"
            class="text-[11px]"
          />
          <span class="text-sm font-medium text-content-0">
            {{
              m.type
                ? resolveMeterTypeLabel(m.type, t)
                : t('editor.operation.meter.untyped')
            }}
          </span>
          <span class="ml-auto font-mono text-xs text-content-300">
            {{ formatDate(m.installed_at, 'dd/MM/yyyy') }}
            <template v-if="m.removed_at">
              → {{ formatDate(m.removed_at, 'dd/MM/yyyy') }}
            </template>
          </span>
        </div>

        <!-- equipment -->
        <div
          v-if="equipmentName(m) || m.serial"
          class="flex items-center gap-2 text-xs text-content-300"
        >
          <span v-if="equipmentName(m)">{{ equipmentName(m) }}</span>
          <span v-if="m.serial" class="font-mono text-content-400">
            S/N {{ m.serial }}
          </span>
        </div>

        <!-- specs -->
        <div
          v-if="specs(m).length"
          class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2"
        >
          <div v-for="s in specs(m)" :key="s.label" class="flex flex-col">
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

        <!-- warnings -->
        <Message
          v-for="msg in warningsById.get(m.id) ?? []"
          :key="msg"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ msg }}
        </Message>

        <p
          v-if="m.notes"
          class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
        >
          {{ m.notes }}
        </p>

        <!-- attachments -->
        <AttachmentField
          :model-value="m.attachments"
          context="meter"
          confirm-delete
          @update:model-value="setAttachments(m.id, $event)"
        />

        <!-- footer -->
        <div
          class="flex items-center justify-end gap-2 pt-1 border-t border-surface-100"
        >
          <Button
            severity="secondary"
            text
            size="small"
            :label="t('editor.edit')"
            :aria-label="t('editor.operation.meter.edit')"
            @click="editMeter(m)"
          >
            <template #icon>
              <Icon name="ph:pencil-simple-duotone" />
            </template>
          </Button>
          <Button
            severity="danger"
            text
            size="small"
            :aria-label="t('editor.operation.meter.deleteConfirm')"
            @click="deleteMeter(m.id)"
          >
            <template #icon>
              <Icon name="ph:x-bold" />
            </template>
          </Button>
        </div>
      </div>
    </div>
  </div>

  <MeterDialog
    v-if="meterDialogVisible"
    v-model="meterDraft"
    v-model:visible="meterDialogVisible"
    @save="upsertMeter"
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
