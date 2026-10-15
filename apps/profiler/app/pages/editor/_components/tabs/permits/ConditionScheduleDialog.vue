<script setup lang="ts">
import type {
  ConditionFulfillment,
  Permit,
  PermitCondition,
  Well,
} from '@welldot/core';
import { getConditionDeadlineStates, todayCalendarDate } from '@welldot/utils';
import ConditionDeadlineList from './ConditionDeadlineList.vue';
import ConditionFulfillDialog from './ConditionFulfillDialog.vue';

/**
 * Full deadline schedule of one condition while the permit is being edited
 * (opened from ConditionEditor). Deadlines are generated against the draft
 * permit, and fulfillments are handed back to the editor, which writes them
 * on the draft condition — they are saved with the permit.
 */
const visible = defineModel<boolean>('visible', { default: false });

const props = defineProps<{
  condition: PermitCondition;
  /** The permit as currently edited. */
  permit: Permit;
  /** The well with `permit` in place. */
  well: Well;
}>();

const emit = defineEmits<{
  fulfill: [fulfillment: ConditionFulfillment];
  undo: [fulfillmentId: string];
}>();

const { t } = useI18n();

const today = todayCalendarDate();

const states = computed(() =>
  getConditionDeadlineStates(props.well, props.permit, props.condition, {
    today,
  }),
);

const counts = computed(() => ({
  fulfilled: states.value.filter(
    s => s.status === 'fulfilled' || s.status === 'fulfilled_late',
  ).length,
  total: states.value.length,
}));

/** An undated condition with no fulfillment yet can still be marked done. */
const canFulfillUndated = computed(
  () =>
    !props.condition.first_due &&
    !props.condition.due_after &&
    !states.value.length,
);

const fulfillDueDate = ref<string | undefined>();
const fulfillVisible = ref(false);

function openFulfill(dueDate: string | undefined) {
  fulfillDueDate.value = dueDate;
  fulfillVisible.value = true;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('editor.operation.permit.conditions.schedule')"
    :style="{ width: '100vw', maxWidth: '40rem' }"
    :breakpoints="{ '640px': '100vw' }"
  >
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex items-start gap-3">
        <span class="flex-1 min-w-0 text-sm text-content-0 whitespace-pre-line">
          {{
            condition.description.trim() ||
            t('editor.operation.permit.conditions.description')
          }}
        </span>
        <span
          v-if="counts.total"
          class="shrink-0 font-mono text-xs text-content-300"
        >
          {{
            t('editor.operation.permit.view.fulfilledCount', {
              done: counts.fulfilled,
              total: counts.total,
            })
          }}
        </span>
      </div>

      <ConditionDeadlineList
        :condition="condition"
        :states="states"
        class="rounded-lg border border-surface-200/70 bg-surface-50 px-3"
        @fulfill="openFulfill"
        @undo="emit('undo', $event)"
      />

      <p
        v-if="!states.length && !canFulfillUndated"
        class="m-0 text-xs text-content-400"
      >
        {{ t('editor.operation.permit.conditions.previewNone') }}
      </p>
      <Button
        v-if="canFulfillUndated"
        severity="success"
        text
        size="small"
        class="self-start"
        :label="t('editor.operation.permit.conditions.markFulfilled')"
        @click="openFulfill(undefined)"
      >
        <template #icon>
          <Icon name="ph:check-circle-duotone" />
        </template>
      </Button>

      <p class="m-0 text-xs text-content-400">
        {{ t('editor.operation.permit.conditions.scheduleInfo') }}
      </p>
    </div>

    <template #footer>
      <Button
        :label="t('editor.operation.permit.view.close')"
        severity="secondary"
        text
        @click="visible = false"
      />
    </template>
  </Dialog>

  <ConditionFulfillDialog
    v-if="fulfillVisible"
    v-model:visible="fulfillVisible"
    :permit="permit"
    :condition="condition"
    :due-date="fulfillDueDate"
    @save="emit('fulfill', $event)"
  />
</template>
