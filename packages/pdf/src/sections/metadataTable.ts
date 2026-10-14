import type { Well } from '@welldot/core';
import { calculatedWellDepth, WELL_PURPOSES, WELL_TYPES } from '@welldot/core';
import { formatCoord } from '@welldot/utils';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters } from '../formatters';
import type { PdfContext } from '../types/options.types';
import type { ContentTable, TableCell } from '../types/pdfmake.types';

/** One `label \n value` cell of a label/value grid. */
export interface MetaField {
  label: string;
  value: string;
}

/** Narrowest content width (pt) that still takes a wide label/value grid. */
export const WIDE_FIELD_GRID_MIN_WIDTH = 420;

/** Label/value columns of a field grid at `ctx.page.contentWidth`: 4, or 2 when narrow. */
export function fieldGridColumns(ctx: Pick<PdfContext, 'page'>): number {
  return ctx.page.contentWidth < WIDE_FIELD_GRID_MIN_WIDTH ? 2 : 4;
}

function labelValueCell(field: MetaField, colSpan?: number): TableCell {
  return {
    width: '*',
    text: [
      { text: `${field.label} \n`, style: 'metadataLabel' },
      { text: field.value, style: 'metadataValue' },
    ],
    ...(colSpan ? { colSpan } : {}),
  };
}

/** Packs `label \n value` cells `columns`-per-row, padding the last row with blanks. */
export function packLabelValueRows(
  fields: MetaField[],
  columns: number,
): TableCell[][] {
  const cells: TableCell[] = fields.map(field => labelValueCell(field));

  const rows: TableCell[][] = [];
  cells.forEach((cell, i) => {
    if (i % columns === 0) rows.push([cell]);
    else rows[rows.length - 1]!.push(cell);
  });

  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    while (lastRow.length < columns) lastRow.push({ width: '*', text: '' });
  }
  return rows;
}

/**
 * Label/value grid in the general-info style: `fields` packed `columns` per
 * row, then each `wide` field (notes, attachments…) on its own full-width
 * row. Returns `null` when both lists are empty.
 */
export function buildLabelValueTable(
  fields: MetaField[],
  columns: number,
  wide: MetaField[] = [],
): ContentTable | null {
  if (fields.length === 0 && wide.length === 0) return null;

  const body = packLabelValueRows(fields, columns);
  // Free text reads poorly squeezed into a single narrow column.
  for (const field of wide) {
    body.push([
      labelValueCell(field, columns),
      ...Array.from({ length: columns - 1 }, () => ({})),
    ]);
  }
  return {
    layout: 'noBorders',
    table: {
      widths: Array<'*'>(columns).fill('*'),
      dontBreakRows: false,
      body,
    },
  };
}

/**
 * {@link buildLabelValueTable} sized to `ctx.page.contentWidth` (see
 * {@link fieldGridColumns}), with a small top margin to sit under an entry
 * header. Used by the per-entry cards (pumps, meters, permits, samples).
 */
export function buildFieldGrid(
  fields: MetaField[],
  ctx: Pick<PdfContext, 'page'>,
  wide: MetaField[] = [],
): ContentTable | null {
  const table = buildLabelValueTable(fields, fieldGridColumns(ctx), wide);
  return table ? { ...table, margin: [0, 2, 0, 0] } : null;
}

/**
 * Builds the well-metadata table (name, type, driller, construction date,
 * coordinates, elevation, observations) in `columns` label/value columns
 * (default 3), omitting fields with no value and returning `null` when none
 * are populated.
 */
export function buildMetadataTable(
  well: Well,
  ctx: PdfContext,
  columns = 3,
): ContentTable | null {
  const { labels } = ctx;
  const { formatLength, vocab, vocabList } = createPdfFormatters(ctx);

  const fields: MetaField[] = [];

  if (well.name) {
    fields.push({ label: labels.general.name, value: well.name });
  }
  if (well.well_type) {
    fields.push({
      label: labels.general.wellType,
      value: vocab(WELL_TYPES, well.well_type),
    });
  }
  if (well.well_purpose?.length) {
    fields.push({
      label: labels.general.wellPurpose,
      value: vocabList(WELL_PURPOSES, well.well_purpose),
    });
  }
  if (well.well_driller) {
    fields.push({
      label: labels.general.driller,
      value: well.well_driller,
    });
  }
  if (well.construction_date) {
    fields.push({
      label: labels.general.constructionDate,
      value: format(parseISO(well.construction_date), ctx.dateFormats.date),
    });
  }
  if (well.location?.lat != null && well.location?.lng != null) {
    fields.push({
      label: labels.general.coordinates,
      value: `${formatCoord(well.location.lat, ctx.coordinateFormat, true)}, ${formatCoord(well.location.lng, ctx.coordinateFormat, false)}`,
    });
  }
  if (well.location?.elevation != null) {
    fields.push({
      label: labels.general.elevation,
      value: formatLength(well.location.elevation),
    });
  }
  const calculatedDepth = calculatedWellDepth(well);
  if (well.well_depth != null || calculatedDepth > 0) {
    fields.push({
      label: labels.general.wellDepth,
      value: formatLength(well.well_depth ?? calculatedDepth),
    });
  }
  for (const entry of well.well_id ?? []) {
    if (!entry.id) continue;
    const label = entry.authority
      ? entry.primary
        ? `${entry.authority} (${labels.general.wellIds.primary})`
        : entry.authority
      : labels.general.wellIds.id;
    fields.push({ label, value: entry.id });
  }
  const observations: MetaField | null = well.obs
    ? { label: labels.general.observationsLabel, value: well.obs }
    : null;

  return buildLabelValueTable(
    fields,
    columns,
    observations ? [observations] : [],
  );
}
