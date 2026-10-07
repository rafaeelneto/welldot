import type { VocabEntry } from '@welldot/core';
import { getVocabLabel } from '@welldot/core';
import { formatVocabList, vocabOptions } from '~/utils/vocab';

/**
 * Labels and select options of the core recommended vocabularies in the
 * active locale. Free-text and `x-` values have no entry and show as-is.
 */
export function useVocab() {
  const { locale } = useI18n();

  return {
    vocabLabel: (vocab: readonly VocabEntry[], value: string) =>
      getVocabLabel(vocab, value, locale.value),
    vocabOptions: (vocab: readonly VocabEntry[], current?: string) =>
      vocabOptions(vocab, locale.value, current),
    vocabList: (vocab: readonly VocabEntry[], values?: readonly string[]) =>
      formatVocabList(vocab, values, locale.value),
  };
}
