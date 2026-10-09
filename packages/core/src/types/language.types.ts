/**
 * Text keyed by BCP 47 language tag (e.g. `en`, `pt`, `pt-BR`). `L` lists
 * the tags that must be present; any other tag is optional. Resolve it with
 * `resolveLanguageText()` — never read a tag directly, a label may be missing.
 *
 * @example
 * const any: LanguageText = { es: 'Bomba' };
 * const both: LanguageText<'en' | 'pt'> = { en: 'Pump', pt: 'Bomba' };
 */
export type LanguageText<L extends string = never> = Record<L, string> &
  Partial<Record<string, string>>;

/**
 * Any shape a localized text may arrive in: a {@link LanguageText} object, a
 * plain locale-invariant string, that object serialized as JSON (e.g. read
 * from storage or a form field), or nothing.
 */
export type LanguageTextInput = LanguageText | string | null | undefined;
