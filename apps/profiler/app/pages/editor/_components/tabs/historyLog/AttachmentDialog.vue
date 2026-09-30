<script setup lang="ts">
import type { Attachment } from '@welldot/core';

/** The attachment being edited. `null` means "adding a new one". */
const model = defineModel<Attachment | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [attachment: Attachment] }>();

const { t } = useI18n();

const mediaTypeOptions = [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'Word', value: 'application/msword' },
  { label: 'Other', value: 'application/octet-stream' },
];

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  url: '',
  filename: '',
  mediaType: 'application/pdf',
});

watch(visible, open => {
  if (open) seedForm(model.value);
});

function seedForm(attachment: Attachment | null) {
  form.url = attachment?.uri ?? '';
  form.filename = attachment?.filename ?? '';
  form.mediaType = attachment?.media_type ?? 'application/pdf';
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
    filename: form.filename.trim() || undefined,
  };
  const current = model.value;

  const next: Attachment = current
    ? {
        id: current.id,
        description: current.description,
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

      <LabeledField :label="t('editor.historyLog.logs.fields.attachmentFilename')">
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
