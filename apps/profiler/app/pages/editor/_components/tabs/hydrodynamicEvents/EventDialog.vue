<script setup lang="ts">
import {
  AirliftEventSchema,
  ConstantRateEventSchema,
  RecoveryOnlyEventSchema,
  SpotMeasurementEventSchema,
  StepDrawdownEventSchema,
  type HydrodynamicEvent,
} from '@welldot/core';
import type { WellGridColumn } from '~/components/DataGrid/types';

const { t } = useI18n();
const profileStore = useProfileStore();
const { typeOptions, measurementMethodOptions } = useHydrodynamicEventTypes();

// ─── Form types ───────────────────────────────────────────────────────────────

type FormReading = {
  elapsed: number | null;
  depth: number | null;
  depthPrecision: number | null;
};
export type FormStepReading = {
  id: string;
  elapsed: number | null;
  depth: number | null;
};
export type FormStep = {
  id: string;
  rate: number | null;
  ratePrecision: number | null;
  duration: number | null;
  readings: FormStepReading[];
};

function blankStepReading(): FormStepReading {
  return { id: crypto.randomUUID(), elapsed: null, depth: null };
}

function blankStep(): FormStep {
  return {
    id: crypto.randomUUID(),
    rate: null,
    ratePrecision: null,
    duration: null,
    readings: [blankStepReading()],
  };
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

const visible = ref(false);
const editingId = ref<string | null>(null);
const expandedSteps = ref<string[]>([]);

const form = reactive<{
  type: string;
  datetime: Date | null;
  operator: string;
  equipment: string;
  notes: string;
  staticLevel: number | null;
  staticLevelPrecision: number | null;
  measurementMethod: string;
  pumpingRate: number | null;
  pumpingDuration: number | null;
  steps: FormStep[];
  stepsDepthPrecision: number | null;
  hasRecovery: boolean;
  recoveryReadings: FormReading[];
}>({
  type: 'spot_measurement',
  datetime: null,
  operator: '',
  equipment: '',
  notes: '',
  staticLevel: null,
  staticLevelPrecision: null,
  measurementMethod: '',
  pumpingRate: null,
  pumpingDuration: null,
  steps: [],
  stepsDepthPrecision: null,
  hasRecovery: false,
  recoveryReadings: [],
});

const showStaticLevel = computed(() =>
  ['spot_measurement', 'constant_rate', 'step_drawdown'].includes(form.type),
);
const showMeasurementMethod = computed(() => form.type === 'spot_measurement');
const showRecoveryOnly = computed(() => form.type === 'recovery_only');
const showSteps = computed(() => form.type !== 'recovery_only');
const showRecoveryToggle = computed(() => form.type !== 'recovery_only');

// ─── Validation (Zod, per event type) ──────────────────────────────────────────

const eventSchemas = {
  spot_measurement: SpotMeasurementEventSchema,
  constant_rate: ConstantRateEventSchema,
  step_drawdown: StepDrawdownEventSchema,
  airlift: AirliftEventSchema,
  recovery_only: RecoveryOnlyEventSchema,
} as const;

const missingFieldLabelKeys: Record<string, string> = {
  datetime: 'editor.hydrodynamicEvents.fields.datetime',
  static_level: 'editor.hydrodynamicEvents.fields.staticLevel',
  steps: 'editor.hydrodynamicEvents.fields.steps',
  recovery: 'editor.hydrodynamicEvents.fields.recovery',
};

const validation = computed(() => {
  const schema = eventSchemas[form.type as keyof typeof eventSchemas];
  return schema ? schema.safeParse(buildEventPayload()) : null;
});

const isFormValid = computed(() => validation.value?.success !== false);

const missingFieldLabels = computed(() => {
  if (!validation.value || validation.value.success) return [];
  const paths = new Set(
    validation.value.error.issues.map(issue => String(issue.path[0])),
  );
  return [...paths].map(p => t(missingFieldLabelKeys[p] ?? p));
});

function resetForm() {
  form.type = 'spot_measurement';
  form.datetime = new Date();
  form.operator = '';
  form.equipment = '';
  form.notes = '';
  form.staticLevel = null;
  form.staticLevelPrecision = null;
  form.measurementMethod = '';
  form.pumpingRate = null;
  form.pumpingDuration = null;
  form.steps = [];
  form.stepsDepthPrecision = null;
  form.hasRecovery = false;
  form.recoveryReadings = [];
}

function openAdd() {
  resetForm();
  form.steps = [blankStep()];
  expandedSteps.value = form.steps.map(s => s.id);
  editingId.value = null;
  visible.value = true;
}

function openEdit(event: HydrodynamicEvent) {
  resetForm();
  editingId.value = event.id;
  form.type = event.type;
  form.datetime = new Date(event.datetime);
  form.operator = event.operator ?? '';
  form.equipment = event.equipment ?? '';
  form.notes = event.notes ?? '';

  const ev = event as Record<string, unknown>;
  form.staticLevel = (ev.static_level as number | null) ?? null;
  form.staticLevelPrecision =
    (ev.static_level_precision as number | null) ?? null;
  form.measurementMethod = (ev.measurement_method as string) ?? '';
  form.pumpingRate = (ev.pumping_rate as number | null) ?? null;
  form.pumpingDuration = (ev.pumping_duration as number | null) ?? null;

  const rawSteps = (ev.steps as Array<Record<string, unknown>>) ?? [];
  form.steps = rawSteps.map(s => {
    const rawReadings = (s.readings as Array<Record<string, unknown>>) ?? [];
    return {
      id: crypto.randomUUID(),
      rate: (s.rate as number | null) ?? null,
      ratePrecision: (s.rate_precision as number | null) ?? null,
      duration: (s.duration as number | null) ?? null,
      readings: rawReadings.length
        ? rawReadings.map(r => ({
            id: crypto.randomUUID(),
            elapsed: (r.elapsed as number | null) ?? null,
            depth: (r.depth as number | null) ?? null,
          }))
        : [blankStepReading()],
    };
  });

  form.stepsDepthPrecision =
    rawSteps
      .flatMap(s => (s.readings as Array<Record<string, unknown>>) ?? [])
      .map(r => (r.depth_precision as number | null) ?? null)
      .find(p => p != null) ?? null;

  if (form.steps.length === 0 && form.type !== 'recovery_only') {
    form.steps = [blankStep()];
  }

  expandedSteps.value = form.steps.map(s => s.id);

  const rawRecovery = ev.recovery as
    | { readings?: Array<Record<string, unknown>> }
    | undefined;
  form.hasRecovery = !!rawRecovery;
  form.recoveryReadings = (rawRecovery?.readings ?? []).map(r => ({
    elapsed: (r.elapsed as number | null) ?? null,
    depth: (r.depth as number | null) ?? null,
    depthPrecision: (r.depth_precision as number | null) ?? null,
  }));

  visible.value = true;
}

defineExpose({ openAdd, openEdit });

function buildSteps() {
  return form.steps
    .filter(s => s.rate != null)
    .map(s => {
      const readings = s.readings
        .filter(r => r.elapsed != null && r.depth != null)
        .map(r => ({
          elapsed: r.elapsed!,
          depth: r.depth!,
          ...(form.stepsDepthPrecision != null && {
            depth_precision: form.stepsDepthPrecision,
          }),
        }));
      const duration = derivedStepDuration(s.readings) ?? s.duration;
      return {
        rate: s.rate!,
        ...(s.ratePrecision != null && { rate_precision: s.ratePrecision }),
        ...(duration != null && { duration }),
        ...(readings.length > 0 && { readings }),
      };
    });
}

function buildRecovery() {
  const shouldInclude = form.type === 'recovery_only' ? true : form.hasRecovery;
  if (!shouldInclude) return undefined;
  const readings = form.recoveryReadings
    .filter(r => r.elapsed != null && r.depth != null)
    .map(r => ({
      elapsed: r.elapsed!,
      depth: r.depth!,
      ...(r.depthPrecision != null && { depth_precision: r.depthPrecision }),
    }));
  return readings.length > 0 ? { readings } : undefined;
}

function buildEventPayload(): Record<string, unknown> {
  const datetimeStr = form.datetime ? form.datetime.toISOString() : '';
  const common: Record<string, unknown> = {
    id: editingId.value ?? crypto.randomUUID(),
    type: form.type,
    datetime: datetimeStr,
    ...(form.operator.trim() && { operator: form.operator.trim() }),
    ...(form.equipment.trim() && { equipment: form.equipment.trim() }),
    ...(form.notes.trim() && { notes: form.notes.trim() }),
  };

  const steps = buildSteps();
  const recovery = buildRecovery();
  let event: Record<string, unknown> = { ...common };

  if (form.type === 'spot_measurement') {
    event = {
      ...event,
      static_level: form.staticLevel!,
      ...(form.staticLevelPrecision != null && {
        static_level_precision: form.staticLevelPrecision,
      }),
      ...(form.measurementMethod && {
        measurement_method: form.measurementMethod,
      }),
      ...(steps.length > 0 && { steps }),
      ...(recovery && { recovery }),
    };
  } else if (form.type === 'constant_rate') {
    event = {
      ...event,
      ...(form.staticLevel != null && { static_level: form.staticLevel }),
      ...(form.staticLevelPrecision != null && {
        static_level_precision: form.staticLevelPrecision,
      }),
      ...(steps.length > 0 && { steps: [steps[0]] }),
      ...(recovery && { recovery }),
    };
  } else if (form.type === 'step_drawdown') {
    event = {
      ...event,
      ...(form.staticLevel != null && { static_level: form.staticLevel }),
      ...(form.staticLevelPrecision != null && {
        static_level_precision: form.staticLevelPrecision,
      }),
      ...(steps.length > 0 && { steps }),
      ...(recovery && { recovery }),
    };
  } else if (form.type === 'airlift') {
    event = {
      ...event,
      ...(steps.length > 0 && { steps }),
      ...(recovery && { recovery }),
    };
  } else if (form.type === 'recovery_only') {
    const rec = buildRecovery()!;
    event = {
      ...event,
      ...(form.pumpingRate != null && { pumping_rate: form.pumpingRate }),
      ...(form.pumpingDuration != null && {
        pumping_duration: form.pumpingDuration,
      }),
      recovery: rec,
    };
  } else {
    event = {
      ...event,
      ...(steps.length > 0 && { steps }),
      ...(recovery && { recovery }),
    };
  }

  return event;
}

function saveEvent() {
  if (!isFormValid.value) return;

  const event = buildEventPayload();

  profileStore.updateWell(draft => {
    if (!draft.hydrodynamic_events) draft.hydrodynamic_events = [];
    if (editingId.value) {
      const idx = draft.hydrodynamic_events.findIndex(
        e => e.id === editingId.value,
      );
      if (idx !== -1)
        draft.hydrodynamic_events[idx] = event as HydrodynamicEvent;
    } else {
      draft.hydrodynamic_events.push(event as HydrodynamicEvent);
    }
  });

  visible.value = false;
}

// ─── Reading columns ────────────────────────────────────────────────────────

const stepReadingColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'elapsed',
    label: t('editor.hydrodynamicEvents.fields.elapsed'),
    type: 'number',
    size: 120,
  },
  {
    prop: 'depth',
    label: t('editor.hydrodynamicEvents.fields.depth'),
    type: 'number',
    size: 120,
  },
]);

const recoveryReadingColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'elapsed',
    label: t('editor.hydrodynamicEvents.fields.elapsed'),
    type: 'number',
    size: 120,
  },
  {
    prop: 'depth',
    label: t('editor.hydrodynamicEvents.fields.depth'),
    type: 'number',
    size: 120,
  },
  {
    prop: 'depthPrecision',
    label: t('editor.hydrodynamicEvents.fields.depthPrecision'),
    type: 'number',
    size: 90,
  },
]);

// ─── Steps ────────────────────────────────────────────────────────────────────

function addStep() {
  const step = blankStep();
  form.steps.push(step);
  expandedSteps.value.push(step.id);
}

function removeStep(i: number) {
  const [removed] = form.steps.splice(i, 1);
  if (!removed) return;
  const expandedIdx = expandedSteps.value.indexOf(removed.id);
  if (expandedIdx !== -1) expandedSteps.value.splice(expandedIdx, 1);
}

// ─── Per-step reading CRUD ────────────────────────────────────────────────────

function addStepReading(si: number) {
  form.steps[si]?.readings.push(blankStepReading());
}

function deleteStepReading(si: number, ri: number) {
  const readings = form.steps[si]?.readings;
  if (!readings) return;
  readings.splice(ri, 1);
}

function changeStepReading(si: number, ri: number, prop: string, val: unknown) {
  const r = form.steps[si]?.readings[ri];
  if (r) (r as Record<string, unknown>)[prop] = val;
}

function reorderStepReading(si: number, from: number, to: number) {
  const readings = form.steps[si]?.readings;
  if (!readings) return;
  const [moved] = readings.splice(from, 1);
  readings.splice(to, 0, moved!);
}

// ─── Recovery reading CRUD ────────────────────────────────────────────────────

function addRecoveryReading() {
  form.recoveryReadings.push({
    elapsed: null,
    depth: null,
    depthPrecision: null,
  });
}

function deleteRecoveryReading(ri: number) {
  form.recoveryReadings.splice(ri, 1);
}

function changeRecoveryReading(ri: number, prop: string, val: unknown) {
  const r = form.recoveryReadings[ri];
  if (r) (r as Record<string, unknown>)[prop] = val;
}

function reorderRecoveryReading(from: number, to: number) {
  const [moved] = form.recoveryReadings.splice(from, 1);
  form.recoveryReadings.splice(to, 0, moved!);
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      editingId
        ? t('editor.hydrodynamicEvents.editEvent')
        : t('editor.hydrodynamicEvents.addEvent')
    "
    :style="{ width: '100vw', maxWidth: '42rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <!-- Event type selector -->
      <LabeledField :label="t('editor.hydrodynamicEvents.fields.type')">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label
            v-for="opt in typeOptions"
            :key="opt.value"
            :for="`evtype-${opt.value}`"
            class="type-radio-option"
            :class="{ active: form.type === opt.value }"
          >
            <RadioButton
              v-model="form.type"
              :input-id="`evtype-${opt.value}`"
              :value="opt.value"
              class="sr-only"
            />
            <Icon :name="opt.icon" class="size-4 shrink-0" />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </LabeledField>

      <!-- Date / time -->
      <LabeledField :label="t('editor.hydrodynamicEvents.fields.datetime')">
        <DatePicker
          v-model="form.datetime"
          show-time
          hour-format="24"
          show-button-bar
          date-format="dd/mm/yy"
          class="w-full"
          :pt="{ pcInput: { root: { class: 'font-mono text-sm w-full' } } }"
        />
      </LabeledField>

      <!-- Operator / Equipment -->
      <div class="grid grid-cols-2 gap-3">
        <LabeledField :label="t('editor.hydrodynamicEvents.fields.operator')">
          <InputText v-model="form.operator" class="w-full" />
        </LabeledField>
        <LabeledField :label="t('editor.hydrodynamicEvents.fields.equipment')">
          <InputText v-model="form.equipment" class="w-full" />
        </LabeledField>
      </div>

      <!-- Static level (spot / constant_rate / step_drawdown) -->
      <div v-if="showStaticLevel" class="grid grid-cols-2 gap-3">
        <LabeledField :label="t('editor.hydrodynamicEvents.fields.staticLevel')">
          <InputNumber
            v-model="form.staticLevel"
            :max-fraction-digits="3"
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.hydrodynamicEvents.fields.staticLevelPrecision')"
        >
          <InputNumber
            v-model="form.staticLevelPrecision"
            :max-fraction-digits="3"
            class="w-full"
          />
        </LabeledField>
      </div>

      <!-- Measurement method (spot_measurement) -->
      <LabeledField
        v-if="showMeasurementMethod"
        :label="t('editor.hydrodynamicEvents.fields.measurementMethod')"
      >
        <Select
          v-model="form.measurementMethod"
          :options="measurementMethodOptions"
          option-label="label"
          option-value="value"
          show-clear
          class="w-full"
        />
      </LabeledField>

      <!-- Recovery only: estimated preceding params -->
      <div v-if="showRecoveryOnly" class="grid grid-cols-2 gap-3">
        <LabeledField :label="t('editor.hydrodynamicEvents.fields.pumpingRate')">
          <InputNumber
            v-model="form.pumpingRate"
            :max-fraction-digits="2"
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.hydrodynamicEvents.fields.pumpingDuration')"
        >
          <InputNumber
            v-model="form.pumpingDuration"
            :max-fraction-digits="1"
            class="w-full"
          />
        </LabeledField>
      </div>

      <!-- Pumping steps -->
      <div v-if="showSteps" class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <span
            class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
          >
            {{ t('editor.hydrodynamicEvents.fields.steps') }}
          </span>
          <div class="flex items-center gap-3">
            <LabeledField
              :label="t('editor.hydrodynamicEvents.fields.stepsDepthPrecision')"
              class="mb-0 flex-row items-center"
            >
              <InputNumber
                v-model="form.stepsDepthPrecision"
                fluid
                :max-fraction-digits="3"
                class="precision-input"
              />
            </LabeledField>
            <Button
              outlined
              size="small"
              :label="t('editor.hydrodynamicEvents.addStep')"
              @click="addStep"
            >
              <template #icon>
                <Icon name="ph:plus" />
              </template>
            </Button>
          </div>
        </div>

        <Accordion
          v-model:value="expandedSteps"
          multiple
          class="flex flex-col gap-3"
        >
          <AccordionPanel
            v-for="(step, si) in form.steps"
            :key="step.id"
            :value="step.id"
            class="step-panel"
          >
            <AccordionHeader v-slot="{ active, a11yAttrs, onClick }" as-child>
              <div
                v-bind="a11yAttrs"
                role="button"
                class="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer font-mono"
                @click="onClick"
              >
                <div class="flex items-center gap-2.5">
                  <Icon
                    name="ph:caret-down-bold"
                    class="size-3.5 shrink-0 text-content-400 transition-transform duration-150"
                    :class="{ '-rotate-90': !active }"
                  />
                  <span
                    class="text-xs font-semibold tracking-wider uppercase text-content-100 whitespace-nowrap"
                  >
                    {{ t('editor.hydrodynamicEvents.stats.steps') }}
                    {{ si + 1 }}
                  </span>
                </div>

                <div class="flex items-center gap-2.5">
                  <span
                    class="flex items-center gap-1.5"
                    @click.stop
                    @mousedown.stop
                  >
                    <span class="text-xs text-content-400 whitespace-nowrap">{{
                      t('editor.hydrodynamicEvents.fields.rate')
                    }}</span>
                    <InputNumber
                      v-model="step.rate"
                      placeholder="m³/h"
                      :max-fraction-digits="2"
                      fluid
                      class="w-22"
                      input-class="font-mono text-xs px-2 py-1"
                    />
                  </span>

                  <span
                    class="flex items-center gap-1.5"
                    @click.stop
                    @mousedown.stop
                  >
                    <span class="text-xs text-content-400 whitespace-nowrap">{{
                      t('editor.hydrodynamicEvents.fields.duration')
                    }}</span>
                    <InputNumber
                      v-if="!stepHasReadings(step.readings)"
                      v-model="step.duration"
                      placeholder="min"
                      fluid
                      :max-fraction-digits="1"
                      class="w-22"
                      input-class="font-mono text-xs px-2 py-1"
                    />
                    <InputNumber
                      v-else
                      v-tooltip.top="
                        t(
                          'editor.hydrodynamicEvents.fields.durationDerivedHint',
                        )
                      "
                      :model-value="derivedStepDuration(step.readings)"
                      disabled
                      :max-fraction-digits="1"
                      class="w-22"
                      input-class="font-mono text-xs px-2 py-1"
                    />
                  </span>

                  <button
                    type="button"
                    class="flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-content-400 transition-colors duration-100 hover:bg-error-500/10 hover:text-error-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-content-400"
                    :disabled="form.steps.length === 1"
                    @click.stop="removeStep(si)"
                    @mousedown.stop
                  >
                    <Icon name="ph:x-bold" class="size-3" />
                  </button>
                </div>
              </div>
            </AccordionHeader>

            <AccordionContent
              :pt="{ content: { class: 'step-panel-content' } }"
            >
              <WellDataGrid
                :rows="step.readings.map(r => ({ ...r }))"
                :columns="stepReadingColumns"
                :add-label="t('editor.hydrodynamicEvents.addReading')"
                @add="addStepReading(si)"
                @delete="ri => deleteStepReading(si, ri)"
                @change="
                  (ri, prop, val) => changeStepReading(si, ri, prop, val)
                "
                @reorder="(from, to) => reorderStepReading(si, from, to)"
              />
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>

      <!-- Recovery toggle (all types except recovery_only) -->
      <div v-if="showRecoveryToggle" class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label
            for="recovery-toggle"
            class="text-sm font-medium text-content-100 cursor-pointer"
          >
            {{ t('editor.hydrodynamicEvents.fields.includeRecovery') }}
          </label>
          <ToggleSwitch v-model="form.hasRecovery" input-id="recovery-toggle" />
        </div>
        <div v-if="form.hasRecovery">
          <WellDataGrid
            :rows="form.recoveryReadings.map(r => ({ ...r }))"
            :columns="recoveryReadingColumns"
            :add-label="t('editor.hydrodynamicEvents.addReading')"
            @add="addRecoveryReading"
            @delete="deleteRecoveryReading"
            @change="changeRecoveryReading"
            @reorder="reorderRecoveryReading"
          />
        </div>
      </div>

      <!-- Recovery required for recovery_only -->
      <div v-if="showRecoveryOnly" class="flex flex-col gap-2">
        <span
          class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
        >
          {{ t('editor.hydrodynamicEvents.fields.recovery') }}
        </span>
        <WellDataGrid
          :rows="form.recoveryReadings.map(r => ({ ...r }))"
          :columns="recoveryReadingColumns"
          :add-label="t('editor.hydrodynamicEvents.addReading')"
          @add="addRecoveryReading"
          @delete="deleteRecoveryReading"
          @change="changeRecoveryReading"
          @reorder="reorderRecoveryReading"
        />
      </div>

      <!-- Notes -->
      <LabeledField :label="t('editor.hydrodynamicEvents.fields.notes')">
        <Textarea
          v-model="form.notes"
          :rows="3"
          class="w-full font-mono text-sm"
        />
      </LabeledField>
    </div>

    <template #footer>
      <div class="flex flex-col gap-2 w-full pt-2">
        <div class="flex justify-end gap-2">
          <Button
            :label="t('editor.confirmClear.reject')"
            severity="secondary"
            text
            @click="visible = false"
          />
          <Button
            :label="
              editingId
                ? t('editor.save')
                : t('editor.hydrodynamicEvents.addEvent')
            "
            :disabled="!isFormValid"
            @click="saveEvent"
          />
        </div>
        <p
          v-if="missingFieldLabels.length"
          class="flex items-center gap-1.5 text-xs text-error-400"
        >
          <Icon name="ph:info" class="size-3.5 shrink-0" />
          {{
            t('editor.hydrodynamicEvents.validation.missing', {
              fields: missingFieldLabels.join(', '),
            })
          }}
        </p>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* ── Step accordion panels ────────────────────────────────────────────────── */
/* PrimeVue's Aura defaults render inside a layered cssLayer, so this unlayered
   scoped CSS always wins regardless of selector specificity — safe to fully
   override the panel/content look here without touching customTheme.ts. */

.step-panel {
  border: 1px solid var(--color-surface-200);
  border-radius: 14px;
  background: var(--color-surface-0);
  overflow: hidden;
}

.step-panel-content {
  padding: 0 12px 12px;
  background: transparent;
  color: var(--color-content-0);
}

/* ── Type radio options ───────────────────────────────────────────────────── */

.type-radio-option {
  display: flex;
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

.type-radio-option:hover {
  background: var(--color-surface-100);
  color: var(--color-content-100);
  border-color: var(--color-surface-300);
}

.type-radio-option.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-color: var(--color-primary-300);
}

/* ── Steps precision field ────────────────────────────────────────────────── */

.precision-input {
  width: 90px;
}
</style>
