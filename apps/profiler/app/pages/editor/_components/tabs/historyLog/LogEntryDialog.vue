<script setup lang="ts">
import type { Attachment, HistoryLogEntry } from '@welldot/core';
import AttachmentDialog from './AttachmentDialog.vue';

/** The entry being edited. `null` means "adding a new one". */
const model = defineModel<HistoryLogEntry | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [entry: HistoryLogEntry] }>();

const { t } = useI18n();
const { categoryOptions, severityOptions } = useHistoryLogCategories();
const {
  attachmentIcon,
  attachmentLabel,
  copiedAttachmentId,
  copyAttachmentPath,
} = useAttachmentDisplay();

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  category: '' as string,
  datetime: null as Date | null,
  description: '',
  author: '',
  severity: '' as string,
  attachments: [] as Attachment[],
});

const isFormValid = computed(
  () => !!form.category && !!form.datetime && !!form.description.trim(),
);

watch(visible, open => {
  if (open) seedForm(model.value);
});

function seedForm(entry: HistoryLogEntry | null) {
  form.category = entry?.category ?? 'event';
  form.datetime = entry ? new Date(entry.datetime) : new Date();
  form.description = entry?.description ?? '';
  form.author = entry?.author ?? '';
  form.severity = entry?.severity ?? '';
  form.attachments = (entry?.attachments ?? []).map(a => ({ ...a }));
}

// ─── Draft attachments — local until the entry is saved ───────────────────────

const attachmentDraft = ref<Attachment | null>(null);
const attachmentDialogVisible = ref(false);

function addAttachment() {
  attachmentDraft.value = null;
  attachmentDialogVisible.value = true;
}

function editAttachment(attachment: Attachment) {
  attachmentDraft.value = attachment;
  attachmentDialogVisible.value = true;
}

function upsertDraftAttachment(attachment: Attachment) {
  const idx = form.attachments.findIndex(a => a.id === attachment.id);
  if (idx === -1) form.attachments.push(attachment);
  else form.attachments[idx] = attachment;
}

function removeDraftAttachment(attachmentId: string) {
  form.attachments = form.attachments.filter(a => a.id !== attachmentId);
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Writes the edited copy back through the model and signals the commit with
 * `save`. The bound entry is spread first so fields the form does not cover
 * survive the round-trip.
 */
function saveEntry() {
  if (!isFormValid.value) return;

  const next: HistoryLogEntry = {
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    category: form.category,
    datetime: form.datetime!.toISOString(),
    description: form.description.trim(),
    author: form.author.trim() || undefined,
    severity: form.severity || undefined,
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
    updated_at: new Date().toISOString(),
  };

  model.value = next;
  emit('save', next);
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      model
        ? t('editor.historyLog.logs.editEvent')
        : t('editor.historyLog.logs.addEvent')
    "
    :style="{ width: '100vw', maxWidth: '36rem' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <LabeledField :label="t('editor.historyLog.logs.fields.category')">
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in categoryOptions"
            :key="opt.value"
            :for="`cat-${opt.value}`"
            class="category-radio-option"
            :class="{ active: form.category === opt.value }"
          >
            <RadioButton
              v-model="form.category"
              :input-id="`cat-${opt.value}`"
              :value="opt.value"
              class="sr-only"
            />
            <Icon :name="opt.icon" class="size-4 shrink-0" />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.datetime')">
        <DatePicker
          v-model="form.datetime"
          show-time
          hour-format="24"
          show-button-bar
          date-format="dd/mm/yy"
          class="w-full"
          :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
        />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.description')">
        <Textarea
          v-model="form.description"
          :rows="5"
          class="w-full font-mono text-sm"
        />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.author')">
        <InputText v-model="form.author" class="w-full" />
      </LabeledField>

      <!-- ── Attachments ────────────────────────────────────────────────── -->
      <LabeledField :label="t('editor.historyLog.logs.fields.attachments')">
        <div class="flex flex-col gap-2">
          <div
            v-for="att in form.attachments"
            :key="att.id"
            class="attachment-row"
          >
            <Icon
              :name="attachmentIcon(att.media_type)"
              class="size-5 text-content-300 shrink-0"
            />
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs text-content-100 truncate">
                {{ attachmentLabel(att) }}
              </span>
              <span
                class="attachment-row__uri font-mono text-content-400 truncate"
              >
                {{ att.uri }}
              </span>
            </div>
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
                  class="size-3.5"
                />
              </button>
              <button
                class="thumb-action"
                type="button"
                :aria-label="t('editor.historyLog.logs.editAttachment')"
                @click="editAttachment(att)"
              >
                <Icon name="ph:pencil-simple-duotone" class="size-3.5" />
              </button>
              <button
                class="thumb-action thumb-action--danger"
                type="button"
                :aria-label="t('editor.historyLog.logs.deleteAttachment')"
                @click="removeDraftAttachment(att.id)"
              >
                <Icon name="ph:trash-duotone" class="size-3.5" />
              </button>
            </div>
          </div>

          <p
            v-if="!form.attachments.length"
            class="text-xs text-content-400 m-0"
          >
            {{ t('editor.historyLog.logs.noAttachments') }}
          </p>

          <button
            class="add-attachment-btn"
            type="button"
            @click="addAttachment"
          >
            <Icon name="ph:plus" class="size-3" />
            {{ t('editor.historyLog.logs.addAttachment') }}
          </button>
        </div>
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.severity')">
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in severityOptions"
            :key="opt.value"
            :for="`sev-${opt.value}`"
            class="category-radio-option"
            :class="{ active: form.severity === opt.value }"
          >
            <RadioButton
              v-model="form.severity"
              :input-id="`sev-${opt.value}`"
              :value="opt.value"
              class="sr-only"
            />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </LabeledField>
    </div>

    <template #footer>
      <Button
        :label="t('editor.confirmClear.reject')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="model ? t('editor.save') : t('editor.historyLog.logs.addEvent')"
        :disabled="!isFormValid"
        @click="saveEntry"
      />
    </template>
  </Dialog>

  <AttachmentDialog
    v-model="attachmentDraft"
    v-model:visible="attachmentDialogVisible"
    @save="upsertDraftAttachment"
  />
</template>

<style scoped>
.category-radio-option {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.category-radio-option:hover {
  background: var(--color-surface-100);
  color: var(--color-content-100);
  border-color: var(--color-surface-300);
}

.category-radio-option.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-color: var(--color-primary-300);
}

.attachment-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-50);
}

.attachment-row__uri {
  font-size: 10px;
}

.add-attachment-btn {
  align-self: flex-start;
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
</style>
