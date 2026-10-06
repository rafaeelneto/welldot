import type {
  LimitSet,
  WaterQualityResult,
  WaterSample,
  Well,
} from '@welldot/core';
import { getLimitSet } from '@welldot/core';
import {
  formatNumber,
  getEffectiveWaterSamples,
  getExceedances,
  getSampleDepth,
  isResultUsable,
} from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import {
  formatResultValue,
  parameterUnitSymbol,
  resolveDeviceLabel,
  resolveFractionLabel,
  resolveMeasuredInLabel,
  resolveParameterLabel,
  resolveSampleTypeLabel,
  resolveSamplingPointTypeLabel,
  resolveValidationStatusLabel,
} from '../waterQualityVocab';
import { createPdfFormatters, type PdfFormatters } from './formatters';
import type { Content, ContentText, TableCell } from './pdfmake.types';
import { buildEntryDivider, headerCell } from './sectionTables';
import type { PdfExportOptions, PdfTranslate } from './types';

/** Color of results exceeding the selected limit set. */
const EXCEEDANCE_COLOR = '#b91c1c';

const field = (t: PdfTranslate, key: string) =>
  t(`editor.waterQuality.fields.${key}`);
const pdf = (t: PdfTranslate, key: string) =>
  t(`editor.waterQuality.pdf.${key}`);

/** RFC 3339 instant → display; `day` resolution drops the time of day. */
function formatInstant(value: string, resolution?: 'day'): string {
  const date = parseISO(value);
  if (isNaN(date.getTime())) return value;
  return format(date, resolution === 'day' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm');
}

const formatValue = (n: number) =>
  formatNumber(n, { maximumFractionDigits: 6 });

/** Qualifier + value, presence, text, or "not detected (DL x)". */
function valueText(r: WaterQualityResult, t: PdfTranslate): string {
  const text = formatResultValue(r, t, formatValue);
  if (r.qualifier === 'not_detected' && r.detection_limit != null) {
    return `${text} (${field(t, 'detectionLimit')} ${formatValue(r.detection_limit)})`;
  }
  return text;
}

/** Datetime, sample type, campaign, correction marker and parent reference. */
function buildHeader(
  sample: WaterSample,
  well: Well,
  t: PdfTranslate,
): Content {
  const parent = sample.parent_sample_id
    ? well.water_samples?.find(s => s.id === sample.parent_sample_id)
    : undefined;
  const details = [
    sample.campaign && `${field(t, 'campaign')}: ${sample.campaign}`,
    sample.corrects && t('editor.waterQuality.correction'),
    sample.parent_sample_id &&
      `${field(t, 'parentSampleId')}: ${
        parent
          ? `${formatInstant(parent.datetime)} (${resolveSampleTypeLabel(parent.sample_type, t)})`
          : sample.parent_sample_id
      }`,
  ].filter((v): v is string => !!v);

  return {
    columns: [
      {
        text: [
          {
            text: resolveSampleTypeLabel(sample.sample_type, t),
            style: 'tableHeader',
          },
          ...(details.length
            ? [{ text: `   ${details.join(' · ')}`, style: 'metadataLabel' }]
            : []),
        ],
        width: '*',
      },
      {
        text: formatInstant(sample.datetime),
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
  t: PdfTranslate,
): string | null {
  const point = sample.sampling_point;
  const depth = getSampleDepth(well, sample);
  const parts = [
    point?.type && resolveSamplingPointTypeLabel(point.type, t),
    point?.device &&
      `${field(t, 'device')}: ${resolveDeviceLabel(point.device, t)}`,
    depth?.kind === 'point' &&
      `${field(t, 'depth')}: ${fmt.formatLength(depth.depth)}`,
    depth?.kind === 'interval' &&
      `${field(t, 'interval')}: ${fmt.formatLength(depth.from)} – ${fmt.formatLength(depth.to)}`,
  ].filter((v): v is string => !!v);
  return parts.length
    ? `${field(t, 'samplingPoint')}: ${parts.join(' · ')}`
    : null;
}

/** Laboratory name, report number, receipt instant and temperature. */
function laboratoryLine(sample: WaterSample, t: PdfTranslate): string | null {
  const lab = sample.laboratory;
  if (!lab) return null;
  const parts = [
    lab.name,
    lab.report_number && `${field(t, 'reportNumber')}: ${lab.report_number}`,
    lab.received_at &&
      `${field(t, 'receivedAt')}: ${formatInstant(lab.received_at, lab.received_at_resolution)}`,
    lab.received_temperature != null &&
      `${field(t, 'receivedTemperature')}: ${formatNumber(lab.received_temperature, { maximumFractionDigits: 1, suffix: '°C' })}`,
  ].filter((v): v is string => !!v);
  return `${field(t, 'laboratory')}: ${parts.join(' · ')}`;
}

function flagsCell(r: WaterQualityResult, t: PdfTranslate): string {
  const validation = r.validation
    ? [
        resolveValidationStatusLabel(r.validation.status, t),
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
  t: PdfTranslate,
): Content {
  const exceeding = new Set(
    limitSet ? getExceedances(sample, limitSet).map(e => e.result_index) : [],
  );

  const body: TableCell[][] = [
    [
      headerCell(pdf(t, 'parameter')),
      headerCell(pdf(t, 'value'), true),
      headerCell(pdf(t, 'unit')),
      headerCell(pdf(t, 'fraction')),
      headerCell(pdf(t, 'measuredIn')),
      headerCell(pdf(t, 'method')),
      headerCell(`${pdf(t, 'flags')} / ${pdf(t, 'validation')}`),
    ],
  ];

  sample.results.forEach((r, index) => {
    const emphasis: Omit<ContentText, 'text'> = {
      fontSize: 8,
      ...(exceeding.has(index) ? { bold: true, color: EXCEEDANCE_COLOR } : {}),
      ...(isResultUsable(r) ? {} : { decoration: 'lineThrough' }),
    };
    const cell = (text: string, alignRight = false): ContentText => ({
      text,
      ...(alignRight ? { style: 'columnRight' } : {}),
      ...emphasis,
    });

    body.push([
      cell(resolveParameterLabel(r.parameter, t)),
      cell(valueText(r, t), true),
      cell(parameterUnitSymbol(r)),
      cell(r.fraction ? resolveFractionLabel(r.fraction, t) : ''),
      cell(r.measured_in ? resolveMeasuredInLabel(r.measured_in, t) : ''),
      cell(r.method ?? ''),
      cell(flagsCell(r, t)),
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
      text: `${pdf(t, 'limitSet')}: ${limitSet.name}   ·   ${pdf(t, 'exceedances')}: ${exceeding.size}`,
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
  t: PdfTranslate,
): Content[] {
  const lines = [
    samplingPointLine(sample, well, fmt, t),
    laboratoryLine(sample, t),
  ].filter((v): v is string => !!v);
  const blocks: Content[] = lines.map(text => ({
    text,
    fontSize: 9,
    margin: [0, 2, 0, 0],
  }));
  if (sample.notes) {
    blocks.push({ text: sample.notes, fontSize: 9, margin: [0, 2, 0, 0] });
  }
  blocks.push(buildResultsTable(sample, limitSet, t));
  return blocks;
}

/**
 * Builds the `water_samples` section (.well v2.3): one card per effective
 * (non-retracted) sample, oldest first, with the sampling point, laboratory
 * and a results table. When `options.waterQualityLimitSet` resolves to a
 * known limit set, exceeding results are highlighted and the set is named
 * under each table. Returns `null` when there are no effective samples. The
 * title is bound to the first card's header inside an `unbreakable` block.
 */
export function buildWaterSampleSection(
  well: Well,
  options: PdfExportOptions,
  t: PdfTranslate,
): Content | null {
  if (!well.water_samples?.length) return null;
  // Already chronological (datetime, then sequence, then file order).
  const samples = getEffectiveWaterSamples(well);
  if (!samples.length) return null;

  const fmt = createPdfFormatters(options);
  const limitSet = options.waterQualityLimitSet
    ? getLimitSet(options.waterQualityLimitSet)
    : undefined;
  const [first, ...rest] = samples;

  const items: Content[] = [
    {
      stack: [
        { text: ' ' },
        { text: pdf(t, 'title'), style: 'title' },
        buildHeader(first!, well, t),
      ],
      unbreakable: true,
    },
    ...buildBody(first!, well, fmt, limitSet, t),
  ];
  rest.forEach(sample => {
    items.push(buildEntryDivider());
    items.push({
      stack: [
        buildHeader(sample, well, t),
        ...buildBody(sample, well, fmt, limitSet, t),
      ],
    });
  });

  return { stack: items };
}
