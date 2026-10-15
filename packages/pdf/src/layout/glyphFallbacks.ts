import type { Content } from '../types/pdfmake.types';

/**
 * Characters the bundled fonts lack, mapped to ones they all have. Ion
 * charges reach the document through parameter labels (`HCO₃⁻`) and free
 * text (`SMEWW 4500-NO₃⁻ E`); unmapped, they print as a missing-glyph box.
 */
export const PDF_GLYPH_FALLBACKS: Readonly<Record<string, string>> = {
  '⁻': '−',
  '⁺': '+',
};

const FALLBACK_PATTERN = new RegExp(
  `[${Object.keys(PDF_GLYPH_FALLBACKS).join('')}]`,
  'g',
);

/** Keys whose string values are not document text. */
const OPAQUE_KEYS = new Set(['svg', 'image', 'qr', 'link', 'id']);

function replaceGlyphs(text: string): string {
  return text.replace(FALLBACK_PATTERN, c => PDF_GLYPH_FALLBACKS[c] ?? c);
}

function walk(node: unknown): unknown {
  if (typeof node === 'string') return replaceGlyphs(node);
  if (Array.isArray(node)) return node.map(walk);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      OPAQUE_KEYS.has(key) ? value : walk(value),
    ]),
  );
}

/**
 * Copy of `content` with every text string passed through
 * {@link PDF_GLYPH_FALLBACKS}. SVG markup, images, QR payloads, links and
 * node ids are left untouched. Builds fresh nodes, so canvas nodes are never
 * shared with the input.
 */
export function applyGlyphFallbacks(content: Content[]): Content[] {
  return walk(content) as Content[];
}
