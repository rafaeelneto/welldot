import type { VocabEntry } from '@welldot/core';
import { getVocabLabel } from '@welldot/core';

/**
 * Select/combo options of a core recommended vocabulary, labeled in `locale`.
 * Deprecated entries are left out unless they are the `current` value, so a
 * legacy file still shows its value in the field.
 */
export function vocabOptions(
  vocab: readonly VocabEntry[],
  locale: string,
  current?: string,
): Array<{ value: string; label: string }> {
  return vocab
    .filter(entry => !entry.deprecated || entry.value === current)
    .map(entry => ({
      value: entry.value,
      label: getVocabLabel(vocab, entry.value, locale),
    }));
}

/** Comma-separated labels of a multi-valued field (e.g. `well_purpose`). */
export function formatVocabList(
  vocab: readonly VocabEntry[],
  values: readonly string[] | undefined,
  locale: string,
): string {
  return (values ?? []).map(v => getVocabLabel(vocab, v, locale)).join(', ');
}
