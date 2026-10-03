<script setup lang="ts">
import type { Attachment, HydrodynamicEvent } from '@welldot/core';
import { getRetractedEventIds } from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import EventStats from './EventStats.vue';

const props = defineProps<{ event: HydrodynamicEvent }>();
const emit = defineEmits<{ edit: [event: HydrodynamicEvent] }>();

const { t } = useI18n();
const profileStore = useProfileStore();
const confirm = useConfirm();
const { eventTypeLabel, eventTypeSeverity } = useHydrodynamicEventTypes();

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
</script>

<template>
  <div class="event-card" :class="{ 'opacity-60': isRetracted }">
    <!-- card header -->
    <div class="flex items-center gap-2 flex-wrap">
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
      <span class="ml-auto font-mono text-xs text-content-300">
        {{ formatDate(event.datetime, 'dd MMM yyyy') }}
      </span>
      <Button
        severity="secondary"
        text
        size="small"
        :label="t('editor.edit')"
        @click="emit('edit', event)"
      >
        <template #icon>
          <Icon name="ph:pencil-simple-duotone" />
        </template>
      </Button>
    </div>

    <EventStats :event="event" />

    <!-- sparkline chart -->
    <svg
      v-if="hasSparkline(event)"
      class="w-full mt-1 text-primary-400"
      height="56"
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
    >
      <polyline
        :points="sparklinePoints(event)"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>

    <!-- footer -->
    <div
      class="flex items-center gap-3 pt-2 border-t border-surface-100 text-[11px] text-content-400 flex-wrap"
    >
      <template
        v-if="event.operator || event.equipment || recoveryReadingsCount(event)"
      >
        <span v-if="event.operator">
          <strong class="font-semibold text-content-200">Operador</strong>
          {{ event.operator }}
        </span>
        <span v-if="event.equipment">
          <strong class="font-semibold text-content-200">Equip.</strong>
          {{ event.equipment }}
        </span>
        <span v-if="recoveryReadingsCount(event)">
          <strong class="font-semibold text-content-200">
            {{ t('editor.hydrodynamicEvents.stats.recovery') }}
          </strong>
          {{ recoveryReadingsCount(event) }}
          {{ t('editor.hydrodynamicEvents.stats.readings') }}
        </span>
      </template>
      <div class="ml-auto shrink-0">
        <Button severity="danger" text size="small" @click="deleteEvent">
          <template #icon>
            <Icon name="ph:x-bold" />
          </template>
        </Button>
      </div>
    </div>

    <!-- notes -->
    <p
      v-if="event.notes"
      class="text-xs text-content-300 m-0 leading-relaxed pt-1"
    >
      {{ event.notes }}
    </p>

    <AttachmentField
      :model-value="event.attachments"
      context="event"
      confirm-delete
      @update:model-value="setAttachments"
    />
  </div>
</template>

<style scoped>
.event-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-0);
}
</style>
