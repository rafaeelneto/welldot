const IANA_SHAPE = /^[A-Za-z][A-Za-z0-9_+\-/]*$/;

/**
 * Whether `value` is an IANA time zone name (e.g. `America/Belem`, `UTC`).
 * UTC offsets (`-03:00`) and unknown names are not valid. Uses the built-in
 * `Intl`, so no time zone database is bundled.
 */
export function isIanaTimeZone(value: string): boolean {
  if (!IANA_SHAPE.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
