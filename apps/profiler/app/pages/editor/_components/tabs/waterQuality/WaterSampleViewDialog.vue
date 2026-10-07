<script setup lang="ts">
import type {
  HistoryLogEntry,
  LimitSet,
  WaterQualityResult,
  WaterSample,
} from '@welldot/core';
import {
  HISTORY_LOG_CATEGORIES,
  MAINTENANCE_TYPES,
  SAMPLE_TYPES,
  SAMPLING_DEVICES,
  SAMPLING_METHODS,
  SAMPLING_POINT_TYPES,
} from '@welldot/core';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  VALIDATION_STATUS_SEVERITY,
  parameterUnitSymbol,
  resolveFractionLabel,
  resolveMeasuredInLabel,
  resolveParameterLabel,
  resolveValidationStatusLabel,
  sampleLabel,
} from '~/utils/waterQualityVocab';
import type { SampleWarning } from './resultDraft';
import { useSampleDerived } from './useSampleDerived';

/**
 * Full read-only view of one water sample (.well v2.3), in tabs: collection
 * (sampling point, laboratory, purge, notes and files); every result with
 * its limits, method, analysis date and validation; and the ledger links
 * (corrections, duplicates/splits, history log entries). Linked samples open
 * in place. The sample is resolved from the store by id so the view stays
 * live; Edit / Correct hand it to the sample dialog.
 */
const visible = defineModel<boolean>('visible', { default: false });

type ViewTab = 'sample' | 'results' | 'links';

const props = defineProps<{
  sampleId: string;
  retracted: boolean;
  warnings: SampleWarning[];
  limitSet?: LimitSet;
}>();

const emit = defineEmits<{
  edit: [sample: WaterSample];
  correct: [sample: WaterSample];
}>();

const { t, locale } = useI18n();
const { vocabLabel } = useVocab();
const profileStore = useProfileStore();
const sampleView = useWaterSampleView();
const { eventTypeLabel } = useHydrodynamicEventTypes();
const { formatFlow, formatVolume } = useUnitFormat();

const activeTab = ref<ViewTab>('sample');
// Following a link opens another sample: start on its first tab.
watch(
  () => props.sampleId,
  () => (activeTab.value = 'sample'),
);

const samples = computed(() => profileStore.well.water_samples ?? []);

const sample = computed<WaterSample | undefined>(() =>
  samples.value.find(s => s.id === props.sampleId),
);

const {
  fmt,
  parent,
  dateLine,
  depthText,
  pumpText,
  formation,
  receivedAtText,
  exceedances,
  valueText,
  isRejected,
  derived,
  warningMessages,
} = useSampleDerived(
  sample,
  () => props.limitSet,
  () => props.warnings,
);

type Fact = { label: string; value?: string | null; mono?: boolean };

function present(facts: Fact[]): Fact[] {
  return facts.filter(f => f.value);
}

// ─── Collection ───────────────────────────────────────────────────────────────

const staticLevelEvent = computed(() => {
  const id = sample.value?.static_level_event_id;
  if (!id) return null;
  const e = profileStore.well.hydrodynamic_events?.find(x => x.id === id);
  return e
    ? `${eventTypeLabel(e.type)} · ${formatDate(e.datetime, 'dd/MM/yyyy HH:mm')}`
    : id;
});

const collectionFacts = computed<Fact[]>(() => {
  const s = sample.value;
  if (!s) return [];
  return present([
    {
      label: t('editor.waterQuality.fields.datetime'),
      value: formatDate(s.datetime, 'dd/MM/yyyy HH:mm'),
      mono: true,
    },
    {
      label: t('editor.waterQuality.fields.sequence'),
      value: s.sequence != null ? String(s.sequence) : null,
      mono: true,
    },
    { label: t('editor.waterQuality.fields.campaign'), value: s.campaign },
    {
      label: t('editor.waterQuality.fields.samplingMethod'),
      value: s.sampling_method
        ? vocabLabel(SAMPLING_METHODS, s.sampling_method)
        : null,
    },
    {
      label: t('editor.waterQuality.fields.collectedBy'),
      value: s.collected_by,
    },
    {
      label: t('editor.waterQuality.fields.preservation'),
      value: s.preservation,
    },
    {
      label: t('editor.waterQuality.fields.chainOfCustody'),
      value: s.chain_of_custody,
      mono: true,
    },
    {
      label: t('editor.waterQuality.fields.staticLevelEvent'),
      value: staticLevelEvent.value,
    },
  ]);
});

const pointFacts = computed<Fact[]>(() => {
  const p = sample.value?.sampling_point;
  return present([
    {
      label: t('editor.waterQuality.samplingPoint.type'),
      value: p?.type ? vocabLabel(SAMPLING_POINT_TYPES, p.type) : null,
    },
    {
      label: t('editor.waterQuality.samplingPoint.device'),
      value: p?.device ? vocabLabel(SAMPLING_DEVICES, p.device) : null,
    },
    {
      label: t('editor.waterQuality.samplingPoint.depth'),
      value: depthText.value,
      mono: true,
    },
    {
      label: t('editor.waterQuality.samplingPoint.pumpInstallation'),
      value: pumpText.value,
    },
  ]);
});

const labFacts = computed<Fact[]>(() => {
  const l = sample.value?.laboratory;
  if (!l) return [];
  return present([
    { label: t('editor.waterQuality.laboratory.name'), value: l.name },
    {
      label: t('editor.waterQuality.laboratory.accreditation'),
      value: l.accreditation,
      mono: true,
    },
    {
      label: t('editor.waterQuality.laboratory.reportNumber'),
      value: l.report_number,
      mono: true,
    },
    {
      label: t('editor.waterQuality.laboratory.batchId'),
      value: l.batch_id,
      mono: true,
    },
    {
      label: t('editor.waterQuality.laboratory.sampleId'),
      value: l.sample_id,
      mono: true,
    },
    {
      label: t('editor.waterQuality.laboratory.receivedAt'),
      value: receivedAtText.value,
      mono: true,
    },
    {
      label: t('editor.waterQuality.laboratory.receivedTemperature'),
      value:
        l.received_temperature != null
          ? `${fmt(l.received_temperature, 1)} °C`
          : null,
      mono: true,
    },
  ]);
});

const purgeFacts = computed<Fact[]>(() => {
  const p = sample.value?.purge;
  if (!p) return [];
  return present([
    {
      label: t('editor.waterQuality.purge.duration'),
      value: p.duration != null ? `${fmt(p.duration, 1)} min` : null,
      mono: true,
    },
    {
      label: t('editor.waterQuality.purge.volume'),
      value: p.volume != null ? formatVolume(p.volume) : null,
      mono: true,
    },
    {
      label: t('editor.waterQuality.purge.flowRate'),
      value: p.flow_rate != null ? formatFlow(p.flow_rate) : null,
      mono: true,
    },
    {
      label: t('editor.waterQuality.purge.stabilized'),
      value:
        p.stabilized === undefined
          ? null
          : t(`editor.waterQuality.fields.${p.stabilized ? 'yes' : 'no'}`),
    },
  ]);
});

const purgeReadings = computed(() =>
  [...(sample.value?.purge?.readings ?? [])].sort(
    (a, b) => a.elapsed - b.elapsed,
  ),
);

// ─── Results ──────────────────────────────────────────────────────────────────

function limitText(value: number | undefined, r: WaterQualityResult) {
  return value != null ? `${fmt(value, 6)} ${parameterUnitSymbol(r)}` : '';
}

function fractionText(r: WaterQualityResult): string {
  const f = r.filtration;
  return [
    r.fraction ? resolveFractionLabel(r.fraction, t) : null,
    f?.pore_size != null ? `${fmt(f.pore_size, 2)} µm` : null,
    f?.location
      ? `${t('editor.waterQuality.filtration.location')} ${resolveMeasuredInLabel(f.location, t).toLowerCase()}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function analyzedAtText(r: WaterQualityResult): string {
  if (!r.analyzed_at) return '';
  return formatDate(
    r.analyzed_at,
    r.analyzed_at_resolution === 'day' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm',
  );
}

function validationInfo(r: WaterQualityResult): string | undefined {
  const v = r.validation;
  if (!v) return undefined;
  return (
    [
      v.qualifier,
      v.guideline,
      v.validated_by,
      v.validated_at && formatDate(v.validated_at, 'dd/MM/yyyy'),
    ]
      .filter(Boolean)
      .join(' · ') || undefined
  );
}

// ─── Links ────────────────────────────────────────────────────────────────────

const corrected = computed(() => {
  const id = sample.value?.corrects;
  return id ? { id, sample: samples.value.find(s => s.id === id) } : null;
});

const correctedBy = computed(() =>
  samples.value.filter(s => s.corrects === props.sampleId),
);

const children = computed(() =>
  samples.value.filter(s => s.parent_sample_id === props.sampleId),
);

const historyLogs = computed(() =>
  (profileStore.well.history_logs ?? [])
    .filter(l => l.sample_id === props.sampleId)
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    ),
);

function historyLogLabel(log: HistoryLogEntry): string {
  return log.maintenance_type
    ? vocabLabel(MAINTENANCE_TYPES, log.maintenance_type)
    : vocabLabel(HISTORY_LOG_CATEGORIES, log.category);
}

const linkCount = computed(
  () =>
    (corrected.value ? 1 : 0) +
    correctedBy.value.length +
    (sample.value?.parent_sample_id ? 1 : 0) +
    children.value.length +
    historyLogs.value.length,
);
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    maximizable
    dismissable-mask
    :style="{ width: '100vw', maxWidth: '64rem', height: 'min(90vh, 56rem)' }"
    :breakpoints="{ '640px': '100vw' }"
    :pt="{ content: { class: 'flex flex-col min-h-0 flex-1 pb-0' } }"
  >
    <template #header>
      <div v-if="sample" class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center flex-wrap gap-2">
          <Icon name="ph:flask-duotone" class="size-5 text-content-300" />
          <span class="text-base font-medium text-content-0">
            {{ vocabLabel(SAMPLE_TYPES, sample.sample_type) }}
          </span>
          <Tag
            v-if="retracted"
            v-tooltip.top="t('editor.waterQuality.retractedInfo')"
            :value="t('editor.waterQuality.retracted')"
            severity="secondary"
            class="text-[11px]"
          />
          <Tag
            v-if="sample.corrects"
            v-tooltip.top="t('editor.waterQuality.correctionInfo')"
            :value="t('editor.waterQuality.correction')"
            severity="info"
            class="text-[11px]"
          />
          <Tag
            v-if="sample.campaign"
            :value="sample.campaign"
            severity="secondary"
            class="text-[11px] font-mono"
          />
        </div>
        <span class="text-xs text-content-300 truncate font-mono">
          {{ dateLine }} · {{ sample.id }}
        </span>
      </div>
    </template>

    <Tabs v-if="sample" v-model:value="activeTab">
      <TabList>
        <Tab value="sample">
          {{ t('editor.waterQuality.view.tabs.sample') }}
        </Tab>
        <Tab value="results">
          <span class="flex items-center gap-1.5">
            {{ t('editor.waterQuality.view.tabs.results') }}
            <Badge
              v-if="exceedances.size"
              v-tooltip.top="limitSet?.name"
              :value="exceedances.size"
              severity="danger"
              size="small"
            />
            <span v-else class="font-mono text-xs text-content-400">
              {{ sample.results.length }}
            </span>
          </span>
        </Tab>
        <Tab value="links">
          <span class="flex items-center gap-1.5">
            {{ t('editor.waterQuality.view.tabs.links') }}
            <span class="font-mono text-xs text-content-400">
              {{ linkCount }}
            </span>
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <!-- ── Collection ─────────────────────────────────────────────────── -->
        <TabPanel value="sample">
          <div class="flex flex-col gap-6 py-4">
            <section class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.sections.collection') }}
              </h3>
              <dl class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div
                  v-for="f in collectionFacts"
                  :key="f.label"
                  class="flex flex-col"
                >
                  <dt class="view-label">{{ f.label }}</dt>
                  <dd
                    class="m-0 text-sm text-content-100"
                    :class="{ 'font-mono': f.mono }"
                  >
                    {{ f.value }}
                  </dd>
                </div>
              </dl>
              <button
                v-if="sample.parent_sample_id"
                type="button"
                class="link-btn self-start text-xs text-content-300"
                :disabled="!parent"
                @click="parent && sampleView.open(parent.id)"
              >
                <Icon name="ph:link-duotone" class="size-3.5" />
                {{
                  t('editor.waterQuality.card.parentOf', {
                    sample: parent
                      ? sampleLabel(parent, locale)
                      : sample.parent_sample_id,
                  })
                }}
              </button>
            </section>

            <section
              v-if="pointFacts.length || formation !== undefined"
              class="flex flex-col gap-3"
            >
              <h3 class="view-heading">
                {{ t('editor.waterQuality.samplingPoint.title') }}
              </h3>
              <dl
                v-if="pointFacts.length"
                class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3"
              >
                <div
                  v-for="f in pointFacts"
                  :key="f.label"
                  class="flex flex-col"
                >
                  <dt class="view-label">{{ f.label }}</dt>
                  <dd
                    class="m-0 text-sm text-content-100"
                    :class="{ 'font-mono': f.mono }"
                  >
                    {{ f.value }}
                  </dd>
                </div>
              </dl>
              <Message
                v-if="formation === true"
                severity="success"
                size="small"
                variant="simple"
              >
                {{ t('editor.waterQuality.card.formationWater') }} —
                {{ t('editor.waterQuality.card.formationWaterInfo') }}
              </Message>
              <Message
                v-else-if="formation === false"
                severity="warn"
                size="small"
                variant="simple"
              >
                {{ t('editor.waterQuality.card.notFormationWater') }} —
                {{ t('editor.waterQuality.card.notFormationWaterInfo') }}
              </Message>
            </section>

            <section v-if="labFacts.length" class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.laboratory.title') }}
              </h3>
              <dl class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div v-for="f in labFacts" :key="f.label" class="flex flex-col">
                  <dt class="view-label">{{ f.label }}</dt>
                  <dd
                    class="m-0 text-sm text-content-100"
                    :class="{ 'font-mono': f.mono }"
                  >
                    {{ f.value }}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              v-if="purgeFacts.length || purgeReadings.length"
              class="flex flex-col gap-3"
            >
              <h3 class="view-heading">
                {{ t('editor.waterQuality.purge.title') }}
              </h3>
              <dl
                v-if="purgeFacts.length"
                class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3"
              >
                <div
                  v-for="f in purgeFacts"
                  :key="f.label"
                  class="flex flex-col"
                >
                  <dt class="view-label">{{ f.label }}</dt>
                  <dd
                    class="m-0 text-sm text-content-100"
                    :class="{ 'font-mono': f.mono }"
                  >
                    {{ f.value }}
                  </dd>
                </div>
              </dl>
              <div v-if="purgeReadings.length" class="flex flex-col gap-2">
                <span class="view-label">
                  {{ t('editor.waterQuality.purge.readings') }}
                </span>
                <div class="overflow-x-auto">
                  <table class="view-table">
                    <thead>
                      <tr>
                        <th>{{ t('editor.waterQuality.purge.elapsed') }}</th>
                        <th>{{ t('editor.waterQuality.purge.parameter') }}</th>
                        <th class="text-right">
                          {{ t('editor.waterQuality.purge.value') }}
                        </th>
                        <th>{{ t('editor.waterQuality.pdf.unit') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(r, i) in purgeReadings" :key="i">
                        <td class="font-mono">{{ fmt(r.elapsed, 1) }} min</td>
                        <td>{{ resolveParameterLabel(r.parameter, t) }}</td>
                        <td class="font-mono text-right">
                          {{ fmt(r.value, 6) }}
                        </td>
                        <td class="font-mono text-content-300">
                          {{ parameterUnitSymbol({ parameter: r.parameter }) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section
              v-if="
                sample.notes ||
                sample.attachments?.length ||
                warningMessages.length
              "
              class="flex flex-col gap-3"
            >
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.sections.notes') }}
              </h3>
              <Message
                v-for="msg in warningMessages"
                :key="msg"
                severity="warn"
                size="small"
                variant="simple"
              >
                {{ msg }}
              </Message>
              <p
                v-if="sample.notes"
                class="m-0 text-sm leading-relaxed whitespace-pre-line text-content-200"
              >
                {{ sample.notes }}
              </p>
              <AttachmentField
                :model-value="sample.attachments"
                readonly
                :visible-count="6"
              />
            </section>
          </div>
        </TabPanel>

        <!-- ── Results ────────────────────────────────────────────────────── -->
        <TabPanel value="results">
          <div class="flex flex-col gap-3 py-4">
            <div
              v-if="derived.length"
              class="flex items-center gap-1.5 flex-wrap"
            >
              <Tag
                v-for="c in derived"
                :key="c.key"
                v-tooltip.top="c.info"
                :value="c.label"
                :severity="c.severity"
                class="text-xs"
              />
            </div>
            <p v-if="limitSet" class="m-0 text-xs text-content-400">
              {{
                t('editor.waterQuality.view.comparingWith', {
                  set: limitSet.name,
                })
              }}
            </p>
            <div class="overflow-x-auto">
              <table class="view-table">
                <thead>
                  <tr>
                    <th>{{ t('editor.waterQuality.pdf.parameter') }}</th>
                    <th class="text-right">
                      {{ t('editor.waterQuality.pdf.value') }}
                    </th>
                    <th>{{ t('editor.waterQuality.pdf.unit') }}</th>
                    <th>{{ t('editor.waterQuality.view.columns.limits') }}</th>
                    <th>{{ t('editor.waterQuality.pdf.fraction') }}</th>
                    <th>{{ t('editor.waterQuality.pdf.measuredIn') }}</th>
                    <th>{{ t('editor.waterQuality.pdf.method') }}</th>
                    <th>{{ t('editor.waterQuality.result.analyzedAt') }}</th>
                    <th>{{ t('editor.waterQuality.pdf.validation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(r, i) in sample.results"
                    :key="i"
                    :class="{ 'opacity-50': isRejected(r) }"
                  >
                    <td>
                      <div class="flex flex-col gap-0.5">
                        <span
                          class="text-content-0"
                          :class="{ 'line-through': isRejected(r) }"
                        >
                          {{ resolveParameterLabel(r.parameter, t) }}
                          <span
                            v-if="r.parameter.vocabulary !== 'welldot'"
                            class="ml-1 font-mono text-content-400"
                          >
                            {{ r.parameter.vocabulary }}:{{ r.parameter.code }}
                          </span>
                        </span>
                        <span
                          v-if="r.notes"
                          class="text-[11px] text-content-400 whitespace-pre-line"
                        >
                          {{ r.notes }}
                        </span>
                      </div>
                    </td>
                    <td class="text-right font-mono whitespace-nowrap">
                      <Tag
                        v-if="exceedances.has(i)"
                        v-tooltip.top="exceedances.get(i)!.join('\n')"
                        :value="valueText(r)"
                        severity="danger"
                        class="text-xs font-mono"
                      />
                      <span v-else class="text-content-0">
                        {{ valueText(r) }}
                      </span>
                      <span
                        v-if="r.value_precision != null"
                        class="block text-[11px] text-content-400"
                      >
                        ± {{ fmt(r.value_precision, 6) }}
                      </span>
                    </td>
                    <td class="font-mono text-content-300">
                      {{ parameterUnitSymbol(r) }}
                    </td>
                    <td class="font-mono text-content-300 whitespace-nowrap">
                      <span v-if="r.detection_limit != null" class="block">
                        {{ t('editor.waterQuality.fields.detectionLimit') }}
                        {{ limitText(r.detection_limit, r) }}
                      </span>
                      <span v-if="r.quantification_limit != null" class="block">
                        {{ t('editor.waterQuality.view.columns.ql') }}
                        {{ limitText(r.quantification_limit, r) }}
                      </span>
                    </td>
                    <td class="text-content-300">{{ fractionText(r) }}</td>
                    <td class="text-content-300">
                      {{
                        r.measured_in
                          ? resolveMeasuredInLabel(r.measured_in, t)
                          : ''
                      }}
                    </td>
                    <td class="font-mono text-content-300">{{ r.method }}</td>
                    <td class="font-mono text-content-300 whitespace-nowrap">
                      {{ analyzedAtText(r) }}
                    </td>
                    <td>
                      <div class="flex items-center gap-1 flex-wrap">
                        <Tag
                          v-if="r.validation"
                          v-tooltip.top="validationInfo(r)"
                          :value="
                            resolveValidationStatusLabel(r.validation.status, t)
                          "
                          :severity="
                            VALIDATION_STATUS_SEVERITY[r.validation.status] ??
                            'secondary'
                          "
                          class="text-xs"
                        />
                        <span
                          v-for="flag in r.lab_flags ?? []"
                          :key="flag"
                          v-tooltip.top="
                            t('editor.waterQuality.result.labFlags')
                          "
                          class="font-mono text-content-300 rounded-sm border border-surface-200 px-1"
                        >
                          {{ flag }}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabPanel>

        <!-- ── Links ──────────────────────────────────────────────────────── -->
        <TabPanel value="links">
          <div class="flex flex-col gap-6 py-4">
            <p v-if="!linkCount" class="m-0 text-xs text-content-400">
              {{ t('editor.waterQuality.view.links.empty') }}
            </p>

            <section v-if="corrected" class="flex flex-col gap-2">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.links.corrects') }}
              </h3>
              <button
                type="button"
                class="link-btn self-start text-sm"
                :disabled="!corrected.sample"
                @click="corrected.sample && sampleView.open(corrected.id)"
              >
                <Icon name="ph:arrow-u-up-left-duotone" class="size-4" />
                {{
                  corrected.sample
                    ? sampleLabel(corrected.sample, locale)
                    : t('editor.waterQuality.view.links.missing', {
                        id: corrected.id,
                      })
                }}
              </button>
            </section>

            <section v-if="correctedBy.length" class="flex flex-col gap-2">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.links.correctedBy') }}
              </h3>
              <button
                v-for="s in correctedBy"
                :key="s.id"
                type="button"
                class="link-btn self-start text-sm"
                @click="sampleView.open(s.id)"
              >
                <Icon name="ph:arrow-bend-down-right-duotone" class="size-4" />
                {{ sampleLabel(s, locale) }}
              </button>
            </section>

            <section v-if="sample.parent_sample_id" class="flex flex-col gap-2">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.links.parent') }}
              </h3>
              <button
                type="button"
                class="link-btn self-start text-sm"
                :disabled="!parent"
                @click="parent && sampleView.open(parent.id)"
              >
                <Icon name="ph:link-duotone" class="size-4" />
                {{
                  parent
                    ? sampleLabel(parent, locale)
                    : t('editor.waterQuality.view.links.missing', {
                        id: sample.parent_sample_id,
                      })
                }}
              </button>
            </section>

            <section v-if="children.length" class="flex flex-col gap-2">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.links.children') }}
              </h3>
              <button
                v-for="s in children"
                :key="s.id"
                type="button"
                class="link-btn self-start text-sm"
                @click="sampleView.open(s.id)"
              >
                <Icon name="ph:copy-duotone" class="size-4" />
                {{ sampleLabel(s, locale) }}
              </button>
            </section>

            <section v-if="historyLogs.length" class="flex flex-col gap-2">
              <h3 class="view-heading">
                {{ t('editor.waterQuality.view.links.historyLogs') }}
              </h3>
              <div
                v-for="log in historyLogs"
                :key="log.id"
                class="flex flex-col gap-0.5"
              >
                <span class="flex flex-wrap items-center gap-2 text-xs">
                  <span class="font-mono text-content-300">
                    {{ formatDate(log.datetime, 'dd/MM/yyyy HH:mm') }}
                  </span>
                  <span class="text-content-400">
                    {{ historyLogLabel(log) }}
                  </span>
                  <span
                    v-if="log.author"
                    class="flex items-center gap-1 text-content-400"
                  >
                    <Icon name="ph:user-duotone" class="size-3" />
                    {{ log.author }}
                  </span>
                </span>
                <span class="text-sm text-content-0 whitespace-pre-line">
                  {{ log.description }}
                </span>
              </div>
            </section>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button
        :label="t('editor.waterQuality.view.close')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <template v-if="sample && !retracted">
        <Button
          :label="t('editor.waterQuality.correct')"
          severity="secondary"
          outlined
          @click="emit('correct', sample)"
        >
          <template #icon>
            <Icon name="ph:arrow-u-up-left-duotone" />
          </template>
        </Button>
        <Button
          v-tooltip.top="t('editor.waterQuality.editTooltip')"
          :label="t('editor.waterQuality.editShort')"
          @click="emit('edit', sample)"
        >
          <template #icon>
            <Icon name="ph:pencil-simple-duotone" />
          </template>
        </Button>
      </template>
    </template>
  </Dialog>
</template>

<style scoped>
.view-heading {
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-surface-200);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-content-0);
}

.view-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}

.view-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.view-table th {
  text-align: left;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
  border-bottom: 1px solid var(--color-surface-200);
  white-space: nowrap;
}

.view-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-surface-100);
  vertical-align: top;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.link-btn:hover:not(:disabled) {
  color: var(--color-primary-500);
  text-decoration: underline;
}

.link-btn:disabled {
  cursor: default;
}
</style>
