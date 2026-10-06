<script setup lang="ts">
import type { PermitHistoryEntry } from '@welldot/core';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  PERMIT_HISTORY_TYPE_VALUES,
  resolvePermitHistoryTypeLabel,
} from '~/utils/permitVocab';

/**
 * Form fields for one permit `history` entry, edited in place on the bound
 * object. Shared by the permit dialog's inline list (PermitHistoryEditor) and
 * the single-entry dialog opened from the permit view. The `actions` slot sits
 * next to the "done" checkbox (e.g. the list's remove button).
 */
const entry = defineModel<PermitHistoryEntry>({ required: true });

const { t } = useI18n();

const typeOptions = computed(() =>
  PERMIT_HISTORY_TYPE_VALUES.map(value => ({
    value,
    label: resolvePermitHistoryTypeLabel(value, t),
  })),
);

function setDate(key: 'date' | 'due_date', d: Date | null) {
  if (d) entry.value[key] = toCalendarDate(d);
  else if (key === 'due_date') delete entry.value.due_date;
}

function setType(value: string | null) {
  if (value?.trim()) entry.value.type = value.trim();
  else delete entry.value.type;
}

/** `done` is meaningful only for actionable steps; unchecked keeps it explicit. */
function setDone(value: boolean) {
  entry.value.done = value;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
      <LabeledField :label="t('editor.operation.permit.history.date')">
        <DatePicker
          :model-value="fromCalendarDate(entry.date)"
          date-format="dd/mm/yy"
          class="w-full"
          :invalid="!entry.date"
          :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          @update:model-value="setDate('date', $event as Date | null)"
        />
      </LabeledField>
      <LabeledField :label="t('editor.operation.permit.history.type')">
        <Select
          :model-value="entry.type ?? null"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          editable
          show-clear
          class="w-full"
          @update:model-value="setType($event)"
        />
      </LabeledField>
      <LabeledField
        :label="t('editor.operation.permit.history.dueDate')"
        :info="t('editor.operation.permit.history.dueDateInfo')"
      >
        <DatePicker
          :model-value="fromCalendarDate(entry.due_date)"
          date-format="dd/mm/yy"
          show-button-bar
          class="w-full"
          :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          @update:model-value="setDate('due_date', $event as Date | null)"
        />
      </LabeledField>
      <div class="flex items-center justify-between gap-2 pb-2">
        <label
          class="flex items-center gap-2 text-sm text-content-100 cursor-pointer"
        >
          <Checkbox
            :model-value="entry.done === true"
            binary
            @update:model-value="setDone($event)"
          />
          {{ t('editor.operation.permit.history.done') }}
        </label>
        <slot name="actions" />
      </div>
    </div>

    <LabeledField :label="t('editor.operation.permit.history.description')">
      <Textarea
        v-model="entry.description"
        :rows="2"
        auto-resize
        class="w-full text-sm"
        :invalid="!entry.description.trim()"
      />
    </LabeledField>

    <AttachmentField v-model="entry.attachments" context="permit_history" />
  </div>
</template>
