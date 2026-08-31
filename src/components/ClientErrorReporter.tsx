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

    /* ── Stale-deployment self-heal ─────────────────────────────────────
       A tab left open across a deploy asks for chunks by their old hashed
       names on its next navigation, gets a ChunkLoadError, and is broken
       until the human thinks to refresh (Sentry 9530752e, 2026-08-31, a
       real visitor at midnight after a 12-deploy day). The honest fix is
       the refresh itself: reload ONCE so the browser picks up the current
       build. A sessionStorage guard (10-min window) stops a reload loop if
       the reload cannot cure it — e.g. an adblocker eating chunks — in
       which case the error reports as normal instead. */
    const CHUNK_RELOAD_KEY = 'jma:chunkReloadAt';
    const isChunkError = (msg: string | undefined | null) =>
      !!msg && (/ChunkLoadError/i.test(msg) || /Loading chunk .* failed/i.test(msg) || /Failed to load chunk/i.test(msg));
    const healChunkError = (): boolean => {
      try {
        const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        if (Date.now() - last < 10 * 60 * 1000) return false; // already tried
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      } catch {
        return false; // no storage (private mode edge cases): report, don't loop
      }
      window.location.reload();
      return true;
    };

    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.message) && healChunkError()) return;
      post({ message: e.message || 'window.onerror', stack: e.error?.stack });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'unhandledrejection';
      const stack = reason instanceof Error ? reason.stack : undefined;
      if (isChunkError(message) && healChunkError()) return;
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
