/** The `.well` format version written by this library (`"M.m"`). */
export const WELL_FORMAT_VERSION = '2.4' as const;

/** A parsed `.well` format version. `minor` is `undefined` for the integer forms (`1`, `2`). */
export type FormatVersion = { major: number; minor: number | undefined };

const VERSION_PATTERN = /^(\d+)\.(\d+)$/;

/**
 * Parses a `.well` `version` value: a non-negative integer (`2`) or an `"M.m"`
 * string (`"2.4"`). Returns `undefined` for anything else (`2.4`, `"2.4.1"`,
 * `"v2.4"`, `"2"`, negatives, non-numbers).
 */
export function parseFormatVersion(value: unknown): FormatVersion | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0
      ? { major: value, minor: undefined }
      : undefined;
  }
  if (typeof value === 'string') {
    const match = VERSION_PATTERN.exec(value);
    if (match) return { major: Number(match[1]), minor: Number(match[2]) };
  }
  return undefined;
}

/**
 * Compares two `"M.m"` versions as two integers (`"2.10"` > `"2.9"`).
 * Returns a negative, zero or positive number.
 * @throws {Error} If either value is not a valid `"M.m"` string.
 */
export function compareFormatVersions(a: string, b: string): number {
  const pa = parseFormatVersion(a);
  const pb = parseFormatVersion(b);
  if (
    !pa ||
    pb === undefined ||
    pa.minor === undefined ||
    pb.minor === undefined
  ) {
    throw new Error(
      `Malformed .well format version: ${JSON.stringify(pa?.minor === undefined ? a : b)}`,
    );
  }
  return pa.major - pb.major || pa.minor - pb.minor;
}
