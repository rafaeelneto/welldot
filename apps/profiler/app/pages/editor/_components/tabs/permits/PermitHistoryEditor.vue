<script setup lang="ts">
import type { PermitHistoryEntry } from '@welldot/core';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  PERMIT_HISTORY_TYPE_VALUES,
  resolvePermitHistoryTypeLabel,
} from '~/utils/permitVocab';

/**
 * Inline list editor for a permit's `history` (process steps, notifications,
 * fees…), used inside the permit dialog. Rows are edited in place on the
 * dialog's local copy and listed newest first.
 */
const history = defineModel<PermitHistoryEntry[]>({ required: true });

const { t } = useI18n();

const typeOptions = computed(() =>
  PERMIT_HISTORY_TYPE_VALUES.map(value => ({
    value,
    label: resolvePermitHistoryTypeLabel(value, t),
  })),
);

const sorted = computed(() =>
  [...history.value].sort((a, b) => b.date.localeCompare(a.date)),
);

function setDate(
  h: PermitHistoryEntry,
  key: 'date' | 'due_date',
  d: Date | null,
) {
  if (d) h[key] = toCalendarDate(d);
  else if (key === 'due_date') delete h.due_date;
}

function setType(h: PermitHistoryEntry, value: string | null) {
  if (value?.trim()) h.type = value.trim();
  else delete h.type;
}

/** `done` is meaningful only for actionable steps; unchecked keeps it explicit. */
function setDone(h: PermitHistoryEntry, value: boolean) {
  h.done = value;
}

function add() {
  history.value = [
    ...history.value,
    {
      id: crypto.randomUUID(),
      date: toCalendarDate(new Date()),
      description: '',
    },
  ];
}

function remove(id: string) {
  history.value = history.value.filter(h => h.id !== id);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="!history.length" class="text-xs text-content-400 m-0">
      {{ t('editor.operation.permit.history.empty') }}
    </p>

    <div
      v-for="h in sorted"
      :key="h.id"
      class="rounded-lg border border-surface-200/70 bg-surface-50 p-3 flex flex-col gap-3"
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <LabeledField :label="t('editor.operation.permit.history.date')">
          <DatePicker
            :model-value="fromCalendarDate(h.date)"
            date-format="dd/mm/yy"
            class="w-full"
            :invalid="!h.date"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            @update:model-value="setDate(h, 'date', $event as Date | null)"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.permit.history.type')">
          <Select
            :model-value="h.type ?? null"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
            @update:model-value="setType(h, $event)"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.permit.history.dueDate')"
          :info="t('editor.operation.permit.history.dueDateInfo')"
        >
          <DatePicker
            :model-value="fromCalendarDate(h.due_date)"
            date-format="dd/mm/yy"
            show-button-bar
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            @update:model-value="setDate(h, 'due_date', $event as Date | null)"
          />
        </LabeledField>
        <div class="flex items-center justify-between gap-2 pb-2">
          <label
            class="flex items-center gap-2 text-sm text-content-100 cursor-pointer"
          >
            <Checkbox
              :model-value="h.done === true"
              binary
              @update:model-value="setDone(h, $event)"
            />
            {{ t('editor.operation.permit.history.done') }}
          </label>
          <Button
            severity="danger"
            text
            size="small"
            :aria-label="t('editor.operation.permit.history.remove')"
            @click="remove(h.id)"
          >
            <template #icon>
              <Icon name="ph:x-bold" />
            </template>
          </Button>
        </div>
      </div>

      <LabeledField :label="t('editor.operation.permit.history.description')">
        <Textarea
          v-model="h.description"
          :rows="2"
          auto-resize
          class="w-full text-sm"
          :invalid="!h.description.trim()"
        />
      </LabeledField>

      <AttachmentField v-model="h.attachments" context="permit_history" />
    </div>

    <Button
      severity="secondary"
      text
      size="small"
      class="self-start"
      :label="t('editor.operation.permit.history.add')"
      @click="add"
    >
      <template #icon>
        <Icon name="ph:plus" />
      </template>
    </Button>
  </div>
</template>
