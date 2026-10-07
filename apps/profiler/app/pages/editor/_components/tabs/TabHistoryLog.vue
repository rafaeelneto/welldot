<script setup lang="ts">
import type { Attachment, HistoryLogEntry } from '@welldot/core';
import { MAINTENANCE_TYPES } from '@welldot/core';
import {
  getOperationWarnings,
  type OperationWarningCode,
} from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AppChip from '~/components/AppChip.vue';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
import {
  WELL_STATUS_SEVERITY,
  meterLabel,
  pumpInstallationLabel,
  resolveWellStatusLabel,
} from '~/utils/operationVocab';
import { sampleLabel } from '~/utils/waterQualityVocab';
import LogEntryDialog from './historyLog/LogEntryDialog.vue';

const { t, locale } = useI18n();
const { vocabLabel } = useVocab();
const profileStore = useProfileStore();
const confirm = useConfirm();
const {
  categoryOptions,
  categoryIcon,
  categoryLabel,
  categorySeverity,
  severityLabel,
  severityToChip,
} = useHistoryLogCategories();
const { eventTypeLabel } = useHydrodynamicEventTypes();

// ─── Dialog bindings — the dialogs edit a copy and hand it back on save ──────

/** Entry passed to the entry dialog; null opens it in "add" mode. */
const entryDraft = ref<HistoryLogEntry | null>(null);
const entryDialogVisible = ref(false);

function addEntry() {
  entryDraft.value = null;
  entryDialogVisible.value = true;
}

function editEntry(entry: HistoryLogEntry) {
  entryDraft.value = entry;
  entryDialogVisible.value = true;
}

// ─── Filter / search ──────────────────────────────────────────────────────────

const searchQuery = ref('');
const activeCategory = ref<string | null>(null);

const allLogs = computed<HistoryLogEntry[]>(() =>
  [...(profileStore.well.history_logs ?? [])].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  ),
);

const filteredLogs = computed<HistoryLogEntry[]>(() => {
  let result = allLogs.value;
  if (activeCategory.value) {
    result = result.filter(e => e.category === activeCategory.value);
  }
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(
      e =>
        e.description.toLowerCase().includes(q) ||
        e.author?.toLowerCase().includes(q) ||
        categoryLabel(e.category).toLowerCase().includes(q),
    );
  }
  return result;
});

function toggleCategory(cat: string) {
  activeCategory.value = activeCategory.value === cat ? null : cat;
}

/** Linked water sample (`sample_id`, .well v2.3), or the raw id when unresolved. */
function sampleRef(entry: HistoryLogEntry): string | null {
  if (!entry.sample_id) return null;
  const sample = profileStore.well.water_samples?.find(
    s => s.id === entry.sample_id,
  );
  return sample ? sampleLabel(sample, locale.value) : entry.sample_id;
}

// ─── maintenance / status_change (.well v2.3) ────────────────────────────────

/** "Pump service · Submersible Acme · 01/02/2024 · Constant rate · 03/02/2024". */
function maintenanceRef(entry: HistoryLogEntry): string | null {
  if (entry.category !== 'maintenance') return null;
  const well = profileStore.well;
  const pump = entry.pump_installation_id
    ? well.pump_installations?.find(p => p.id === entry.pump_installation_id)
    : undefined;
  const meter = entry.meter_id
    ? well.meters?.find(m => m.id === entry.meter_id)
    : undefined;
  const event = entry.event_id
    ? well.hydrodynamic_events?.find(e => e.id === entry.event_id)
    : undefined;
  return (
    [
      entry.maintenance_type
        ? vocabLabel(MAINTENANCE_TYPES, entry.maintenance_type)
        : null,
      pump
        ? pumpInstallationLabel(pump, locale.value)
        : entry.pump_installation_id,
      meter ? meterLabel(meter, t, locale.value) : entry.meter_id,
      event
        ? `${eventTypeLabel(event.type)} · ${formatDate(event.datetime, 'dd/MM/yyyy')}`
        : entry.event_id,
      sampleRef(entry),
    ]
      .filter(Boolean)
      .join(' · ') || null
  );
}

function statusSeverity(status: string): string {
  return (
    WELL_STATUS_SEVERITY[status as keyof typeof WELL_STATUS_SEVERITY] ??
    'secondary'
  );
}

const LOG_WARNING_CODES: readonly OperationWarningCode[] = [
  'log_category_field_mismatch',
  'log_reference_unresolved',
  'log_after_decommission',
  'missing_maintenance_type',
  'missing_status',
];

/** Warning messages per log entry id. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of getOperationWarnings(profileStore.well)) {
    if (!LOG_WARNING_CODES.includes(w.code)) continue;
    for (const id of w.ids) {
      const list = map.get(id) ?? [];
      const msg = t(`editor.operation.warnings.${w.code}`);
      if (!list.includes(msg)) list.push(msg);
      map.set(id, list);
    }
  }
  return map;
});

// ─── Description expand ───────────────────────────────────────────────────────

const expandedDescriptions = ref(new Set<string>());

function toggleDescription(id: string) {
  if (expandedDescriptions.value.has(id)) {
    expandedDescriptions.value.delete(id);
  } else {
    expandedDescriptions.value.add(id);
  }
  expandedDescriptions.value = new Set(expandedDescriptions.value);
}

function isDescriptionExpanded(id: string) {
  return expandedDescriptions.value.has(id);
}

// ─── Entries ──────────────────────────────────────────────────────────────────

/** Receives the edited entry back from the dialog and persists it. */
function upsertEntry(entry: HistoryLogEntry) {
  profileStore.updateWell(draft => {
    if (!draft.history_logs) draft.history_logs = [];
    const idx = draft.history_logs.findIndex(e => e.id === entry.id);
    if (idx === -1) draft.history_logs.push(entry);
    else draft.history_logs[idx] = entry;
  });
}

function deleteEntry(id: string) {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.historyLog.logs.deleteConfirm'),
    message: t('editor.historyLog.logs.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.history_logs = draft.history_logs?.filter(e => e.id !== id);
      });
    },
  });
}

// ─── Attachments on saved entries ─────────────────────────────────────────────

function setAttachments(entryId: string, list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.history_logs?.find(e => e.id === entryId),
      list,
    );
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function showEditedAt(entry: HistoryLogEntry): boolean {
  if (!entry.updated_at) return false;
  const diff = Math.abs(
    new Date(entry.updated_at).getTime() - new Date(entry.datetime).getTime(),
  );
  return diff > 60_000;
}

function entryMeta(entry: HistoryLogEntry): (string | false)[] {
  return [
    !!entry.author && `${t('editor.record.by')} ${entry.author}`,
    showEditedAt(entry) &&
      t('editor.historyLog.logs.editedAt', {
        date: formatDate(entry.updated_at, 'dd/MM/yyyy'),
      }),
  ];
}

function entryActions(entry: HistoryLogEntry): RecordAction[] {
  return [
    {
      key: 'edit',
      label: t('editor.edit'),
      ariaLabel: t('editor.historyLog.logs.editEvent'),
      icon: 'ph:pencil-simple-duotone',
      onClick: () => editEntry(entry),
    },
    {
      key: 'delete',
      label: t('editor.historyLog.logs.deleteConfirm'),
      icon: 'ph:x-bold',
      severity: 'danger',
      onClick: () => deleteEntry(entry.id),
    },
  ];
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.historyLog.logs.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500 tabular-nums"
      >
        {{ filteredLogs.length }}
        <span v-if="filteredLogs.length !== allLogs.length">
          / {{ allLogs.length }}</span
        >
        {{ t('editor.historyLog.logs.registries') }}
      </span>
    </div>

    <!-- ── Toolbar: search + add ──────────────────────────────────────────── -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1">
        <Icon
          name="ph:magnifying-glass-duotone"
          class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-content-400 pointer-events-none"
        />
        <InputText
          v-model="searchQuery"
          :placeholder="t('editor.historyLog.logs.search')"
          class="w-full pl-9"
        />
      </div>
      <Button
        unstyled
        class="add-entry-btn"
        type="button"
        :label="t('editor.historyLog.logs.addEvent')"
        @click="addEntry"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Category filter chips ──────────────────────────────────────────── -->
    <div class="flex flex-wrap gap-2">
      <AppChip
        v-for="opt in categoryOptions"
        :key="opt.value"
        :label="opt.label"
        :icon="opt.icon"
        :active="activeCategory === opt.value"
        @click="toggleCategory(opt.value)"
      />
    </div>

    <!-- ── Empty state ────────────────────────────────────────────────────── -->
    <div
      v-if="!allLogs.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon
        name="ph:clock-counter-clockwise-duotone"
        class="size-12 opacity-40"
      />
      <p class="text-sm">{{ t('editor.historyLog.logs.empty') }}</p>
    </div>

    <!-- ── No results ────────────────────────────────────────────────────── -->
    <div
      v-else-if="!filteredLogs.length"
      class="flex flex-col items-center gap-3 py-10 text-content-400"
    >
      <Icon name="ph:funnel-simple-duotone" class="size-10 opacity-40" />
      <p class="text-sm">{{ t('editor.historyLog.logs.noResults') }}</p>
    </div>

    <!-- ── Timeline ───────────────────────────────────────────────────────── -->
    <div v-else class="relative flex flex-col">
      <!-- vertical line -->
      <div class="absolute left-4.5 top-0 bottom-0 w-px bg-surface-200" />

      <div
        v-for="entry in filteredLogs"
        :key="entry.id"
        class="relative flex gap-4 pb-6 last:pb-0"
      >
        <!-- dot on timeline -->
        <div class="relative z-10 shrink-0 mt-1">
          <div
            class="size-9 rounded-full flex items-center justify-center bg-surface-100 border border-surface-200"
          >
            <Icon
              :name="categoryIcon(entry.category)"
              class="size-4 text-content-200"
            />
          </div>
        </div>

        <!-- card -->
        <RecordCard
          class="flex-1 min-w-0"
          :date="formatDate(entry.datetime, 'dd/MM/yyyy HH:mm')"
          :meta="entryMeta(entry)"
          :actions="entryActions(entry)"
        >
          <template #tags>
            <Tag
              :value="categoryLabel(entry.category)"
              :severity="categorySeverity(entry.category)"
              class="text-[11px]"
            />
            <Tag
              v-if="entry.category === 'status_change' && entry.status"
              :value="resolveWellStatusLabel(entry.status, t)"
              :severity="statusSeverity(entry.status)"
              class="text-[11px]"
            />
            <Tag
              v-if="entry.severity"
              :value="severityLabel(entry.severity)"
              :severity="severityToChip(entry.severity)"
              class="text-[11px]"
            />
          </template>

          <!-- ── description ────────────────────────────────────────────── -->
          <div class="flex flex-col gap-1">
            <span
              v-if="maintenanceRef(entry)"
              class="flex items-center gap-1.5 text-xs text-content-400"
            >
              <Icon name="ph:wrench-duotone" class="size-3.5 shrink-0" />
              {{ maintenanceRef(entry) }}
            </span>
            <p
              class="text-sm leading-relaxed whitespace-pre-line m-0 transition-all"
              :class="{ 'line-clamp-3': !isDescriptionExpanded(entry.id) }"
            >
              {{ entry.description }}
            </p>
            <button
              v-if="entry.description.length > 200"
              class="show-more-btn"
              type="button"
              @click="toggleDescription(entry.id)"
            >
              {{
                isDescriptionExpanded(entry.id)
                  ? t('editor.historyLog.logs.showLess')
                  : t('editor.historyLog.logs.showMore')
              }}
            </button>
          </div>

          <!-- ── warnings ────────────────────────────────────────────────── -->
          <Message
            v-for="msg in warningsById.get(entry.id) ?? []"
            :key="msg"
            severity="warn"
            size="small"
            variant="simple"
          >
            {{ msg }}
          </Message>

          <!-- ── attachments ─────────────────────────────────────────────── -->
          <AttachmentField
            :model-value="entry.attachments"
            context="history"
            confirm-delete
            @update:model-value="setAttachments(entry.id, $event)"
          />
        </RecordCard>
      </div>
    </div>
  </div>

  <LogEntryDialog
    v-if="entryDialogVisible"
    v-model="entryDraft"
    v-model:visible="entryDialogVisible"
    @save="upsertEntry"
  />
</template>

<style scoped>
.add-entry-btn {
  align-self: flex-start;
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

.add-entry-btn:active {
  transform: translateY(0.5px);
}

.add-entry-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}

.show-more-btn {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  font-family: var(--font-display);
  font-weight: 500;
  color: var(--color-primary-500);
  cursor: pointer;
  letter-spacing: 0.01em;
}

.show-more-btn:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}
</style>
