<script setup lang="ts">
import type { ConditionFulfillment, PermitCondition } from '@welldot/core';
import type { ConditionDeadlineState } from '@welldot/utils';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import { DEADLINE_STATUS_SEVERITY } from '~/utils/permitVocab';
import { sampleLabel } from '~/utils/waterQualityVocab';

/**
 * Full deadline schedule of one permit condition: every generated deadline
 * with its status and, when fulfilled, the fulfillment record. Emits
 * `fulfill` / `undo` so the caller decides where the change is written (the
 * store from the permit view, the draft from the permit dialog).
 */
const props = defineProps<{
  condition: PermitCondition;
  states: ConditionDeadlineState[];
}>();

const emit = defineEmits<{
  fulfill: [dueDate: string | undefined];
  undo: [fulfillmentId: string];
}>();

const { t } = useI18n();
const profileStore = useProfileStore();
const { eventTypeLabel } = useHydrodynamicEventTypes();

function fulfillmentOf(
  id: string | undefined,
): ConditionFulfillment | undefined {
  return id ? props.condition.fulfillments?.find(f => f.id === id) : undefined;
}

/** Linked evidence of a fulfillment: hydrodynamic event and/or water sample. */
function evidence(f: ConditionFulfillment): string | null {
  const well = profileStore.well;
  const event = f.event_id
    ? well.hydrodynamic_events?.find(e => e.id === f.event_id)
    : undefined;
  const sample = f.sample_id
    ? well.water_samples?.find(s => s.id === f.sample_id)
    : undefined;
  return (
    [
      event
        ? `${eventTypeLabel(event.type)} · ${formatDate(event.datetime, 'dd/MM/yyyy')}`
        : f.event_id,
      sample ? sampleLabel(sample, t) : f.sample_id,
    ]
      .filter(Boolean)
      .join(' · ') || null
  );
}

/**
 * Deadlines that get the full "Mark fulfilled" button: every overdue one and
 * the next upcoming one. Later deadlines get an icon-only button.
 */
const nextUpcoming = computed(
  () => props.states.find(s => s.status === 'upcoming')?.due_date,
);

function isPrimary(s: ConditionDeadlineState): boolean {
  return (
    s.status === 'overdue' ||
    (s.status === 'upcoming' && s.due_date === nextUpcoming.value)
  );
}
</script>

<template>
  <ul v-if="states.length" class="m-0 p-0 list-none flex flex-col">
    <li
      v-for="s in states"
      :key="s.due_date ?? s.fulfillment_id"
      class="flex flex-col gap-1.5 border-t border-surface-200 py-2 first:border-t-0"
    >
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-mono text-content-100 w-24 shrink-0">
          {{
            s.due_date
              ? formatCalendarDate(s.due_date)
              : t('editor.operation.permit.conditions.undated')
          }}
        </span>
        <Tag
          :value="
            t(`editor.operation.permit.conditions.deadlineStatus.${s.status}`)
          "
          :severity="DEADLINE_STATUS_SEVERITY[s.status] ?? 'secondary'"
          class="text-[10px]"
        />
        <template v-if="fulfillmentOf(s.fulfillment_id)">
          <span class="font-mono text-content-300">
            {{
              formatDate(
                fulfillmentOf(s.fulfillment_id)!.datetime,
                'dd/MM/yyyy HH:mm',
              )
            }}
          </span>
          <span
            v-if="fulfillmentOf(s.fulfillment_id)!.author"
            class="flex items-center gap-1 text-content-300"
          >
            <Icon name="ph:user-duotone" class="size-3" />
            {{ fulfillmentOf(s.fulfillment_id)!.author }}
          </span>
        </template>
        <Button
          v-if="!s.fulfillment_id"
          v-tooltip.left="
            isPrimary(s)
              ? undefined
              : t('editor.operation.permit.conditions.markFulfilled')
          "
          severity="success"
          text
          size="small"
          class="ml-auto"
          :label="
            isPrimary(s)
              ? t('editor.operation.permit.conditions.markFulfilled')
              : undefined
          "
          :aria-label="t('editor.operation.permit.conditions.markFulfilled')"
          @click="emit('fulfill', s.due_date)"
        >
          <template #icon>
            <Icon name="ph:check-circle-duotone" />
          </template>
        </Button>
        <Button
          v-else
          v-tooltip.left="t('editor.operation.permit.conditions.undoFulfilled')"
          severity="secondary"
          text
          size="small"
          class="ml-auto"
          :aria-label="t('editor.operation.permit.conditions.undoFulfilled')"
          @click="emit('undo', s.fulfillment_id)"
        >
          <template #icon>
            <Icon name="ph:arrow-counter-clockwise" />
          </template>
        </Button>
      </div>
      <template v-if="fulfillmentOf(s.fulfillment_id)">
        <p
          v-if="fulfillmentOf(s.fulfillment_id)!.description"
          class="m-0 text-xs text-content-200 whitespace-pre-line sm:pl-26"
        >
          {{ fulfillmentOf(s.fulfillment_id)!.description }}
        </p>
        <span
          v-if="evidence(fulfillmentOf(s.fulfillment_id)!)"
          class="flex items-center gap-1.5 text-[11px] text-content-400 sm:pl-26"
        >
          <Icon name="ph:link-duotone" class="size-3.5" />
          {{ evidence(fulfillmentOf(s.fulfillment_id)!) }}
        </span>
        <div class="sm:pl-26">
          <AttachmentField
            :model-value="fulfillmentOf(s.fulfillment_id)!.attachments"
            readonly
          />
        </div>
      </template>
    </li>
  </ul>
</template>
