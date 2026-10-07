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

export { formatVocabList } from '@welldot/core';
