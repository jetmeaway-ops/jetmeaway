/**
 * Lightweight Sentry forwarder for Edge Runtime.
 *
 * The official @sentry/nextjs SDK is heavy (300kb+) and has rough edges on
 * Edge Runtime. We don't need stack traces, breadcrumbs, source maps, or
 * any of the SDK's UI plumbing — we just want exceptions and structured
 * events to land in Sentry's web UI so the bug inbox + Sentry are kept in
 * sync.
 *
 * This file talks to Sentry's HTTP envelope endpoint directly. Zero npm
 * deps, Edge-Runtime safe, fire-and-forget.
 *
 * Setup:
 *  1. Sign up at sentry.io (free for 5k events/month).
 *  2. Create a "Next.js" project. Copy the DSN.
 *  3. Add env var on Vercel: SENTRY_DSN=https://abc@oNNN.ingest.sentry.io/PROJECT_ID
 *  4. Done — every reportBug() call now also lands in Sentry.
 *
 * If SENTRY_DSN is unset (e.g. local dev) every call no-ops silently.
 */

interface SentryEvent {
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  message?: string;
  exception?: { values: Array<{ type: string; value: string }> };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
  release?: string;
  environment?: string;
}

/**
 * Parse a Sentry DSN into the pieces we need to authenticate.
 * Format: https://PUBLIC_KEY@HOST/PROJECT_ID
 */
function parseDsn(dsn: string): { host: string; projectId: string; publicKey: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '').split('/')[0];
    const publicKey = u.username;
    if (!projectId || !publicKey) return null;
    return { host: u.host, projectId, publicKey };
  } catch {
    return null;
  }
}

/**
 * Send an event to Sentry. Fire-and-forget — never awaited by callers.
 * Always wrapped in .catch so a Sentry outage cannot break a request.
 */
export function sentryCapture(event: SentryEvent): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parts = parseDsn(dsn);
  if (!parts) return;

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const ts = Date.now() / 1000;
  const fullEvent = {
    event_id: eventId,
    timestamp: ts,
    platform: 'javascript',
    level: event.level ?? 'error',
    server_name: 'jetmeaway-edge',
    environment:
      event.environment ?? (process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'),
    release: event.release ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    message: event.message ? { formatted: event.message } : undefined,
    exception: event.exception,
    tags: event.tags,
    extra: event.extra,
    user: event.user,
  };

  // NDJSON envelope: header line, item header line, item payload line.
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(fullEvent),
  ].join('\n');

  const url =
    `https://${parts.host}/api/${parts.projectId}/envelope/` +
    `?sentry_key=${parts.publicKey}&sentry_version=7`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
  }).catch(() => {
    /* swallow — Sentry forwarding is best-effort */
  });
}

/**
 * Convenience for try/catch blocks. Forwards both the exception type and
 * its message so Sentry can group identical errors together.
 */
export function sentryCaptureException(err: unknown, extra?: Record<string, unknown>): void {
  const e = err instanceof Error ? err : new Error(String(err));
  sentryCapture({
    level: 'error',
    exception: { values: [{ type: e.name || 'Error', value: e.message || String(e) }] },
    extra,
  });
}
