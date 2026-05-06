/**
 * Network-aware typed fetch wrapper for the JetMeAway native app.
 *
 * - Resolves with parsed JSON on 2xx
 * - Throws `APIError` on non-2xx with the parsed JSON body attached
 * - Throws a plain `new Error('Offline')` if NetInfo reports no connection
 *   at request time (so React Query / callers can fail-fast rather than
 *   waiting on the platform's TCP timeout)
 * - Includes the session cookie via `credentials: 'include'` so screens
 *   inherit the auth state set by either the WebView or native sign-in
 * - Aborts requests after the configurable timeout (default 15s)
 *
 * Usage:
 *   const data = await apiClient<{ flights: FlightOffer[] }>('/api/flights?...');
 *   const trip  = await apiClient<TripPayload>('/api/account/me');
 */

import NetInfo from '@react-native-community/netinfo';

const API_BASE = 'https://jetmeaway.co.uk';
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Custom error class thrown by `apiClient` for any non-2xx response.
 * Carries the HTTP status, the human-readable message (sourced from the
 * error JSON's `error` / `message` field where present), and the raw
 * parsed JSON body for callers that need detail.
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
    // Preserve the prototype chain across transpilation so
    // `err instanceof APIError` keeps working.
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export type ApiOptions = Omit<RequestInit, 'body'> & {
  /** Plain object → JSON.stringify'd before send. Leave unset for GET. */
  body?: unknown;
  /** Override the default 15s timeout. */
  timeoutMs?: number;
  /** Skip the NetInfo offline pre-check (useful for retry-from-cache flows). */
  skipNetCheck?: boolean;
};

/**
 * The single function every native screen / hook should use to talk to the
 * jetmeaway.co.uk backend. Keep all retry / dedupe / cache logic in the
 * React Query layer above — this stays a thin transport.
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, timeoutMs, skipNetCheck, headers, ...rest } = options;

  if (!skipNetCheck) {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) {
      throw new Error('Offline');
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    const init: RequestInit = {
      credentials: 'include',
      ...rest,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(headers as Record<string, string> | undefined),
      },
      signal: rest.signal ?? controller.signal,
    };

    if (body !== undefined && body !== null) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      let errorData: unknown = null;
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        errorData = await res.json();
        if (errorData && typeof errorData === 'object') {
          const e = errorData as { error?: unknown; message?: unknown };
          if (typeof e.error === 'string') errorMessage = e.error;
          else if (typeof e.message === 'string') errorMessage = e.message;
        }
      } catch {
        // Body wasn't JSON — keep the status-line message.
      }
      throw new APIError(res.status, errorMessage, errorData);
    }

    // 204 No Content → return null cast as T (callers treat null as "no payload").
    if (res.status === 204) return null as T;

    // Best-effort JSON parse. If the server returned 200 with no body
    // (rare), surface as null rather than throwing.
    const text = await res.text();
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new APIError(res.status, 'Server returned non-JSON body', text);
    }
  } finally {
    clearTimeout(timer);
  }
}
