<script setup lang="ts">
import type {
  Attachment,
  HistoryLogEntry,
  Permit,
  PermitCondition,
} from '@welldot/core';
import { formatISO } from 'date-fns';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import { sampleLabel } from '~/utils/waterQualityVocab';

/**
 * Records the fulfillment of one condition deadline as a `history_logs`
 * entry of category `permit_condition` (.well v2.3).
 */
const visible = defineModel<boolean>('visible', { default: false });

const props = defineProps<{
  permit: Permit;
  condition: PermitCondition;
  /** The deadline fulfilled. Absent for an undated condition. */
  dueDate?: string;
}>();

const emit = defineEmits<{ save: [entry: HistoryLogEntry] }>();

const { t } = useI18n();
const profileStore = useProfileStore();

/** Samples that can evidence a `water_quality_analysis` condition. */
const sampleOptions = computed(() =>
  [...(profileStore.well.water_samples ?? [])]
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .map(s => ({ value: s.id, label: `${sampleLabel(s, t)} (${s.id})` })),
);
const showSampleField = computed(
  () =>
    props.condition.category === 'water_quality_analysis' &&
    sampleOptions.value.length > 0,
);

const form = reactive({
  datetime: new Date() as Date | null,
  description: '',
  author: '',
  attachments: [] as Attachment[],
  sampleId: null as string | null,
});

watch(
  visible,
  open => {
    if (!open) return;
    form.datetime = new Date();
    form.description = t('editor.operation.permit.fulfill.defaultDescription', {
      condition: props.condition.description,
    });
    form.author = '';
    form.attachments = [];
    form.sampleId = null;
  },
  { immediate: true },
);

const isFormValid = computed(
  () => !!form.datetime && !!form.description.trim(),
);

function save() {
  if (!isFormValid.value) return;
  const now = new Date().toISOString();
  const entry: HistoryLogEntry = {
    id: crypto.randomUUID(),
    // Local offset kept: the deadline is judged by the local date written here.
    datetime: formatISO(form.datetime!),
    category: 'permit_condition',
    description: form.description.trim(),
    permit_id: props.permit.id,
    condition_id: props.condition.id,
    ...(props.dueDate && { due_date: props.dueDate }),
    ...(form.author.trim() && { author: form.author.trim() }),
    ...(form.sampleId && { sample_id: form.sampleId }),
    ...(form.attachments.length && {
      attachments: form.attachments.map(a => ({ ...a })),
    }),
    updated_at: now,
  };
  emit('save', entry);
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('editor.operation.permit.fulfill.title')"
    :style="{ width: '100vw', maxWidth: '32rem' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1 text-sm">
        <span class="text-content-0">{{ condition.description }}</span>
        <span v-if="dueDate" class="font-mono text-xs text-content-400">
          {{ t('editor.operation.permit.fulfill.deadline') }}
          {{ formatCalendarDate(dueDate) }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField :label="t('editor.operation.permit.fulfill.datetime')">
          <DatePicker
            v-model="form.datetime"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.historyLog.logs.fields.author')">
          <InputText v-model="form.author" class="w-full" />
        </LabeledField>
      </div>

      <LabeledField
        v-if="showSampleField"
        :label="t('editor.historyLog.logs.fields.sample')"
        :info="t('editor.operation.permit.fulfill.sampleInfo')"
      >
        <Select
          v-model="form.sampleId"
          :options="sampleOptions"
          option-label="label"
          option-value="value"
          show-clear
          filter
          class="w-full"
        />
      </LabeledField>

      <LabeledField :label="t('editor.operation.permit.fulfill.description')">
        <Textarea v-model="form.description" :rows="3" class="w-full text-sm" />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.attachments')">
        <AttachmentField v-model="form.attachments" context="condition" />
      </LabeledField>

      <p class="text-xs text-content-400 m-0">
        {{ t('editor.operation.permit.fulfill.info') }}
      </p>
    </div>

    <template #footer>
      <Button
        :label="t('editor.confirmClear.reject')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="t('editor.operation.permit.conditions.markFulfilled')"
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
