/**
 * Duffel client — shared helpers.
 *
 * After April 2026 we moved off Duffel's internal Stripe (blocked by
 * Stripe Connect onboarding issues) to the balance-payment model:
 * we charge the customer via OUR Stripe, then call Duffel with
 * payments: [{ type: 'balance' }] to issue the ticket from our
 * pre-funded Duffel balance.
 */

const DUFFEL_KEY =
  process.env.DUFFEL_TEST_TOKEN ||
  process.env.DUFFEL_ACCESS_TOKEN ||
  process.env.DUFFEL_API_KEY ||
  '';

const DUFFEL_BASE = 'https://api.duffel.com';

/**
 * Duffel API version — single source of truth for the `Duffel-Version`
 * header. Every call-site in the codebase (lib/duffel.ts + all /api routes
 * that hit Duffel directly) reads from this constant, which itself reads
 * from the DUFFEL_API_VERSION env var. Defaults to v2 (what we currently
 * run on). To roll forward to v3, set DUFFEL_API_VERSION=v3 in Vercel and
 * redeploy — no code changes required.
 */
export const DUFFEL_VERSION: string =
  process.env.DUFFEL_API_VERSION || 'v2';

export type DuffelBalance = {
  available: number;
  currency: string;
  raw: string;
};

/**
 * GET /airlines/balances — returns the current prepaid balance.
 * Used both by admin dashboard widget and by the pre-flight balance
 * check before showing the "Pay" button to the customer.
 */
export async function getBalance(): Promise<DuffelBalance | null> {
  if (!DUFFEL_KEY) return null;

  try {
    const res = await fetch(`${DUFFEL_BASE}/airlines/balances`, {
      headers: {
        Authorization: `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': DUFFEL_VERSION,
        Accept: 'application/json',
      },
      // Never cache — balance changes with every ticket issued
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Duffel balance fetch failed', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const raw = json.data?.available_balance || json.data?.balance || '0';
    return {
      available: parseFloat(raw),
      currency: json.data?.currency || 'GBP',
      raw: String(raw),
    };
  } catch (err) {
    console.error('Duffel balance error', err);
    return null;
  }
}

/**
 * Re-fetch the offer to detect price drift between search → checkout.
 * Returns the current total in GBP (as a number).
 */
export async function refreshOfferTotal(offerId: string): Promise<{
  total: number;
  currency: string;
} | null> {
  if (!DUFFEL_KEY) return null;

  try {
    const res = await fetch(`${DUFFEL_BASE}/air/offers/${offerId}`, {
      headers: {
        Authorization: `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': DUFFEL_VERSION,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const offer = json.data;
    return {
      total: parseFloat(offer.total_amount || '0'),
      currency: offer.total_currency || 'GBP',
    };
  } catch (err) {
    console.error('Duffel offer refresh error', err);
    return null;
  }
}

/**
 * Re-fetch the offer with available_services inlined, for stale-ID checks
 * and ancillary repricing on the server side before order creation.
 */
export async function refreshOfferWithServices(offerId: string): Promise<{
  total: number;
  currency: string;
  availableServiceIds: Set<string>;
  servicePrices: Record<string, { amount: number; currency: string }>;
} | null> {
  if (!DUFFEL_KEY) return null;
  try {
    const res = await fetch(
      `${DUFFEL_BASE}/air/offers/${offerId}?return_available_services=true`,
      {
        headers: {
          Authorization: `Bearer ${DUFFEL_KEY}`,
          'Duffel-Version': DUFFEL_VERSION,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const offer = json.data;
    const svcArr: any[] = offer.available_services || [];
    const ids = new Set<string>(svcArr.map((s) => String(s.id)));
    const prices: Record<string, { amount: number; currency: string }> = {};
    for (const s of svcArr) {
      prices[String(s.id)] = {
        amount: parseFloat(s.total_amount || '0'),
        currency: s.total_currency || offer.total_currency || 'GBP',
      };
    }
    return {
      total: parseFloat(offer.total_amount || '0'),
      currency: offer.total_currency || 'GBP',
      availableServiceIds: ids,
      servicePrices: prices,
    };
  } catch (err) {
    console.error('Duffel refresh with services error', err);
    return null;
  }
}

/**
 * Create a Duffel order using the balance payment model.
 * Caller is responsible for ensuring Stripe payment succeeded first.
 *
 * `services` is optional (Phase 2a): each entry is `{ id, quantity }` referencing
 * an `available_services[].id` from the offer. Duffel sums their price into
 * the order total, which must match `payments[].amount` exactly — the caller
 * is responsible for passing the already-summed amount.
 */
export async function createBalanceOrder(args: {
  offerId: string;
  passengers: Array<Record<string, any>>;
  amount: string;
  currency: string;
  services?: Array<{ id: string; quantity: number }>;
}): Promise<{ ok: true; order: any } | { ok: false; error: string; status: number }> {
  if (!DUFFEL_KEY) {
    return { ok: false, error: 'Duffel not configured', status: 503 };
  }

  const body: any = {
    data: {
      type: 'instant',
      selected_offers: [args.offerId],
      passengers: args.passengers,
      payments: [
        {
          type: 'balance',
          amount: args.amount,
          currency: args.currency,
        },
      ],
    },
  };

  if (args.services && args.services.length > 0) {
    body.data.services = args.services;
  }

  const res = await fetch(`${DUFFEL_BASE}/air/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DUFFEL_KEY}`,
      'Duffel-Version': DUFFEL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = 'Duffel order failed';
    try {
      const j = JSON.parse(text);
      message = j.errors?.[0]?.message || message;
    } catch {}
    return { ok: false, error: message, status: res.status };
  }

  const json = await res.json();
  return { ok: true, order: json.data };
}

/** Price drift tolerance — if actual price > quoted + this, we refund instead. */
export const PRICE_DRIFT_TOLERANCE_GBP = 2.0;
