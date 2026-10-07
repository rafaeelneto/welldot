<script setup lang="ts">
import type { Attachment, LimitSet, WaterSample } from '@welldot/core';
import { SAMPLE_TYPES } from '@welldot/core';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
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

const props = defineProps<{
  sample: WaterSample;
  retracted: boolean;
  /** Referenced by `corrects`, `parent_sample_id` or a history log. */
  referenced: boolean;
  warnings: SampleWarning[];
  limitSet?: LimitSet;
}>();

const emit = defineEmits<{
  view: [id: string];
  correct: [sample: WaterSample];
  edit: [sample: WaterSample];
  delete: [id: string];
}>();

const { t, locale } = useI18n();
const { vocabLabel } = useVocab();
const profileStore = useProfileStore();

const {
  typeSeverity,
  parent,
  dateLine,
  pointLine,
  formation,
  labLine,
  exceedances,
  valueText,
  isRejected,
  derived,
  warningMessages,
} = useSampleDerived(
  () => props.sample,
  () => props.limitSet,
  () => props.warnings,
);

// ─── Header / footer ──────────────────────────────────────────────────────────

const meta = computed(() => [
  !!props.sample.collected_by &&
    `${t('editor.waterQuality.fields.collectedBy')} ${props.sample.collected_by}`,
]);

const actions = computed<RecordAction[]>(() => [
  {
    key: 'view',
    label: t('editor.waterQuality.view.open'),
    icon: 'ph:eye-duotone',
    onClick: () => emit('view', props.sample.id),
  },
  ...(props.retracted
    ? []
    : [
        {
          key: 'edit',
          label: t('editor.waterQuality.editShort'),
          tooltip: t('editor.waterQuality.editTooltip'),
          icon: 'ph:pencil-simple-duotone',
          onClick: () => emit('edit', props.sample),
        },
        {
          key: 'correct',
          label: t('editor.waterQuality.correct'),
          icon: 'ph:arrow-u-up-left-duotone',
          onClick: () => emit('correct', props.sample),
        },
      ]),
  {
    key: 'delete',
    label: t('editor.waterQuality.deleteConfirm'),
    icon: 'ph:x-bold',
    severity: 'danger',
    disabled: props.referenced,
    tooltip: props.referenced
      ? t('editor.waterQuality.deleteBlocked')
      : undefined,
    onClick: () => emit('delete', props.sample.id),
  },
]);

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
  <RecordCard
    :id="`ws-card-${sample.id}`"
    :dimmed="retracted && 'strong'"
    :date="dateLine"
    :meta="meta"
    :actions="actions"
  >
    <template #tags>
      <Tag
        :value="vocabLabel(SAMPLE_TYPES, sample.sample_type)"
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
    </template>

    <button
      v-if="sample.parent_sample_id"
      type="button"
      class="flex items-center gap-1.5 self-start text-xs text-primary-500 hover:underline bg-transparent border-0 p-0 cursor-pointer"
      @click="emit('view', sample.parent_sample_id)"
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
  </RecordCard>
</template>
