export interface FormatNumberOptions {
  /** Fixed decimal precision — sets both min and max. Takes precedence over the pair below. */
  fractionDigits?: number;
  /** Minimum fraction digits (ignored if fractionDigits is set). */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (ignored if fractionDigits is set). */
  maximumFractionDigits?: number;
  /** String appended after the number, separated by a space (e.g. 'm', 'ft', 'm³'). */
  suffix?: string;
  /** BCP 47 locale string (e.g. 'en-US', 'pt-BR', or bare 'en'/'pt'). Defaults to 'en-US'. */
  locale?: string;
  /** Returned for null, undefined, or NaN inputs. Defaults to '—'. */
  fallback?: string;
}

/**
 * Formats a number for display with locale-aware decimal/grouping separators
 * and bounded fraction digits, so floating-point noise (e.g. `39.99998784`)
 * never reaches the UI unrounded.
 */
export function formatNumber(
  value: number | null | undefined,
  options?: FormatNumberOptions,
): string {
  const fallback = options?.fallback ?? '—';
  if (value === null || value === undefined || Number.isNaN(value))
    return fallback;

  const locale = options?.locale ?? 'en-US';
  const intlOpts: Intl.NumberFormatOptions = {};

  if (options?.fractionDigits !== undefined) {
    intlOpts.minimumFractionDigits = options.fractionDigits;
    intlOpts.maximumFractionDigits = options.fractionDigits;
  } else {
    if (options?.minimumFractionDigits !== undefined)
      intlOpts.minimumFractionDigits = options.minimumFractionDigits;
    if (options?.maximumFractionDigits !== undefined)
      intlOpts.maximumFractionDigits = options.maximumFractionDigits;
  }

  const formatted = new Intl.NumberFormat(locale, intlOpts).format(value);
  return options?.suffix ? `${formatted} ${options.suffix}` : formatted;
}
