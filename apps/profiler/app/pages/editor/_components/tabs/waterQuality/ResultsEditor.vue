<script setup lang="ts">
import {
  WATER_QUALITY_PARAMETERS,
  getParameterDefinition,
} from '@welldot/core';
import {
  FILTRATION_LOCATION_VALUES,
  FRACTION_VALUES,
  MEASURED_IN_VALUES,
  NUMERIC_QUALIFIERS,
  PARAMETER_GROUP_VALUES,
  QUALIFIER_VALUES,
  VALIDATION_STATUS_VALUES,
  parameterUnitSymbol,
  resolveFractionLabel,
  resolveMeasuredInLabel,
  resolveParameterGroupLabel,
  resolveParameterLabel,
  resolveQualifierLabel,
  resolveValidationStatusLabel,
} from '~/utils/waterQualityVocab';
import {
  emptyResultDraft,
  expectedForm,
  type ResultDraft,
  type VocabularyMode,
} from './resultDraft';

/**
 * Row editor for a sample's `results`. Each row picks its parameter from the
 * `welldot` vocabulary (grouped, localized), a CAS number, or a custom `x-`
 * vocabulary (which then needs a UCUM unit); the value input follows the
 * parameter's value form.
 */
const rows = defineModel<ResultDraft[]>({ required: true });

const { t } = useI18n();

const modeOptions = computed(() => [
  {
    value: 'welldot',
    label: t('editor.waterQuality.result.vocabularies.welldot'),
  },
  { value: 'cas', label: t('editor.waterQuality.result.vocabularies.cas') },
  {
    value: 'custom',
    label: t('editor.waterQuality.result.vocabularies.custom'),
  },
]);

/** Vocabulary entries grouped for the parameter picker. */
const parameterGroups = computed(() =>
  PARAMETER_GROUP_VALUES.map(group => ({
    label: resolveParameterGroupLabel(group, t),
    items: WATER_QUALITY_PARAMETERS.filter(d => d.group === group).map(d => ({
      value: d.code,
      code: d.code,
      label: resolveParameterLabel({ code: d.code, vocabulary: 'welldot' }, t),
      unit: d.unit.symbol,
    })),
  })),
);

const formOptions = computed(() =>
  (['value', 'presence', 'text'] as const).map(value => ({
    value,
    label: t(`editor.waterQuality.result.forms.${value}`),
  })),
);

function qualifierOptions(row: ResultDraft) {
  return QUALIFIER_VALUES.map(value => ({
    value,
    label: resolveQualifierLabel(value, t),
    disabled: NUMERIC_QUALIFIERS.includes(value) && row.form !== 'value',
  }));
}

const presenceOptions = computed(() => [
  { value: true, label: t('editor.waterQuality.presence.present') },
  { value: false, label: t('editor.waterQuality.presence.absent') },
]);
const fractionOptions = computed(() =>
  FRACTION_VALUES.map(value => ({
    value,
    label: resolveFractionLabel(value, t),
  })),
);
const measuredInOptions = computed(() =>
  MEASURED_IN_VALUES.map(value => ({
    value,
    label: resolveMeasuredInLabel(value, t),
  })),
);
const filtrationLocationOptions = computed(() =>
  FILTRATION_LOCATION_VALUES.map(value => ({
    value,
    label: resolveMeasuredInLabel(value, t),
  })),
);
const validationStatusOptions = computed(() =>
  VALIDATION_STATUS_VALUES.map(value => ({
    value,
    label: resolveValidationStatusLabel(value, t),
  })),
);

const CAS_PATTERN = /^\d{2,7}-\d{2}-\d$/;

// ─── Row helpers ──────────────────────────────────────────────────────────────

function addRow() {
  rows.value = [...rows.value, { ...emptyResultDraft(), expanded: false }];
}

function removeRow(key: string) {
  rows.value = rows.value.filter(r => r.key !== key);
}

function setMode(row: ResultDraft, mode: VocabularyMode) {
  row.mode = mode;
  row.code = null;
  row.form = 'value';
  if (mode !== 'custom') row.unit = '';
}

function setCode(row: ResultDraft, code: string | null) {
  row.code = code;
  const form = expectedForm(row);
  if (form) row.form = form;
  if (row.form !== 'value' && row.qualifier && row.qualifier !== 'not_detected')
    row.qualifier = null;
}

function setForm(row: ResultDraft, form: ResultDraft['form']) {
  row.form = form;
  if (form !== 'value' && row.qualifier && row.qualifier !== 'not_detected')
    row.qualifier = null;
}

/** Shows the value-form switch for custom codes or a form/vocabulary mismatch. */
function showFormSwitch(row: ResultDraft): boolean {
  if (row.mode === 'custom') return true;
  const expected = expectedForm(row);
  return !!expected && expected !== row.form;
}

function unitOf(row: ResultDraft): string {
  if (!row.code) return '';
  return parameterUnitSymbol({
    parameter: {
      code: row.code,
      vocabulary: row.mode === 'custom' ? 'x-' : row.mode,
    },
    unit: row.unit || undefined,
  });
}

/** "= Sulfate" hint for a CAS number with a published `welldot` equivalent. */
function casEquivalent(row: ResultDraft): string | null {
  if (row.mode !== 'cas' || !row.code) return null;
  const def = getParameterDefinition({
    code: row.code.trim(),
    vocabulary: 'cas',
  });
  return def
    ? resolveParameterLabel({ code: def.code, vocabulary: 'welldot' }, t)
    : null;
}

function casInvalid(row: ResultDraft): boolean {
  return row.mode === 'cas' && !CAS_PATTERN.test((row.code ?? '').trim());
}

function valueMissing(row: ResultDraft): boolean {
  if (row.qualifier === 'not_detected') return false;
  if (row.form === 'value') return row.value == null;
  if (row.form === 'presence') return row.presence == null;
  return !row.text.trim();
}

function rowTitle(row: ResultDraft): string {
  if (!row.code) return t('editor.waterQuality.result.newRow');
  if (row.mode === 'custom') return `${row.customVocabulary}:${row.code}`;
  return resolveParameterLabel({ code: row.code, vocabulary: row.mode }, t);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(row, index) in rows"
      :key="row.key"
      class="rounded-xl border border-surface-200/70 bg-surface-0 px-3 py-3 flex flex-col gap-3"
    >
      <!-- ── Parameter ─────────────────────────────────────────────────── -->
      <div class="flex items-start gap-2 flex-wrap">
        <span class="font-mono text-xs text-content-400 pt-2 w-5 shrink-0">
          {{ index + 1 }}
        </span>
        <Select
          :model-value="row.mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="w-32 shrink-0"
          :aria-label="t('editor.waterQuality.result.vocabulary')"
          @update:model-value="setMode(row, $event)"
        />

        <Select
          v-if="row.mode === 'welldot'"
          :model-value="row.code"
          :options="parameterGroups"
          option-label="label"
          option-value="value"
          option-group-label="label"
          option-group-children="items"
          filter
          :filter-fields="['label', 'code']"
          size="small"
          :invalid="!row.code"
          :placeholder="t('editor.waterQuality.result.parameterPlaceholder')"
          class="flex-1 min-w-48"
          @update:model-value="setCode(row, $event)"
        >
          <template #option="{ option }">
            <div class="flex items-center justify-between gap-3 w-full">
              <span class="text-sm">{{ option.label }}</span>
              <span class="font-mono text-xs text-content-400">
                {{ option.code
                }}<template v-if="option.unit"> · {{ option.unit }}</template>
              </span>
            </div>
          </template>
        </Select>

        <div
          v-else-if="row.mode === 'cas'"
          class="flex-1 min-w-48 flex flex-col gap-1"
        >
          <InputText
            :model-value="row.code ?? ''"
            size="small"
            class="w-full font-mono text-sm"
            placeholder="71-43-2"
            :invalid="casInvalid(row)"
            @update:model-value="setCode(row, $event ?? null)"
          />
          <span v-if="casEquivalent(row)" class="text-xs text-content-400">
            = {{ casEquivalent(row) }}
          </span>
        </div>

        <div v-else class="flex-1 min-w-48 grid grid-cols-3 gap-2">
          <InputText
            v-model="row.customVocabulary"
            size="small"
            class="w-full font-mono text-sm"
            :invalid="!/^x-.+/.test(row.customVocabulary.trim())"
            :placeholder="t('editor.waterQuality.result.customVocabulary')"
            :aria-label="t('editor.waterQuality.result.customVocabulary')"
          />
          <InputText
            :model-value="row.code ?? ''"
            size="small"
            class="w-full font-mono text-sm"
            :invalid="!row.code?.trim()"
            :placeholder="t('editor.waterQuality.result.code')"
            :aria-label="t('editor.waterQuality.result.code')"
            @update:model-value="row.code = $event ?? null"
          />
          <InputText
            v-model="row.unit"
            v-tooltip.top="t('editor.waterQuality.result.unitInfo')"
            size="small"
            class="w-full font-mono text-sm"
            :invalid="!row.unit.trim()"
            :placeholder="t('editor.waterQuality.result.unit')"
            :aria-label="t('editor.waterQuality.result.unit')"
          />
        </div>

        <Button
          severity="danger"
          text
          size="small"
          :aria-label="t('editor.waterQuality.result.remove')"
          @click="removeRow(row.key)"
        >
          <template #icon>
            <Icon name="ph:x-bold" />
          </template>
        </Button>
      </div>

      <!-- ── Value ─────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <WellLabeledField
          v-if="showFormSwitch(row)"
          :label="t('editor.waterQuality.result.form')"
          class="col-span-2 sm:col-span-4"
        >
          <SelectButton
            :model-value="row.form"
            :options="formOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            @update:model-value="setForm(row, $event)"
          />
        </WellLabeledField>
        <WellLabeledField :label="t('editor.waterQuality.result.qualifier')">
          <Select
            v-model="row.qualifier"
            :options="qualifierOptions(row)"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            show-clear
            size="small"
            class="w-full"
          />
        </WellLabeledField>
        <WellLabeledField
          v-if="row.qualifier !== 'not_detected'"
          :label="t('editor.waterQuality.result.value')"
          :class="row.form === 'text' ? 'col-span-2 sm:col-span-3' : ''"
        >
          <WellInputNumber
            v-if="row.form === 'value'"
            v-model="row.value"
            :max-fraction-digits="6"
            :suffix="unitOf(row) ? ` ${unitOf(row)}` : undefined"
            :invalid="valueMissing(row)"
            size="small"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
          <SelectButton
            v-else-if="row.form === 'presence'"
            v-model="row.presence"
            :options="presenceOptions"
            option-label="label"
            option-value="value"
            :invalid="valueMissing(row)"
            size="small"
          />
          <InputText
            v-else
            v-model="row.text"
            size="small"
            class="w-full text-sm"
            :invalid="valueMissing(row)"
          />
        </WellLabeledField>
        <WellLabeledField
          v-if="row.form !== 'text' || row.qualifier === 'not_detected'"
          :label="t('editor.waterQuality.result.fraction')"
        >
          <Select
            v-model="row.fraction"
            :options="fractionOptions"
            option-label="label"
            option-value="value"
            show-clear
            size="small"
            class="w-full"
          />
        </WellLabeledField>
        <WellLabeledField :label="t('editor.waterQuality.result.measuredIn')">
          <Select
            v-model="row.measuredIn"
            :options="measuredInOptions"
            option-label="label"
            option-value="value"
            show-clear
            size="small"
            class="w-full"
          />
        </WellLabeledField>
      </div>
      <Message
        v-if="row.qualifier === 'not_detected' && row.detectionLimit == null"
        severity="warn"
        size="small"
        variant="simple"
      >
        {{ t('editor.waterQuality.warnings.not_detected_without_limit') }}
      </Message>

      <!-- ── Details (collapsible) ─────────────────────────────────────── -->
      <button
        type="button"
        class="flex items-center gap-2 self-start text-xs font-medium text-content-300 hover:text-content-0 bg-transparent border-0 p-0 cursor-pointer"
        @click="row.expanded = !row.expanded"
      >
        <Icon
          :name="row.expanded ? 'ph:caret-down' : 'ph:caret-right'"
          class="size-3"
        />
        {{ t('editor.waterQuality.result.details', { name: rowTitle(row) }) }}
      </button>
      <div v-if="row.expanded" class="flex flex-col gap-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <WellLabeledField
            :label="t('editor.waterQuality.result.detectionLimit')"
          >
            <WellInputNumber
              v-model="row.detectionLimit"
              :min="0"
              :max-fraction-digits="6"
              size="small"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.waterQuality.result.quantificationLimit')"
          >
            <WellInputNumber
              v-model="row.quantificationLimit"
              :min="0"
              :max-fraction-digits="6"
              size="small"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </WellLabeledField>
          <WellLabeledField
            v-if="row.form === 'value'"
            :label="t('editor.waterQuality.result.valuePrecision')"
            :info="t('editor.waterQuality.result.valuePrecisionInfo')"
            :info-label="t('editor.fieldInfo')"
          >
            <WellInputNumber
              v-model="row.valuePrecision"
              :min="0"
              :max-fraction-digits="6"
              size="small"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </WellLabeledField>
        </div>

        <div v-if="row.fraction === 'dissolved'" class="grid grid-cols-2 gap-2">
          <WellLabeledField
            :label="t('editor.waterQuality.filtration.poreSize')"
          >
            <WellInputNumber
              v-model="row.poreSize"
              :min="0"
              :max-fraction-digits="3"
              suffix=" µm"
              size="small"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.waterQuality.filtration.location')"
          >
            <Select
              v-model="row.filtrationLocation"
              :options="filtrationLocationOptions"
              option-label="label"
              option-value="value"
              show-clear
              size="small"
              class="w-full"
            />
          </WellLabeledField>
          <Message
            v-if="row.poreSize == null && !row.filtrationLocation"
            severity="warn"
            size="small"
            variant="simple"
            class="col-span-2"
          >
            {{ t('editor.waterQuality.warnings.dissolved_without_filtration') }}
          </Message>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <WellLabeledField :label="t('editor.waterQuality.result.method')">
            <InputText
              v-model="row.method"
              size="small"
              class="w-full text-sm"
              placeholder="US EPA 200.8"
            />
          </WellLabeledField>
          <WellLabeledField :label="t('editor.waterQuality.result.analyzedAt')">
            <div class="flex items-center gap-3">
              <DatePicker
                v-model="row.analyzedAt"
                :show-time="!row.analyzedDateOnly"
                hour-format="24"
                date-format="dd/mm/yy"
                show-button-bar
                size="small"
                class="flex-1"
                :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
              />
              <label
                class="flex items-center gap-1.5 text-xs text-content-300 cursor-pointer shrink-0"
              >
                <Checkbox v-model="row.analyzedDateOnly" binary />
                {{ t('editor.waterQuality.fields.dateOnly') }}
              </label>
            </div>
          </WellLabeledField>
        </div>

        <WellLabeledField
          :label="t('editor.waterQuality.result.labFlags')"
          :info="t('editor.waterQuality.result.labFlagsInfo')"
          :info-label="t('editor.fieldInfo')"
        >
          <AutoComplete
            v-model="row.labFlags"
            multiple
            :typeahead="false"
            size="small"
            class="w-full"
            :pt="{ inputMultiple: { class: 'w-full font-mono text-sm' } }"
          />
        </WellLabeledField>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <WellLabeledField :label="t('editor.waterQuality.validation.status')">
            <Select
              v-model="row.validationStatus"
              :options="validationStatusOptions"
              option-label="label"
              option-value="value"
              show-clear
              size="small"
              class="w-full"
            />
          </WellLabeledField>
          <template v-if="row.validationStatus">
            <WellLabeledField
              :label="t('editor.waterQuality.validation.qualifier')"
              :info="t('editor.waterQuality.validation.qualifierInfo')"
              :info-label="t('editor.fieldInfo')"
            >
              <InputText
                v-model="row.validationQualifier"
                size="small"
                class="w-full font-mono text-sm"
              />
            </WellLabeledField>
            <WellLabeledField
              :label="t('editor.waterQuality.validation.guideline')"
            >
              <InputText
                v-model="row.validationGuideline"
                size="small"
                class="w-full text-sm"
              />
            </WellLabeledField>
            <WellLabeledField
              :label="t('editor.waterQuality.validation.validatedBy')"
            >
              <InputText
                v-model="row.validatedBy"
                size="small"
                class="w-full text-sm"
              />
            </WellLabeledField>
            <WellLabeledField
              :label="t('editor.waterQuality.validation.validatedAt')"
            >
              <DatePicker
                v-model="row.validatedAt"
                show-time
                hour-format="24"
                date-format="dd/mm/yy"
                show-button-bar
                size="small"
                class="w-full"
                :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
              />
            </WellLabeledField>
          </template>
        </div>

        <WellLabeledField :label="t('editor.waterQuality.fields.notes')">
          <Textarea v-model="row.notes" :rows="2" class="w-full text-sm" />
        </WellLabeledField>
      </div>
    </div>

    <Button
      severity="secondary"
      text
      size="small"
      class="self-start"
      :label="t('editor.waterQuality.result.add')"
      @click="addRow"
    >
      <template #icon>
        <Icon name="ph:plus" />
      </template>
    </Button>
  </div>
</template>
