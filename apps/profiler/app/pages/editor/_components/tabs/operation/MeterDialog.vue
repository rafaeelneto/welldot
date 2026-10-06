<script setup lang="ts">
import type { Meter } from '@welldot/core';
import {
  METER_TYPE_VALUES,
  resolveMeterTypeLabel,
} from '~/utils/operationVocab';

/** The meter being edited. `null` means "adding a new one". */
const model = defineModel<Meter | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [meter: Meter] }>();

const { t } = useI18n();
const { diameterUnit, volumeUnit } = useUnitFormat();

const typeOptions = computed(() =>
  METER_TYPE_VALUES.map(value => ({
    value,
    label: resolveMeterTypeLabel(value, t),
  })),
);

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  type: null as string | null,
  installedAt: null as Date | null,
  removedAt: null as Date | null,
  serial: '',
  nominalDiameter: null as number | null,
  maxReading: null as number | null,
  notes: '',
});

const removedBeforeInstalled = computed(
  () =>
    !!form.installedAt &&
    !!form.removedAt &&
    form.removedAt.getTime() <= form.installedAt.getTime(),
);

const isFormValid = computed(
  () => !!form.installedAt && !removedBeforeInstalled.value,
);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(m: Meter | null) {
  form.type = m?.type ?? null;
  form.installedAt = m ? new Date(m.installed_at) : new Date();
  form.removedAt = m?.removed_at ? new Date(m.removed_at) : null;
  form.serial = m?.serial ?? '';
  form.nominalDiameter = m?.nominal_diameter ?? null;
  form.maxReading = m?.max_reading ?? null;
  form.notes = m?.notes ?? '';
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
 * `save`. The bound meter is spread first so fields the form does not cover
 * (e.g. `x-` members) survive the round-trip.
 */
function save() {
  if (!isFormValid.value) return;

  const next = compact<Meter>({
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    installed_at: form.installedAt!.toISOString(),
    removed_at: form.removedAt?.toISOString(),
    type: optionalText(form.type),
    serial: optionalText(form.serial),
    nominal_diameter: optional(form.nominalDiameter),
    max_reading: optional(form.maxReading),
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
      model ? t('editor.operation.meter.edit') : t('editor.operation.meter.add')
    "
    :style="{ width: '100vw', maxWidth: '36rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField :label="t('editor.operation.meter.fields.type')">
          <Select
            v-model="form.type"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.meter.fields.serial')"
          :info="t('editor.operation.meter.fields.serialInfo')"
        >
          <InputText v-model="form.serial" class="w-full font-mono text-sm" />
        </LabeledField>

        <LabeledField :label="t('editor.operation.meter.fields.installedAt')">
          <DatePicker
            v-model="form.installedAt"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.meter.fields.removedAt')"
          :info="t('editor.operation.meter.fields.removedAtInfo')"
        >
          <DatePicker
            v-model="form.removedAt"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            show-button-bar
            class="w-full"
            :invalid="removedBeforeInstalled"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          />
        </LabeledField>
      </div>
      <Message
        v-if="removedBeforeInstalled"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ t('editor.operation.warnings.meter_removed_before_installed') }}
      </Message>
      <Message severity="secondary" size="small" variant="simple">
        {{ t('editor.operation.meter.readingsInfo') }}
      </Message>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LabeledField
          :label="t('editor.operation.meter.fields.nominalDiameter')"
          :info="t('editor.operation.meter.fields.nominalDiameterInfo')"
        >
          <UnitInput
            v-model="form.nominalDiameter"
            unit-type="diameter"
            :min="0"
            :suffix="` ${diameterUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.meter.fields.maxReading')"
          :info="t('editor.operation.meter.fields.maxReadingInfo')"
        >
          <UnitInput
            v-model="form.maxReading"
            unit-type="volume"
            :min="0"
            :max-fraction-digits="3"
            :suffix="` ${volumeUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
      </div>

      <LabeledField :label="t('editor.operation.meter.fields.notes')">
        <Textarea v-model="form.notes" :rows="3" class="w-full text-sm" />
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
        :label="model ? t('editor.save') : t('editor.operation.meter.add')"
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
