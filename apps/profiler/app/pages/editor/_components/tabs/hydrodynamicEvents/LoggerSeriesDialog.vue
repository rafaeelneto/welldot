<script setup lang="ts">
import {
  BAROMETRIC_COMPENSATIONS,
  MEASUREMENT_METHODS,
  READING_AGGREGATIONS,
  type HydrodynamicEvent,
  type LoggerSeriesEvent,
} from '@welldot/core';
import { getWellTimeZone, inferLoggerInterval } from '@welldot/utils';
import type { WellGridColumn } from '@welldot/vue/grid';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import LoggerImportDialog, {
  type LoggerImportPayload,
} from './LoggerImportDialog.vue';
import {
  applyTypedDatetime,
  blankLoggerReading,
  formatReadingLocal,
  isAggregated,
  isReadingInstant,
  mergeImportedReadings,
  nextReadingDatetime,
  toLoggerForm,
  validateLoggerForm,
  type LoggerForm,
  type LoggerFormIssue,
} from './loggerSeriesForm';

const { t } = useI18n();
const profileStore = useProfileStore();
const { vocabOptions } = useVocab();

/** Height cap of the readings grid; longer series scroll (virtualized) inside it. */
const GRID_MAX_HEIGHT = 420;
const VALIDATION_DEBOUNCE_MS = 300;

// ─── Dialog state ─────────────────────────────────────────────────────────────

const visible = ref(false);
const editingId = ref<string | null>(null);
/** Id of a new series, drawn once per `openAdd` so the payload keeps one id. */
const draftId = ref<string>('');
/** The series being edited, kept so members the form does not own survive. */
const editingOriginal = shallowRef<LoggerSeriesEvent | null>(null);
const form = reactive<LoggerForm>(toLoggerForm(null));
/**
 * Readings can run to tens of thousands, so the grid, the summary and the
 * validation read them raw and depend on this counter instead of tracking
 * every row. Every change to `form.readings` must bump it.
 */
const readingsVersion = ref(0);
const rawReadings = () => toRaw(form).readings;

function load(event: LoggerSeriesEvent | null) {
  Object.assign(form, toLoggerForm(event));
  editingOriginal.value = event ? toRaw(event) : null;
  editingId.value = event?.id ?? null;
  draftId.value = event?.id ?? crypto.randomUUID();
  displayCache.clear();
  readingsVersion.value++;
  validate();
  visible.value = true;
}

function openAdd() {
  load(null);
}

function openEdit(event: LoggerSeriesEvent) {
  load(event);
}

defineExpose({ openAdd, openEdit });

// ─── Time zone ────────────────────────────────────────────────────────────────

/** Zone of the well; without one, the browser's (so local text still parses). */
const wellTimeZone = computed(() => getWellTimeZone(profileStore.well));
const timeZone = computed(
  () => wellTimeZone.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
);

/** Local text of stored datetimes, so a grid change formats only new values. */
const displayCache = new Map<string, string>();
function displayDatetime(datetime: string): string {
  const key = `${timeZone.value}\n${datetime}`;
  let shown = displayCache.get(key);
  if (shown === undefined) {
    shown = formatReadingLocal(datetime, timeZone.value);
    displayCache.set(key, shown);
  }
  return shown;
}

// ─── Start ────────────────────────────────────────────────────────────────────
// Typed as local text in the same zone as the grid, committed on change.

const startText = ref('');
watch(
  [() => form.datetime, timeZone],
  () => {
    startText.value = displayDatetime(form.datetime);
  },
  { immediate: true },
);

function commitStart() {
  form.datetime = applyTypedDatetime(
    form.datetime,
    startText.value,
    timeZone.value,
  );
  startText.value = displayDatetime(form.datetime);
}

// ─── Options ──────────────────────────────────────────────────────────────────

const measurementMethodOptions = computed(() =>
  vocabOptions(MEASUREMENT_METHODS, form.measurementMethod),
);
const barometricOptions = computed(() =>
  vocabOptions(BAROMETRIC_COMPENSATIONS),
);
const aggregationOptions = computed(() => vocabOptions(READING_AGGREGATIONS));
const aggregated = computed(() => isAggregated(form.aggregation));

// ─── Validation (debounced while editing, synchronous on save) ────────────────

const issues = shallowRef<LoggerFormIssue[]>([]);
const isFormValid = computed(() => issues.value.length === 0);

function validate() {
  const result = validateLoggerForm(
    toRaw(form),
    draftId.value,
    editingOriginal.value,
  );
  issues.value = result.issues;
  return result;
}

watchDebounced(
  () => [
    form.datetime,
    form.operator,
    form.equipment,
    form.notes,
    form.measurementMethod,
    form.sensorDepth,
    form.interval,
    form.barometricCompensation,
    form.aggregation,
    form.attachments,
    readingsVersion.value,
  ],
  validate,
  { debounce: VALIDATION_DEBOUNCE_MS },
);

const fieldLabelKeys: Record<string, string> = {
  datetime: 'editor.hydrodynamicEvents.logger.start',
  interval: 'editor.hydrodynamicEvents.logger.interval',
  sensor_depth: 'editor.hydrodynamicEvents.logger.sensorDepth',
  barometric_compensation:
    'editor.hydrodynamicEvents.fields.barometricCompensation',
  aggregation: 'editor.hydrodynamicEvents.fields.aggregation',
  readings: 'editor.hydrodynamicEvents.logger.readings',
};
const readingColumnKeys: Record<string, string> = {
  datetime: 'datetime',
  depth: 'depth',
  pressure: 'pressure',
  depth_min: 'depthMin',
  depth_max: 'depthMax',
};

function issueMessage(issue: LoggerFormIssue): string {
  const key = String(issue.path[issue.path.length - 1]);
  if (issue.code === 'invalid_type' && issue.message === 'Required')
    return t('editor.hydrodynamicEvents.logger.validation.required');
  if (key === 'datetime' && issue.code === 'invalid_string')
    return t('editor.hydrodynamicEvents.logger.validation.datetime');
  if (issue.code === 'too_small' && key === 'interval')
    return t('editor.hydrodynamicEvents.logger.validation.positive');
  // The aggregated-series range rule (core's superRefine).
  if (issue.code === 'custom' && (key === 'depth_min' || key === 'depth_max'))
    return t('editor.hydrodynamicEvents.logger.validation.required');
  return issue.message;
}

/** First issue per field; a reading issue names its grid row and column. */
const issueLines = computed(() => {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const issue of issues.value) {
    const [head, , column] = issue.path;
    const field = String(head ?? '');
    if (seen.has(field)) continue;
    seen.add(field);
    if (field === 'readings' && issue.row !== undefined) {
      const columnKey = readingColumnKeys[String(column)];
      lines.push(
        t('editor.hydrodynamicEvents.logger.validation.row', {
          row: issue.row,
          column: columnKey
            ? t(`editor.hydrodynamicEvents.logger.columns.${columnKey}`)
            : String(column ?? ''),
          message: issueMessage(issue),
        }),
      );
    } else if (field === 'readings') {
      lines.push(t('editor.hydrodynamicEvents.logger.validation.noReadings'));
    } else {
      lines.push(
        t('editor.hydrodynamicEvents.logger.validation.field', {
          field: fieldLabelKeys[field] ? t(fieldLabelKeys[field]) : field,
          message: issueMessage(issue),
        }),
      );
    }
  }
  return lines;
});

function save() {
  // Validated now, not by the debounced watcher, so no edit slips through.
  // Built from the raw form, so no Vue proxy reaches the store.
  const { event, issues: found } = validate();
  if (found.length) return;
  profileStore.updateWell(draft => {
    if (!draft.hydrodynamic_events) draft.hydrodynamic_events = [];
    const idx = editingId.value
      ? draft.hydrodynamic_events.findIndex(e => e.id === editingId.value)
      : -1;
    if (idx !== -1) draft.hydrodynamic_events[idx] = event as HydrodynamicEvent;
    else draft.hydrodynamic_events.push(event as HydrodynamicEvent);
  });
  visible.value = false;
}

// ─── Readings ─────────────────────────────────────────────────────────────────

/** Count and first/last instant of the readings, in one pass (no sort). */
const readingSpan = computed(() => {
  void readingsVersion.value;
  let count = 0;
  let first: { ms: number; datetime: string } | undefined;
  let last: { ms: number; datetime: string } | undefined;
  for (const r of rawReadings()) {
    if (!isReadingInstant(r.datetime)) continue;
    const ms = Date.parse(r.datetime);
    count++;
    if (!first || ms < first.ms) first = { ms, datetime: r.datetime };
    if (!last || ms >= last.ms) last = { ms, datetime: r.datetime };
  }
  return { count, first: first?.datetime, last: last?.datetime };
});

const summary = computed(() => {
  const { count, first, last } = readingSpan.value;
  if (!count || !first || !last)
    return t('editor.hydrodynamicEvents.logger.summaryEmpty');
  return t(
    'editor.hydrodynamicEvents.logger.summary',
    { count, first: displayDatetime(first), last: displayDatetime(last) },
    count,
  );
});

const readingColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'datetime',
    label: t('editor.hydrodynamicEvents.logger.columns.datetime'),
    info: t('editor.hydrodynamicEvents.logger.columns.datetimeInfo', {
      zone: timeZone.value,
    }),
    type: 'text',
    size: 190,
  },
  {
    prop: 'depth',
    label: t('editor.hydrodynamicEvents.logger.columns.depth'),
    type: 'number',
    size: 110,
  },
  {
    prop: 'pressure',
    label: t('editor.hydrodynamicEvents.logger.columns.pressure'),
    type: 'number',
    size: 120,
  },
  ...(aggregated.value
    ? (['depthMin', 'depthMax'] as const).map(prop => ({
        prop,
        label: t(`editor.hydrodynamicEvents.logger.columns.${prop}`),
        type: 'number' as const,
        size: 120,
      }))
    : []),
]);

/** Grid rows: instants shown as local text in the zone. */
const gridRows = computed(() => {
  void readingsVersion.value;
  return rawReadings().map(r => ({
    datetime: displayDatetime(r.datetime),
    depth: r.depth,
    pressure: r.pressure,
    depthMin: r.depthMin,
    depthMax: r.depthMax,
  }));
});

// ─── CSV import ───────────────────────────────────────────────────────────────

const importDialog = ref<InstanceType<typeof LoggerImportDialog> | null>(null);

function applyImport(payload: LoggerImportPayload) {
  const { readings } = mergeImportedReadings(
    rawReadings(),
    payload.readings,
    payload.mode,
  );
  // Replace the array in place: `form.readings` is read raw elsewhere.
  toRaw(form).readings = readings;
  if (form.interval == null && payload.interval != null)
    form.interval = payload.interval;
  readingsVersion.value++;
  validate();
}

function addReading() {
  const readings = rawReadings();
  const timed = readings.filter(r => isReadingInstant(r.datetime));
  // Only `datetime` matters to the interval inference.
  const interval =
    form.interval ??
    inferLoggerInterval(timed.map(r => ({ datetime: r.datetime, depth: 0 }))) ??
    null;
  readings.push(
    blankLoggerReading(nextReadingDatetime(readingSpan.value.last, interval)),
  );
  readingsVersion.value++;
}

const NUMERIC_PROPS = ['depth', 'pressure', 'depthMin', 'depthMax'] as const;
const isNumericProp = (prop: string): prop is (typeof NUMERIC_PROPS)[number] =>
  (NUMERIC_PROPS as readonly string[]).includes(prop);

function deleteReading(index: number) {
  rawReadings().splice(index, 1);
  readingsVersion.value++;
}

function changeReading(index: number, prop: string, value: unknown) {
  const row = rawReadings()[index];
  if (!row) return;
  if (prop === 'datetime') {
    // Unchanged shown text keeps the stored instant as it is.
    row.datetime = applyTypedDatetime(
      row.datetime,
      typeof value === 'string' ? value : '',
      timeZone.value,
    );
  } else if (isNumericProp(prop)) {
    const n =
      typeof value === 'number' ? value : Number.parseFloat(String(value));
    row[prop] = Number.isFinite(n) ? n : null;
  } else return;
  readingsVersion.value++;
}

function reorderReading(from: number, to: number) {
  const readings = rawReadings();
  const [moved] = readings.splice(from, 1);
  if (moved) readings.splice(to, 0, moved);
  readingsVersion.value++;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      editingId
        ? t('editor.hydrodynamicEvents.logger.editSeries')
        : t('editor.hydrodynamicEvents.logger.addSeries')
    "
    :style="{ width: '100vw', maxWidth: '48rem' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <!-- Start / Measurement method -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WellLabeledField :label="t('editor.hydrodynamicEvents.logger.start')">
          <InputText
            v-model="startText"
            :placeholder="
              t('editor.hydrodynamicEvents.logger.startPlaceholder')
            "
            class="w-full font-mono text-sm"
            @change="commitStart"
          />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.fields.measurementMethod')"
        >
          <WellComboSelect
            v-model="form.measurementMethod"
            :options="measurementMethodOptions"
            option-label="label"
            option-value="value"
            :hint="t('editor.comboHint')"
            show-clear
            class="w-full"
          />
        </WellLabeledField>
      </div>

      <!-- Operator / Equipment -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.fields.operator')"
        >
          <InputText v-model="form.operator" class="w-full" />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.fields.equipment')"
        >
          <InputText v-model="form.equipment" class="w-full" />
        </WellLabeledField>
      </div>

      <!-- Sensor depth / Interval -->
      <div class="grid grid-cols-2 gap-3">
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.logger.sensorDepth')"
        >
          <InputNumber
            v-model="form.sensorDepth"
            :max-fraction-digits="3"
            class="w-full"
          />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.logger.interval')"
        >
          <InputNumber
            v-model="form.interval"
            :min="0"
            :max-fraction-digits="2"
            class="w-full"
          />
        </WellLabeledField>
      </div>

      <!-- Barometric compensation / Aggregation (closed vocabularies) -->
      <div class="grid grid-cols-2 gap-3">
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.fields.barometricCompensation')"
        >
          <Select
            v-model="form.barometricCompensation"
            :options="barometricOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full"
          />
        </WellLabeledField>
        <WellLabeledField
          :label="t('editor.hydrodynamicEvents.fields.aggregation')"
        >
          <Select
            v-model="form.aggregation"
            :options="aggregationOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full"
          />
        </WellLabeledField>
      </div>

      <!-- Readings -->
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span
            class="text-xs font-semibold tracking-widest uppercase text-content-400"
          >
            {{ t('editor.hydrodynamicEvents.logger.readings') }}
          </span>
          <span class="font-mono text-xs text-content-300">{{ summary }}</span>
        </div>
        <div>
          <Button
            :label="t('editor.hydrodynamicEvents.logger.import.button')"
            icon="pi pi-upload"
            size="small"
            severity="secondary"
            outlined
            @click="importDialog?.open()"
          />
        </div>
        <p class="m-0 flex items-center gap-1.5 text-xs text-content-400">
          <Icon
            name="ph:globe-hemisphere-west-duotone"
            class="size-3.5 shrink-0"
          />
          {{
            wellTimeZone
              ? t('editor.hydrodynamicEvents.logger.zone', { zone: timeZone })
              : t('editor.hydrodynamicEvents.logger.noTimezone', {
                  zone: timeZone,
                })
          }}
        </p>
        <WellDataGrid
          :rows="gridRows"
          :columns="readingColumns"
          :max-height="GRID_MAX_HEIGHT"
          :add-label="t('editor.hydrodynamicEvents.addReading')"
          :delete-label="t('editor.deleteRow')"
          :labels="{
            showPendingTextures: t('editor.showPendingTextures'),
            columnInfo: t('editor.fieldInfo'),
          }"
          @add="addReading"
          @delete="deleteReading"
          @change="changeReading"
          @reorder="reorderReading"
        />
      </div>

      <!-- Notes -->
      <WellLabeledField :label="t('editor.hydrodynamicEvents.fields.notes')">
        <Textarea
          v-model="form.notes"
          :rows="3"
          class="w-full font-mono text-sm"
        />
      </WellLabeledField>

      <!-- Attachments -->
      <WellLabeledField :label="t('editor.historyLog.logs.fields.attachments')">
        <AttachmentField v-model="form.attachments" context="event" />
      </WellLabeledField>
    </div>

    <LoggerImportDialog
      ref="importDialog"
      v-model:sensor-depth="form.sensorDepth"
      :time-zone="wellTimeZone"
      :existing-count="readingSpan.count"
      @import="applyImport"
    />

    <template #footer>
      <div class="flex flex-col gap-2 w-full pt-2">
        <div class="flex justify-end gap-2">
          <Button
            :label="t('editor.confirmClear.reject')"
            severity="secondary"
            text
            @click="visible = false"
          />
          <Button
            :label="
              editingId
                ? t('editor.save')
                : t('editor.hydrodynamicEvents.logger.save')
            "
            :disabled="!isFormValid"
            @click="save"
          />
        </div>
        <ul
          v-if="issueLines.length"
          class="m-0 flex list-none flex-col gap-1 p-0 text-xs text-error-400"
        >
          <li
            v-for="line in issueLines"
            :key="line"
            class="flex items-center gap-1.5"
          >
            <Icon name="ph:info" class="size-3.5 shrink-0" />
            {{ line }}
          </li>
        </ul>
      </div>
    </template>
  </Dialog>
</template>
