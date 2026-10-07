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
