<script setup lang="ts">
import type { Attachment, HistoryLogEntry, WellStatus } from '@welldot/core';
import { MAINTENANCE_TYPES } from '@welldot/core';
import { formatISO } from 'date-fns';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  WELL_STATUS_VALUES,
  meterLabel,
  pumpInstallationLabel,
  resolveWellStatusLabel,
} from '~/utils/operationVocab';
import { sampleLabel } from '~/utils/waterQualityVocab';

/** The entry being edited. `null` means "adding a new one". */
const model = defineModel<HistoryLogEntry | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [entry: HistoryLogEntry] }>();

const { t, locale } = useI18n();
const { vocabOptions } = useVocab();
const { categoryOptions, severityOptions } = useHistoryLogCategories();
const { eventTypeLabel } = useHydrodynamicEventTypes();
const profileStore = useProfileStore();

// ─── Category-specific options (.well v2.3) ──────────────────────────────────

const maintenanceTypeOptions = computed(() => vocabOptions(MAINTENANCE_TYPES));
const statusOptions = computed(() =>
  WELL_STATUS_VALUES.map(value => ({
    value,
    label: resolveWellStatusLabel(value, t),
  })),
);
const pumpOptions = computed(() =>
  (profileStore.well.pump_installations ?? []).map(p => ({
    value: p.id,
    label: pumpInstallationLabel(p, locale.value),
  })),
);
const meterOptions = computed(() =>
  (profileStore.well.meters ?? []).map(m => ({
    value: m.id,
    label: meterLabel(m, t, locale.value),
  })),
);
const eventOptions = computed(() =>
  [...(profileStore.well.hydrodynamic_events ?? [])]
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .map(e => ({
      value: e.id,
      label: `${eventTypeLabel(e.type)} · ${formatDate(e.datetime, 'dd/MM/yyyy')}`,
    })),
);

const sampleOptions = computed(() =>
  [...(profileStore.well.water_samples ?? [])]
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .map(s => ({
      value: s.id,
      label: `${sampleLabel(s, locale.value)} (${s.id})`,
    })),
);

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  category: '' as string,
  datetime: null as Date | null,
  description: '',
  author: '',
  severity: '' as string,
  attachments: [] as Attachment[],
  // Data links, any category
  hydrodynamicEventIds: [] as string[],
  sampleIds: [] as string[],
  // `maintenance`
  maintenanceType: null as string | null,
  pumpInstallationId: null as string | null,
  meterId: null as string | null,
  // `status_change`
  status: null as WellStatus | null,
});

const isFormValid = computed(
  () =>
    !!form.category &&
    !!form.datetime &&
    !!form.description.trim() &&
    (form.category !== 'status_change' || !!form.status),
);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(entry: HistoryLogEntry | null) {
  form.category = entry?.category ?? 'event';
  form.datetime = entry ? new Date(entry.datetime) : new Date();
  form.description = entry?.description ?? '';
  form.author = entry?.author ?? '';
  form.severity = entry?.severity ?? '';
  form.attachments = (entry?.attachments ?? []).map(a => ({ ...a }));
  form.hydrodynamicEventIds = [...(entry?.hydrodynamic_event_ids ?? [])];
  form.sampleIds = [...(entry?.sample_ids ?? [])];
  form.maintenanceType = entry?.maintenance_type ?? null;
  form.pumpInstallationId = entry?.pump_installation_id ?? null;
  form.meterId = entry?.meter_id ?? null;
  form.status = entry?.status ?? null;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Writes the edited copy back through the model and signals the commit with
 * `save`. The bound entry is spread first so fields the form does not cover
 * survive the round-trip.
 */
function saveEntry() {
  if (!isFormValid.value) return;

  const next: HistoryLogEntry = {
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    category: form.category,
    // Keep the local offset written by the user.
    datetime: formatISO(form.datetime!),
    description: form.description.trim(),
    author: form.author.trim() || undefined,
    severity: form.severity || undefined,
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
    hydrodynamic_event_ids: form.hydrodynamicEventIds.length
      ? [...form.hydrodynamicEventIds]
      : undefined,
    sample_ids: form.sampleIds.length ? [...form.sampleIds] : undefined,
    updated_at: new Date().toISOString(),
  };
  if (next.category === 'maintenance') {
    next.maintenance_type = form.maintenanceType?.trim() || undefined;
    next.pump_installation_id = form.pumpInstallationId || undefined;
    next.meter_id = form.meterId || undefined;
  }
  if (next.category === 'status_change') {
    next.status = form.status ?? undefined;
  }
  // Category-specific fields MUST be absent on entries of other categories.
  if (next.category !== 'maintenance') {
    delete next.maintenance_type;
    delete next.pump_installation_id;
    delete next.meter_id;
  }
  if (next.category !== 'status_change') delete next.status;
  for (const key of Object.keys(next) as (keyof HistoryLogEntry)[]) {
    if (next[key] === undefined) delete next[key];
  }

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
        ? t('editor.historyLog.logs.editEvent')
        : t('editor.historyLog.logs.addEvent')
    "
    :style="{ width: '100vw', maxWidth: '36rem' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <LabeledField :label="t('editor.historyLog.logs.fields.category')">
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in categoryOptions"
            :key="opt.value"
            :for="`cat-${opt.value}`"
            class="category-radio-option"
            :class="{ active: form.category === opt.value }"
          >
            <RadioButton
              v-model="form.category"
              :input-id="`cat-${opt.value}`"
              :value="opt.value"
              class="sr-only"
            />
            <Icon :name="opt.icon" class="size-4 shrink-0" />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </LabeledField>

      <!-- ── maintenance: structured fields (optional — legacy logs lack them) -->
      <div
        v-if="form.category === 'maintenance'"
        class="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <LabeledField
          :label="t('editor.historyLog.logs.fields.maintenanceType')"
          class="sm:col-span-2"
        >
          <Select
            v-model="form.maintenanceType"
            :options="maintenanceTypeOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          v-if="pumpOptions.length"
          :label="t('editor.historyLog.logs.fields.pumpInstallation')"
        >
          <Select
            v-model="form.pumpInstallationId"
            :options="pumpOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          v-if="meterOptions.length"
          :label="t('editor.historyLog.logs.fields.meter')"
        >
          <Select
            v-model="form.meterId"
            :options="meterOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full"
          />
        </LabeledField>
      </div>

      <!-- ── data links (any category, .well v2.3) ─────────────────────── -->
      <LabeledField
        v-if="eventOptions.length || form.hydrodynamicEventIds.length"
        :label="t('editor.historyLog.logs.fields.events')"
        :info="t('editor.historyLog.logs.fields.eventsInfo')"
      >
        <TagSelect
          v-model="form.hydrodynamicEventIds"
          :options="eventOptions"
          :placeholder="t('editor.historyLog.logs.fields.addEvent')"
          :remove-label="t('editor.historyLog.logs.fields.removeLink')"
          filter
        />
      </LabeledField>
      <LabeledField
        v-if="sampleOptions.length || form.sampleIds.length"
        :label="t('editor.historyLog.logs.fields.samples')"
        :info="t('editor.historyLog.logs.fields.samplesInfo')"
      >
        <TagSelect
          v-model="form.sampleIds"
          :options="sampleOptions"
          :placeholder="t('editor.historyLog.logs.fields.addSample')"
          :remove-label="t('editor.historyLog.logs.fields.removeLink')"
          filter
        />
      </LabeledField>

      <!-- ── status_change: required status (closed vocabulary) ─────────── -->
      <LabeledField
        v-if="form.category === 'status_change'"
        :label="t('editor.historyLog.logs.fields.status')"
        :info="t('editor.historyLog.logs.fields.statusInfo')"
      >
        <Select
          v-model="form.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :invalid="!form.status"
          class="w-full"
        />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.datetime')">
        <DatePicker
          v-model="form.datetime"
          show-time
          hour-format="24"
          show-button-bar
          date-format="dd/mm/yy"
          class="w-full"
          :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
        />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.description')">
        <Textarea
          v-model="form.description"
          :rows="5"
          class="w-full font-mono text-sm"
        />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.author')">
        <InputText v-model="form.author" class="w-full" />
      </LabeledField>

      <!-- ── Attachments ────────────────────────────────────────────────── -->
      <LabeledField :label="t('editor.historyLog.logs.fields.attachments')">
        <AttachmentField v-model="form.attachments" context="history" />
      </LabeledField>

      <LabeledField :label="t('editor.historyLog.logs.fields.severity')">
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in severityOptions"
            :key="opt.value"
            :for="`sev-${opt.value}`"
            class="category-radio-option"
            :class="{ active: form.severity === opt.value }"
          >
            <RadioButton
              v-model="form.severity"
              :input-id="`sev-${opt.value}`"
              :value="opt.value"
              class="sr-only"
            />
            <span>{{ opt.label }}</span>
          </label>
        </div>
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
        :label="model ? t('editor.save') : t('editor.historyLog.logs.addEvent')"
        :disabled="!isFormValid"
        @click="saveEntry"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.category-radio-option {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.category-radio-option:hover {
  background: var(--color-surface-100);
  color: var(--color-content-100);
  border-color: var(--color-surface-300);
}

.category-radio-option.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-color: var(--color-primary-300);
}
</style>
