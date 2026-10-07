import type { Well } from '@welldot/core';
import { WELL_PURPOSES, WELL_TYPES } from '@welldot/core';
import { format, parseISO } from 'date-fns';
import { createPdfFormatters } from '../formatters';
import { formatCoord } from '../helpers/coords';
import { calculatedWellDepth } from '../helpers/wellDepth';
import type { PdfContext } from '../types/options.types';
import type { ContentTable, TableCell } from '../types/pdfmake.types';

interface MetaField {
  label: string;
  value: string;
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
 * Builds the well-metadata table (name, type, driller, construction date,
 * coordinates, elevation, observations), omitting fields with no value and
 * returning `null` when none are populated.
 */
export function buildMetadataTable(
  well: Well,
  ctx: PdfContext,
): ContentTable | null {
  const { t } = ctx;
  const { formatLength, vocab, vocabList } = createPdfFormatters(ctx);

  const fields: MetaField[] = [];

  if (well.name) {
    fields.push({ label: t('general.name'), value: well.name });
  }
  if (well.well_type) {
    fields.push({
      label: t('general.wellType'),
      value: vocab(WELL_TYPES, well.well_type),
    });
  }
  if (well.well_purpose?.length) {
    fields.push({
      label: t('general.wellPurpose'),
      value: vocabList(WELL_PURPOSES, well.well_purpose),
    });
  }
  if (well.well_driller) {
    fields.push({
      label: t('general.driller'),
      value: well.well_driller,
    });
  }
  if (well.construction_date) {
    fields.push({
      label: t('general.constructionDate'),
      value: format(parseISO(well.construction_date), ctx.dateFormats.date),
    });
  }
  if (well.location?.lat != null && well.location?.lng != null) {
    fields.push({
      label: t('general.coordinates'),
      value: `${formatCoord(well.location.lat, ctx.coordinateFormat, true)}, ${formatCoord(well.location.lng, ctx.coordinateFormat, false)}`,
    });
  }
  if (well.location?.elevation != null) {
    fields.push({
      label: t('general.elevation'),
      value: formatLength(well.location.elevation),
    });
  }
  const calculatedDepth = calculatedWellDepth(well);
  if (well.well_depth != null || calculatedDepth > 0) {
    fields.push({
      label: t('general.wellDepth'),
      value: formatLength(well.well_depth ?? calculatedDepth),
    });
  }
  for (const entry of well.well_id ?? []) {
    if (!entry.id) continue;
    const label = entry.authority
      ? entry.primary
        ? `${entry.authority} (${t('general.wellIds.primary')})`
        : entry.authority
      : t('general.wellIds.id');
    fields.push({ label, value: entry.id });
  }
  const observations: MetaField | null = well.obs
    ? { label: t('general.observationsLabel'), value: well.obs }
    : null;

  if (fields.length === 0 && !observations) return null;

  const body = packLabelValueRows(fields, 3);
  // Always its own full-width row at the end, starting at the first column —
  // free-text notes read poorly squeezed into a single narrow column.
  if (observations) {
    body.push([labelValueCell(observations, 3), {}, {}]);
  }

  return {
    layout: 'noBorders',
    table: {
      widths: ['*', '*', '*'],
      dontBreakRows: false,
      body,
    },
  };
}
