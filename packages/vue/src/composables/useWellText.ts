import { resolveLanguageText, type LanguageTextInput } from '@welldot/core';
import { useWelldotConfig } from '../config';

/**
 * Returns a resolver for `LanguageTextInput` props against the configured
 * locale. Missing or empty text resolves to `undefined`, so callers can skip
 * rendering an omitted label with a plain `v-if`.
 *
 * Call it in `setup`; the returned function reads the locale on every call,
 * so it stays reactive when used in templates or computeds.
 */
export function useWellText(): (
  text?: LanguageTextInput,
) => string | undefined {
  const config = useWelldotConfig();
  return text => {
    if (text == null) return undefined;
    const resolved = resolveLanguageText(text, config.locale);
    return resolved === '' ? undefined : resolved;
  };
}
