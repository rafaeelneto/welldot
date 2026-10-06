<script setup lang="ts">
import type { Attachment, HistoryLogEntry } from '@welldot/core';
import { formatISO } from 'date-fns';
import AttachmentField from '~/components/attachments/AttachmentField.vue';

/** The entry being edited. `null` means "adding a new one". */
const model = defineModel<HistoryLogEntry | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [entry: HistoryLogEntry] }>();

const { t } = useI18n();
const { categoryOptions, severityOptions } = useHistoryLogCategories();

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  category: '' as string,
  datetime: null as Date | null,
  description: '',
  author: '',
  severity: '' as string,
  attachments: [] as Attachment[],
});

/**
 * `permit_condition` entries are created from the Operation › Permits tab,
 * which sets the permit references; offer it here only when editing one.
 */
const selectableCategories = computed(() =>
  categoryOptions.value.filter(
    o =>
      o.value !== 'permit_condition' ||
      model.value?.category === 'permit_condition',
  ),
);

const isFormValid = computed(
  () => !!form.category && !!form.datetime && !!form.description.trim(),
);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(entry: HistoryLogEntry | null) {
  form.category = entry?.category ?? 'event';
  form.datetime = entry ? new Date(entry.datetime) : new Date();
  form.description = entry?.description ?? '';
  form.author = entry?.author ?? '';
  form.severity = entry?.severity ?? '';
  form.attachments = (entry?.attachments ?? []).map(a => ({ ...a }));
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
    // Keep the local offset: a `permit_condition` deadline is judged by the
    // local date written in the instant.
    datetime: formatISO(form.datetime!),
    description: form.description.trim(),
    author: form.author.trim() || undefined,
    severity: form.severity || undefined,
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
    updated_at: new Date().toISOString(),
  };
  // Category-specific fields MUST be absent on entries of other categories.
  if (next.category !== 'permit_condition') {
    delete next.permit_id;
    delete next.condition_id;
    delete next.due_date;
  }

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
            v-for="opt in selectableCategories"
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
        <AttachmentField v-model="form.attachments" context="history" />
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
</style>
