import { parseWell, serializeWell, WellSchema, type Well } from '@welldot/core';
import { SIAGAS_PAGE_URL, siagasToWell, type RimasMode } from './convert';
import { SiagasError } from './errors';
import { parseSiagasPage } from './parse';
import { parseRimasPage, RIMAS_PAGE_URL, type RimasPage } from './rimas';
import { siagasWarning, type SiagasWarning } from './warnings';

/**
 * The SIAGAS code in a user input: the 10-digit code itself (spaces and
 * dots ignored) or a SIAGAS / RIMAS detail URL with `ponto=`.
 *
 * @returns The 10-digit code, or `null` when the input holds none.
 */
export function normalizeSiagasCode(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/[?&]ponto=(\d{10})(?!\d)/);
  if (fromUrl) return fromUrl[1];
  const digits = text.replace(/[\s.\-/]/g, '');
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** URL of the SIAGAS detail page of a well. */
export function siagasUrl(code: string): string {
  return `${SIAGAS_PAGE_URL}${code}`;
}

/** URL of the RIMAS page of a well (level series and media). */
export function rimasUrl(code: string): string {
  return `${RIMAS_PAGE_URL}${code}`;
}

export interface ImportSiagasOptions {
  /** `fetch` to use (default: the global one). */
  fetch?: typeof globalThis.fetch;
  /** RIMAS level series to import (default `monthly`). */
  rimas?: RimasMode;
  /** Import RIMAS photos and documents as attachments (default true). */
  media?: boolean;
  signal?: AbortSignal;
}

export interface SiagasImport {
  well: Well;
  /** The well serialized with `serializeWell` (the `.well` file content). */
  json: string;
  warnings: SiagasWarning[];
  source: { url: string; rimas_url?: string; fetched_at: string };
}

async function getText(
  url: string,
  fetchFn: typeof globalThis.fetch,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetchFn(url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new SiagasError('upstream', `Could not reach ${url}`, e);
  }
  if (!res.ok) {
    throw new SiagasError('upstream', `${url} answered HTTP ${res.status}`);
  }
  // The pages declare ISO-8859-1 but their data is UTF-8; only comments
  // hold Latin-1 bytes, which the non-fatal decoder replaces.
  return new TextDecoder('utf-8').decode(await res.arrayBuffer());
}

/** Reads the RIMAS page; a failure becomes a warning, not an error. */
async function getRimas(
  code: string,
  fetchFn: typeof globalThis.fetch,
  signal?: AbortSignal,
): Promise<RimasPage | Error> {
  try {
    return parseRimasPage(await getText(rimasUrl(code), fetchFn, signal));
  } catch (e) {
    if (signal?.aborted) throw e;
    return e instanceof Error ? e : new Error(String(e));
  }
}

/**
 * Imports a well from SIAGAS (and RIMAS): reads the SIAGAS detail page,
 * converts it with `siagasToWell`, validates the result against the `.well`
 * schema and serializes it. Needs network access to `sgb.gov.br`, which
 * sends no CORS headers: call it from a server, not from a browser.
 *
 * @param input A 10-digit SIAGAS code or a detail page URL.
 * @throws {SiagasError} `invalid_code`, `not_found`, `upstream`, `parse` or
 *   `conversion` (the converted well failed validation, a converter bug).
 *   An abort through `signal` rethrows the abort error.
 */
export async function importSiagasWell(
  input: string,
  options: ImportSiagasOptions = {},
): Promise<SiagasImport> {
  const code = normalizeSiagasCode(input);
  if (!code) {
    throw new SiagasError('invalid_code', `Not a SIAGAS code: ${input}`);
  }
  const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  const rimasMode = options.rimas ?? 'monthly';
  const wantRimas = rimasMode !== 'none' || options.media !== false;
  const url = siagasUrl(code);
  const fetchedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const [html, rimas] = await Promise.all([
    getText(url, fetchFn, options.signal),
    wantRimas ? getRimas(code, fetchFn, options.signal) : undefined,
  ]);

  let record;
  try {
    record = parseSiagasPage(html);
  } catch (e) {
    if (e instanceof SiagasError) throw e;
    throw new SiagasError('parse', 'Could not read the SIAGAS page', e);
  }

  const { well, warnings } = siagasToWell(record, {
    rimas: rimas instanceof Error ? undefined : rimas,
    rimasMode,
    media: options.media,
    fetchedAt,
  });
  if (rimas instanceof Error) {
    warnings.push(
      siagasWarning('rimas_unavailable', { reason: rimas.message }),
    );
  }

  const checked = WellSchema.safeParse(well);
  if (!checked.success) {
    throw new SiagasError(
      'conversion',
      'The converted well is not a valid .well',
      checked.error.issues,
    );
  }
  const json = serializeWell(well);
  try {
    parseWell(json);
  } catch (e) {
    throw new SiagasError(
      'conversion',
      'The .well file does not round-trip',
      e,
    );
  }

  return {
    well,
    json,
    warnings,
    source: {
      url,
      ...(wantRimas && { rimas_url: rimasUrl(code) }),
      fetched_at: fetchedAt,
    },
  };
}
