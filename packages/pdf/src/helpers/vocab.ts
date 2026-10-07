import type { VocabEntry } from '@welldot/core';
import { getVocabLabel } from '@welldot/core';

/** Comma-separated labels of a multi-valued field (e.g. `well_purpose`). */
export function formatVocabList(
  vocab: readonly VocabEntry[],
  values: readonly string[] | undefined,
  locale: string,
): string {
  return (values ?? []).map(v => getVocabLabel(vocab, v, locale)).join(', ');
}
