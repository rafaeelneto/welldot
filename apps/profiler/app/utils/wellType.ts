import { WELL_TYPES, getVocabEntry } from '@welldot/core';

/** Whether `value` is a `well_type` deprecated by the current spec revision. */
export function isDeprecatedWellType(value: string | undefined): boolean {
  return getVocabEntry(WELL_TYPES, value)?.deprecated === true;
}
