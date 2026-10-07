// Shared fixtures for the package's Vitest suites. Not exported from the barrel.
import type { Well } from '@welldot/core';
import { resolvePdfContext } from './context';
import type {
  PdfContext,
  PdfExportOptions,
  PdfTranslate,
} from './types/options.types';

/** Translate stub that echoes the key's last segment (`general.name` → `name`). */
export const lastSegmentT: PdfTranslate = key => key.split('.').pop()!;

/** Translate stub that echoes the full key. */
export const keyT: PdfTranslate = key => key;

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
 * `https://example.test`. Pass `t` to replace the label lookup with a stub.
 */
export function makeTestContext(
  options: PdfExportOptions = {},
  t?: PdfTranslate,
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
  return t ? { ...ctx, t } : ctx;
}
