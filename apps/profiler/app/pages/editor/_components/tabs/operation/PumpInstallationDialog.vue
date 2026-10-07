<script setup lang="ts">
import type {
  Attachment,
  PumpElectrical,
  PumpInstallation,
} from '@welldot/core';
import {
  CONSTRUCTION_MATERIALS,
  POWER_SOURCES,
  PUMP_TYPES,
} from '@welldot/core';
import AttachmentField from '~/components/attachments/AttachmentField.vue';

/** The installation being edited. `null` means "adding a new one". */
const model = defineModel<PumpInstallation | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [installation: PumpInstallation] }>();

const { t } = useI18n();
const { vocabOptions } = useVocab();
const { lengthUnit, diameterUnit, flowUnit, powerUnit } = useUnitFormat();

const typeOptions = computed(() => vocabOptions(PUMP_TYPES));
const powerSourceOptions = computed(() => vocabOptions(POWER_SOURCES));
const riserMaterialOptions = computed(() =>
  vocabOptions(CONSTRUCTION_MATERIALS),
);
const phaseOptions = [
  { label: '1φ', value: 1 },
  { label: '3φ', value: 3 },
];

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  type: 'submersible' as string,
  powerSource: null as string | null,
  installedAt: null as Date | null,
  removedAt: null as Date | null,
  installedBy: '',
  removedBy: '',
  manufacturer: '',
  model: '',
  serial: '',
  intakeDepth: null as number | null,
  ratedFlowRate: null as number | null,
  ratedHead: null as number | null,
  ratedPower: null as number | null,
  stages: null as number | null,
  riserDiameter: null as number | null,
  riserMaterial: null as string | null,
  checkValve: false,
  voltage: null as number | null,
  phases: null as 1 | 3 | null,
  cableSection: null as number | null,
  cableLength: null as number | null,
  notes: '',
  attachments: [] as Attachment[],
});

const removedBeforeInstalled = computed(
  () =>
    !!form.installedAt &&
    !!form.removedAt &&
    form.removedAt.getTime() <= form.installedAt.getTime(),
);

const isFormValid = computed(
  () =>
    !!form.type.trim() && !!form.installedAt && !removedBeforeInstalled.value,
);

const showElectrical = ref(false);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(p: PumpInstallation | null) {
  form.type = p?.type ?? 'submersible';
  form.powerSource = p?.power_source ?? null;
  form.installedAt = p ? new Date(p.installed_at) : new Date();
  form.removedAt = p?.removed_at ? new Date(p.removed_at) : null;
  form.installedBy = p?.installed_by ?? '';
  form.removedBy = p?.removed_by ?? '';
  form.manufacturer = p?.manufacturer ?? '';
  form.model = p?.model ?? '';
  form.serial = p?.serial ?? '';
  form.intakeDepth = p?.intake_depth ?? null;
  form.ratedFlowRate = p?.rated_flow_rate ?? null;
  form.ratedHead = p?.rated_head ?? null;
  form.ratedPower = p?.rated_power ?? null;
  form.stages = p?.stages ?? null;
  form.riserDiameter = p?.riser_diameter ?? null;
  form.riserMaterial = p?.riser_material ?? null;
  form.checkValve = p?.check_valve ?? false;
  form.voltage = p?.electrical?.voltage ?? null;
  form.phases = p?.electrical?.phases ?? null;
  form.cableSection = p?.electrical?.cable_section ?? null;
  form.cableLength = p?.electrical?.cable_length ?? null;
  form.notes = p?.notes ?? '';
  form.attachments = (p?.attachments ?? []).map(a => ({ ...a }));
  showElectrical.value = !!p?.electrical;
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
 * `save`. The bound installation is spread first so fields the form does not
 * cover (e.g. `x-` members) survive the round-trip.
 */
function save() {
  if (!isFormValid.value) return;

  const electrical = compact<PumpElectrical>({
    ...model.value?.electrical,
    voltage: optional(form.voltage),
    phases: optional(form.phases),
    cable_section: optional(form.cableSection),
    cable_length: optional(form.cableLength),
  });

  const next = compact<PumpInstallation>({
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    installed_at: form.installedAt!.toISOString(),
    removed_at: form.removedAt?.toISOString(),
    installed_by: optionalText(form.installedBy),
    // Who removed the unit only means something once it has been removed.
    removed_by: form.removedAt ? optionalText(form.removedBy) : undefined,
    type: form.type.trim(),
    power_source: optionalText(form.powerSource),
    manufacturer: optionalText(form.manufacturer),
    model: optionalText(form.model),
    serial: optionalText(form.serial),
    intake_depth: optional(form.intakeDepth),
    rated_flow_rate: optional(form.ratedFlowRate),
    rated_head: optional(form.ratedHead),
    rated_power: optional(form.ratedPower),
    stages: optional(form.stages),
    riser_diameter: optional(form.riserDiameter),
    riser_material: optionalText(form.riserMaterial),
    // "No" is only written when the record already declared the field —
    // an untouched toggle means "unknown", not "no check valve".
    check_valve:
      form.checkValve || model.value?.check_valve !== undefined
        ? form.checkValve
        : undefined,
    electrical: Object.keys(electrical).length ? electrical : undefined,
    notes: optionalText(form.notes),
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
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
      model ? t('editor.operation.pump.edit') : t('editor.operation.pump.add')
    "
    :style="{ width: '100vw', maxWidth: '40rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <!-- ── Equipment ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField
          :label="t('editor.operation.pump.fields.type')"
          :info="t('editor.operation.pump.fields.typeInfo')"
        >
          <Select
            v-model="form.type"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            editable
            class="w-full"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.powerSource')">
          <Select
            v-model="form.powerSource"
            :options="powerSourceOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>

        <LabeledField :label="t('editor.operation.pump.fields.installedAt')">
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
          :label="t('editor.operation.pump.fields.removedAt')"
          :info="t('editor.operation.pump.fields.removedAtInfo')"
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

        <LabeledField :label="t('editor.operation.pump.fields.installedBy')">
          <InputText v-model="form.installedBy" class="w-full" />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.removedBy')">
          <InputText
            v-model="form.removedBy"
            :disabled="!form.removedAt"
            class="w-full"
          />
        </LabeledField>
      </div>
      <Message
        v-if="removedBeforeInstalled"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ t('editor.operation.pump.warnings.removed_before_installed') }}
      </Message>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LabeledField :label="t('editor.operation.pump.fields.manufacturer')">
          <InputText v-model="form.manufacturer" class="w-full" />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.model')">
          <InputText v-model="form.model" class="w-full" />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.pump.fields.serial')"
          :info="t('editor.operation.pump.fields.serialInfo')"
        >
          <InputText v-model="form.serial" class="w-full font-mono text-sm" />
        </LabeledField>
      </div>

      <!-- ── Installation & nameplate ───────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <LabeledField
          :label="t('editor.operation.pump.fields.intakeDepth')"
          :info="t('editor.operation.pump.fields.intakeDepthInfo')"
        >
          <UnitInput
            v-model="form.intakeDepth"
            unit-type="length"
            :min="0"
            :suffix="` ${lengthUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.ratedFlowRate')">
          <UnitInput
            v-model="form.ratedFlowRate"
            unit-type="flow"
            :min="0"
            :max-fraction-digits="2"
            :suffix="` ${flowUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.ratedHead')">
          <UnitInput
            v-model="form.ratedHead"
            unit-type="length"
            :min="0"
            :suffix="` ${lengthUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.pump.fields.ratedPower')"
          :info="t('editor.operation.pump.fields.ratedPowerInfo')"
        >
          <UnitInput
            v-model="form.ratedPower"
            unit-type="power"
            :min="0"
            :max-fraction-digits="2"
            :suffix="` ${powerUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.stages')">
          <WellInputNumber
            v-model="form.stages"
            :min="1"
            :max-fraction-digits="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.checkValve')">
          <div class="flex items-center h-full min-h-10">
            <ToggleSwitch v-model="form.checkValve" />
          </div>
        </LabeledField>
      </div>

      <!-- ── Riser ──────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField
          :label="t('editor.operation.pump.fields.riserDiameter')"
          :info="t('editor.operation.pump.fields.riserDiameterInfo')"
        >
          <UnitInput
            v-model="form.riserDiameter"
            unit-type="diameter"
            :min="0"
            :suffix="` ${diameterUnit}`"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="t('editor.operation.pump.fields.riserMaterial')">
          <Select
            v-model="form.riserMaterial"
            :options="riserMaterialOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>
      </div>

      <!-- ── Electrical (collapsible) ───────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="flex items-center gap-2 self-start text-xs font-medium text-content-300 hover:text-content-0 bg-transparent border-0 p-0 cursor-pointer"
          @click="showElectrical = !showElectrical"
        >
          <Icon
            :name="showElectrical ? 'ph:caret-down' : 'ph:caret-right'"
            class="size-3"
          />
          <Icon name="ph:lightning-duotone" class="size-4" />
          {{ t('editor.operation.pump.fields.electrical') }}
        </button>
        <template v-if="showElectrical">
          <div class="grid grid-cols-2 gap-4">
            <LabeledField :label="t('editor.operation.pump.fields.voltage')">
              <WellInputNumber
                v-model="form.voltage"
                :min="0"
                suffix=" V"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField :label="t('editor.operation.pump.fields.phases')">
              <SelectButton
                v-model="form.phases"
                :options="phaseOptions"
                class="w-auto h-8 gap-0!"
                :pt="{
                  pcToggleButton: {
                    root: 'font-mono text-xs h-7 p-0 border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                    content: 'px-2 py-0 rounded-full',
                  },
                }"
                option-label="label"
                option-value="value"
                size="small"
              />
            </LabeledField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <LabeledField
              :label="t('editor.operation.pump.fields.cableSection')"
            >
              <WellInputNumber
                v-model="form.cableSection"
                :min="0"
                :max-fraction-digits="2"
                suffix=" mm²"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.operation.pump.fields.cableLength')"
            >
              <UnitInput
                v-model="form.cableLength"
                unit-type="length"
                :min="0"
                :suffix="` ${lengthUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
          </div>
        </template>
      </div>

      <LabeledField :label="t('editor.operation.pump.fields.notes')">
        <Textarea v-model="form.notes" :rows="3" class="w-full text-sm" />
      </LabeledField>

      <!-- ── Attachments ────────────────────────────────────────────────── -->
      <LabeledField :label="t('editor.historyLog.logs.fields.attachments')">
        <AttachmentField v-model="form.attachments" context="pump" />
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
        :label="model ? t('editor.save') : t('editor.operation.pump.add')"
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
