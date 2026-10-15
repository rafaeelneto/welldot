import type { RateLimiterBinding } from '../utils/rateLimit';

/**
 * Stores one product event from `trackEvent()` in `app_events`
 * (server/db/app_events.sql). Keeps the event name, its small params, the
 * country Cloudflare resolved and the host. No IP, cookie or user id is
 * stored. Unknown names and oversized params are rejected.
 */
export default defineEventHandler(async event => {
  const rateLimiter = getRuntimeBinding<RateLimiterBinding>(
    event,
    'EVENTS_RATE_LIMITER',
  );
  if (rateLimiter) {
    const clientIp = getHeader(event, 'cf-connecting-ip') ?? 'unknown';
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      throw createError({ statusCode: 429, statusMessage: 'Too many events' });
    }
  }

  const body = await readBody<{ name?: unknown; params?: unknown }>(
    event,
  ).catch(() => null);
  const params = parseAnalyticsParams(body?.params);
  if (!isAnalyticsEvent(body?.name) || !params) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid event' });
  }

  const { error } = await getSupabaseClient(event)
    .from('app_events')
    .insert({
      name: body.name,
      params,
      country: getHeader(event, 'cf-ipcountry') ?? null,
      host: getRequestHost(event),
    });

  if (error) {
    console.error('[events] insert failed:', error.message);
    throw createError({ statusCode: 500, statusMessage: 'Failed to store' });
  }

  setResponseStatus(event, 204);
  return null;
});
