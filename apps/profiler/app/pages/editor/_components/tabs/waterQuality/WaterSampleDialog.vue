<script setup lang="ts">
import type {
  Attachment,
  Laboratory,
  Purge,
  SamplingPoint,
  WaterSample,
} from '@welldot/core';
import { WaterSampleSchema } from '@welldot/core';
import { getPumpInstalledAt } from '@welldot/utils';
import { formatISO } from 'date-fns';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import { pumpInstallationLabel } from '~/utils/operationVocab';
import {
  PARENT_SAMPLE_TYPES,
  SAMPLE_TYPE_VALUES,
  SAMPLING_DEVICE_VALUES,
  SAMPLING_METHOD_VALUES,
  SAMPLING_POINT_TYPE_VALUES,
  resolveDeviceLabel,
  resolveParameterLabel,
  resolveSampleTypeLabel,
  resolveSamplingMethodLabel,
  resolveSamplingPointTypeLabel,
  sampleLabel,
} from '~/utils/waterQualityVocab';
import PurgeReadingsEditor from './PurgeReadingsEditor.vue';
import ResultsEditor from './ResultsEditor.vue';
import {
  draftToResult,
  emptyResultDraft,
  resultToDraft,
  toInstant,
  type PurgeReadingDraft,
  type ResultDraft,
} from './resultDraft';

/**
 * The sample being corrected. `null` means "adding a new one".
 * `water_samples` is a ledger: a correction (amended report, revalidation)
 * is saved as a NEW sample whose `corrects` points to this one — the
 * original is never edited in place.
 */
const model = defineModel<WaterSample | null>({ default: null });
/**
 * `correct` (default with a model) appends a new sample retracting the
 * original; `edit` rewrites the original in place to fix typing errors —
 * it bypasses the ledger rule, so the dialog warns about it.
 */
const props = withDefaults(defineProps<{ mode?: 'correct' | 'edit' }>(), {
  mode: 'correct',
});
const isEdit = computed(() => !!model.value && props.mode === 'edit');
const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{ save: [sample: WaterSample] }>();

const { t } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { eventTypeLabel } = useHydrodynamicEventTypes();
const { lengthUnit, volumeUnit, flowUnit } = useUnitFormat();

// ─── Options ──────────────────────────────────────────────────────────────────

const samples = computed(() => profileStore.well.water_samples ?? []);

const sampleTypeOptions = computed(() =>
  SAMPLE_TYPE_VALUES.map(value => ({
    value,
    label: resolveSampleTypeLabel(value, t),
  })),
);
const methodOptions = computed(() =>
  SAMPLING_METHOD_VALUES.map(value => ({
    value,
    label: resolveSamplingMethodLabel(value, t),
  })),
);
const pointTypeOptions = computed(() =>
  SAMPLING_POINT_TYPE_VALUES.map(value => ({
    value,
    label: resolveSamplingPointTypeLabel(value, t),
  })),
);
const deviceOptions = computed(() =>
  SAMPLING_DEVICE_VALUES.map(value => ({
    value,
    label: resolveDeviceLabel(value, t),
  })),
);
const parentOptions = computed(() =>
  [...samples.value]
    .filter(s => s.id !== model.value?.id)
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .map(s => ({ value: s.id, label: `${sampleLabel(s, t)} (${s.id})` })),
);
const campaignOptions = computed(
  () =>
    [
      ...new Set(samples.value.map(s => s.campaign).filter(Boolean)),
    ] as string[],
);
const pumpOptions = computed(() =>
  (profileStore.well.pump_installations ?? []).map(p => ({
    value: p.id,
    label: pumpInstallationLabel(p, t),
  })),
);
/** Pump in place when the sample was collected — offered as a one-click link. */
const pumpAtCollection = computed(() =>
  form.datetime
    ? getPumpInstalledAt(profileStore.well, form.datetime)
    : undefined,
);
const suggestPumpLink = computed(
  () =>
    !!pumpAtCollection.value &&
    form.pumpInstallationId !== pumpAtCollection.value.id,
);
/** The linked pump was not installed at the collection instant. */
const pumpNotInPlace = computed(
  () =>
    !!form.pumpInstallationId &&
    !!form.datetime &&
    pumpAtCollection.value?.id !== form.pumpInstallationId,
);
function linkPumpAtCollection() {
  const pump = pumpAtCollection.value;
  if (!pump) return;
  form.pumpInstallationId = pump.id;
  if (!form.pointType) form.pointType = 'pump_discharge';
}
const eventOptions = computed(() =>
  [...(profileStore.well.hydrodynamic_events ?? [])]
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .map(e => ({
      value: e.id,
      label: `${eventTypeLabel(e.type)} · ${formatDate(e.datetime, 'dd/MM/yyyy HH:mm')}`,
    })),
);
type Geometry = 'none' | 'depth' | 'interval';
const geometryOptions = computed(() =>
  (['none', 'depth', 'interval'] as const).map(value => ({
    value,
    label: t(`editor.waterQuality.samplingPoint.geometries.${value}`),
  })),
);
const stabilizedOptions = computed(() => [
  { value: true, label: t('editor.waterQuality.fields.yes') },
  { value: false, label: t('editor.waterQuality.fields.no') },
]);

// ─── Form ─────────────────────────────────────────────────────────────────────

/** Local copy — nothing reaches the ledger until Save. */
const form = reactive({
  id: '',
  datetime: null as Date | null,
  sampleType: 'routine' as string | null,
  parentSampleId: null as string | null,
  campaign: null as string | null,
  sequence: null as number | null,
  samplingMethod: null as string | null,
  // sampling point
  pointType: null as string | null,
  device: null as string | null,
  geometry: 'none' as Geometry,
  depth: null as number | null,
  depthPrecision: null as number | null,
  from: null as number | null,
  to: null as number | null,
  pumpInstallationId: null as string | null,
  // purge
  purgeDuration: null as number | null,
  purgeVolume: null as number | null,
  purgeFlowRate: null as number | null,
  purgeStabilized: null as boolean | null,
  purgeReadings: [] as PurgeReadingDraft[],
  // collection
  staticLevelEventId: null as string | null,
  collectedBy: '',
  preservation: '',
  chainOfCustody: '',
  // laboratory
  labName: '',
  labAccreditation: '',
  labReportNumber: '',
  labBatchId: '',
  labSampleId: '',
  labReceivedAt: null as Date | null,
  labReceivedDateOnly: false,
  labReceivedTemperature: null as number | null,
  notes: '',
  attachments: [] as Attachment[],
  results: [] as ResultDraft[],
});

const showPurge = ref(false);
const showLab = ref(false);
const errors = ref<string[]>([]);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

/** First free id of the form `<base>`, `<base>-2`, … */
function uniqueId(base: string): string {
  const taken = new Set(samples.value.map(s => s.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function seedForm(s: WaterSample | null) {
  const now = new Date();
  form.id = s
    ? isEdit.value
      ? s.id
      : uniqueId(`${s.id}-r`)
    : uniqueId(`ws-${formatDate(now, 'yyyy-MM-dd')}`);
  form.datetime = s ? new Date(s.datetime) : now;
  form.sampleType = s?.sample_type ?? 'routine';
  form.parentSampleId = s?.parent_sample_id ?? null;
  form.campaign = s?.campaign ?? null;
  form.sequence = s?.sequence ?? null;
  form.samplingMethod = s?.sampling_method ?? null;

  const p = s?.sampling_point;
  form.pointType = p?.type ?? null;
  form.device = p?.device ?? null;
  form.geometry =
    p?.depth !== undefined
      ? 'depth'
      : p?.from !== undefined || p?.to !== undefined
        ? 'interval'
        : 'none';
  form.depth = p?.depth ?? null;
  form.depthPrecision = p?.depth_precision ?? null;
  form.from = p?.from ?? null;
  form.to = p?.to ?? null;
  form.pumpInstallationId = p?.pump_installation_id ?? null;

  const pu = s?.purge;
  form.purgeDuration = pu?.duration ?? null;
  form.purgeVolume = pu?.volume ?? null;
  form.purgeFlowRate = pu?.flow_rate ?? null;
  form.purgeStabilized = pu?.stabilized ?? null;
  form.purgeReadings = (pu?.readings ?? []).map((r, i) => ({
    key: `p${i}`,
    elapsed: r.elapsed,
    code: r.parameter.code,
    value: r.value,
  }));
  showPurge.value = !!pu;

  form.staticLevelEventId = s?.static_level_event_id ?? null;
  form.collectedBy = s?.collected_by ?? '';
  form.preservation = s?.preservation ?? '';
  form.chainOfCustody = s?.chain_of_custody ?? '';

  const l = s?.laboratory;
  form.labName = l?.name ?? '';
  form.labAccreditation = l?.accreditation ?? '';
  form.labReportNumber = l?.report_number ?? '';
  form.labBatchId = l?.batch_id ?? '';
  form.labSampleId = l?.sample_id ?? '';
  form.labReceivedAt = l?.received_at ? new Date(l.received_at) : null;
  form.labReceivedDateOnly = l?.received_at_resolution === 'day';
  form.labReceivedTemperature = l?.received_temperature ?? null;
  showLab.value = !!l;

  form.notes = s?.notes ?? '';
  form.attachments = (s?.attachments ?? []).map(a => ({ ...a }));
  form.results = s?.results.length
    ? s.results.map(resultToDraft)
    : [{ ...emptyResultDraft(), expanded: false }];
  errors.value = [];
}

// ─── Derived form state ──────────────────────────────────────────────────────

const idTaken = computed(() =>
  samples.value.some(
    s => s.id === form.id.trim() && !(isEdit.value && s.id === model.value?.id),
  ),
);
const needsParent = computed(() =>
  PARENT_SAMPLE_TYPES.includes(form.sampleType ?? ''),
);
const hasLabFields = computed(
  () =>
    !!(
      form.labAccreditation.trim() ||
      form.labReportNumber.trim() ||
      form.labBatchId.trim() ||
      form.labSampleId.trim() ||
      form.labReceivedAt ||
      form.labReceivedTemperature != null
    ),
);
const labNameMissing = computed(
  () => hasLabFields.value && !form.labName.trim(),
);
const pointFieldsWithoutType = computed(
  () =>
    !form.pointType?.trim() &&
    (!!form.device ||
      !!form.pumpInstallationId ||
      form.depth != null ||
      form.from != null ||
      form.to != null),
);
const intervalInvalid = computed(
  () =>
    form.geometry === 'interval' &&
    form.from != null &&
    form.to != null &&
    form.to < form.from,
);

const isFormValid = computed(
  () =>
    !!form.id.trim() &&
    !idTaken.value &&
    !!form.datetime &&
    !!form.sampleType?.trim() &&
    !labNameMissing.value &&
    !pointFieldsWithoutType.value &&
    !intervalInvalid.value &&
    form.results.length > 0,
);

// ─── Save ─────────────────────────────────────────────────────────────────────

const text = (v: string | null | undefined) => v?.trim() || undefined;
const num = (v: number | null | undefined) => (v == null ? undefined : v);

function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

function buildSamplingPoint(): SamplingPoint | undefined {
  const type = text(form.pointType);
  if (!type) return undefined;
  const base = { ...model.value?.sampling_point };
  for (const key of ['depth', 'depth_precision', 'from', 'to'] as const)
    delete base[key];
  return compact({
    ...base,
    type,
    device: text(form.device),
    depth: form.geometry === 'depth' ? num(form.depth) : undefined,
    depth_precision:
      form.geometry === 'depth' ? num(form.depthPrecision) : undefined,
    from: form.geometry === 'interval' ? num(form.from) : undefined,
    to: form.geometry === 'interval' ? num(form.to) : undefined,
    pump_installation_id: form.pumpInstallationId ?? undefined,
  });
}

function buildPurge(): Purge | undefined {
  const readings = form.purgeReadings
    .filter(r => r.elapsed != null && r.code && r.value != null)
    .map(r => ({
      elapsed: r.elapsed!,
      parameter: { code: r.code!, vocabulary: 'welldot' },
      value: r.value!,
    }));
  const purge = compact({
    ...model.value?.purge,
    duration: num(form.purgeDuration),
    volume: num(form.purgeVolume),
    flow_rate: num(form.purgeFlowRate),
    stabilized: form.purgeStabilized ?? undefined,
    readings: readings.length ? readings : undefined,
  });
  return Object.keys(purge).length ? purge : undefined;
}

function buildLaboratory(): Laboratory | undefined {
  const name = text(form.labName);
  if (!name) return undefined;
  const received = toInstant(form.labReceivedAt, form.labReceivedDateOnly);
  return compact({
    ...model.value?.laboratory,
    name,
    accreditation: text(form.labAccreditation),
    report_number: text(form.labReportNumber),
    batch_id: text(form.labBatchId),
    sample_id: text(form.labSampleId),
    received_at: received.instant,
    received_at_resolution: received.resolution,
    received_temperature: num(form.labReceivedTemperature),
  });
}

/** Readable "Result 3 (Sulfate): message" lines for schema issues. */
function describeIssues(sample: WaterSample): string[] {
  const parsed = WaterSampleSchema.safeParse(sample);
  if (parsed.success) return [];
  return parsed.error.issues.map(issue => {
    const [head, index] = issue.path;
    if (head === 'results' && typeof index === 'number') {
      const r = sample.results[index];
      const name = r?.parameter.code
        ? resolveParameterLabel(r.parameter, t)
        : '—';
      return t('editor.waterQuality.errors.result', {
        n: index + 1,
        name,
        message: issue.message,
      });
    }
    return issue.path.length
      ? `${issue.path.join('.')}: ${issue.message}`
      : issue.message;
  });
}

/**
 * Emits a NEW ledger sample (add / correct) or, in `edit` mode, the
 * original rewritten under the same id. When correcting or editing, the
 * original is spread first
 * so members the form does not cover (e.g. `x-` members) carry over, and
 * `corrects` points to it.
 */
function save() {
  if (!isFormValid.value) return;
  const sample = compact({
    ...model.value,
    id: form.id.trim(),
    datetime: formatISO(form.datetime!),
    sample_type: form.sampleType!.trim(),
    parent_sample_id: form.parentSampleId ?? undefined,
    sequence: num(form.sequence),
    campaign: text(form.campaign),
    sampling_method: text(form.samplingMethod),
    sampling_point: buildSamplingPoint(),
    purge: buildPurge(),
    static_level_event_id: form.staticLevelEventId ?? undefined,
    collected_by: text(form.collectedBy),
    preservation: text(form.preservation),
    chain_of_custody: text(form.chainOfCustody),
    laboratory: buildLaboratory(),
    // An edit keeps the original `corrects`; a correction retracts the original.
    corrects: isEdit.value ? model.value?.corrects : model.value?.id,
    notes: text(form.notes),
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
    results: form.results.map(draftToResult),
  }) as WaterSample;

  errors.value = describeIssues(sample);
  if (errors.value.length) return;

  if (!isEdit.value) return commit(sample);
  // An in-place edit rewrites the original with no trace — confirm first.
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.waterQuality.editConfirm'),
    message: t('editor.waterQuality.editConfirmInfo'),
    acceptLabel: t('editor.waterQuality.saveEdit'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'warn' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => commit(sample),
  });
}

function commit(sample: WaterSample) {
  emit('save', sample);
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      isEdit
        ? t('editor.waterQuality.edit')
        : model
          ? t('editor.waterQuality.correct')
          : t('editor.waterQuality.add')
    "
    :style="{ width: '100vw', maxWidth: '52rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <Message v-if="isEdit" severity="warn" size="small">
        <template #icon>
          <Icon name="ph:warning-duotone" class="size-5" />
        </template>
        {{ t('editor.waterQuality.editWarning') }}
      </Message>
      <Message v-else-if="model" severity="info" size="small" variant="simple">
        {{ t('editor.waterQuality.correctInfo') }}
      </Message>

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LabeledField
          :label="t('editor.waterQuality.fields.id')"
          :info="t('editor.waterQuality.fields.idInfo')"
        >
          <InputText
            v-model="form.id"
            :disabled="isEdit"
            class="w-full font-mono text-sm"
            :invalid="!form.id.trim() || idTaken"
          />
        </LabeledField>
        <LabeledField :label="t('editor.waterQuality.fields.datetime')">
          <DatePicker
            v-model="form.datetime"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            :invalid="!form.datetime"
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.sampleType')"
          :info="t('editor.waterQuality.fields.sampleTypeInfo')"
        >
          <Select
            v-model="form.sampleType"
            :options="sampleTypeOptions"
            option-label="label"
            option-value="value"
            editable
            :invalid="!form.sampleType?.trim()"
            class="w-full"
          />
        </LabeledField>
      </div>
      <Message v-if="idTaken" severity="error" size="small" variant="simple">
        {{ t('editor.waterQuality.errors.idTaken') }}
      </Message>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LabeledField
          v-if="needsParent || form.parentSampleId"
          :label="t('editor.waterQuality.fields.parentSample')"
          :info="t('editor.waterQuality.fields.parentSampleInfo')"
          class="sm:col-span-3"
        >
          <Select
            v-model="form.parentSampleId"
            :options="parentOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            :invalid="needsParent && !form.parentSampleId"
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.campaign')"
          :info="t('editor.waterQuality.fields.campaignInfo')"
        >
          <Select
            v-model="form.campaign"
            :options="campaignOptions"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.sequence')"
          :info="t('editor.waterQuality.fields.sequenceInfo')"
        >
          <WellInputNumber
            v-model="form.sequence"
            :max-fraction-digits="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.samplingMethod')"
          :info="t('editor.waterQuality.fields.samplingMethodInfo')"
        >
          <Select
            v-model="form.samplingMethod"
            :options="methodOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
          />
        </LabeledField>
      </div>
      <Message
        v-if="needsParent && !form.parentSampleId"
        severity="warn"
        size="small"
        variant="simple"
      >
        {{ t('editor.waterQuality.warnings.parent_missing') }}
      </Message>

      <!-- ── Sampling point ─────────────────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <span class="section-label">
          <Icon name="ph:map-pin-duotone" class="size-4" />
          {{ t('editor.waterQuality.samplingPoint.title') }}
        </span>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LabeledField :label="t('editor.waterQuality.samplingPoint.type')">
            <Select
              v-model="form.pointType"
              :options="pointTypeOptions"
              option-label="label"
              option-value="value"
              editable
              show-clear
              :invalid="pointFieldsWithoutType"
              class="w-full"
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.waterQuality.samplingPoint.device')"
            :info="t('editor.waterQuality.samplingPoint.deviceInfo')"
          >
            <Select
              v-model="form.device"
              :options="deviceOptions"
              option-label="label"
              option-value="value"
              editable
              show-clear
              class="w-full"
            />
          </LabeledField>
          <LabeledField
            v-if="pumpOptions.length || form.pumpInstallationId"
            :label="t('editor.waterQuality.samplingPoint.pumpInstallation')"
            :info="t('editor.waterQuality.samplingPoint.pumpInstallationInfo')"
          >
            <Select
              v-model="form.pumpInstallationId"
              :options="pumpOptions"
              option-label="label"
              option-value="value"
              show-clear
              class="w-full"
            />
            <Button
              v-if="suggestPumpLink"
              :label="
                t('editor.waterQuality.samplingPoint.linkPumpAtCollection', {
                  pump: pumpInstallationLabel(pumpAtCollection!, t),
                })
              "
              size="small"
              severity="secondary"
              text
              class="self-start"
              @click="linkPumpAtCollection"
            >
              <template #icon>
                <Icon name="ph:link-duotone" />
              </template>
            </Button>
            <Message
              v-else-if="pumpNotInPlace"
              severity="warn"
              size="small"
              variant="simple"
            >
              {{ t('editor.waterQuality.samplingPoint.pumpNotInPlace') }}
            </Message>
          </LabeledField>
        </div>
        <Message
          v-if="pointFieldsWithoutType"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ t('editor.waterQuality.errors.pointTypeRequired') }}
        </Message>
        <div class="flex flex-col gap-3">
          <SelectButton
            v-model="form.geometry"
            :options="geometryOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            class="self-start"
          />
          <div v-if="form.geometry === 'depth'" class="grid grid-cols-2 gap-4">
            <LabeledField
              :label="t('editor.waterQuality.samplingPoint.depth')"
              :info="t('editor.waterQuality.samplingPoint.depthInfo')"
            >
              <UnitInput
                v-model="form.depth"
                unit-type="length"
                :min="0"
                :suffix="` ${lengthUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.samplingPoint.depthPrecision')"
            >
              <UnitInput
                v-model="form.depthPrecision"
                unit-type="length"
                :min="0"
                :suffix="` ${lengthUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
          </div>
          <div
            v-else-if="form.geometry === 'interval'"
            class="grid grid-cols-2 gap-4"
          >
            <LabeledField :label="t('editor.waterQuality.samplingPoint.from')">
              <UnitInput
                v-model="form.from"
                unit-type="length"
                :min="0"
                :suffix="` ${lengthUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField :label="t('editor.waterQuality.samplingPoint.to')">
              <UnitInput
                v-model="form.to"
                unit-type="length"
                :min="0"
                :suffix="` ${lengthUnit}`"
                :invalid="intervalInvalid"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
          </div>
          <p
            v-if="form.pumpInstallationId && form.geometry === 'none'"
            class="text-xs text-content-400 m-0"
          >
            {{ t('editor.waterQuality.samplingPoint.pumpDepthInfo') }}
          </p>
        </div>
      </div>

      <!-- ── Collection ─────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField
          v-if="eventOptions.length || form.staticLevelEventId"
          :label="t('editor.waterQuality.fields.staticLevelEvent')"
          :info="t('editor.waterQuality.fields.staticLevelEventInfo')"
          class="sm:col-span-2"
        >
          <Select
            v-model="form.staticLevelEventId"
            :options="eventOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full"
          />
        </LabeledField>
        <LabeledField :label="t('editor.waterQuality.fields.collectedBy')">
          <InputText v-model="form.collectedBy" class="w-full" />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.chainOfCustody')"
          :info="t('editor.waterQuality.fields.chainOfCustodyInfo')"
        >
          <InputText
            v-model="form.chainOfCustody"
            class="w-full font-mono text-sm"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.waterQuality.fields.preservation')"
          :info="t('editor.waterQuality.fields.preservationInfo')"
          class="sm:col-span-2"
        >
          <InputText v-model="form.preservation" class="w-full" />
        </LabeledField>
      </div>

      <!-- ── Purge (collapsible) ────────────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="section-toggle"
          @click="showPurge = !showPurge"
        >
          <Icon
            :name="showPurge ? 'ph:caret-down' : 'ph:caret-right'"
            class="size-3"
          />
          <Icon name="ph:waves-duotone" class="size-4" />
          {{ t('editor.waterQuality.purge.title') }}
        </button>
        <template v-if="showPurge">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <LabeledField :label="t('editor.waterQuality.purge.duration')">
              <WellInputNumber
                v-model="form.purgeDuration"
                :min="0"
                :max-fraction-digits="1"
                suffix=" min"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField :label="t('editor.waterQuality.purge.volume')">
              <UnitInput
                v-model="form.purgeVolume"
                unit-type="volume"
                :min="0"
                :max-fraction-digits="4"
                :suffix="` ${volumeUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField :label="t('editor.waterQuality.purge.flowRate')">
              <UnitInput
                v-model="form.purgeFlowRate"
                unit-type="flow"
                :min="0"
                :max-fraction-digits="4"
                :suffix="` ${flowUnit}`"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.purge.stabilized')"
              :info="t('editor.waterQuality.purge.stabilizedInfo')"
            >
              <SelectButton
                v-model="form.purgeStabilized"
                :options="stabilizedOptions"
                option-label="label"
                option-value="value"
                size="small"
              />
            </LabeledField>
          </div>
          <LabeledField
            :label="t('editor.waterQuality.purge.readings')"
            :info="t('editor.waterQuality.purge.readingsInfo')"
          >
            <PurgeReadingsEditor v-model="form.purgeReadings" />
          </LabeledField>
        </template>
      </div>

      <!-- ── Laboratory (collapsible) ───────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="section-toggle"
          @click="showLab = !showLab"
        >
          <Icon
            :name="showLab ? 'ph:caret-down' : 'ph:caret-right'"
            class="size-3"
          />
          <Icon name="ph:flask-duotone" class="size-4" />
          {{ t('editor.waterQuality.laboratory.title') }}
        </button>
        <template v-if="showLab">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabeledField :label="t('editor.waterQuality.laboratory.name')">
              <InputText
                v-model="form.labName"
                class="w-full"
                :invalid="labNameMissing"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.laboratory.accreditation')"
              :info="t('editor.waterQuality.laboratory.accreditationInfo')"
            >
              <InputText v-model="form.labAccreditation" class="w-full" />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.laboratory.reportNumber')"
            >
              <InputText
                v-model="form.labReportNumber"
                class="w-full font-mono text-sm"
              />
            </LabeledField>
            <LabeledField :label="t('editor.waterQuality.laboratory.batchId')">
              <InputText
                v-model="form.labBatchId"
                class="w-full font-mono text-sm"
              />
            </LabeledField>
            <LabeledField :label="t('editor.waterQuality.laboratory.sampleId')">
              <InputText
                v-model="form.labSampleId"
                class="w-full font-mono text-sm"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.laboratory.receivedTemperature')"
            >
              <WellInputNumber
                v-model="form.labReceivedTemperature"
                :max-fraction-digits="1"
                suffix=" °C"
                class="w-full"
                :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              />
            </LabeledField>
            <LabeledField
              :label="t('editor.waterQuality.laboratory.receivedAt')"
              class="sm:col-span-3"
            >
              <div class="flex items-center gap-3">
                <DatePicker
                  v-model="form.labReceivedAt"
                  :show-time="!form.labReceivedDateOnly"
                  hour-format="24"
                  date-format="dd/mm/yy"
                  show-button-bar
                  class="flex-1"
                  :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
                />
                <label
                  class="flex items-center gap-1.5 text-xs text-content-300 cursor-pointer shrink-0"
                >
                  <Checkbox v-model="form.labReceivedDateOnly" binary />
                  {{ t('editor.waterQuality.fields.dateOnly') }}
                </label>
              </div>
            </LabeledField>
          </div>
          <Message
            v-if="labNameMissing"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ t('editor.waterQuality.errors.labNameRequired') }}
          </Message>
        </template>
      </div>

      <!-- ── Results ────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <span class="section-label">
          <Icon name="ph:list-checks-duotone" class="size-4" />
          {{ t('editor.waterQuality.fields.results') }}
        </span>
        <ResultsEditor v-model="form.results" />
        <Message
          v-if="!form.results.length"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ t('editor.waterQuality.errors.noResults') }}
        </Message>
      </div>

      <LabeledField :label="t('editor.waterQuality.fields.notes')">
        <Textarea v-model="form.notes" :rows="2" class="w-full text-sm" />
      </LabeledField>

      <LabeledField :label="t('editor.waterQuality.fields.attachments')">
        <AttachmentField v-model="form.attachments" context="sample" />
      </LabeledField>

      <Message
        v-if="errors.length"
        severity="error"
        size="small"
        variant="simple"
      >
        <div class="flex flex-col gap-1">
          <span class="font-medium">{{
            t('editor.waterQuality.errors.title')
          }}</span>
          <span v-for="e in errors" :key="e">{{ e }}</span>
        </div>
      </Message>
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
          isEdit
            ? t('editor.waterQuality.saveEdit')
            : model
              ? t('editor.waterQuality.saveCorrection')
              : t('editor.waterQuality.add')
        "
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-content-100);
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-content-300);
  cursor: pointer;
}

.section-toggle:hover {
  color: var(--color-content-0);
}
</style>
