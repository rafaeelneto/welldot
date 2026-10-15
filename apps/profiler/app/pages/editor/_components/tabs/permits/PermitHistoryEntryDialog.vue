<script setup lang="ts">
import type { PermitHistoryEntry } from '@welldot/core';
import PermitHistoryEntryFields from './PermitHistoryEntryFields.vue';

/**
 * Adds or edits one entry of a permit's `history` (.well v2.3) outside the
 * permit dialog — opened from the permit view's timeline. Edits a copy and
 * hands it back on save.
 */
const visible = defineModel<boolean>('visible', { default: false });

/** Entry to edit; absent opens the dialog in "add" mode. */
const props = defineProps<{ entry?: PermitHistoryEntry }>();

const emit = defineEmits<{ save: [entry: PermitHistoryEntry] }>();

const { t } = useI18n();

const isEdit = computed(() => !!props.entry);

function copyOf(e: PermitHistoryEntry | undefined): PermitHistoryEntry {
  return e
    ? {
        ...e,
        ...(e.attachments && {
          attachments: e.attachments.map(a => ({ ...a })),
        }),
      }
    : {
        id: crypto.randomUUID(),
        date: toCalendarDate(new Date()),
        description: '',
      };
}

const draft = ref<PermitHistoryEntry>(copyOf(props.entry));

watch(visible, open => {
  if (open) draft.value = copyOf(props.entry);
});

const isValid = computed(
  () => !!draft.value.date && !!draft.value.description.trim(),
);

function save() {
  if (!isValid.value) return;
  const { attachments, ...rest } = draft.value;
  emit('save', {
    ...rest,
    description: rest.description.trim(),
    ...(attachments?.length && { attachments }),
    updated_at: new Date().toISOString(),
  });
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      isEdit
        ? t('editor.operation.permit.history.editTitle')
        : t('editor.operation.permit.history.addTitle')
    "
    :style="{ width: '100vw', maxWidth: '40rem' }"
    :breakpoints="{ '640px': '100vw' }"
  >
    <div class="flex flex-col gap-3 pt-2">
      <p class="text-xs text-content-400 m-0">
        {{ t('editor.operation.permit.history.info') }}
      </p>
      <PermitHistoryEntryFields v-model="draft" />
    </div>

    <template #footer>
      <Button
        :label="t('editor.confirmClear.reject')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="t('editor.operation.permit.history.save')"
        :disabled="!isValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
