/**
 * AirGateway NDC Client — Scaffold
 *
 * This is the thin client wrapper for AirGateway's NDC aggregated API.
 * All endpoints and auth details TBC after the discovery call
 * (AirGateway: API Discovery Call — Tue 15 Apr 2026, 13:15 UK).
 *
 * Connects JetMeAway to 35+ NDC carriers (BA, LH, AF, KL, IB, AA, UA,
 * EK, etc.) via a single unified endpoint. Sits alongside Duffel as a
 * secondary source — same pattern as hotels (LiteAPI + RateHawk).
 */

const AG_BASE = process.env.AIRGATEWAY_BASE_URL || 'https://api.airgateway.com';
const AG_KEY = process.env.AIRGATEWAY_API_KEY || '';

export type AGPassenger = {
  type: 'adult' | 'child' | 'infant';
  age?: number;
};

export type AGSearchParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: AGPassenger[];
  cabin?: 'economy' | 'premium_economy' | 'business' | 'first';
};

/**
 * Generic AirGateway fetch wrapper. Endpoint paths and auth scheme
 * to be confirmed during onboarding.
 */
export async function agFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!AG_KEY) {
    return { ok: false, status: 0, data: null, error: 'AIRGATEWAY_API_KEY not set' };
  }

  try {
    const res = await fetch(`${AG_BASE}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${AG_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      error: err instanceof Error ? err.message : 'Unknown AirGateway error',
    };
  }
}

/**
 * Placeholder search — to be wired up after discovery call.
 * Returns empty result set until AirGateway credentials are provisioned.
 */
export async function searchFlights(_params: AGSearchParams) {
  // TODO: Implement after AirGateway onboarding
  // Expected endpoint: POST /ndc/search or similar
  return { offers: [], source: 'airgateway', ready: false };
}
