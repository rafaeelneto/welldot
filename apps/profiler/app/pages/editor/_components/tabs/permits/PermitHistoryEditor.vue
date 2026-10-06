<script setup lang="ts">
import type { PermitHistoryEntry } from '@welldot/core';
import PermitHistoryEntryFields from './PermitHistoryEntryFields.vue';

/**
 * Inline list editor for a permit's `history` (process steps, notifications,
 * fees…), used inside the permit dialog. Rows are edited in place on the
 * dialog's local copy and listed newest first.
 */
const history = defineModel<PermitHistoryEntry[]>({ required: true });

const { t } = useI18n();

const sorted = computed(() =>
  [...history.value].sort((a, b) => b.date.localeCompare(a.date)),
);

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

    <PermitHistoryEntryFields
      v-for="h in sorted"
      :key="h.id"
      :model-value="h"
      class="rounded-lg border border-surface-200/70 bg-surface-50 p-3"
    >
      <template #actions>
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
      </template>
    </PermitHistoryEntryFields>

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
