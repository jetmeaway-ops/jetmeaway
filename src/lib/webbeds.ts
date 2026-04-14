/**
 * WebBeds Hotel API Client — Scaffold
 *
 * Thin wrapper for WebBeds' direct hotel API.
 * 500,000+ hotels in 38,000 destinations worldwide.
 *
 * Contact: Anthony Potts (anthony.potts@webbeds.com)
 * Meeting: Wed 16 Apr 2026, 11:00 UK
 *
 * Payment model: credit card at booking creation — JetMeAway's card
 * is charged the net rate; we collect retail from the customer.
 * Sits alongside LiteAPI as a secondary hotel supply source.
 */

const WB_BASE = process.env.WEBBEDS_BASE_URL || 'https://api.webbeds.com';
const WB_USER = process.env.WEBBEDS_USERNAME || '';
const WB_PASS = process.env.WEBBEDS_PASSWORD || '';
const WB_CLIENT_ID = process.env.WEBBEDS_CLIENT_ID || '';

export type WBGuest = {
  adults: number;
  children?: number[]; // ages
};

export type WBSearchParams = {
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  rooms: WBGuest[];
  nationality?: string; // ISO 2-letter
  currency?: string;    // ISO 3-letter, default GBP
};

/**
 * Generic WebBeds fetch wrapper. Auth scheme (basic vs token) and exact
 * endpoint paths to be confirmed after the onboarding form is submitted
 * and credentials issued.
 */
export async function wbFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!WB_USER || !WB_PASS) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'WebBeds credentials not set',
    };
  }

  try {
    const auth = btoa(`${WB_USER}:${WB_PASS}`);
    const res = await fetch(`${WB_BASE}${path}`, {
      ...init,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(WB_CLIENT_ID ? { 'X-Client-Id': WB_CLIENT_ID } : {}),
        ...(init?.headers || {}),
      },
    });

    const data = res.ok ? ((await res.json()) as T) : null;
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown WebBeds error',
    };
  }
}

/**
 * Placeholder availability search — returns empty until credentials
 * are provisioned post-onboarding.
 */
export async function searchAvailability(_params: WBSearchParams) {
  // TODO: Implement after WebBeds onboarding
  // Expected endpoint: POST /hotels/availability or similar
  return { hotels: [], source: 'webbeds', ready: false };
}
