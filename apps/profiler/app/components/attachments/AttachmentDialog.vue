<script setup lang="ts">
import type { Attachment, DocumentTypeContext } from '@welldot/core';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_SUGGESTIONS,
  vocabValues,
} from '@welldot/core';

const props = withDefaults(
  defineProps<{
    /** Where the attachment lives — orders the suggested `document_type`s first. */
    context?: DocumentTypeContext;
  }>(),
  { context: 'history' },
);

/** The attachment being edited. `null` means "adding a new one". */
const model = defineModel<Attachment | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [attachment: Attachment] }>();

const { t } = useI18n();
const { vocabLabel } = useVocab();

const mediaTypeOptions = computed(() => [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'Word', value: 'application/msword' },
  {
    label: t('editor.attachments.mediaTypeOther'),
    value: 'application/octet-stream',
  },
]);

/**
 * Suggested values for this context first, then the rest of the vocabulary.
 * A non-canonical value already on the attachment is kept as an option so
 * editing never silently drops it.
 */
const documentTypeOptions = computed(() => {
  const suggested: readonly string[] = DOCUMENT_TYPE_SUGGESTIONS[props.context];
  const ordered = [
    ...suggested,
    ...vocabValues(DOCUMENT_TYPES).filter(v => !suggested.includes(v)),
  ];
  const current = model.value?.document_type;
  if (current && !ordered.includes(current)) ordered.push(current);
  return ordered.map(value => ({
    value,
    label: vocabLabel(DOCUMENT_TYPES, value),
  }));
});

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  url: '',
  filename: '',
  mediaType: 'application/pdf',
  documentType: null as string | null,
  description: '',
});

// `immediate` so a dialog mounted already open (behind `v-if`) still seeds.
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(attachment: Attachment | null) {
  form.url = attachment?.uri ?? '';
  form.filename = attachment?.filename ?? '';
  form.mediaType = attachment?.media_type ?? 'application/pdf';
  form.documentType = attachment?.document_type ?? null;
  form.description = attachment?.description ?? '';
}

/**
 * Writes the edited copy back through the model and signals the commit with
 * `save`. The result always carries an id — the original when updating, a fresh
 * one when adding — so callers can handle it uniformly: upsert by id. `sha256`
 * is dropped when the URI changed: the old hash no longer describes the target.
 */
function save() {
  const uri = form.url.trim();
  if (!uri) return;

  const patch = {
    uri,
    media_type: form.mediaType,
    document_type: form.documentType || undefined,
    filename: form.filename.trim() || undefined,
    description: form.description.trim() || undefined,
  };
  const current = model.value;

  const next: Attachment = current
    ? {
        ...current,
        sha256: current.uri === uri ? current.sha256 : undefined,
        ...patch,
      }
    : { id: crypto.randomUUID(), ...patch };

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
        ? t('editor.historyLog.logs.editAttachment')
        : t('editor.historyLog.logs.addAttachment')
    "
    :style="{ width: '28rem' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <LabeledField :label="t('editor.historyLog.logs.fields.attachmentUrl')">
        <InputText
          v-model="form.url"
          class="w-full font-mono text-sm"
          placeholder="https://"
        />
      </LabeledField>

      <LabeledField
        :label="t('editor.attachments.documentType')"
        :info="t('editor.attachments.documentTypeInfo')"
      >
        <Select
          v-model="form.documentType"
          :options="documentTypeOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('editor.attachments.documentTypePlaceholder')"
          show-clear
          class="w-full"
        />
      </LabeledField>

      <LabeledField
        :label="t('editor.historyLog.logs.fields.attachmentFilename')"
      >
        <InputText v-model="form.filename" class="w-full" />
      </LabeledField>

      <LabeledField
        :label="t('editor.historyLog.logs.fields.attachmentMediaType')"
      >
        <Select
          v-model="form.mediaType"
          :options="mediaTypeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </LabeledField>

      <LabeledField :label="t('editor.attachments.description')">
        <Textarea v-model="form.description" :rows="2" class="w-full text-sm" />
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
        :label="
          model ? t('editor.save') : t('editor.historyLog.logs.addAttachment')
        "
        :disabled="!form.url.trim()"
        @click="save"
      />
    </template>
  </Dialog>
</template>
