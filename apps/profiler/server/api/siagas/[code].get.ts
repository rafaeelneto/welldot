import {
  importSiagasWell,
  normalizeSiagasCode,
  SiagasError,
  type RimasMode,
  type SiagasErrorKind,
} from '@welldot/utils/siagas';
import type { RateLimiterBinding } from '../../utils/rateLimit';

const RIMAS_MODES: RimasMode[] = ['none', 'monthly', 'all'];

/** SIAGAS records rarely change; a day of edge cache spares the SGB server. */
const EDGE_CACHE_SECONDS = 86_400;
const UPSTREAM_TIMEOUT_MS = 20_000;

const STATUS: Record<SiagasErrorKind, number> = {
  invalid_code: 400,
  not_found: 404,
  upstream: 502,
  parse: 502,
  conversion: 500,
};

/**
 * Imports a well from SIAGAS (and RIMAS) by its code and returns the
 * `.well` JSON with the importer's warnings. The SGB pages send no CORS
 * headers, so the browser cannot read them directly.
 *
 * Query: `rimas` = `none` | `monthly` (default) | `all`; `media` = `0` to
 * skip the RIMAS photos and documents.
 */
export default defineEventHandler(async event => {
  const code = normalizeSiagasCode(getRouterParam(event, 'code') ?? '');
  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid SIAGAS code',
    });
  }
  const query = getQuery(event);
  const rimas = RIMAS_MODES.includes(query.rimas as RimasMode)
    ? (query.rimas as RimasMode)
    : 'monthly';
  const media = query.media !== '0';

  const cache = await globalThis.caches?.open('siagas-imports');
  const cacheKey = new Request(
    `https://siagas-cache.internal/${code}?rimas=${rimas}&media=${media ? 1 : 0}`,
  );
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  const rateLimiter = getRuntimeBinding<RateLimiterBinding>(
    event,
    'SIAGAS_RATE_LIMITER',
  );
  if (rateLimiter) {
    const clientIp = getHeader(event, 'cf-connecting-ip') ?? 'unknown';
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many SIAGAS imports — please try again shortly.',
      });
    }
  }

  let result;
  try {
    result = await importSiagasWell(code, {
      rimas,
      media,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof SiagasError) {
      if (e.kind === 'conversion')
        console.error('SIAGAS conversion', code, e.details);
      throw createError({
        statusCode: STATUS[e.kind],
        statusMessage: e.message,
      });
    }
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw createError({
        statusCode: 504,
        statusMessage: 'SIAGAS did not answer in time',
      });
    }
    throw e;
  }

  const response = new Response(
    JSON.stringify({
      json: result.json,
      warnings: result.warnings,
      source: result.source,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=3600, s-maxage=${EDGE_CACHE_SECONDS}`,
      },
    },
  );
  if (cache) event.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});
