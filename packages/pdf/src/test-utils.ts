// Shared fixtures for the package's Vitest suites. Not exported from the barrel.
import type { Well } from '@welldot/core';
import type { PdfLabelTree } from './configs/labels.configs';
import { PDF_LABELS } from './configs/labels.configs';
import { resolvePdfContext } from './context';
import type {
  PdfContext,
  PdfExportOptions,
  PdfLabels,
} from './types/options.types';

function echoLabels(mode: 'path' | 'lastSegment'): PdfLabels {
  const walk = (node: PdfLabelTree, path: string[]): unknown =>
    Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        const at = [...path, key];
        return typeof value.en === 'string'
          ? [key, mode === 'path' ? at.join('.') : key]
          : [key, walk(value as PdfLabelTree, at)];
      }),
    );
  return walk(PDF_LABELS as unknown as PdfLabelTree, []) as PdfLabels;
}

/** Labels whose text is their own path (`general.name` reads "general.name"). */
export const keyLabels = echoLabels('path');

/** Labels whose text is their last path segment (`general.name` reads "name"). */
export const lastSegmentLabels = echoLabels('lastSegment');

/** Minimal valid v2 well. */
export function baseWell(overrides: Partial<Well> = {}): Well {
  return {
    version: 2,
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    ...overrides,
  };
}

/**
 * Resolved context for tests: `breakPages: false`, metres/mm, `en`,
 * `https://example.test`. Pass `labels` (e.g. {@link keyLabels}) to replace
 * the document text.
 */
export function makeTestContext(
  options: PdfExportOptions = {},
  labels?: PdfLabels,
): PdfContext {
  const ctx = resolvePdfContext({
    title: 'Header',
    breakPages: false,
    scale: 500,
    metadataPosition: 'before',
    coordinateFormat: 'DD',
    locale: 'en',
    baseUrl: 'https://example.test',
    ...options,
    units: { length: 'm', diameter: 'mm', ...options.units },
  });
  return labels ? { ...ctx, labels } : ctx;
}

/**
 * Every `label \n value` cell under `node` (see `buildLabelValueTable`), as
 * `label → value`. Labels are trimmed; a repeated label keeps every value.
 */
export function collectFields(node: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const text = (n as { text?: unknown }).text;
    if (
      Array.isArray(text) &&
      text.length === 2 &&
      (text[0] as { style?: string }).style === 'metadataLabel' &&
      (text[1] as { style?: string }).style === 'metadataValue'
    ) {
      const label = String((text[0] as { text: string }).text).trim();
      (out[label] ??= []).push(String((text[1] as { text: string }).text));
    }
    Object.values(n).forEach(walk);
  };
  walk(node);
  return out;
}

/** Text of a table cell: a string, or the `text` of a cell object. */
export function cellText(cell: unknown): string {
  if (typeof cell === 'string') return cell;
  const text = (cell as { text?: unknown } | undefined)?.text;
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) return text.map(cellText).join('');
  return '';
}

/**
 * Bodies of every table under `node` whose header row starts with
 * `firstHeader`, as rows of cell texts from that header row on (a
 * `withTableTitle` title row above it is skipped).
 */
export function findTables(node: unknown, firstHeader: string): string[][][] {
  const out: string[][][] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const body = (n as { table?: { body?: unknown[][] } }).table?.body;
    const start =
      body?.slice(0, 2).findIndex(row => cellText(row[0]) === firstHeader) ??
      -1;
    if (start >= 0) {
      out.push(body!.slice(start).map(row => row.map(cellText)));
    }
    Object.values(n).forEach(walk);
  };
  walk(node);
  return out;
}
