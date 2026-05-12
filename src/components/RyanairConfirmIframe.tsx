'use client';

/**
 * RyanairConfirmIframe — embeds the Ryanair flight-confirmation page
 * required by their OTA/B2C distribution model.
 *
 * Required between CommitBooking (which returns the `x-session-token`)
 * and Payment. Customer must "Confirm flights" inside the iframe;
 * we receive a `REDIRECT` postMessage event with status=200 when
 * confirmation completes, then we fire Payment.
 *
 * Reference: docs.sandbox.gokyte.com — KH-Iframe-Ryanair.pdf.
 *
 * postMessage events we listen for (filter: data.type === 'RYANAIR_TELEMETRY'):
 *   - LOADED           — page rendered, includes bodyHeight + scrollHeight
 *   - SESSION_ERROR    — invalid/expired session, restart flow
 *   - REDIRECT,200     — flights confirmed, parent triggers Payment
 *   - REDIRECT,440     — session timeout, user clicked "New search"
 *   - TIMEOUT          — session expired silently
 *   - UNLOADED         — iframe closed / user cancelled
 *
 * Origin policy: only accepts events from the iframe's own host
 * (fr.sandbox.gokyte.com in sandbox; www.ryanair.com in production).
 */

import { useEffect, useRef, useState } from 'react';

export type RyanairTelemetryState =
  | 'LOADED'
  | 'SESSION_ERROR'
  | 'REDIRECT'
  | 'TIMEOUT'
  | 'UNLOADED';

export type RyanairTelemetryPayload = {
  session: string;
  state: RyanairTelemetryState;
  version?: string;
  status?: 200 | 440;
  error?: string;
  sessionTTL?: number;
  bodyHeight?: number;
  scrollHeight?: number;
};

type Props = {
  /** Session token from /api/flights/kyte/commit response. */
  sessionToken: string;
  /** Where Ryanair redirects after the user confirms / times out.
   *  Must be a URL we control. Defaults to the current page. */
  redirectUri?: string;
  /** Ryanair market code, e.g. 'gb/en', 'ie/en', 'fr/fr'. Default: 'gb/en'. */
  market?: string;
  /**
   * Sandbox uses 'KOTA'. Production partnerId is assigned by Ryanair
   * after certification — pass that in via prop.
   */
  partnerId?: string;
  /**
   * Iframe host. Defaults to sandbox. Set to
   * `https://www.ryanair.com` in production.
   */
  hostBase?: string;
  /** Fired on REDIRECT,200 — parent should trigger Payment. */
  onConfirmed?: (telemetry: RyanairTelemetryPayload) => void;
  /** Fired on SESSION_ERROR. */
  onSessionError?: (telemetry: RyanairTelemetryPayload) => void;
  /** Fired on TIMEOUT or REDIRECT,440. */
  onTimeout?: (telemetry: RyanairTelemetryPayload) => void;
  /** Fired on UNLOADED. */
  onClosed?: (telemetry: RyanairTelemetryPayload) => void;
};

export default function RyanairConfirmIframe({
  sessionToken,
  redirectUri,
  market = 'gb/en',
  partnerId = 'KOTA',
  hostBase = 'https://fr.sandbox.gokyte.com',
  onConfirmed,
  onSessionError,
  onTimeout,
  onClosed,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<
    'loading' | 'ready' | 'confirmed' | 'session_error' | 'timeout' | 'closed'
  >('loading');
  const [height, setHeight] = useState(620);
  const [lastError, setLastError] = useState<string | null>(null);

  const resolvedRedirectUri =
    redirectUri || (typeof window !== 'undefined' ? window.location.href : '');

  // Build the iframe URL. Params per the PDF spec (page 6-7):
  // partnerId, redirectUri, session.
  const iframeSrc = `${hostBase.replace(/\/+$/, '')}/${market}/flights-confirmation?partnerId=${encodeURIComponent(
    partnerId,
  )}&redirectUri=${encodeURIComponent(resolvedRedirectUri)}&session=${encodeURIComponent(sessionToken)}`;

  // Acceptable origin = the iframe's own host (no wildcards).
  const expectedOrigin = (() => {
    try {
      return new URL(hostBase).origin;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Origin gate — only honour messages from the iframe's host.
      if (expectedOrigin && event.origin !== expectedOrigin) return;
      const data = event.data;
      if (!data || data.type !== 'RYANAIR_TELEMETRY') return;
      const payload = data.payload as RyanairTelemetryPayload | undefined;
      if (!payload) return;

      switch (payload.state) {
        case 'LOADED': {
          setPhase('ready');
          if (payload.bodyHeight) setHeight(Math.max(400, payload.bodyHeight + 16));
          break;
        }
        case 'SESSION_ERROR': {
          setPhase('session_error');
          setLastError(payload.error || 'session invalid');
          onSessionError?.(payload);
          break;
        }
        case 'REDIRECT': {
          if (payload.status === 200) {
            setPhase('confirmed');
            onConfirmed?.(payload);
          } else if (payload.status === 440) {
            setPhase('timeout');
            onTimeout?.(payload);
          }
          break;
        }
        case 'TIMEOUT': {
          setPhase('timeout');
          onTimeout?.(payload);
          break;
        }
        case 'UNLOADED': {
          setPhase('closed');
          onClosed?.(payload);
          break;
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [expectedOrigin, onConfirmed, onSessionError, onTimeout, onClosed]);

  return (
    <div className="w-full max-w-[1028px] mx-auto">
      <div className="text-xs text-[#5C6378] mb-2 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#0066FF]"></span>
        Ryanair flight confirmation
        <span className="ml-auto">
          {phase === 'loading' && 'Loading…'}
          {phase === 'ready' && 'Confirm your flights below'}
          {phase === 'confirmed' && '✓ Flights confirmed — processing payment'}
          {phase === 'session_error' && `⚠ Session error${lastError ? `: ${lastError}` : ''}`}
          {phase === 'timeout' && '⏱ Session timed out — please retry'}
          {phase === 'closed' && '✕ Confirmation closed'}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Ryanair flight confirmation"
        style={{ width: '100%', height, border: '1px solid #E8ECF4', borderRadius: 12 }}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
      />
    </div>
  );
}
