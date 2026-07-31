/**
 * Kyte flight pricing — the single source of truth for the customer total.
 *
 * A Kyte flight is charged via Stripe (Auth + Hold). The customer covers the
 * bare airline fare PLUS our unavoidable per-booking costs — Kyte's booking fee
 * and the Stripe processing fee — grossed up so JetMeAway nets exactly
 * `airline + Kyte fee` after Stripe's cut (zero margin on the base fare; profit
 * comes from ancillaries, matching the "no markup on direct bookings" promise).
 *
 * This lives in its own pure module (NO undici / Node-only imports) so BOTH the
 * client search page (to DISPLAY the price) and the server create-payment-intent
 * route (to CHARGE it) import the identical math — the shown price and the
 * charged price can never diverge again.
 */

/** Kyte per-booking fee (sandbox value — verify against the signed pricing
 *  letter). Charged once per booking. */
export const KYTE_FEE_PENCE = 50;

/** Stripe UK card pricing used in the gross-up. EU/UK: 1.5% + 20p. International
 *  cards run higher; we hard-code the UK rate and absorb the small delta. */
export const STRIPE_FIXED_PENCE = 20;
export const STRIPE_PCT = 0.015;

/**
 * Given the bare airline fare in MINOR units (pence, as Kyte returns it),
 * return the grossed-up total the customer actually pays, in minor units:
 *   total = ceil( (airline + Kyte fee + Stripe fixed) / (1 - Stripe %) )
 * Integer-pence throughout to avoid floating-point drift.
 */
export function kyteCustomerTotalPence(airlinePence: number): number {
  const subtotal = airlinePence + KYTE_FEE_PENCE + STRIPE_FIXED_PENCE;
  return Math.ceil(subtotal / (1 - STRIPE_PCT));
}
