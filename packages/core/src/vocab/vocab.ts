import type { LanguageText } from '../types/language.types';
import { resolveLanguageText } from '../utils/language.utils';

/** One recommended value of an open (free-text) `.well` vocabulary. */
export type VocabEntry<V extends string = string> = {
  value: V;
  /** Display label; welldot vocabularies always provide `en` and `pt`. */
  label: LanguageText<'en' | 'pt'>;
  description?: LanguageText<'en' | 'pt'>;
  /** Still valid and resolvable, but never offered for new input. */
  deprecated?: true;
};

/**
 * A field that recommends the values `V` but accepts any string (free text or
 * an `x-` prefixed extension). The `string & {}` arm keeps editor
 * autocomplete for `V` — a plain `V | string` collapses to `string`.
 */
export type OpenVocab<V extends string> = V | (string & {});

/** The entry of `vocab` whose `value` is exactly `value`, if any. */
export function getVocabEntry<V extends string>(
  vocab: readonly VocabEntry<V>[],
  value: string | undefined,
): VocabEntry<V> | undefined {
  if (value === undefined) return undefined;
  return vocab.find(entry => entry.value === value);
}

/** Whether `value` is one of the recommended values of `vocab`. */
export function isVocabValue<V extends string>(
  vocab: readonly VocabEntry<V>[],
  value: string | undefined,
): value is V {
  return getVocabEntry(vocab, value) !== undefined;
}

/**
 * Display label of `value` in `locale`. Free-text and `x-` values have no
 * entry and are returned as-is.
 */
export function getVocabLabel(
  vocab: readonly VocabEntry[],
  value: string,
  locale: string,
): string {
  const entry = getVocabEntry(vocab, value);
  return entry ? resolveLanguageText(entry.label, locale) : value;
}

/**
 * Comma-separated labels of a multi-valued field (e.g. `well_purpose`) in
 * `locale`. Values with no entry are kept as-is.
 */
export function formatVocabList(
  vocab: readonly VocabEntry[],
  values: readonly string[] | undefined,
  locale: string,
): string {
  return (values ?? []).map(v => getVocabLabel(vocab, v, locale)).join(', ');
}

/** The recommended values of `vocab`, deprecated ones left out by default. */
export function vocabValues<V extends string>(
  vocab: readonly VocabEntry<V>[],
  { includeDeprecated = false }: { includeDeprecated?: boolean } = {},
): V[] {
  return vocab
    .filter(entry => includeDeprecated || !entry.deprecated)
    .map(entry => entry.value);
}
