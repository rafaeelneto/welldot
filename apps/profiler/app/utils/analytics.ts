/**
 * Records a product event (`ANALYTICS_EVENTS`, shared/utils/analytics.ts) by
 * posting it to `/api/events`, which stores it in database. First party: no
 * cookies, no identifiers, no third-party script. Fire and forget; no-op on
 * the server, console-only in dev.
 */
export function trackEvent(
  name: AnalyticsEvent,
  params?: AnalyticsParams,
): void {
  if (import.meta.server) return;
  if (import.meta.dev) {
    console.debug('[analytics]', name, params ?? {});
    return;
  }
  const body = JSON.stringify({ name, params });
  try {
    // A beacon survives the page unloading right after the action (a download).
    const sent = navigator.sendBeacon?.(
      '/api/events',
      new Blob([body], { type: 'application/json' }),
    );
    if (sent) return;
  } catch {
    // Fall through to fetch.
  }
  fetch('/api/events', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => {});
}
