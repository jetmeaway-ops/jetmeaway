'use client';

import { useEffect } from 'react';

/**
 * Mounts global handlers for window.onerror + unhandledrejection and
 * forwards each event to /api/client-error → reportBug → Sentry. Two
 * layers of de-dupe live downstream; this component is fire-and-forget.
 *
 * Why a custom component instead of @sentry/nextjs:
 *  - Zero npm bytes shipped to the user (the full SDK is ~80kb gzipped)
 *  - Edge-Runtime safe end to end
 *  - Plays nicely with the existing bug inbox / Resend pipeline
 *
 * Caveats vs the official SDK:
 *  - No source maps in Sentry (we'd need to upload them on build).
 *  - No breadcrumbs (no replay of the user's actions before the error).
 *  - No performance traces.
 * For our scale (small user base, narrow funnel) the message + stack
 * trace is enough to triage — and it costs nothing to add the official
 * SDK later if we outgrow this.
 */
// Matches the ChunkLoadError / dynamic-import failures that fire when a
// browser tab held open across a new Vercel deploy tries to fetch a JS/CSS
// chunk from a deployment that's been superseded — the chunk URL is
// versioned by dpl_ id and no longer resolves. Not a logic bug; the fix is
// to get the tab onto the new deployment's assets via a single reload.
const CHUNK_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk [\w.-]+ failed|Failed to load chunk|Importing a module script failed|error loading dynamically imported module/i;

const CHUNK_RELOAD_KEY = 'jma-chunk-reload';

/**
 * If `message` looks like a stale-chunk error, reload once to pick up the
 * new deployment's assets. Guarded by sessionStorage so a genuinely broken
 * deployment (reload doesn't fix it) falls through to normal reporting
 * instead of reload-looping the tab.
 *
 * Returns true if a reload was triggered (caller should skip reporting).
 */
function recoverFromChunkError(message: string): boolean {
  if (!CHUNK_ERROR_PATTERN.test(message)) return false;
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    // Private-browsing / storage disabled — fall through to reporting.
    return false;
  }
}

export default function ClientErrorReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cheap fingerprint dedupe so a buggy useEffect that fires on every
    // render doesn't flood the inbox. Memory-only; clears on hard reload.
    const seen = new Set<string>();
    const recent: number[] = [];
    const RATE_LIMIT_PER_MIN = 10;

    const post = (payload: { message: string; stack?: string }) => {
      const key = (payload.message + (payload.stack?.slice(0, 200) || '')).slice(0, 400);
      if (seen.has(key)) return;
      seen.add(key);

      // Rate-limit to 10 events/min to protect the inbox under
      // catastrophic JS bugs (infinite render loops etc).
      const now = Date.now();
      while (recent.length && now - recent[0] > 60_000) recent.shift();
      if (recent.length >= RATE_LIMIT_PER_MIN) return;
      recent.push(now);

      const body = JSON.stringify({
        message: payload.message,
        stack: payload.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      // sendBeacon is preferred — survives page unload.
      try {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon?.('/api/client-error', blob)) return;
      } catch {
        /* fall through to fetch */
      }
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
    };

    const onError = (e: ErrorEvent) => {
      const message = e.message || 'window.onerror';
      if (recoverFromChunkError(message)) return;
      post({ message, stack: e.error?.stack });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'unhandledrejection';
      if (recoverFromChunkError(message)) return;
      const stack = reason instanceof Error ? reason.stack : undefined;
      post({ message: `[unhandledrejection] ${message}`, stack });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
