<script setup lang="ts">
import type {
  Attachment,
  LimitSet,
  WaterQualityResult,
  WaterSample,
} from '@welldot/core';
import {
  getExceedances,
  getHoldingTimes,
  getHydrochemicalFacies,
  getIonBalance,
  getPurgeStabilization,
  getReceivedTemperatureCompliance,
  getRelativePercentDifferences,
  getSampleDepth,
  isFormationWater,
} from '@welldot/utils';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import { pumpInstallationLabel } from '~/utils/operationVocab';
import {
  BLANK_SAMPLE_TYPES,
  PARENT_SAMPLE_TYPES,
  VALIDATION_STATUS_SEVERITY,
  formatResultValue,
  parameterUnitSymbol,
  resolveDeviceLabel,
  resolveFractionLabel,
  resolveMeasuredInLabel,
  resolveParameterLabel,
  resolveSampleTypeLabel,
  resolveSamplingMethodLabel,
  resolveSamplingPointTypeLabel,
  resolveValidationStatusLabel,
  sampleLabel,
} from '~/utils/waterQualityVocab';
import type { SampleWarning } from './resultDraft';

const props = defineProps<{
  sample: WaterSample;
  retracted: boolean;
  /** Referenced by `corrects`, `parent_sample_id` or a history log. */
  referenced: boolean;
  warnings: SampleWarning[];
  limitSet?: LimitSet;
}>();

const emit = defineEmits<{
  correct: [sample: WaterSample];
  edit: [sample: WaterSample];
  delete: [id: string];
}>();

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatLength } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const fmt = (n: number, digits = 4) =>
  formatNumber(n, { maximumFractionDigits: digits });

// ─── Header ───────────────────────────────────────────────────────────────────

const typeSeverity = computed(() =>
  props.sample.sample_type === 'routine'
    ? 'info'
    : PARENT_SAMPLE_TYPES.includes(props.sample.sample_type) ||
        BLANK_SAMPLE_TYPES.includes(props.sample.sample_type)
      ? 'warn'
      : 'secondary',
);

const parent = computed(() =>
  props.sample.parent_sample_id
    ? profileStore.well.water_samples?.find(
        s => s.id === props.sample.parent_sample_id,
      )
    : undefined,
);

function scrollToSample(id: string) {
  document
    .getElementById(`ws-card-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── Sampling point ───────────────────────────────────────────────────────────

const pointLine = computed(() => {
  const p = props.sample.sampling_point;
  const depth = getSampleDepth(profileStore.well, props.sample);
  const pump = p?.pump_installation_id
    ? profileStore.well.pump_installations?.find(
        i => i.id === p.pump_installation_id,
      )
    : undefined;
  return [
    p?.type ? resolveSamplingPointTypeLabel(p.type, t) : null,
    p?.device ? resolveDeviceLabel(p.device, t) : null,
    depth?.kind === 'point'
      ? `${formatLength(depth.depth)}${
          p?.depth === undefined && p?.pump_installation_id
            ? ` (${t('editor.waterQuality.card.pumpIntake')})`
            : ''
        }`
      : depth?.kind === 'interval'
        ? `${formatLength(depth.from)} – ${formatLength(depth.to)}`
        : null,
    pump ? pumpInstallationLabel(pump, t) : (p?.pump_installation_id ?? null),
    props.sample.sampling_method
      ? resolveSamplingMethodLabel(props.sample.sampling_method, t)
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
});

const formation = computed(() =>
  isFormationWater(profileStore.well, props.sample),
);

const labLine = computed(() => {
  const l = props.sample.laboratory;
  if (!l) return '';
  return [
    l.name,
    l.report_number
      ? `${t('editor.waterQuality.laboratory.reportNumber')} ${l.report_number}`
      : null,
    l.received_at
      ? `${t('editor.waterQuality.laboratory.receivedAt')} ${formatDate(
          l.received_at,
          l.received_at_resolution === 'day'
            ? 'dd/MM/yyyy'
            : 'dd/MM/yyyy HH:mm',
        )}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
});

// ─── Results ──────────────────────────────────────────────────────────────────

/** Exceedances per result index for the selected limit set. */
const exceedances = computed(() => {
  const map = new Map<number, string[]>();
  if (!props.limitSet) return map;
  for (const e of getExceedances(props.sample, props.limitSet)) {
    const r = props.sample.results[e.result_index];
    const unit = r ? parameterUnitSymbol(r) : '';
    const text =
      e.kind === 'presence'
        ? t('editor.waterQuality.exceedsPresence')
        : e.kind === 'above_max'
          ? t('editor.waterQuality.exceedsMax', {
              limit: `${fmt(e.limit.max ?? 0, 6)} ${unit}`.trim(),
            })
          : t('editor.waterQuality.exceedsMin', {
              limit: `${fmt(e.limit.min ?? 0, 6)} ${unit}`.trim(),
            });
    const list = map.get(e.result_index) ?? [];
    list.push(
      `${props.limitSet.name}: ${text}${e.limit.note ? ` (${e.limit.note})` : ''}`,
    );
    map.set(e.result_index, list);
  }
  return map;
});

function valueText(r: WaterQualityResult): string {
  return formatResultValue(r, t, n => fmt(n, 6));
}

function isRejected(r: WaterQualityResult): boolean {
  return r.validation?.status === 'rejected';
}

// ─── Derived strip ────────────────────────────────────────────────────────────

type Chip = { key: string; label: string; severity: string; info?: string };

const derived = computed<Chip[]>(() => {
  const chips: Chip[] = [];
  const s = props.sample;

  const ion = getIonBalance(s);
  if (ion) {
    const bad = Math.abs(ion.error_pct) > 10;
    chips.push({
      key: 'ion',
      label: t('editor.waterQuality.derived.ionBalance', {
        pct: fmt(ion.error_pct, 1),
      }),
      severity: bad ? 'warn' : 'success',
      info: t('editor.waterQuality.derived.ionBalanceInfo', {
        cations: fmt(ion.cations_meq, 2),
        anions: fmt(ion.anions_meq, 2),
      }),
    });
  }

  if (s.parent_sample_id) {
    const rpds = getRelativePercentDifferences(profileStore.well, s.id);
    if (rpds.length) {
      const worst = rpds.reduce((a, b) => (b.rpd_pct > a.rpd_pct ? b : a));
      chips.push({
        key: 'rpd',
        label: t('editor.waterQuality.derived.rpd', {
          pct: fmt(worst.rpd_pct, 1),
          name: resolveParameterLabel(worst.parameter, t),
        }),
        severity: worst.rpd_pct > 20 ? 'warn' : 'success',
        info: rpds
          .map(
            r =>
              `${resolveParameterLabel(r.parameter, t)}: ${fmt(r.rpd_pct, 1)}%`,
          )
          .join('\n'),
      });
    }
  }

  const holding = getHoldingTimes(s);
  if (holding.length) {
    const longest = holding.reduce((a, b) => (b.hours > a.hours ? b : a));
    const hoursText = (h: { hours: number; resolution?: string }) =>
      h.resolution === 'day'
        ? t('editor.waterQuality.derived.days', { n: fmt(h.hours / 24, 0) })
        : t('editor.waterQuality.derived.hours', { n: fmt(h.hours, 1) });
    chips.push({
      key: 'holding',
      label: t('editor.waterQuality.derived.holdingTime', {
        time: hoursText(longest),
      }),
      severity: 'secondary',
      info: holding
        .map(h => {
          const r = s.results[h.result_index];
          return `${r ? resolveParameterLabel(r.parameter, t) : h.key}: ${hoursText(h)}`;
        })
        .join('\n'),
    });
  }

  const temp = getReceivedTemperatureCompliance(s);
  if (temp !== undefined) {
    chips.push({
      key: 'temp',
      label: temp
        ? t('editor.waterQuality.derived.receivedTempOk')
        : t('editor.waterQuality.derived.receivedTempHigh'),
      severity: temp ? 'success' : 'warn',
      info:
        s.laboratory?.received_temperature != null
          ? `${fmt(s.laboratory.received_temperature, 1)} °C`
          : undefined,
    });
  }

  const purge = s.purge ? getPurgeStabilization(s.purge) : undefined;
  if (purge) {
    const unstable = purge.parameters.filter(p => !p.stabilized);
    chips.push({
      key: 'purge',
      label: purge.stabilized
        ? t('editor.waterQuality.derived.purgeStabilized')
        : t('editor.waterQuality.derived.purgeNotStabilized'),
      severity: purge.stabilized ? 'success' : 'warn',
      info: unstable.length
        ? unstable
            .map(p =>
              resolveParameterLabel({ code: p.key, vocabulary: 'welldot' }, t),
            )
            .join(', ')
        : undefined,
    });
  }

  const facies = getHydrochemicalFacies(s);
  if (facies) {
    const ionLabel = (code: string) =>
      t(`editor.waterQuality.derived.faciesIons.${code}`);
    chips.push({
      key: 'facies',
      label: t('editor.waterQuality.derived.facies', {
        facies: `${ionLabel(facies.cation)} – ${ionLabel(facies.anion)}`,
      }),
      severity: 'info',
    });
  }

  return chips;
});

// ─── Warnings ─────────────────────────────────────────────────────────────────

const warningMessages = computed(() => {
  const seen = new Set<string>();
  return props.warnings.flatMap(w => {
    const r =
      w.result_index !== undefined
        ? props.sample.results[w.result_index]
        : undefined;
    const msg = t(`editor.waterQuality.warnings.${w.code}`);
    const text = r ? `${resolveParameterLabel(r.parameter, t)}: ${msg}` : msg;
    if (seen.has(text)) return [];
    seen.add(text);
    return [text];
  });
});

// ─── Attachments ──────────────────────────────────────────────────────────────

function setAttachments(list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.water_samples?.find(s => s.id === props.sample.id),
      list,
    );
  });
}
</script>

<template>
  <div
    :id="`ws-card-${sample.id}`"
    class="rounded-xl border border-surface-200/70 bg-surface-0 px-4 py-3 flex flex-col gap-3"
    :class="{ 'opacity-60': retracted }"
  >
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center flex-wrap gap-2">
      <Tag
        :value="resolveSampleTypeLabel(sample.sample_type, t)"
        :severity="typeSeverity"
        class="text-xs"
      />
      <Tag
        v-if="retracted"
        v-tooltip.top="t('editor.waterQuality.retractedInfo')"
        :value="t('editor.waterQuality.retracted')"
        severity="secondary"
        class="text-xs"
      />
      <Tag
        v-if="sample.corrects"
        v-tooltip.top="t('editor.waterQuality.correctionInfo')"
        :value="t('editor.waterQuality.correction')"
        severity="info"
        class="text-xs"
      />
      <Tag
        v-if="sample.campaign"
        :value="sample.campaign"
        severity="secondary"
        class="text-xs font-mono"
      />
      <span class="font-mono text-xs text-content-400">{{ sample.id }}</span>
      <span class="ml-auto font-mono text-xs text-content-300">
        {{ formatDate(sample.datetime, 'dd/MM/yyyy HH:mm') }}
        <template v-if="sample.sequence != null">
          · #{{ sample.sequence }}</template
        >
      </span>
    </div>

    <button
      v-if="sample.parent_sample_id"
      type="button"
      class="flex items-center gap-1.5 self-start text-xs text-primary-500 hover:underline bg-transparent border-0 p-0 cursor-pointer"
      @click="scrollToSample(sample.parent_sample_id)"
    >
      <Icon name="ph:link-duotone" class="size-3.5" />
      {{
        t('editor.waterQuality.card.parentOf', {
          sample: parent ? sampleLabel(parent, t) : sample.parent_sample_id,
        })
      }}
    </button>

    <!-- ── Point / lab ────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-1 text-xs text-content-300">
      <div
        v-if="pointLine || formation !== undefined"
        class="flex items-center gap-2 flex-wrap"
      >
        <Icon name="ph:map-pin-duotone" class="size-3.5 text-content-400" />
        <span>{{ pointLine || '—' }}</span>
        <Tag
          v-if="formation === true"
          v-tooltip.top="t('editor.waterQuality.card.formationWaterInfo')"
          :value="t('editor.waterQuality.card.formationWater')"
          severity="success"
          class="text-xs"
        />
        <Tag
          v-else-if="formation === false"
          v-tooltip.top="t('editor.waterQuality.card.notFormationWaterInfo')"
          :value="t('editor.waterQuality.card.notFormationWater')"
          severity="warn"
          class="text-xs"
        />
      </div>
      <div v-if="labLine" class="flex items-center gap-2">
        <Icon name="ph:flask-duotone" class="size-3.5 text-content-400" />
        <span>{{ labLine }}</span>
      </div>
    </div>

    <!-- ── Results ────────────────────────────────────────────────────────── -->
    <div class="overflow-x-auto rounded-lg border border-surface-200/70">
      <table class="w-full text-xs">
        <thead class="bg-surface-50 text-content-400">
          <tr>
            <th class="text-left font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.parameter') }}
            </th>
            <th class="text-right font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.value') }}
            </th>
            <th class="text-left font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.unit') }}
            </th>
            <th class="text-left font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.fraction') }}
            </th>
            <th class="text-left font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.measuredIn') }}
            </th>
            <th class="text-left font-medium px-3 py-1.5">
              {{ t('editor.waterQuality.pdf.validation') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in sample.results"
            :key="i"
            class="border-t border-surface-100 text-content-100"
            :class="{ 'opacity-50 line-through': isRejected(r) }"
          >
            <td class="px-3 py-1.5">
              <span>{{ resolveParameterLabel(r.parameter, t) }}</span>
              <span
                v-if="r.parameter.vocabulary !== 'welldot'"
                class="ml-1 font-mono text-content-400"
              >
                {{ r.parameter.vocabulary }}:{{ r.parameter.code }}
              </span>
            </td>
            <td class="px-3 py-1.5 text-right font-mono whitespace-nowrap">
              <Tag
                v-if="exceedances.has(i)"
                v-tooltip.top="exceedances.get(i)!.join('\n')"
                :value="valueText(r)"
                severity="danger"
                class="text-xs font-mono"
              />
              <span v-else class="text-content-0">{{ valueText(r) }}</span>
            </td>
            <td class="px-3 py-1.5 font-mono text-content-300">
              {{ parameterUnitSymbol(r) }}
            </td>
            <td class="px-3 py-1.5 text-content-300">
              {{ r.fraction ? resolveFractionLabel(r.fraction, t) : '' }}
            </td>
            <td class="px-3 py-1.5 text-content-300">
              {{
                r.measured_in ? resolveMeasuredInLabel(r.measured_in, t) : ''
              }}
            </td>
            <td class="px-3 py-1.5">
              <div class="flex items-center gap-1 flex-wrap">
                <Tag
                  v-if="r.validation"
                  v-tooltip.top="
                    [
                      r.validation.qualifier,
                      r.validation.guideline,
                      r.validation.validated_by,
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  "
                  :value="resolveValidationStatusLabel(r.validation.status, t)"
                  :severity="
                    VALIDATION_STATUS_SEVERITY[r.validation.status] ??
                    'secondary'
                  "
                  class="text-xs"
                />
                <span
                  v-for="flag in r.lab_flags ?? []"
                  :key="flag"
                  v-tooltip.top="t('editor.waterQuality.result.labFlags')"
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

    <!-- ── Derived ────────────────────────────────────────────────────────── -->
    <div v-if="derived.length" class="flex items-center gap-1.5 flex-wrap">
      <Tag
        v-for="c in derived"
        :key="c.key"
        v-tooltip.top="c.info"
        :value="c.label"
        :severity="c.severity"
        class="text-xs"
      />
    </div>

    <p
      v-if="sample.notes"
      class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
    >
      {{ sample.notes }}
    </p>

    <Message
      v-for="msg in warningMessages"
      :key="msg"
      severity="warn"
      size="small"
      variant="simple"
    >
      {{ msg }}
    </Message>

    <AttachmentField
      :model-value="sample.attachments"
      context="sample"
      confirm-delete
      @update:model-value="setAttachments"
    />

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <div
      class="flex items-center justify-end gap-2 pt-1 border-t border-surface-100"
    >
      <Button
        v-if="!retracted"
        v-tooltip.top="t('editor.waterQuality.editTooltip')"
        severity="secondary"
        text
        size="small"
        :label="t('editor.waterQuality.editShort')"
        @click="emit('edit', sample)"
      >
        <template #icon>
          <Icon name="ph:pencil-simple-duotone" />
        </template>
      </Button>
      <Button
        v-if="!retracted"
        severity="secondary"
        text
        size="small"
        :label="t('editor.waterQuality.correct')"
        @click="emit('correct', sample)"
      >
        <template #icon>
          <Icon name="ph:arrow-u-up-left-duotone" />
        </template>
      </Button>
      <span
        v-tooltip.top="
          referenced ? t('editor.waterQuality.deleteBlocked') : undefined
        "
      >
        <Button
          severity="danger"
          text
          size="small"
          :disabled="referenced"
          :aria-label="t('editor.waterQuality.deleteConfirm')"
          @click="emit('delete', sample.id)"
        >
          <template #icon>
            <Icon name="ph:x-bold" />
          </template>
        </Button>
      </span>
    </div>
  </div>
</template>
