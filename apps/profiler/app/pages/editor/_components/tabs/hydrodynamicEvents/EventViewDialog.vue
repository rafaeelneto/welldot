<script setup lang="ts">
import type {
  Attachment,
  HistoryLogEntry,
  HydrodynamicEvent,
} from '@welldot/core';
import { MAINTENANCE_TYPES } from '@welldot/core';
import { getRetractedEventIds, pumpingTimeline } from '@welldot/utils';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import PumpingTestCharts from './charts/PumpingTestCharts.vue';
import EventStats from './EventStats.vue';

/**
 * Full read-only view of one hydrodynamic event (pumping test or spot
 * measurement), in tabs: overview (details, results, charts, notes and files,
 * ledger links) and readings (step summary, every step's readings on the test
 * clock, recovery). Linked events open in place. The event is resolved from
 * the store by id so the view stays live; Edit hands it to the event dialog.
 */
const visible = defineModel<boolean>('visible', { default: false });

type ViewTab = 'overview' | 'readings';

const props = defineProps<{ eventId: string }>();

const emit = defineEmits<{ edit: [event: HydrodynamicEvent] }>();

const { t } = useI18n();
const { vocabLabel } = useVocab();
const profileStore = useProfileStore();
const eventView = useHydrodynamicEventView();
const {
  typeOptions,
  eventTypeLabel,
  eventTypeSeverity,
  measurementMethodLabel,
  loggerSeriesFacts,
} = useHydrodynamicEventTypes();
const { categoryIcon, categoryLabel } = useHistoryLogCategories();
const { toFlow, flowUnit, toSpecificCapacity, specificCapacityUnit } =
  useUnitFormat();
const { formatNumber } = useNumberFormat();

const fmt = (n: number | null | undefined, digits = 2) =>
  formatNumber(n, { maximumFractionDigits: digits });
const fixed = (n: number | null | undefined, digits = 2) =>
  formatNumber(n, { fractionDigits: digits });

const activeTab = ref<ViewTab>('overview');
// Following a link opens another event: start on its first tab.
watch(
  () => props.eventId,
  () => (activeTab.value = 'overview'),
);

const events = computed(() => profileStore.well.hydrodynamic_events ?? []);

const event = computed<HydrodynamicEvent | undefined>(() =>
  events.value.find(e => e.id === props.eventId),
);

/** Retracted by a later event's `corrects` — kept, but excluded from derivations. */
const isRetracted = computed(() =>
  getRetractedEventIds(profileStore.well).has(props.eventId),
);

const typeIcon = computed(
  () =>
    typeOptions.value.find(o => o.value === event.value?.type)?.icon ??
    'ph:drop-duotone',
);

function eventLabel(e: HydrodynamicEvent): string {
  return `${eventTypeLabel(e.type)} · ${formatDate(e.datetime, 'dd/MM/yyyy HH:mm')}`;
}

type Fact = { label: string; value?: string | null; mono?: boolean };

function present(facts: Fact[]): Fact[] {
  return facts.filter(f => f.value);
}

// ─── Overview ─────────────────────────────────────────────────────────────────

const detailFacts = computed<Fact[]>(() => {
  const e = event.value;
  if (!e) return [];
  const ev = e as Record<string, unknown>;
  return present([
    {
      label: t('editor.hydrodynamicEvents.fields.datetime'),
      value: formatDate(e.datetime, 'dd/MM/yyyy HH:mm'),
      mono: true,
    },
    {
      label: t('editor.hydrodynamicEvents.fields.operator'),
      value: e.operator,
    },
    {
      label: t('editor.hydrodynamicEvents.fields.equipment'),
      value: e.equipment,
    },
    {
      label: t('editor.hydrodynamicEvents.fields.measurementMethod'),
      value: measurementMethodLabel(
        ev.measurement_method as string | undefined,
      ),
    },
    ...(isLoggerSeries(e) ? loggerSeriesFacts(e) : []),
  ]);
});

function setAttachments(list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.hydrodynamic_events?.find(e => e.id === props.eventId),
      list,
    );
  });
}

// ─── Readings ─────────────────────────────────────────────────────────────────

const timeline = computed(() =>
  event.value ? pumpingTimeline(event.value) : null,
);

const hasStaticLevel = computed(() => timeline.value?.staticLevel != null);

/** Steps or a recovery block: a pumping test, not a bare spot measurement. */
const hasTestData = computed(
  () =>
    !!timeline.value &&
    (timeline.value.steps.length > 0 || timeline.value.recovery != null),
);

// The event can lose its readings while the view is open (live edit).
watch(hasTestData, has => {
  if (!has) activeTab.value = 'overview';
});

const readingCount = computed(
  () =>
    (timeline.value?.steps.reduce((n, s) => n + s.points.length, 0) ?? 0) +
    (timeline.value?.recovery?.points.length ?? 0),
);

type StepRow = {
  n: number;
  rate: number | null;
  duration: number | null;
  finalLevel: number | null;
  drawdown: number | null;
  /** m per display flow unit. */
  specificDrawdown: number | null;
  /** Display specific-capacity unit. */
  specificCapacity: number | null;
};

const stepRows = computed<StepRow[]>(
  () =>
    timeline.value?.steps.map(s => {
      const last = s.points[s.points.length - 1];
      const drawdown = last?.drawdown ?? null;
      const rate = s.rate;
      return {
        n: s.index + 1,
        rate,
        duration: s.end > s.start ? s.end - s.start : null,
        finalLevel: last?.depth ?? null,
        drawdown,
        specificDrawdown:
          rate && drawdown != null ? drawdown / toFlow(rate) : null,
        specificCapacity:
          rate && drawdown ? toSpecificCapacity(rate / drawdown) : null,
      };
    }) ?? [],
);

/** A step's own elapsed time equals the test clock when there is one step. */
const showTestClock = computed(() => (timeline.value?.steps.length ?? 0) > 1);

const readingFacts = computed<Fact[]>(() => {
  const ev = event.value as Record<string, unknown> | undefined;
  if (!ev) return [];
  const staticLevel = timeline.value?.staticLevel;
  return present([
    {
      label: t('editor.hydrodynamicEvents.fields.staticLevel'),
      value: staticLevel != null ? fixed(staticLevel) : null,
      mono: true,
    },
    {
      label: t('editor.hydrodynamicEvents.fields.pumpingRate', {
        unit: flowUnit.value,
      }),
      value:
        ev.type === 'recovery_only' && ev.pumping_rate != null
          ? fmt(toFlow(ev.pumping_rate as number))
          : null,
      mono: true,
    },
    {
      label: t('editor.hydrodynamicEvents.fields.pumpingDuration'),
      value:
        ev.type === 'recovery_only' && ev.pumping_duration != null
          ? fmt(ev.pumping_duration as number, 1)
          : null,
      mono: true,
    },
  ]);
});

type RecoveryRow = {
  elapsed: number;
  ratio: number | null;
  depth: number;
  drawdown: number | null;
};

const recoveryRows = computed<RecoveryRow[]>(() => {
  const end = timeline.value?.pumpingEnd;
  return (
    timeline.value?.recovery?.points.map(p => ({
      elapsed: p.elapsed,
      ratio:
        end != null && end > 0 && p.elapsed > 0
          ? (end + p.elapsed) / p.elapsed
          : null,
      depth: p.depth,
      drawdown: p.drawdown,
    })) ?? []
  );
});

const showRatio = computed(() => recoveryRows.value.some(r => r.ratio != null));

// ─── Links ────────────────────────────────────────────────────────────────────

const corrected = computed(() => {
  const id = event.value?.corrects;
  return id ? { id, event: events.value.find(e => e.id === id) } : null;
});

const correctedBy = computed(() =>
  events.value.filter(e => e.corrects === props.eventId),
);

const historyLogs = computed(() =>
  (profileStore.well.history_logs ?? [])
    .filter(l => l.hydrodynamic_event_ids?.includes(props.eventId))
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    ),
);

function historyLogLabel(log: HistoryLogEntry): string {
  return log.maintenance_type
    ? vocabLabel(MAINTENANCE_TYPES, log.maintenance_type)
    : categoryLabel(log.category);
}

const linkCount = computed(
  () =>
    (corrected.value ? 1 : 0) +
    correctedBy.value.length +
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
      <div v-if="event" class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center flex-wrap gap-2">
          <Icon :name="typeIcon" class="size-5 text-content-300" />
          <span class="text-base font-medium text-content-0">
            {{ t('editor.hydrodynamicEvents.view.title') }}
          </span>
          <Tag
            :value="eventTypeLabel(event.type)"
            :severity="eventTypeSeverity(event.type)"
            class="text-xs font-mono tracking-wide"
          />
          <Tag
            v-if="isRetracted"
            v-tooltip.top="t('editor.hydrodynamicEvents.retractedInfo')"
            :value="t('editor.hydrodynamicEvents.retracted')"
            severity="secondary"
            class="text-xs"
          />
          <Tag
            v-if="event.corrects"
            v-tooltip.top="t('editor.hydrodynamicEvents.correctionInfo')"
            :value="t('editor.hydrodynamicEvents.correction')"
            severity="info"
            class="text-xs"
          />
        </div>
        <span class="text-xs text-content-300 truncate font-mono">
          {{ formatDate(event.datetime, 'dd/MM/yyyy HH:mm') }} · {{ event.id }}
        </span>
      </div>
    </template>

    <Tabs v-if="event" v-model:value="activeTab">
      <TabList>
        <Tab value="overview">
          {{ t('editor.hydrodynamicEvents.view.tabs.overview') }}
        </Tab>
        <Tab v-if="hasTestData" value="readings">
          <span class="flex items-center gap-1.5">
            {{ t('editor.hydrodynamicEvents.view.tabs.readings') }}
            <span class="font-mono text-xs text-content-400">
              {{ readingCount }}
            </span>
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <!-- ── Overview ───────────────────────────────────────────────────── -->
        <TabPanel value="overview">
          <div class="flex flex-col gap-6 py-4">
            <section class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.view.sections.details') }}
              </h3>
              <dl class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div
                  v-for="f in detailFacts"
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
              <EventStats :event="event" />
            </section>

            <section v-if="hasTestData" class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.charts.title') }}
              </h3>
              <PumpingTestCharts :event="event" />
            </section>

            <section class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.view.sections.notes') }}
              </h3>
              <p
                v-if="event.notes"
                class="m-0 text-sm leading-relaxed whitespace-pre-line text-content-200"
              >
                {{ event.notes }}
              </p>
              <AttachmentField
                :model-value="event.attachments"
                context="event"
                confirm-delete
                :visible-count="6"
                @update:model-value="setAttachments"
              />
            </section>

            <section class="flex flex-col gap-4">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.view.sections.links') }}
              </h3>
              <p v-if="!linkCount" class="m-0 text-xs text-content-400">
                {{ t('editor.hydrodynamicEvents.view.links.empty') }}
              </p>

              <div v-if="corrected" class="flex flex-col gap-2">
                <span class="view-label">
                  {{ t('editor.hydrodynamicEvents.view.links.corrects') }}
                </span>
                <button
                  type="button"
                  class="link-btn self-start text-sm"
                  :disabled="!corrected.event"
                  @click="corrected.event && eventView.open(corrected.id)"
                >
                  <Icon name="ph:arrow-u-up-left-duotone" class="size-4" />
                  {{
                    corrected.event
                      ? eventLabel(corrected.event)
                      : t('editor.hydrodynamicEvents.view.links.missing', {
                          id: corrected.id,
                        })
                  }}
                </button>
              </div>

              <div v-if="correctedBy.length" class="flex flex-col gap-2">
                <span class="view-label">
                  {{ t('editor.hydrodynamicEvents.view.links.correctedBy') }}
                </span>
                <button
                  v-for="e in correctedBy"
                  :key="e.id"
                  type="button"
                  class="link-btn self-start text-sm"
                  @click="eventView.open(e.id)"
                >
                  <Icon
                    name="ph:arrow-bend-down-right-duotone"
                    class="size-4"
                  />
                  {{ eventLabel(e) }}
                </button>
              </div>

              <div v-if="historyLogs.length" class="flex flex-col gap-2">
                <span class="view-label">
                  {{ t('editor.hydrodynamicEvents.view.links.historyLogs') }}
                </span>
                <div
                  v-for="log in historyLogs"
                  :key="log.id"
                  class="flex items-start gap-2"
                >
                  <Icon
                    :name="categoryIcon(log.category)"
                    class="mt-0.5 size-4 shrink-0 text-content-300"
                  />
                  <div class="flex flex-col gap-0.5 min-w-0">
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
                </div>
              </div>
            </section>
          </div>
        </TabPanel>

        <!-- ── Readings ───────────────────────────────────────────────────── -->
        <TabPanel v-if="hasTestData && timeline" value="readings">
          <div class="flex flex-col gap-6 py-4">
            <dl
              v-if="readingFacts.length"
              class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3"
            >
              <div
                v-for="f in readingFacts"
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

            <!-- Step summary -->
            <section v-if="stepRows.length" class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.view.sections.stepSummary') }}
              </h3>
              <DataTable :value="stepRows" data-key="n" size="small">
                <Column
                  field="n"
                  :header="t('editor.hydrodynamicEvents.view.columns.step')"
                  body-class="font-mono"
                />
                <Column
                  :header="
                    t('editor.hydrodynamicEvents.view.columns.rate', {
                      unit: flowUnit,
                    })
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ data.rate != null ? fmt(toFlow(data.rate)) : '—' }}
                  </template>
                </Column>
                <Column
                  :header="t('editor.hydrodynamicEvents.view.columns.duration')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.duration, 1) }}
                  </template>
                </Column>
                <Column
                  :header="
                    t('editor.hydrodynamicEvents.view.columns.finalLevel')
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.finalLevel) }}
                  </template>
                </Column>
                <Column
                  v-if="hasStaticLevel"
                  :header="t('editor.hydrodynamicEvents.view.columns.drawdown')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.drawdown) }}
                  </template>
                </Column>
                <Column
                  v-if="hasStaticLevel"
                  :header="
                    t(
                      'editor.hydrodynamicEvents.view.columns.specificDrawdown',
                      { unit: flowUnit },
                    )
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.specificDrawdown, 4) }}
                  </template>
                </Column>
                <Column
                  v-if="hasStaticLevel"
                  :header="
                    t(
                      'editor.hydrodynamicEvents.view.columns.specificCapacity',
                      { unit: specificCapacityUnit },
                    )
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.specificCapacity) }}
                  </template>
                </Column>
              </DataTable>
            </section>

            <!-- Step readings -->
            <section
              v-for="step in timeline.steps"
              :key="step.index"
              class="flex flex-col gap-3"
            >
              <h3 class="view-heading">
                {{
                  t('editor.hydrodynamicEvents.view.sections.step', {
                    n: step.index + 1,
                  })
                }}
                <span
                  v-if="step.rate != null"
                  class="ml-2 font-mono text-xs font-normal text-content-300"
                >
                  Q = {{ fmt(toFlow(step.rate)) }} {{ flowUnit }}
                </span>
              </h3>
              <DataTable
                v-if="step.points.length"
                :value="step.points"
                size="small"
              >
                <Column
                  :header="t('editor.hydrodynamicEvents.view.columns.elapsed')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.elapsed) }}
                  </template>
                </Column>
                <Column
                  v-if="showTestClock"
                  :header="t('editor.hydrodynamicEvents.view.columns.testTime')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">{{ fmt(data.t) }}</template>
                </Column>
                <Column
                  :header="t('editor.hydrodynamicEvents.view.columns.level')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.depth) }}
                  </template>
                </Column>
                <Column
                  v-if="hasStaticLevel"
                  :header="t('editor.hydrodynamicEvents.view.columns.drawdown')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.drawdown) }}
                  </template>
                </Column>
              </DataTable>
              <p v-else class="m-0 text-xs text-content-400">
                {{ t('editor.hydrodynamicEvents.view.noReadings') }}
              </p>
            </section>
            <p v-if="showTestClock" class="m-0 text-xs text-content-400">
              {{ t('editor.hydrodynamicEvents.view.clockInfo') }}
            </p>

            <!-- Recovery -->
            <section v-if="timeline.recovery" class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.hydrodynamicEvents.view.sections.recovery') }}
              </h3>
              <DataTable
                v-if="recoveryRows.length"
                :value="recoveryRows"
                size="small"
              >
                <Column
                  :header="
                    t('editor.hydrodynamicEvents.view.columns.recoveryElapsed')
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.elapsed) }}
                  </template>
                </Column>
                <Column
                  v-if="showRatio"
                  :header="t('editor.hydrodynamicEvents.view.columns.ratio')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fmt(data.ratio) }}
                  </template>
                </Column>
                <Column
                  :header="t('editor.hydrodynamicEvents.view.columns.level')"
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.depth) }}
                  </template>
                </Column>
                <Column
                  v-if="hasStaticLevel"
                  :header="
                    t('editor.hydrodynamicEvents.view.columns.residualDrawdown')
                  "
                  body-class="font-mono"
                >
                  <template #body="{ data }">
                    {{ fixed(data.drawdown) }}
                  </template>
                </Column>
              </DataTable>
              <p v-else class="m-0 text-xs text-content-400">
                {{ t('editor.hydrodynamicEvents.view.noReadings') }}
              </p>
            </section>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button
        :label="t('editor.hydrodynamicEvents.view.close')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        v-if="event"
        :label="t('editor.hydrodynamicEvents.view.edit')"
        @click="emit('edit', event)"
      >
        <template #icon>
          <Icon name="ph:pencil-simple-duotone" />
        </template>
      </Button>
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
