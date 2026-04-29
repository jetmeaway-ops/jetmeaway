/**
 * Server-side bug reporter — fires a fire-and-forget POST to
 * /api/bug-monitor whenever a critical route catches an unexpected
 * error. The endpoint runs Claude analysis + emails waqar@jetmeaway.co.uk
 * with a 2-sentence summary so the owner gets a heads-up about prod
 * issues without having to dig through Vercel logs.
 *
 * Usage in a catch block:
 *
 *   try { ... } catch (err) {
 *     reportBug('hotel search failed', { city, error: String(err) });
 *     // ... existing error handling
 *   }
 *
 * Fire-and-forget by design — never await it. The bug-monitor path
 * involves Claude + Resend calls (1-3s) and we don't want to slow
 * down the user-facing error response.
 *
 * Requires env vars (already in Vercel):
 *  - BUG_MONITOR_SECRET — shared secret matching the route's auth gate
 *  - NEXT_PUBLIC_SITE_URL OR VERCEL_URL — base URL to POST to
 *
 * If env vars are missing the call no-ops silently (we don't want bug
 * reporting itself to throw and break the calling route).
 */

interface ReportContext {
  [key: string]: unknown;
}

/**
 * Fire a bug report. Returns immediately — the actual POST happens
 * in the background.
 */
export function reportBug(message: string, context?: ReportContext): void {
  // Skip in dev / when secret is unset. Prod ALWAYS has BUG_MONITOR_SECRET
  // configured (per the env-var checklist).
  const secret = process.env.BUG_MONITOR_SECRET;
  if (!secret) return;

  // Build absolute URL — internal fetches on Vercel Edge need it.
  // VERCEL_URL is set by Vercel automatically (e.g. "jetmeaway-abc.vercel.app").
  // NEXT_PUBLIC_SITE_URL is our own override for production custom domain.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://jetmeaway.co.uk';

  const payload = [
    {
      level: 'error',
      message,
      context: context ?? {},
      ts: new Date().toISOString(),
    },
  ];

  // Fire and forget. We .catch to swallow any error so an unreachable
  // bug-monitor doesn't mess up the caller's error path.
  fetch(`${base}/api/bug-monitor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bug-monitor-secret': secret,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* swallow — bug reporting is best-effort */
  });
}
