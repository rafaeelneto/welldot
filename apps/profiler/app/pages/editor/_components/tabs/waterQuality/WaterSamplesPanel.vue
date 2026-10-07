<script setup lang="ts">
import type { WaterSample } from '@welldot/core';
import {
  SAMPLE_TYPES,
  WATER_QUALITY_LIMIT_SETS,
  getLimitSet,
} from '@welldot/core';
import { getRetractedSampleIds, getWaterSampleWarnings } from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import type { SampleWarning } from './resultDraft';
import WaterSampleCard from './WaterSampleCard.vue';
import WaterSampleDialog from './WaterSampleDialog.vue';
import WaterSampleViewDialog from './WaterSampleViewDialog.vue';

const { t } = useI18n();
const { vocabLabel } = useVocab();
const confirm = useConfirm();
const profileStore = useProfileStore();
const uiStore = useUiStore();

const samples = computed(() => profileStore.well.water_samples ?? []);

// ─── Ledger ───────────────────────────────────────────────────────────────────

const retractedIds = computed(() => getRetractedSampleIds(profileStore.well));

/**
 * Samples another record points to (`corrects`, `parent_sample_id`,
 * `history_logs[].sample_id`) — deleting them would leave dangling references.
 */
const referencedIds = computed(() => {
  const ids = new Set<string>();
  for (const s of samples.value) {
    if (s.corrects) ids.add(s.corrects);
    if (s.parent_sample_id) ids.add(s.parent_sample_id);
  }
  for (const log of profileStore.well.history_logs ?? []) {
    if (log.sample_id) ids.add(log.sample_id);
  }
  return ids;
});

// ─── Filters ──────────────────────────────────────────────────────────────────

const hideRetracted = ref(false);
const campaignFilter = ref<string | null>(null);
const typeFilter = ref<string | null>(null);

const campaignOptions = computed(
  () =>
    [
      ...new Set(samples.value.map(s => s.campaign).filter(Boolean)),
    ].sort() as string[],
);
const typeOptions = computed(() =>
  [...new Set(samples.value.map(s => s.sample_type))].map(value => ({
    value,
    label: vocabLabel(SAMPLE_TYPES, value),
  })),
);

const visibleSamples = computed<WaterSample[]>(() => {
  const fileIndex = new Map(samples.value.map((s, i) => [s.id, i]));
  const retracted = retractedIds.value;
  let list = [...samples.value];
  if (hideRetracted.value) list = list.filter(s => !retracted.has(s.id));
  if (campaignFilter.value)
    list = list.filter(s => s.campaign === campaignFilter.value);
  if (typeFilter.value)
    list = list.filter(s => s.sample_type === typeFilter.value);
  // Newest first. At the same instant, the sample in force sits above the
  // ones it retracts, then by `sequence`, then later additions first.
  return list.sort(
    (a, b) =>
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime() ||
      Number(retracted.has(a.id)) - Number(retracted.has(b.id)) ||
      (b.sequence ?? 0) - (a.sequence ?? 0) ||
      fileIndex.get(b.id)! - fileIndex.get(a.id)!,
  );
});

/** Warnings per sample id. */
const warningsById = computed(() => {
  const map = new Map<string, SampleWarning[]>();
  for (const w of getWaterSampleWarnings(profileStore.well)) {
    // `reference_unresolved` lists `[sample id, missing id]`.
    const ids = w.code === 'reference_unresolved' ? w.ids.slice(0, 1) : w.ids;
    for (const id of ids) {
      const list = map.get(id) ?? [];
      list.push({ code: w.code, result_index: w.result_index });
      map.set(id, list);
    }
  }
  return map;
});

// ─── Limit set ────────────────────────────────────────────────────────────────

const limitSetOptions = computed(() =>
  WATER_QUALITY_LIMIT_SETS.map(s => ({ value: s.id, label: s.name })),
);
const limitSet = computed(() =>
  uiStore.waterQualityLimitSet
    ? getLimitSet(uiStore.waterQualityLimitSet)
    : undefined,
);

// ─── Dialog ───────────────────────────────────────────────────────────────────

const draft = ref<WaterSample | null>(null);
const dialogMode = ref<'correct' | 'edit'>('correct');
const dialogVisible = ref(false);

function addSample() {
  draft.value = null;
  dialogMode.value = 'correct';
  dialogVisible.value = true;
}

function correctSample(s: WaterSample) {
  draft.value = s;
  dialogMode.value = 'correct';
  dialogVisible.value = true;
}

/** In-place edit, for typing errors — the dialog warns about it. */
function editSample(s: WaterSample) {
  draft.value = s;
  dialogMode.value = 'edit';
  dialogVisible.value = true;
}

/**
 * Ledger: new samples and corrections (new samples with `corrects`) are
 * appended; an in-place edit replaces the sample with the same id.
 */
function saveSample(s: WaterSample) {
  profileStore.updateWell(d => {
    if (!d.water_samples) d.water_samples = [];
    const idx =
      dialogMode.value === 'edit'
        ? d.water_samples.findIndex(e => e.id === s.id)
        : -1;
    if (idx === -1) d.water_samples.push(s);
    else d.water_samples[idx] = s;
  });
}

// ─── Read-only view ───────────────────────────────────────────────────────────

const sampleView = useWaterSampleView();
const viewVisible = computed({
  get: () =>
    !!sampleView.sampleId.value &&
    samples.value.some(s => s.id === sampleView.sampleId.value),
  set: open => {
    if (!open) sampleView.close();
  },
});

function editFromView(s: WaterSample) {
  sampleView.close();
  editSample(s);
}

function correctFromView(s: WaterSample) {
  sampleView.close();
  correctSample(s);
}

function deleteSample(id: string) {
  if (referencedIds.value.has(id)) return;
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.waterQuality.deleteConfirm'),
    message: t('editor.waterQuality.deleteInfo'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(d => {
        d.water_samples = d.water_samples?.filter(s => s.id !== id);
        if (!d.water_samples?.length) delete d.water_samples;
      });
    },
  });
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <h3
      class="font-serif text-2xl font-medium tracking-tight text-content-0 m-0"
    >
      {{ t('editor.waterQuality.title') }}
    </h3>
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.waterQuality.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.waterQuality.addShort')"
        @click="addSample"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!samples.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:flask-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.waterQuality.empty') }}</p>
    </div>

    <template v-else>
      <!-- ── Compare / filters ─────────────────────────────────────────── -->
      <div
        class="flex items-end justify-between gap-3 flex-wrap rounded-xl border border-surface-200/70 bg-surface-50 px-4 py-3"
      >
        <LabeledField
          :label="t('editor.waterQuality.compareAgainst')"
          :info="t('editor.waterQuality.compareAgainstInfo')"
          class="min-w-60"
        >
          <Select
            v-model="uiStore.waterQualityLimitSet"
            :options="limitSetOptions"
            option-label="label"
            option-value="value"
            show-clear
            size="small"
            :placeholder="t('editor.waterQuality.noLimitSet')"
            class="w-full"
          />
        </LabeledField>
        <div class="flex items-center gap-3 flex-wrap">
          <label
            v-if="retractedIds.size"
            class="flex items-center gap-2 text-xs text-content-300 cursor-pointer"
          >
            <ToggleSwitch v-model="hideRetracted" />
            {{ t('editor.waterQuality.hideRetracted') }}
          </label>
          <Select
            v-if="campaignOptions.length"
            v-model="campaignFilter"
            :options="campaignOptions"
            show-clear
            size="small"
            :placeholder="t('editor.waterQuality.allCampaigns')"
            class="min-w-40"
          />
          <Select
            v-if="typeOptions.length > 1"
            v-model="typeFilter"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            show-clear
            size="small"
            :placeholder="t('editor.waterQuality.allTypes')"
            class="min-w-40"
          />
        </div>
      </div>
      <Message
        v-if="limitSet"
        severity="secondary"
        size="small"
        variant="simple"
      >
        {{
          t('editor.waterQuality.limitSetSource', { source: limitSet.source })
        }}
      </Message>

      <WaterSampleCard
        v-for="s in visibleSamples"
        :key="s.id"
        :sample="s"
        :retracted="retractedIds.has(s.id)"
        :referenced="referencedIds.has(s.id)"
        :warnings="warningsById.get(s.id) ?? []"
        :limit-set="limitSet"
        @view="sampleView.open"
        @correct="correctSample"
        @edit="editSample"
        @delete="deleteSample"
      />
      <p v-if="!visibleSamples.length" class="text-xs text-content-400 m-0">
        {{ t('editor.waterQuality.noMatches') }}
      </p>
    </template>
  </div>

  <WaterSampleDialog
    v-if="dialogVisible"
    v-model="draft"
    v-model:visible="dialogVisible"
    :mode="dialogMode"
    @save="saveSample"
  />

  <WaterSampleViewDialog
    v-if="viewVisible && sampleView.sampleId.value"
    v-model:visible="viewVisible"
    :sample-id="sampleView.sampleId.value"
    :retracted="retractedIds.has(sampleView.sampleId.value)"
    :warnings="warningsById.get(sampleView.sampleId.value) ?? []"
    :limit-set="limitSet"
    @edit="editFromView"
    @correct="correctFromView"
  />
</template>

<style scoped>
.add-entry-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.add-entry-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.add-entry-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}
</style>
