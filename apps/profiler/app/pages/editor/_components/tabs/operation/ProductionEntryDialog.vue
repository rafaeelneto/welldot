<script setup lang="ts">
import type {
  DeclaredVolume,
  Meter,
  MeterReading,
  ProductionEntry,
} from '@welldot/core';
import { formatISO } from 'date-fns';
import {
  DECLARED_METHOD_VALUES,
  READING_SOURCE_VALUES,
  meterLabel,
  resolveDeclaredMethodLabel,
  resolveReadingSourceLabel,
} from '~/utils/operationVocab';

/**
 * The entry being corrected. `null` means "adding a new one". `production`
 * is a ledger: a correction is saved as a NEW entry whose `corrects` points
 * to this one — the original is never edited in place.
 */
const model = defineModel<ProductionEntry | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [entry: ProductionEntry] }>();

const { t } = useI18n();
const profileStore = useProfileStore();
const { volumeUnit } = useUnitFormat();

type EntryType = 'meter_reading' | 'declared_volume';

const typeOptions = computed(() => [
  {
    value: 'meter_reading',
    label: t('editor.operation.production.types.meter_reading'),
  },
  {
    value: 'declared_volume',
    label: t('editor.operation.production.types.declared_volume'),
  },
]);

const meters = computed<Meter[]>(() =>
  [...(profileStore.well.meters ?? [])].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  ),
);
const meterOptions = computed(() =>
  meters.value.map(m => ({ value: m.id, label: meterLabel(m, t) })),
);
const sourceOptions = computed(() =>
  READING_SOURCE_VALUES.map(value => ({
    value,
    label: resolveReadingSourceLabel(value, t),
  })),
);
const methodOptions = computed(() =>
  DECLARED_METHOD_VALUES.map(value => ({
    value,
    label: resolveDeclaredMethodLabel(value, t),
  })),
);

/** Local copy — nothing reaches the ledger until Save. */
const form = reactive({
  type: 'meter_reading' as EntryType,
  datetime: null as Date | null,
  meterId: null as string | null,
  reading: null as number | null,
  source: null as string | null,
  periodStart: null as Date | null,
  periodEnd: null as Date | null,
  volume: null as number | null,
  method: null as string | null,
  notes: '',
});

const periodInvalid = computed(
  () =>
    !!form.periodStart &&
    !!form.periodEnd &&
    form.periodEnd.getTime() <= form.periodStart.getTime(),
);

/** Non-blocking: a reading outside the selected meter's installation window. */
const readingOutsideInstallation = computed(() => {
  if (form.type !== 'meter_reading' || !form.datetime || !form.meterId)
    return false;
  const meter = meters.value.find(m => m.id === form.meterId);
  if (!meter) return false;
  const time = form.datetime.getTime();
  return (
    time < new Date(meter.installed_at).getTime() ||
    (!!meter.removed_at && time > new Date(meter.removed_at).getTime())
  );
});

const isFormValid = computed(() =>
  form.type === 'meter_reading'
    ? !!form.datetime && !!form.meterId && form.reading != null
    : !!form.periodStart &&
      !!form.periodEnd &&
      !periodInvalid.value &&
      form.volume != null,
);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(e: ProductionEntry | null) {
  const reading = e?.type === 'meter_reading' ? (e as MeterReading) : null;
  const declared = e?.type === 'declared_volume' ? (e as DeclaredVolume) : null;
  form.type = declared ? 'declared_volume' : 'meter_reading';
  form.datetime = reading ? new Date(reading.datetime) : new Date();
  form.meterId =
    reading?.meter_id ?? meters.value.find(m => !m.removed_at)?.id ?? null;
  form.reading = reading?.reading ?? null;
  form.source = reading?.source ?? null;
  form.periodStart = declared ? new Date(declared.period_start) : null;
  form.periodEnd = declared ? new Date(declared.period_end) : null;
  form.volume = declared?.volume ?? null;
  form.method = declared?.method ?? null;
  form.notes = e?.notes ?? '';
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/** Drops `undefined` members so optional fields are absent, not `undefined`. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

const optionalText = (v: string | null) => v?.trim() || undefined;

/** Fields owned by each entry type, stripped when the type changes. */
const TYPE_FIELDS: Record<EntryType, string[]> = {
  meter_reading: ['datetime', 'meter_id', 'reading', 'source'],
  declared_volume: ['period_start', 'period_end', 'volume', 'method'],
};

/**
 * Emits a NEW ledger entry. When correcting, the original is spread first so
 * members the form does not cover (e.g. `x-` members, `sequence`) carry over,
 * and `corrects` points to it.
 */
function save() {
  if (!isFormValid.value) return;

  const base: Record<string, unknown> = { ...model.value };
  const otherType: EntryType =
    form.type === 'meter_reading' ? 'declared_volume' : 'meter_reading';
  for (const key of TYPE_FIELDS[otherType]) delete base[key];

  // Instants keep the local offset: daily/monthly buckets use the date part
  // of the instant as written.
  const typed =
    form.type === 'meter_reading'
      ? {
          type: 'meter_reading' as const,
          datetime: formatISO(form.datetime!),
          meter_id: form.meterId!,
          reading: form.reading!,
          source: optionalText(form.source),
        }
      : {
          type: 'declared_volume' as const,
          period_start: formatISO(form.periodStart!),
          period_end: formatISO(form.periodEnd!),
          volume: form.volume!,
          method: optionalText(form.method),
        };

  const next = compact({
    ...base,
    ...typed,
    id: crypto.randomUUID(),
    corrects: model.value?.id,
    notes: optionalText(form.notes),
  }) as ProductionEntry;

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
        ? t('editor.operation.production.correct')
        : t('editor.operation.production.add')
    "
    :style="{ width: '100vw', maxWidth: '36rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <Message v-if="model" severity="info" size="small" variant="simple">
        {{ t('editor.operation.production.correctInfo') }}
      </Message>

      <SelectButton
        v-model="form.type"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        class="self-start"
      />

      <!-- ── Meter reading ──────────────────────────────────────────────── -->
      <template v-if="form.type === 'meter_reading'">
        <Message
          v-if="!meters.length"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ t('editor.operation.production.noMeters') }}
        </Message>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledField :label="t('editor.operation.production.fields.meter')">
            <Select
              v-model="form.meterId"
              :options="meterOptions"
              option-label="label"
              option-value="value"
              :invalid="!form.meterId"
              class="w-full"
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.operation.production.fields.datetime')"
          >
            <DatePicker
              v-model="form.datetime"
              show-time
              hour-format="24"
              date-format="dd/mm/yy"
              class="w-full"
              :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.operation.production.fields.reading')"
            :info="t('editor.operation.production.fields.readingInfo')"
          >
            <UnitInput
              v-model="form.reading"
              unit-type="volume"
              :min="0"
              :max-fraction-digits="3"
              :suffix="` ${volumeUnit}`"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </LabeledField>
          <LabeledField :label="t('editor.operation.production.fields.source')">
            <Select
              v-model="form.source"
              :options="sourceOptions"
              option-label="label"
              option-value="value"
              editable
              show-clear
              class="w-full"
            />
          </LabeledField>
        </div>
        <Message
          v-if="readingOutsideInstallation"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ t('editor.operation.warnings.reading_outside_installation') }}
        </Message>
      </template>

      <!-- ── Declared volume ────────────────────────────────────────────── -->
      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledField
            :label="t('editor.operation.production.fields.periodStart')"
          >
            <DatePicker
              v-model="form.periodStart"
              show-time
              hour-format="24"
              date-format="dd/mm/yy"
              class="w-full"
              :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.operation.production.fields.periodEnd')"
          >
            <DatePicker
              v-model="form.periodEnd"
              show-time
              hour-format="24"
              date-format="dd/mm/yy"
              class="w-full"
              :invalid="periodInvalid"
              :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            />
          </LabeledField>
        </div>
        <Message
          v-if="periodInvalid"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ t('editor.operation.warnings.declared_period_invalid') }}
        </Message>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LabeledField :label="t('editor.operation.production.fields.volume')">
            <UnitInput
              v-model="form.volume"
              unit-type="volume"
              :min="0"
              :max-fraction-digits="3"
              :suffix="` ${volumeUnit}`"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.operation.production.fields.method')"
            :info="t('editor.operation.production.fields.methodInfo')"
          >
            <Select
              v-model="form.method"
              :options="methodOptions"
              option-label="label"
              option-value="value"
              editable
              show-clear
              class="w-full"
            />
          </LabeledField>
        </div>
      </template>

      <LabeledField :label="t('editor.operation.production.fields.notes')">
        <Textarea v-model="form.notes" :rows="2" class="w-full text-sm" />
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
        :label="
          model
            ? t('editor.operation.production.saveCorrection')
            : t('editor.operation.production.add')
        "
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
