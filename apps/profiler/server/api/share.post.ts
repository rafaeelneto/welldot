import { deserializeWell, isWellEmpty, serializeWell } from '@welldot/core';
import type { RateLimiterBinding } from '../utils/rateLimit';

export default defineEventHandler(async event => {
  const rateLimiter = getRuntimeBinding<RateLimiterBinding>(
    event,
    'SHARE_RATE_LIMITER',
  );
  if (rateLimiter) {
    const clientIp = getHeader(event, 'cf-connecting-ip') ?? 'unknown';
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many share requests — please try again shortly.',
      });
    }
  }

  const body = await readBody<{ well?: unknown }>(event);

  let validated;
  try {
    validated = deserializeWell(JSON.stringify(body?.well ?? null));
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid well payload',
    });
  }
  if (!validated || isWellEmpty(validated)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid well payload',
    });
  }

  const canonical = serializeWell(validated);
  if (new TextEncoder().encode(canonical).byteLength > MAX_SHARE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Well profile is too large to share',
    });
  }

  const id = await hashWellJson(canonical);
  const supabase = getSupabaseClient(event);

  const { error: upsertError } = await supabase
    .from('well_shares')
    .upsert(
      { id, well_json: canonical },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (upsertError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to store share',
    });
  }

  const { data, error: selectError } = await supabase
    .from('well_shares')
    .select('expires_at')
    .eq('id', id)
    .single();
  if (selectError || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to store share',
    });
  }

  return { id, expiresAt: data.expires_at as string };
});
