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
  (d: unknown, _i: number): string => {
    const { id, from, to } = d as {
      id?: string | number;
      from: number;
      to: number;
    };
    return id ? `${id}` : `${type}:${from}:${to}`;
  };

/**
 * Factory for D3 key functions on point features (`depth`).
 * Format: `${type}:${depth}:${i}`.
 */
export const makePointKey =
  (type: string) =>
  (d: unknown, i: number): string => {
    const { id, depth } = d as { id?: string | number; depth: number };
    return id ? `${id}` : `${type}:${depth}:${i}`;
  };
