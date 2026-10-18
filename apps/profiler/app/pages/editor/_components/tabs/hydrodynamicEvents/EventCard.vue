<script setup lang="ts">
import type { Attachment, HydrodynamicEvent } from '@welldot/core';
import { getRetractedEventIds } from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
import EventSparkline from './charts/EventSparkline.vue';
import EventStats from './EventStats.vue';

const props = defineProps<{ event: HydrodynamicEvent }>();
const emit = defineEmits<{
  view: [id: string];
  edit: [event: HydrodynamicEvent];
}>();

const { t } = useI18n();
const profileStore = useProfileStore();
const confirm = useConfirm();
const { eventTypeLabel, eventTypeSeverity, loggerSeriesFacts } =
  useHydrodynamicEventTypes();

const loggerFacts = computed(() =>
  isLoggerSeries(props.event) ? loggerSeriesFacts(props.event) : [],
);

/** Retracted by a later event's `corrects` — kept, but excluded from derivations. */
const isRetracted = computed(() =>
  getRetractedEventIds(profileStore.well).has(props.event.id),
);

function setAttachments(list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.hydrodynamic_events?.find(e => e.id === props.event.id),
      list,
    );
  });
}

function deleteEvent() {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.hydrodynamicEvents.deleteConfirm'),
    message: t('editor.hydrodynamicEvents.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.hydrodynamic_events = draft.hydrodynamic_events?.filter(
          e => e.id !== props.event.id,
        );
      });
    },
  });
}

const meta = computed(() => [
  !!props.event.operator && `${t('editor.record.by')} ${props.event.operator}`,
]);

const actions = computed<RecordAction[]>(() => [
  {
    key: 'view',
    label: t('editor.hydrodynamicEvents.view.open'),
    icon: 'ph:eye-duotone',
    onClick: () => emit('view', props.event.id),
  },
  // The parent routes a logger series to its own dialog.
  {
    key: 'edit',
    label: t('editor.edit'),
    ariaLabel: isLoggerSeries(props.event)
      ? t('editor.hydrodynamicEvents.logger.editSeries')
      : t('editor.hydrodynamicEvents.editEvent'),
    icon: 'ph:pencil-simple-duotone',
    onClick: () => emit('edit', props.event),
  },
  {
    key: 'delete',
    label: t('editor.hydrodynamicEvents.deleteConfirm'),
    icon: 'ph:x-bold',
    severity: 'danger',
    onClick: deleteEvent,
  },
]);
</script>

<template>
  <RecordCard
    :dimmed="isRetracted && 'strong'"
    :date="formatDate(event.datetime, 'dd/MM/yyyy HH:mm')"
    :meta="meta"
    :actions="actions"
  >
    <template #tags>
      <Tag
        :value="eventTypeLabel(event.type)"
        :severity="eventTypeSeverity(event.type)"
        class="text-[11px] font-mono tracking-wide"
      />
      <Tag
        v-if="isRetracted"
        v-tooltip.top="t('editor.hydrodynamicEvents.retractedInfo')"
        :value="t('editor.hydrodynamicEvents.retracted')"
        severity="secondary"
        class="text-[11px]"
      />
      <Tag
        v-if="event.corrects"
        v-tooltip.top="t('editor.hydrodynamicEvents.correctionInfo')"
        :value="t('editor.hydrodynamicEvents.correction')"
        severity="info"
        class="text-[11px]"
      />
    </template>

    <EventStats :event="event" />

    <dl
      v-if="loggerFacts.length"
      class="m-0 flex flex-wrap gap-x-6 gap-y-2 text-xs"
    >
      <div v-for="f in loggerFacts" :key="f.label" class="flex flex-col">
        <dt class="text-content-400">{{ f.label }}</dt>
        <dd class="m-0 text-content-100" :class="{ 'font-mono': f.mono }">
          {{ f.value }}
        </dd>
      </div>
    </dl>

    <EventSparkline
      :event="event"
      class="mt-1"
      @click="emit('view', event.id)"
    />

    <!-- equipment / recovery -->
    <div
      v-if="event.equipment || recoveryReadingsCount(event)"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-300"
    >
      <span v-if="event.equipment" class="flex items-center gap-1.5">
        <Icon name="ph:toolbox-duotone" class="size-3.5 text-content-400" />
        {{ t('editor.hydrodynamicEvents.fields.equipment') }}:
        {{ event.equipment }}
      </span>
      <span v-if="recoveryReadingsCount(event)">
        {{ t('editor.hydrodynamicEvents.stats.recovery') }}:
        {{ recoveryReadingsCount(event) }}
        {{ t('editor.hydrodynamicEvents.stats.readings') }}
      </span>
    </div>

    <p
      v-if="event.notes"
      class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
    >
      {{ event.notes }}
    </p>

    <AttachmentField
      :model-value="event.attachments"
      context="event"
      confirm-delete
      @update:model-value="setAttachments"
    />
  </RecordCard>
</template>
