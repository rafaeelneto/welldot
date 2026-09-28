<script setup lang="ts">
import type { Attachment, HistoryLogEntry } from '@welldot/core';
import { useConfirm } from 'primevue/useconfirm';
import AppChip from '~/components/AppChip.vue';
import AttachmentDialog from './historyLog/AttachmentDialog.vue';
import LogEntryDialog from './historyLog/LogEntryDialog.vue';

const { t } = useI18n();
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
const {
  attachmentIcon,
  attachmentLabel,
  copiedAttachmentId,
  copyAttachmentPath,
} = useAttachmentDisplay();

// ─── Dialog bindings — the dialogs edit a copy and hand it back on save ──────

/** Entry passed to the entry dialog; null opens it in "add" mode. */
const entryDraft = ref<HistoryLogEntry | null>(null);
const entryDialogVisible = ref(false);

/** Attachment passed to the file dialog, plus the entry it belongs to. */
const attachmentDraft = ref<Attachment | null>(null);
const attachmentDialogVisible = ref(false);
const attachmentTargetEntryId = ref<string>('');

function addEntry() {
  entryDraft.value = null;
  entryDialogVisible.value = true;
}

function editEntry(entry: HistoryLogEntry) {
  entryDraft.value = entry;
  entryDialogVisible.value = true;
}

function addAttachment(entryId: string) {
  attachmentTargetEntryId.value = entryId;
  attachmentDraft.value = null;
  attachmentDialogVisible.value = true;
}

function editAttachment(entryId: string, attachment: Attachment) {
  attachmentTargetEntryId.value = entryId;
  attachmentDraft.value = attachment;
  attachmentDialogVisible.value = true;
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

// ─── Attachment expand ────────────────────────────────────────────────────────

const VISIBLE_ATTACHMENTS = 3;
const expandedAttachments = ref(new Set<string>());

function toggleAttachments(id: string) {
  if (expandedAttachments.value.has(id)) {
    expandedAttachments.value.delete(id);
  } else {
    expandedAttachments.value.add(id);
  }
  expandedAttachments.value = new Set(expandedAttachments.value);
}

function visibleAttachments(entry: HistoryLogEntry): Attachment[] {
  const list = entry.attachments ?? [];
  if (expandedAttachments.value.has(entry.id)) return list;
  return list.slice(0, VISIBLE_ATTACHMENTS);
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

function upsertStoredAttachment(attachment: Attachment) {
  profileStore.updateWell(draft => {
    const entry = draft.history_logs?.find(
      e => e.id === attachmentTargetEntryId.value,
    );
    if (!entry) return;
    if (!entry.attachments) entry.attachments = [];

    const idx = entry.attachments.findIndex(a => a.id === attachment.id);
    if (idx === -1) entry.attachments.push(attachment);
    else entry.attachments[idx] = attachment;
  });
}

function deleteAttachment(entryId: string, attachmentId: string) {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.historyLog.logs.deleteAttachment'),
    message: t('editor.historyLog.logs.deleteAttachment'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        const entry = draft.history_logs?.find(e => e.id === entryId);
        if (entry) {
          entry.attachments = entry.attachments?.filter(
            a => a.id !== attachmentId,
          );
        }
      });
    },
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
        <div
          class="flex-1 rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
        >
          <!-- ── header row: tags + date ─────────────────────────────────── -->
          <div class="flex items-center flex-wrap gap-2">
            <Tag
              :value="categoryLabel(entry.category)"
              :severity="categorySeverity(entry.category)"
              class="text-[11px]"
            />
            <Tag
              v-if="entry.severity"
              :value="severityLabel(entry.severity)"
              :severity="severityToChip(entry.severity)"
              class="text-[11px]"
            />
            <span class="ml-auto font-mono text-xs text-content-300">
              {{ formatDate(entry.datetime, 'dd/MM/yyyy HH:mm') }}
            </span>
          </div>

          <!-- ── description ────────────────────────────────────────────── -->
          <div class="flex flex-col gap-1">
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

          <!-- ── attachments section ────────────────────────────────────── -->
          <div class="flex flex-col gap-2">
            <!-- label row -->
            <div class="flex items-center gap-2">
              <span
                class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
              >
                {{
                  t('editor.historyLog.logs.attachments', {
                    n: (entry.attachments ?? []).length,
                  })
                }}
              </span>
              <button
                class="add-attachment-btn"
                type="button"
                @click="addAttachment(entry.id)"
              >
                <Icon name="ph:plus" class="size-3" />
                {{ t('editor.historyLog.logs.addAttachment') }}
              </button>
            </div>

            <!-- thumbnail strip -->
            <div
              v-if="(entry.attachments ?? []).length"
              class="flex flex-wrap gap-2"
            >
              <div
                v-for="att in visibleAttachments(entry)"
                :key="att.id"
                class="attachment-thumb"
              >
                <Icon
                  :name="attachmentIcon(att.media_type)"
                  class="size-5 text-content-300 shrink-0"
                />
                <span
                  class="font-mono text-[10px] text-content-300 truncate flex-1 min-w-0"
                  :title="att.uri"
                >
                  {{ attachmentLabel(att) }}
                </span>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    class="thumb-action"
                    type="button"
                    :aria-label="t('editor.historyLog.logs.copyPath')"
                    :title="
                      copiedAttachmentId === att.id
                        ? t('editor.historyLog.logs.copied')
                        : t('editor.historyLog.logs.copyPath')
                    "
                    @click="copyAttachmentPath(att)"
                  >
                    <Icon
                      :name="
                        copiedAttachmentId === att.id
                          ? 'ph:check-bold'
                          : 'ph:copy-duotone'
                      "
                      class="size-3"
                    />
                  </button>
                  <button
                    class="thumb-action"
                    type="button"
                    :aria-label="t('editor.historyLog.logs.editAttachment')"
                    @click="editAttachment(entry.id, att)"
                  >
                    <Icon name="ph:pencil-simple-duotone" class="size-3" />
                  </button>
                  <button
                    class="thumb-action thumb-action--danger"
                    type="button"
                    :aria-label="t('editor.historyLog.logs.deleteAttachment')"
                    @click="deleteAttachment(entry.id, att.id)"
                  >
                    <Icon name="ph:trash-duotone" class="size-3" />
                  </button>
                </div>
              </div>

              <!-- overflow / show more -->
              <button
                v-if="(entry.attachments ?? []).length > VISIBLE_ATTACHMENTS"
                class="attachment-overflow-btn"
                type="button"
                @click="toggleAttachments(entry.id)"
              >
                <span v-if="!expandedAttachments.has(entry.id)">
                  +{{ (entry.attachments?.length ?? 0) - VISIBLE_ATTACHMENTS }}
                  {{ t('editor.historyLog.logs.showMore') }}
                </span>
                <span v-else>{{ t('editor.historyLog.logs.showLess') }}</span>
              </button>
            </div>
          </div>

          <!-- ── footer row: author + actions ───────────────────────────── -->
          <div class="flex items-center gap-2 pt-1 border-t border-surface-100">
            <div
              class="flex items-center gap-2 flex-1 text-xs text-content-400"
            >
              <span v-if="entry.author">
                {{ t('editor.historyLog.logs.by') }} {{ entry.author }}
              </span>
              <span
                v-if="showEditedAt(entry)"
                :class="{ 'before:content-[\'·\'] before:mr-2': entry.author }"
              >
                {{
                  t('editor.historyLog.logs.editedAt', {
                    date: formatDate(entry.updated_at, 'dd/MM/yyyy'),
                  })
                }}
              </span>
            </div>
            <Button
              severity="secondary"
              text
              size="small"
              :label="t('editor.edit')"
              :aria-label="t('editor.historyLog.logs.editEvent')"
              @click="editEntry(entry)"
            >
              <template #icon>
                <Icon name="ph:pencil-simple-duotone" />
              </template>
            </Button>
            <Button
              severity="danger"
              text
              size="small"
              :aria-label="t('editor.historyLog.logs.deleteConfirm')"
              @click="deleteEntry(entry.id)"
            >
              <template #icon>
                <Icon name="ph:x-bold" />
              </template>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <LogEntryDialog
    v-if="entryDialogVisible"
    v-model="entryDraft"
    v-model:visible="entryDialogVisible"
    @save="upsertEntry"
  />
  <AttachmentDialog
    v-if="attachmentDialogVisible"
    v-model="attachmentDraft"
    v-model:visible="attachmentDialogVisible"
    @save="upsertStoredAttachment"
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

.add-attachment-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: transparent;
  color: var(--color-content-400);
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.add-attachment-btn:hover {
  background: var(--color-surface-50);
  color: var(--color-content-200);
  border-color: var(--color-surface-400);
}

.attachment-thumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-50);
  max-width: 200px;
  min-width: 120px;
}

.thumb-action {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  border-radius: 4px;
  color: var(--color-content-400);
  cursor: pointer;
  transition:
    color 100ms ease,
    background 100ms ease;
}

.thumb-action:hover {
  background: var(--color-surface-100);
  color: var(--color-content-100);
}

.thumb-action--danger:hover {
  background: color-mix(in srgb, var(--color-error-500) 10%, transparent);
  color: var(--color-error-500);
}

.attachment-overflow-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px dashed var(--color-surface-300);
  background: transparent;
  color: var(--color-content-400);
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.attachment-overflow-btn:hover {
  background: var(--color-surface-50);
  color: var(--color-primary-500);
}
</style>
