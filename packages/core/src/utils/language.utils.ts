import type { LanguageText, LanguageTextInput } from '../types/language.types';

/**
 * The {@link LanguageText} encoded in a JSON object string, keeping only its
 * non-empty string entries (possibly none). `undefined` when `value` is not a
 * JSON object.
 */
function parseLanguageTextJson(value: string): LanguageText | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const entries = Object.entries(parsed).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim() !== '',
  );
  return Object.fromEntries(entries);
}

/**
 * Resolves `text` to a single string for `locale`: exact tag, then its base
 * language (`pt-BR` → `pt`), then `fallback`, then the first available value.
 * Empty labels count as missing.
 *
 * - A plain string is locale-invariant and returned as-is.
 * - A JSON object string (`'{"en":"Pump","pt":"Bomba"}'`) is parsed and
 *   resolved like the object; malformed JSON is treated as a plain string.
 * - `null` / `undefined`, and objects (or JSON objects) with no usable label,
 *   resolve to `''`.
 */
export function resolveLanguageText(
  text: LanguageTextInput,
  locale: string,
  fallback = 'en',
): string {
  if (text == null) return '';
  const labels = typeof text === 'string' ? parseLanguageTextJson(text) : text;
  if (labels === undefined) return text as string;

  const base = locale.split('-')[0]!;
  const usable = (key: string) => {
    const value = labels[key];
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  };
  return (
    usable(locale) ??
    usable(base) ??
    usable(fallback) ??
    Object.keys(labels)
      .map(usable)
      .find(v => v !== undefined) ??
    ''
  );
}
