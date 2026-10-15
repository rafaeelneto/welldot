import type { PumpInstallation, Well } from '@welldot/core';
import {
  CONSTRUCTION_MATERIALS,
  POWER_SOURCES,
  PUMP_TYPES,
} from '@welldot/core';
import { getCurrentPump } from '@welldot/utils';
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

function formatPeriod(p: PumpInstallation, dateFormat: string): string {
  const from = format(parseISO(p.installed_at), dateFormat);
  return p.removed_at
    ? `${from} → ${format(parseISO(p.removed_at), dateFormat)}`
    : from;
}

/** Equipment, crew, power and rating fields that have a value. */
function specFields(
  p: PumpInstallation,
  fmt: PdfFormatters,
  labels: PdfLabels,
): MetaField[] {
  const fields = labels.operation.pump.fields;
  const equipment = [p.manufacturer, p.model].filter(Boolean).join(' ');

  return [
    equipment && { label: fields.model, value: equipment },
    p.serial && { label: fields.serial, value: p.serial },
    p.installed_by && { label: fields.installedBy, value: p.installed_by },
    p.removed_at &&
      p.removed_by && { label: fields.removedBy, value: p.removed_by },
    p.power_source && {
      label: fields.powerSource,
      value: fmt.vocab(POWER_SOURCES, p.power_source),
    },
    p.intake_depth != null && {
      label: fields.intakeDepth,
      value: fmt.formatLength(p.intake_depth),
    },
    p.rated_flow_rate != null && {
      label: fields.ratedFlowRate,
      value: fmt.formatFlow(p.rated_flow_rate, 2),
    },
    p.rated_head != null && {
      label: fields.ratedHead,
      value: fmt.formatLength(p.rated_head),
    },
    p.rated_power != null && {
      label: fields.ratedPower,
      value: fmt.formatPower(p.rated_power),
    },
    p.riser_diameter != null && {
      label: fields.riserDiameter,
      value: fmt.formatDiameter(p.riser_diameter),
    },
    p.riser_material && {
      label: fields.riserMaterial,
      value: fmt.vocab(CONSTRUCTION_MATERIALS, p.riser_material),
    },
  ].filter((field): field is MetaField => !!field);
}

/** Notes and attachments, each on its own full-width row. */
function wideFields(p: PumpInstallation, labels: PdfLabels): MetaField[] {
  const attachments = p.attachments ?? [];
  return [
    p.notes && { label: labels.operation.pump.fields.notes, value: p.notes },
    attachments.length > 0 && {
      label: labels.operation.attachments,
      value: attachments.map(attachmentName).join('\n'),
    },
  ].filter((field): field is MetaField => !!field);
}

function buildBody(
  p: PumpInstallation,
  fmt: PdfFormatters,
  ctx: PdfContext,
): Content[] {
  const grid = buildFieldGrid(
    specFields(p, fmt, ctx.labels),
    ctx,
    wideFields(p, ctx.labels),
  );
  return grid ? [grid] : [];
}

/**
 * Builds the `pump_installations` listing (.well v2.3), most recent
 * installation first: a header (type, "current" marker, period) and a
 * label/value grid per installation. Returns `null` when there are none.
 */
export function buildPumpInstallationSection(
  well: Well,
  ctx: PdfContext,
): Content | null {
  const pumps = well.pump_installations;
  if (!pumps?.length) return null;

  const { labels } = ctx;
  const fmt = createPdfFormatters(ctx);
  const currentId = getCurrentPump(well)?.id;
  const sorted = [...pumps].sort(
    (a, b) =>
      new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime(),
  );

  return buildEntryListing(
    labels.operation.pump.title,
    sorted.map(p => ({
      header: buildEntryHeader(
        fmt.vocab(PUMP_TYPES, p.type),
        p.id === currentId ? labels.operation.pump.current : null,
        formatPeriod(p, ctx.dateFormats.date),
      ),
      body: buildBody(p, fmt, ctx),
    })),
    ctx,
  );
}
