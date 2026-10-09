import type {
  LimitSet,
  WaterQualityResult,
  WaterSample,
  Well,
} from '@welldot/core';
import {
  getLimitSet,
  getParameterLabel,
  MEASUREMENT_LOCATIONS,
  RESULT_FRACTIONS,
  SAMPLE_TYPES,
  SAMPLING_DEVICES,
  SAMPLING_POINT_TYPES,
  VALIDATION_STATUSES,
} from '@welldot/core';
import {
  formatNumber,
  formatWaterQualityResult,
  getEffectiveWaterSamples,
  getExceedances,
  getSampleDepth,
  isResultUsable,
  parameterUnitSymbol,
} from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import { buildEntryDivider, headerCell } from '../layout/tables';
import type {
  PdfContext,
  PdfDateFormats,
  PdfLabels,
} from '../types/options.types';
import type { Content, ContentText, TableCell } from '../types/pdfmake.types';

/** RFC 3339 instant → display; `day` resolution drops the time of day. */
function formatInstant(
  value: string,
  formats: Required<PdfDateFormats>,
  resolution?: 'day',
): string {
  const date = parseISO(value);
  if (isNaN(date.getTime())) return value;
  return format(date, resolution === 'day' ? formats.date : formats.dateTime);
}

const formatValue = (n: number) =>
  formatNumber(n, { maximumFractionDigits: 6 });

/** Qualifier + value, presence, text, or "not detected (DL x)". */
function valueText(r: WaterQualityResult, labels: PdfLabels): string {
  const words = labels.waterQuality;
  const text = formatWaterQualityResult(
    r,
    {
      notDetected: words.notDetected,
      present: words.presence.present,
      absent: words.presence.absent,
      estimated: words.estimatedShort,
    },
    formatValue,
  );
  if (r.qualifier === 'not_detected' && r.detection_limit != null) {
    return `${text} (${labels.waterQuality.fields.detectionLimit} ${formatValue(r.detection_limit)})`;
  }
  return text;
}

/** Datetime, sample type, campaign, correction marker and parent reference. */
function buildHeader(
  sample: WaterSample,
  well: Well,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content {
  const { labels, dateFormats } = ctx;
  const parent = sample.parent_sample_id
    ? well.water_samples?.find(s => s.id === sample.parent_sample_id)
    : undefined;
  const details = [
    sample.campaign &&
      `${labels.waterQuality.fields.campaign}: ${sample.campaign}`,
    sample.corrects && labels.waterQuality.correction,
    sample.parent_sample_id &&
      `${labels.waterQuality.fields.parentSampleId}: ${
        parent
          ? `${formatInstant(parent.datetime, dateFormats)} (${fmt.vocab(SAMPLE_TYPES, parent.sample_type)})`
          : sample.parent_sample_id
      }`,
  ].filter((v): v is string => !!v);

  return {
    columns: [
      {
        text: [
          {
            text: fmt.vocab(SAMPLE_TYPES, sample.sample_type),
            style: 'tableHeader',
          },
          ...(details.length
            ? [{ text: `   ${details.join(' · ')}`, style: 'metadataLabel' }]
            : []),
        ],
        width: '*',
      },
      {
        text: formatInstant(sample.datetime, dateFormats),
        style: 'metadataLabel',
        alignment: 'right',
        width: 'auto',
      },
    ],
  };
}

/** Sampling point type, device and depth (or interval) in the display unit. */
function samplingPointLine(
  sample: WaterSample,
  well: Well,
  fmt: PdfFormatters,
  labels: PdfLabels,
): string | null {
  const point = sample.sampling_point;
  const depth = getSampleDepth(well, sample);
  const parts = [
    point?.type && fmt.vocab(SAMPLING_POINT_TYPES, point.type),
    point?.device &&
      `${labels.waterQuality.fields.device}: ${fmt.vocab(SAMPLING_DEVICES, point.device)}`,
    depth?.kind === 'point' &&
      `${labels.waterQuality.fields.depth}: ${fmt.formatLength(depth.depth)}`,
    depth?.kind === 'interval' &&
      `${labels.waterQuality.fields.interval}: ${fmt.formatLength(depth.from)} – ${fmt.formatLength(depth.to)}`,
  ].filter((v): v is string => !!v);
  return parts.length
    ? `${labels.waterQuality.fields.samplingPoint}: ${parts.join(' · ')}`
    : null;
}

/** Laboratory name, report number, receipt instant and temperature. */
function laboratoryLine(
  sample: WaterSample,
  labels: PdfLabels,
  dateFormats: Required<PdfDateFormats>,
): string | null {
  const lab = sample.laboratory;
  if (!lab) return null;
  const parts = [
    lab.name,
    lab.report_number &&
      `${labels.waterQuality.fields.reportNumber}: ${lab.report_number}`,
    lab.received_at &&
      `${labels.waterQuality.fields.receivedAt}: ${formatInstant(lab.received_at, dateFormats, lab.received_at_resolution)}`,
    lab.received_temperature != null &&
      `${labels.waterQuality.fields.receivedTemperature}: ${formatNumber(lab.received_temperature, { maximumFractionDigits: 1, suffix: '°C' })}`,
  ].filter((v): v is string => !!v);
  return `${labels.waterQuality.fields.laboratory}: ${parts.join(' · ')}`;
}

function flagsCell(r: WaterQualityResult, fmt: PdfFormatters): string {
  const validation = r.validation
    ? [
        fmt.vocab(VALIDATION_STATUSES, r.validation.status),
        r.validation.qualifier,
      ]
        .filter(Boolean)
        .join(' ')
    : null;
  return [r.lab_flags?.length ? r.lab_flags.join(', ') : null, validation]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Results table. Rows exceeding the limit set are bold and red; rejected
 * results (excluded from derivations) are struck through.
 */
function buildResultsTable(
  sample: WaterSample,
  limitSet: LimitSet | undefined,
  labels: PdfLabels,
  fmt: PdfFormatters,
  exceedanceColor: string,
): Content {
  const exceeding = new Set(
    limitSet ? getExceedances(sample, limitSet).map(e => e.result_index) : [],
  );

  const body: TableCell[][] = [
    [
      headerCell(labels.waterQuality.pdf.parameter),
      headerCell(labels.waterQuality.pdf.value, true),
      headerCell(labels.waterQuality.pdf.unit),
      headerCell(labels.waterQuality.pdf.fraction),
      headerCell(labels.waterQuality.pdf.measuredIn),
      headerCell(labels.waterQuality.pdf.method),
      headerCell(
        `${labels.waterQuality.pdf.flags} / ${labels.waterQuality.pdf.validation}`,
      ),
    ],
  ];

  sample.results.forEach((r, index) => {
    const emphasis: Omit<ContentText, 'text'> = {
      fontSize: 8,
      ...(exceeding.has(index) ? { bold: true, color: exceedanceColor } : {}),
      ...(isResultUsable(r) ? {} : { decoration: 'lineThrough' }),
    };
    const cell = (text: string, alignRight = false): ContentText => ({
      text,
      ...(alignRight ? { style: 'columnRight' } : {}),
      ...emphasis,
    });

    body.push([
      cell(getParameterLabel(r.parameter, fmt.locale)),
      cell(valueText(r, labels), true),
      cell(parameterUnitSymbol(r)),
      cell(r.fraction ? fmt.vocab(RESULT_FRACTIONS, r.fraction) : ''),
      cell(
        r.measured_in ? fmt.vocab(MEASUREMENT_LOCATIONS, r.measured_in) : '',
      ),
      cell(r.method ?? ''),
      cell(flagsCell(r, fmt)),
    ]);
  });

  const blocks: Content[] = [
    {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        body,
      },
      margin: [0, 4, 0, 0],
    },
  ];
  if (limitSet) {
    blocks.push({
      text: `${labels.waterQuality.pdf.limitSet}: ${limitSet.name}   ·   ${labels.waterQuality.pdf.exceedances}: ${exceeding.size}`,
      style: 'metadataLabel',
      margin: [0, 2, 0, 0],
    });
  }
  return { stack: blocks };
}

function buildBody(
  sample: WaterSample,
  well: Well,
  fmt: PdfFormatters,
  limitSet: LimitSet | undefined,
  ctx: PdfContext,
): Content[] {
  const { labels } = ctx;
  const lines = [
    samplingPointLine(sample, well, fmt, labels),
    laboratoryLine(sample, labels, ctx.dateFormats),
  ].filter((v): v is string => !!v);
  const blocks: Content[] = lines.map(text => ({
    text,
    fontSize: 9,
    margin: [0, 2, 0, 0],
  }));
  if (sample.notes) {
    blocks.push({ text: sample.notes, fontSize: 9, margin: [0, 2, 0, 0] });
  }
  blocks.push(
    buildResultsTable(
      sample,
      limitSet,
      labels,
      fmt,
      ctx.theme.colors.exceedance,
    ),
  );
  return blocks;
}

/**
 * Builds the `water_samples` section (.well v2.3): one card per effective
 * (non-retracted) sample, oldest first, with the sampling point, laboratory
 * and a results table. When `ctx.waterQualityLimitSet` resolves to a
 * known limit set, exceeding results are highlighted and the set is named
 * under each table. Returns `null` when there are no effective samples. The
 * title is bound to the first card's header inside an `unbreakable` block.
 */
export function buildWaterSampleSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  if (!well.water_samples?.length) return null;
  // Already chronological (datetime, then sequence, then file order).
  const samples = getEffectiveWaterSamples(well);
  if (!samples.length) return null;

  const fmt = createPdfFormatters(ctx);
  const limitSet = ctx.waterQualityLimitSet
    ? getLimitSet(ctx.waterQualityLimitSet)
    : undefined;
  const [first, ...rest] = samples;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: ctx.labels.waterQuality.pdf.title, style: 'title' },
        buildHeader(first!, well, fmt, ctx),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, well, fmt, limitSet, ctx),
  ];
  rest.forEach(sample => {
    items.push(buildEntryDivider(ctx));
    items.push({
      stack: [
        buildHeader(sample, well, fmt, ctx),
        ...buildBody(sample, well, fmt, limitSet, ctx),
      ],
    });
  });

  return { stack: items };
}
