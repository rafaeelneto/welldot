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
import {
  buildEntryHeader,
  buildEntryListing,
  headerCell,
} from '../layout/tables';
import type {
  PdfContext,
  PdfDateFormats,
  PdfLabels,
} from '../types/options.types';
import type { Content, ContentText, TableCell } from '../types/pdfmake.types';
import { buildFieldGrid, type MetaField } from './metadataTable';

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

/** Sample type, campaign, correction marker, parent reference and datetime. */
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

  return buildEntryHeader(
    fmt.vocab(SAMPLE_TYPES, sample.sample_type),
    details.join(' · '),
    formatInstant(sample.datetime, dateFormats),
  );
}

/** Sampling point (type, device, depth or interval) and laboratory fields. */
function sampleFields(
  sample: WaterSample,
  well: Well,
  fmt: PdfFormatters,
  ctx: PdfContext,
): MetaField[] {
  const fields = ctx.labels.waterQuality.fields;
  const point = sample.sampling_point;
  const depth = getSampleDepth(well, sample);
  const lab = sample.laboratory;

  return [
    point?.type && {
      label: fields.samplingPoint,
      value: fmt.vocab(SAMPLING_POINT_TYPES, point.type),
    },
    point?.device && {
      label: fields.device,
      value: fmt.vocab(SAMPLING_DEVICES, point.device),
    },
    depth?.kind === 'point' && {
      label: fields.depth,
      value: fmt.formatLength(depth.depth),
    },
    depth?.kind === 'interval' && {
      label: fields.interval,
      value: `${fmt.formatLength(depth.from)} – ${fmt.formatLength(depth.to)}`,
    },
    lab?.name && { label: fields.laboratory, value: lab.name },
    lab?.report_number && {
      label: fields.reportNumber,
      value: lab.report_number,
    },
    lab?.received_at && {
      label: fields.receivedAt,
      value: formatInstant(
        lab.received_at,
        ctx.dateFormats,
        lab.received_at_resolution,
      ),
    },
    lab?.received_temperature != null && {
      label: fields.receivedTemperature,
      value: formatNumber(lab.received_temperature, {
        maximumFractionDigits: 1,
        suffix: '°C',
      }),
    },
  ].filter((field): field is MetaField => !!field);
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

/** One results-table column: header and the text of each result. */
interface ResultColumn {
  header: string;
  alignRight?: boolean;
  /** Dropped when no result in the sample has a value for it. */
  optional?: boolean;
  width: string;
  value: (r: WaterQualityResult) => string;
}

function resultColumns(labels: PdfLabels, fmt: PdfFormatters): ResultColumn[] {
  const words = labels.waterQuality.pdf;
  return [
    {
      header: words.parameter,
      width: '*',
      value: r => getParameterLabel(r.parameter, fmt.locale),
    },
    {
      header: words.value,
      alignRight: true,
      width: 'auto',
      value: r => valueText(r, labels),
    },
    { header: words.unit, width: 'auto', value: r => parameterUnitSymbol(r) },
    {
      header: words.fraction,
      optional: true,
      width: 'auto',
      value: r => (r.fraction ? fmt.vocab(RESULT_FRACTIONS, r.fraction) : ''),
    },
    {
      header: words.measuredIn,
      optional: true,
      width: 'auto',
      value: r =>
        r.measured_in ? fmt.vocab(MEASUREMENT_LOCATIONS, r.measured_in) : '',
    },
    {
      header: words.method,
      optional: true,
      width: 'auto',
      value: r => r.method ?? '',
    },
    {
      header: words.flagsValidation,
      optional: true,
      width: 'auto',
      value: r => flagsCell(r, fmt),
    },
  ];
}

/**
 * Results table. Optional columns (fraction, measured in, method, flags)
 * appear only when a result has a value for them. Rows exceeding the limit
 * set are bold and red; rejected results (excluded from derivations) are
 * struck through.
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
  const columns = resultColumns(labels, fmt).filter(
    col => !col.optional || sample.results.some(r => col.value(r) !== ''),
  );

  const body: TableCell[][] = [
    columns.map(col => headerCell(col.header, col.alignRight)),
  ];
  sample.results.forEach((r, index) => {
    const emphasis: Omit<ContentText, 'text'> = {
      fontSize: 8,
      ...(exceeding.has(index) ? { bold: true, color: exceedanceColor } : {}),
      ...(isResultUsable(r) ? {} : { decoration: 'lineThrough' }),
    };
    body.push(
      columns.map(col => ({
        text: col.value(r),
        ...(col.alignRight ? { style: 'columnRight' } : {}),
        ...emphasis,
      })),
    );
  });

  const blocks: Content[] = [
    {
      layout: 'lightHorizontalLines',
      table: {
        widths: columns.map(col => col.width),
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
  const blocks: Content[] = [];
  const grid = buildFieldGrid(
    sampleFields(sample, well, fmt, ctx),
    ctx,
    sample.notes
      ? [{ label: labels.waterQuality.fields.notes, value: sample.notes }]
      : [],
  );
  if (grid) blocks.push(grid);
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
 * (non-retracted) sample, oldest first, with a label/value grid of the
 * sampling point and laboratory and a results table. When
 * `ctx.waterQualityLimitSet` resolves to a known limit set, exceeding
 * results are highlighted and the set is named under each table. Returns `null` when there are no effective samples. The
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

  return buildEntryListing(
    ctx.labels.waterQuality.pdf.title,
    samples.map(sample => ({
      header: buildHeader(sample, well, fmt, ctx),
      body: buildBody(sample, well, fmt, limitSet, ctx),
    })),
    ctx,
  );
}
