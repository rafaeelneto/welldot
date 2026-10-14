import type { Meter, Well } from '@welldot/core';
import { METER_TYPES } from '@welldot/core';
import { getCurrentMeters } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters, type PdfFormatters } from '../formatters';
import {
  attachmentName,
  buildEntryHeader,
  buildEntryListing,
} from '../layout/tables';
import type { PdfContext, PdfLabels } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';
import { buildFieldGrid, type MetaField } from './metadataTable';

function formatPeriod(m: Meter, dateFormat: string): string {
  const from = format(parseISO(m.installed_at), dateFormat);
  return m.removed_at
    ? `${from} → ${format(parseISO(m.removed_at), dateFormat)}`
    : from;
}

/** Equipment, crew and register fields that have a value. */
function specFields(
  m: Meter,
  fmt: PdfFormatters,
  labels: PdfLabels,
): MetaField[] {
  const fields = labels.operation.meter.fields;
  const equipment = [m.manufacturer, m.model].filter(Boolean).join(' ');

  return [
    equipment && { label: fields.model, value: equipment },
    m.serial && { label: fields.serial, value: m.serial },
    m.installed_by && { label: fields.installedBy, value: m.installed_by },
    m.removed_at &&
      m.removed_by && { label: fields.removedBy, value: m.removed_by },
    m.nominal_diameter != null && {
      label: fields.nominalDiameter,
      value: fmt.formatDiameter(m.nominal_diameter),
    },
    m.max_reading != null && {
      label: fields.maxReading,
      value: fmt.formatVolume(m.max_reading, 0),
    },
  ].filter((field): field is MetaField => !!field);
}

/** Notes and attachments, each on its own full-width row. */
function wideFields(m: Meter, labels: PdfLabels): MetaField[] {
  const attachments = m.attachments ?? [];
  return [
    m.notes && { label: labels.operation.meter.fields.notes, value: m.notes },
    attachments.length > 0 && {
      label: labels.operation.attachments,
      value: attachments.map(attachmentName).join('\n'),
    },
  ].filter((field): field is MetaField => !!field);
}

function buildBody(m: Meter, fmt: PdfFormatters, ctx: PdfContext): Content[] {
  const grid = buildFieldGrid(
    specFields(m, fmt, ctx.labels),
    ctx,
    wideFields(m, ctx.labels),
  );
  return grid ? [grid] : [];
}

/**
 * Builds the `meters` listing (.well v2.3), most recent installation first:
 * a header (type, "current" marker, period) and a label/value grid per
 * meter. Returns `null` when there are none.
 */
export function buildMeterSection(well: Well, ctx: PdfContext): Content | null {
  const meters = well.meters;
  if (!meters?.length) return null;

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);
  const currentIds = new Set(getCurrentMeters(well).map(m => m.id));
  const sorted = [...meters].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  );

  return buildEntryListing(
    labels.operation.meter.title,
    sorted.map(m => ({
      header: buildEntryHeader(
        m.type
          ? fmt.vocab(METER_TYPES, m.type)
          : labels.operation.meter.untyped,
        currentIds.has(m.id) ? labels.operation.meter.current : null,
        formatPeriod(m, ctx.dateFormats.date),
      ),
      body: buildBody(m, fmt, ctx),
    })),
    ctx,
  );
}
