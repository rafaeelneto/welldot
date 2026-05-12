/**
 * Factory for D3 key functions on interval features (`from`/`to`).
 * Format: `${type}:${from}:${to}:${i}` — type scopes the key,
 * coordinates provide semantic stability, index breaks ties for
 * features sharing identical depth positions.
 *
 * Accepts `unknown` datum so the returned function is compatible with
 * both typed and untyped D3 selections without extra casts at call sites.
 */
export const makeIntervalKey =
  (type: string) =>
  (d: unknown, i: number): string => {
    const { from, to } = d as { from: number; to: number };
    return `${type}:${from}:${to}:${i}`;
  };

/**
 * Factory for D3 key functions on point features (`depth`).
 * Format: `${type}:${depth}:${i}`.
 */
export const makePointKey =
  (type: string) =>
  (d: unknown, i: number): string => {
    const { depth } = d as { depth: number };
    return `${type}:${depth}:${i}`;
  };
