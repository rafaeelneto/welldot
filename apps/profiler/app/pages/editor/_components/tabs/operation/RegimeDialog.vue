<script setup lang="ts">
import type { OperatingRegime } from '@welldot/core';

/** The regime being edited. `null` means "adding a new one". */
const model = defineModel<OperatingRegime | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [regime: OperatingRegime] }>();

const { t } = useI18n();
const profileStore = useProfileStore();
const { flowUnit } = useUnitFormat();

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  effectiveFrom: null as Date | null,
  flowRate: null as number | null,
  dailyOperatingTime: null as number | null,
  daysPerWeek: null as number | null,
  notes: '',
});

/** `effective_from` is unique within the block. */
const duplicateEffectiveFrom = computed(() => {
  if (!form.effectiveFrom) return false;
  const time = form.effectiveFrom.getTime();
  return (profileStore.well.operating_regime ?? []).some(
    r =>
      r.id !== model.value?.id && new Date(r.effective_from).getTime() === time,
  );
});

const isFormValid = computed(
  () => !!form.effectiveFrom && !duplicateEffectiveFrom.value,
);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(r: OperatingRegime | null) {
  form.effectiveFrom = r ? new Date(r.effective_from) : new Date();
  form.flowRate = r?.flow_rate ?? null;
  form.dailyOperatingTime = r?.daily_operating_time ?? null;
  form.daysPerWeek = r?.days_per_week ?? null;
  form.notes = r?.notes ?? '';
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/** Drops `undefined` members so optional fields are absent, not `undefined`. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

const optional = <T,>(v: T | null): T | undefined =>
  v == null ? undefined : v;
const optionalText = (v: string | null) => v?.trim() || undefined;

/**
 * Writes the edited copy back through the model and signals the commit with
 * `save`. The bound regime is spread first so fields the form does not cover
 * (e.g. `x-` members) survive the round-trip.
 */
function save() {
  if (!isFormValid.value) return;

  const next = compact<OperatingRegime>({
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    effective_from: form.effectiveFrom!.toISOString(),
    flow_rate: optional(form.flowRate),
    daily_operating_time: optional(form.dailyOperatingTime),
    days_per_week: optional(form.daysPerWeek),
    notes: optionalText(form.notes),
    updated_at: new Date().toISOString(),
  });

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
        ? t('editor.operation.regime.edit')
        : t('editor.operation.regime.add')
    "
    :style="{ width: '100vw', maxWidth: '34rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <WellLabeledField
        :label="t('editor.operation.regime.fields.effectiveFrom')"
        :info="t('editor.operation.regime.fields.effectiveFromInfo')"
        :info-label="t('editor.fieldInfo')"
      >
        <DatePicker
          v-model="form.effectiveFrom"
          show-time
          hour-format="24"
          date-format="dd/mm/yy"
          class="w-full"
          :invalid="duplicateEffectiveFrom"
          :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
        />
      </WellLabeledField>
      <Message
        v-if="duplicateEffectiveFrom"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ t('editor.operation.warnings.regime_duplicate_effective_from') }}
      </Message>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <WellLabeledField :label="t('editor.operation.regime.fields.flowRate')">
          <WellUnitInput
            v-model="form.flowRate"
            unit-type="flow"
            :min="0"
            :max-fraction-digits="2"
            :suffix="` ${flowUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.operation.regime.fields.dailyOperatingTime')"
        >
          <WellInputNumber
            v-model="form.dailyOperatingTime"
            :min="0"
            :max="24"
            :max-fraction-digits="2"
            suffix=" h"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.operation.regime.fields.daysPerWeek')"
        >
          <WellInputNumber
            v-model="form.daysPerWeek"
            :min="1"
            :max="7"
            :max-fraction-digits="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </WellLabeledField>
      </div>
      <Message severity="secondary" size="small" variant="simple">
        {{ t('editor.operation.regime.unknownInfo') }}
      </Message>

      <WellLabeledField :label="t('editor.operation.regime.fields.notes')">
        <Textarea v-model="form.notes" :rows="3" class="w-full text-sm" />
      </WellLabeledField>
    </div>

    <template #footer>
      <Button
        :label="t('editor.confirmClear.reject')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="model ? t('editor.save') : t('editor.operation.regime.add')"
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
