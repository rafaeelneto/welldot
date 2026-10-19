<script setup lang="ts">
import type { LoggerReading } from '@welldot/core';
import {
  buildLoggerReadings,
  inferLoggerInterval,
  parseDelimitedText,
  type LoggerDateFormat,
  type LoggerImportIssue,
} from '@welldot/utils';

export type LoggerImportPayload = {
  readings: LoggerReading[];
  mode: 'append' | 'replace';
  interval?: number;
};

const props = defineProps<{
  /** Sensor depth of the parent form (m); asked for here when empty. */
  sensorDepth: number | null;
  /** IANA zone of the well, when it has one. */
  timeZone?: string;
  /** Readings already in the series (a replace asks before dropping them). */
  existingCount: number;
}>();
const emit = defineEmits<{
  import: [payload: LoggerImportPayload];
  'update:sensorDepth': [value: number | null];
}>();

const { t, locale } = useI18n();
const confirm = useConfirm();

const PREVIEW_ROWS = 20;
const DEFAULT_OFFSET = '-03:00';
const MAX_ISSUE_ROWS = 5;
const ISSUES: LoggerImportIssue[] = [
  'invalid_date',
  'invalid_value',
  'missing_sensor_depth',
  'missing_offset',
];
const DATE_FORMATS: LoggerDateFormat[] = ['iso', 'dmy', 'mdy', 'ymd'];

const visible = ref(false);
const text = ref('');
const fileName = ref('');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

/** Sample export shown in the help box; its mapping is spelled out in `help.exampleMapping`. */
const CSV_EXAMPLE = [
  'Levelogger 5 LT, SN 2081234',
  'Date;Time;Level;Pressure',
  '01/07/2026;00:00:00;23,58;233,9',
  '01/07/2026;00:15:00;23,56;233,7',
].join('\n');
const headerRows = ref(1);
const dateColumn = ref<number | null>(0);
const timeColumn = ref<number | null>(null);
const valueColumn = ref<number | null>(1);
const pressureColumn = ref<number | null>(null);
const dateFormat = ref<LoggerDateFormat>('iso');
const valueKind = ref<'depth' | 'water_column'>('depth');
const depthInput = ref<number | null>(null);
const offset = ref(DEFAULT_OFFSET);
const mode = ref<'append' | 'replace'>('append');

function open() {
  text.value = '';
  fileName.value = '';
  headerRows.value = 1;
  dateColumn.value = 0;
  timeColumn.value = null;
  valueColumn.value = 1;
  pressureColumn.value = null;
  dateFormat.value = locale.value.startsWith('pt') ? 'dmy' : 'iso';
  valueKind.value = 'depth';
  depthInput.value = props.sensorDepth;
  offset.value = DEFAULT_OFFSET;
  mode.value = 'append';
  visible.value = true;
}
defineExpose({ open });

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  fileName.value = file.name;
  text.value = await file.text();
  // Lets the same file be chosen again after an edit of the pasted text.
  (event.target as HTMLInputElement).value = '';
}

// ─── Parsing and mapping ──────────────────────────────────────────────────────

const rows = computed(() => parseDelimitedText(text.value).rows);
const columnCount = computed(() =>
  rows.value.slice(0, PREVIEW_ROWS).reduce((m, r) => Math.max(m, r.length), 0),
);
const previewRows = computed(() => rows.value.slice(0, PREVIEW_ROWS));
const columnOptions = computed(() =>
  Array.from({ length: columnCount.value }, (_, i) => ({
    value: i,
    label: t('editor.hydrodynamicEvents.logger.import.column', { n: i + 1 }),
  })),
);

// Guess the columns when a new text arrives: date, [time], value.
watch(columnCount, count => {
  if (!count) return;
  dateColumn.value = 0;
  timeColumn.value = count >= 3 ? 1 : null;
  valueColumn.value = count >= 3 ? 2 : 1;
  pressureColumn.value = null;
});

const effectiveSensorDepth = computed(() =>
  valueKind.value === 'water_column'
    ? (depthInput.value ?? undefined)
    : undefined,
);

const built = computed(() => {
  if (
    !rows.value.length ||
    dateColumn.value === null ||
    valueColumn.value === null
  )
    return { readings: [] as LoggerReading[], skipped: [] };
  return buildLoggerReadings(rows.value, {
    headerRows: Math.max(0, headerRows.value ?? 0),
    dateColumn: dateColumn.value,
    timeColumn: timeColumn.value ?? undefined,
    valueColumn: valueColumn.value,
    pressureColumn: pressureColumn.value ?? undefined,
    valueKind: valueKind.value,
    sensorDepth: effectiveSensorDepth.value,
    dateFormat: dateFormat.value,
    ...(props.timeZone
      ? { timeZone: props.timeZone }
      : { offset: offset.value.trim() }),
  });
});

const span = computed(() => {
  let first: { ms: number; datetime: string } | undefined;
  let last: { ms: number; datetime: string } | undefined;
  for (const r of built.value.readings) {
    const ms = Date.parse(r.datetime);
    if (!first || ms < first.ms) first = { ms, datetime: r.datetime };
    if (!last || ms >= last.ms) last = { ms, datetime: r.datetime };
  }
  return { first: first?.datetime, last: last?.datetime };
});

/** Skipped rows grouped by issue, with the first row numbers (1-based). */
const skippedGroups = computed(() =>
  ISSUES.flatMap(issue => {
    const hits = built.value.skipped.filter(s => s.issue === issue);
    if (!hits.length) return [];
    const shown = hits.slice(0, MAX_ISSUE_ROWS).map(h => h.row + 1);
    return [
      {
        issue,
        text: t('editor.hydrodynamicEvents.logger.import.skippedGroup', {
          issue: t(`editor.hydrodynamicEvents.logger.import.issues.${issue}`),
          count: hits.length,
          rows: shown.join(', ') + (hits.length > shown.length ? '…' : ''),
        }),
      },
    ];
  }),
);

const needsSensorDepth = computed(
  () => valueKind.value === 'water_column' && depthInput.value == null,
);
const canImport = computed(
  () => built.value.readings.length > 0 && !needsSensorDepth.value,
);

function confirmImport() {
  const readings = built.value.readings;
  const payload: LoggerImportPayload = {
    readings,
    mode: mode.value,
    interval: inferLoggerInterval(readings),
  };
  const run = () => {
    if (valueKind.value === 'water_column')
      emit('update:sensorDepth', depthInput.value);
    emit('import', payload);
    visible.value = false;
  };
  if (mode.value === 'replace' && props.existingCount > 0) {
    confirm.require({
      header: t('editor.hydrodynamicEvents.logger.import.replaceHeader'),
      message: t('editor.hydrodynamicEvents.logger.import.replaceMessage', {
        count: props.existingCount,
      }),
      acceptLabel: t('editor.hydrodynamicEvents.logger.import.replaceAccept'),
      rejectLabel: t('editor.confirmClear.reject'),
      accept: run,
    });
    return;
  }
  run();
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('editor.hydrodynamicEvents.logger.import.title')"
    :style="{ width: '100vw', maxWidth: '48rem' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <!-- What the file should look like -->
      <div
        class="flex flex-col gap-2 rounded border border-content-600 bg-surface-50 p-3 text-xs text-content-200"
      >
        <span class="font-semibold text-content-100">
          {{ t('editor.hydrodynamicEvents.logger.import.help.title') }}
        </span>
        <ul class="flex list-disc flex-col gap-1 pl-4">
          <li>{{ t('editor.hydrodynamicEvents.logger.import.help.rows') }}</li>
          <li>
            {{ t('editor.hydrodynamicEvents.logger.import.help.columns') }}
          </li>
          <li>{{ t('editor.hydrodynamicEvents.logger.import.help.dates') }}</li>
          <li>
            {{ t('editor.hydrodynamicEvents.logger.import.help.values') }}
          </li>
          <li>
            {{ t('editor.hydrodynamicEvents.logger.import.help.header') }}
          </li>
        </ul>
        <span class="text-content-300">
          {{ t('editor.hydrodynamicEvents.logger.import.help.example') }}
        </span>
        <pre
          class="overflow-x-auto rounded bg-surface-100 px-2 py-1.5 font-mono text-content-100"
          v-text="CSV_EXAMPLE"
        />
        <span class="text-content-300">
          {{ t('editor.hydrodynamicEvents.logger.import.help.exampleMapping') }}
        </span>
      </div>

      <!-- Source -->
      <div class="flex flex-col gap-2">
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt"
          class="hidden"
          :aria-label="t('editor.hydrodynamicEvents.logger.import.file')"
          @change="onFile"
        />
        <div class="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            severity="secondary"
            outlined
            :label="t('editor.hydrodynamicEvents.logger.import.chooseFile')"
            @click="fileInput?.click()"
          >
            <template #icon>
              <Icon name="ph:file-arrow-up-duotone" />
            </template>
          </Button>
          <span
            class="min-w-0 truncate text-sm"
            :class="fileName ? 'text-content-100' : 'text-content-400'"
          >
            {{
              fileName || t('editor.hydrodynamicEvents.logger.import.noFile')
            }}
          </span>
        </div>
        <Textarea
          v-model="text"
          :rows="4"
          :placeholder="t('editor.hydrodynamicEvents.logger.import.paste')"
          class="w-full font-mono text-xs"
        />
      </div>

      <template v-if="rows.length">
        <!-- Preview -->
        <div class="max-h-56 overflow-auto rounded border border-content-600">
          <table class="w-full border-collapse font-mono text-xs">
            <thead>
              <tr class="bg-surface-100">
                <th class="px-2 py-1 text-left text-content-300">#</th>
                <th
                  v-for="c in columnCount"
                  :key="c"
                  class="px-2 py-1 text-left text-content-300"
                >
                  {{ c }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in previewRows"
                :key="i"
                :class="{ 'text-content-300': i < headerRows }"
              >
                <td class="px-2 py-0.5 text-content-300">{{ i + 1 }}</td>
                <td
                  v-for="c in columnCount"
                  :key="c"
                  class="whitespace-nowrap px-2 py-0.5"
                >
                  {{ row[c - 1] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mapping -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.headerRows')"
          >
            <InputNumber
              v-model="headerRows"
              :min="0"
              :max-fraction-digits="0"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.dateColumn')"
          >
            <Select
              v-model="dateColumn"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.timeColumn')"
          >
            <Select
              v-model="timeColumn"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              show-clear
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.dateFormat')"
          >
            <Select
              v-model="dateFormat"
              :options="
                DATE_FORMATS.map(value => ({
                  value,
                  label: t(
                    `editor.hydrodynamicEvents.logger.import.dateFormats.${value}`,
                  ),
                }))
              "
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.valueColumn')"
          >
            <Select
              v-model="valueColumn"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.pressureColumn')"
          >
            <Select
              v-model="pressureColumn"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              show-clear
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.valueKind')"
          >
            <Select
              v-model="valueKind"
              :options="
                (['depth', 'water_column'] as const).map(value => ({
                  value,
                  label: t(
                    `editor.hydrodynamicEvents.logger.import.valueKinds.${value}`,
                  ),
                }))
              "
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            v-if="valueKind === 'water_column'"
            :label="t('editor.hydrodynamicEvents.logger.sensorDepth')"
          >
            <InputNumber
              v-model="depthInput"
              :max-fraction-digits="3"
              :invalid="needsSensorDepth"
              class="w-full"
            />
          </WellLabeledField>
          <WellLabeledField
            :label="t('editor.hydrodynamicEvents.logger.import.timeZone')"
          >
            <InputText
              v-if="timeZone"
              :model-value="timeZone"
              readonly
              class="w-full"
            />
            <InputText v-else v-model="offset" class="w-full font-mono" />
          </WellLabeledField>
        </div>
        <p v-if="!timeZone" class="m-0 text-xs text-content-400">
          {{ t('editor.hydrodynamicEvents.logger.import.noTimezone') }}
        </p>
        <p v-if="needsSensorDepth" class="m-0 text-xs text-error-400">
          {{ t('editor.hydrodynamicEvents.logger.import.needSensorDepth') }}
        </p>

        <!-- Summary -->
        <div class="flex flex-col gap-1 text-xs">
          <span class="font-mono text-content-300">
            {{
              built.readings.length
                ? t(
                    'editor.hydrodynamicEvents.logger.import.summary',
                    {
                      count: built.readings.length,
                      first: span.first,
                      last: span.last,
                    },
                    built.readings.length,
                  )
                : t('editor.hydrodynamicEvents.logger.import.summaryEmpty')
            }}
          </span>
          <span v-if="built.skipped.length" class="text-warning-500">
            {{
              t('editor.hydrodynamicEvents.logger.import.skipped', {
                count: built.skipped.length,
              })
            }}
          </span>
          <ul class="m-0 list-none p-0 text-content-400">
            <li v-for="g in skippedGroups" :key="g.issue">{{ g.text }}</li>
          </ul>
        </div>

        <!-- Mode -->
        <div class="flex flex-col gap-2">
          <label
            v-for="m in ['append', 'replace'] as const"
            :key="m"
            class="flex items-center gap-2 text-sm"
          >
            <RadioButton v-model="mode" :value="m" name="logger-import-mode" />
            {{ t(`editor.hydrodynamicEvents.logger.import.modes.${m}`) }}
          </label>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button
          :label="t('editor.confirmClear.reject')"
          severity="secondary"
          text
          @click="visible = false"
        />
        <Button
          :label="t('editor.hydrodynamicEvents.logger.import.confirm')"
          :disabled="!canImport"
          @click="confirmImport"
        />
      </div>
    </template>
  </Dialog>
</template>
