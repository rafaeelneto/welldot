import { resolveLanguageText } from '@welldot/core';
import type { PdfLabelOverrides, PdfTranslate } from '../types/options.types';
import type { PdfLabelPack, PdfLabelTree } from './labels.configs';
import { PDF_LABELS } from './labels.configs';

/** {@link PdfLabelPack} with every leaf resolved to a string. */
export type ResolvedPdfLabels<T = PdfLabelPack> = {
  [K in keyof T]: T[K] extends { en: string; pt: string }
    ? string
    : ResolvedPdfLabels<T[K]>;
};

function isLeaf(value: unknown): value is { en: string; pt: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { en?: unknown }).en === 'string'
  );
}

function resolveTree(
  tree: PdfLabelTree,
  overrides: Record<string, unknown> | undefined,
  locale: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tree)) {
    const override = overrides?.[key];
    if (isLeaf(value)) {
      const source =
        override !== undefined && override !== null
          ? (override as string | Record<string, string>)
          : value;
      // Pass the default as `en`/`pt` so an override in another language
      // still falls back to the built-in text for missing tags.
      const merged =
        typeof source === 'string' ? source : { ...value, ...source };
      out[key] = resolveLanguageText(merged, locale, 'pt');
    } else {
      out[key] = resolveTree(
        value,
        override as Record<string, unknown> | undefined,
        locale,
      );
    }
  }
  return out;
}

/**
 * Resolves the label pack for `locale` (exact tag → base language → `pt`),
 * applying `overrides` leaf by leaf.
 *
 * @example
 * resolvePdfLabels('en', { general: { name: 'Well name' } }).general.name // 'Well name'
 */
export function resolvePdfLabels(
  locale: string,
  overrides?: PdfLabelOverrides,
): ResolvedPdfLabels {
  return resolveTree(
    PDF_LABELS as unknown as PdfLabelTree,
    overrides as Record<string, unknown> | undefined,
    locale,
  ) as ResolvedPdfLabels;
}

/** Dot-path lookup in resolved labels. Returns the key itself when it does not resolve to a string. */
export function createPdfTranslate(labels: ResolvedPdfLabels): PdfTranslate {
  return key => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object'
            ? (node as Record<string, unknown>)[part]
            : undefined,
        labels,
      );
    return typeof value === 'string' && value !== '' ? value : key;
  };
}
