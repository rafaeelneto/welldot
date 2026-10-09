import type { DiameterUnits, LengthUnits } from '@welldot/core';
import { resolveLanguageText } from '@welldot/core';
import { formatNumber } from '@welldot/utils';
import type { RenderLocalizedText } from '~/types/render.types';

const MM_TO_INCHES = 0.0393701;
const M_TO_FT = 3.28084;

/**
 * Formats a depth value in metres to the active length unit string, rounded
 * (never raw floating-point) and using the target locale's decimal separator.
 */
export function formatLength(
  m: number,
  units: LengthUnits,
  locale: 'en' | 'pt',
): string {
  return units === 'ft'
    ? formatNumber(m * M_TO_FT, { maximumFractionDigits: 1, locale })
    : formatNumber(m, { maximumFractionDigits: 2, locale });
}

/**
 * Formats a diameter value in millimetres to the active diameter unit
 * string, rounded (never raw floating-point) and using the target locale's
 * decimal separator.
 */
export function formatDiameter(
  mm: number,
  units: DiameterUnits,
  locale: 'en' | 'pt',
): string {
  return units === 'inches'
    ? formatNumber(mm * MM_TO_INCHES, { maximumFractionDigits: 2, locale })
    : formatNumber(mm, { maximumFractionDigits: 2, locale });
}

/** Returns the display label for the active length unit (e.g. `"m"` or `"ft"`). */
export function getLengthUnit(units: LengthUnits): string {
  return units === 'ft' ? 'ft' : 'm';
}

/**
 * Returns the display symbol for the active diameter unit. `mm` is
 * locale-invariant; `inches` is `'"'` unless `locale` is `'en'`, in which
 * case it's `'in.'`. Omitting `locale` preserves the historical `'"'` default.
 */
export function getDiameterUnit(
  units: DiameterUnits,
  locale?: 'en' | 'pt',
): string {
  if (units !== 'inches') return 'mm';
  return locale === 'en' ? 'in.' : '"';
}

/**
 * Resolves a render label to a plain string: core `resolveLanguageText()`
 * with `pt` as the fallback locale. A bare string is returned as-is
 * (locale-invariant).
 */
export function resolveRenderLabel(
  value: RenderLocalizedText,
  locale: 'en' | 'pt',
): string {
  return resolveLanguageText(value, locale, 'pt');
}
