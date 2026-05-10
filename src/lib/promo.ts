/**
 * Promo eligibility engine — v1 ships a single hardcoded code:
 * APP_2ND_5OFF (£5 cashback on the customer's 2nd hotel booking when
 * made via the JetMeAway iOS or Android app).
 *
 * v1 architecture decisions (see plan: ditch-the-5-cash-hazy-toast.md):
 *   - LiteAPI-only inventory (DOTW path exists in code but isn't live).
 *   - LiteAPI captures the customer's full charge via its own Payment SDK,
 *     so JetMeAway can't deduct £5 at checkout. The £5 goes out as a
 *     post-booking cashback — handled MANUALLY by the owner for v1
 *     (LiteAPI dashboard partial refund, or out-of-pocket via Wise/PayPal/
 *     Stripe). Automated payout is the v2 build.
 *   - We flag the booking at confirmation and surface it on /admin/promos
 *     with a "Mark as paid" button.
 *
 * Fraud guards:
 *   - Customer must be signed in (we match prior-booking history by email).
 *   - Channel must be ios or android (UA-detected; harder to spoof from
 *     web than a query param).
 *   - Min spend £50 — sanity guard against £5-on-£15-room margin nuking.
 *   - One redemption per email — re-checked at book-confirmation time too.
 *   - Hard global cap of 500 redemptions = £2,500 max v1 promo cost.
 *   - Code re-validates at /api/hotels/book confirmation time so a race
 *     between two parallel checkouts doesn't cost us £10.
 *
 * Performance: listBookings() reads the entire bookings:all KV array.
 * At current scale (single-digit thousands lifetime) that's fine; same
 * pattern as src/app/api/account/me/route.ts. When bookings:all.length
 * exceeds ~10k, add a bookings:by-email:{email} index — backlogged.
 */

import { listBookings, type Supplier } from '@/lib/bookings';
import type { Channel } from '@/lib/channel';

export const APP_2ND_5OFF = {
  code: 'APP_2ND_5OFF' as const,
  /** Discount in pence — £5. */
  discountPence: 500,
  /** Min spend in pence — £50. Below this the £5 is too large a chunk
   *  of margin to absorb cleanly. */
  minSpendPence: 5000,
  /** Channels the promo applies to. v1 = mobile apps only. */
  eligibleChannels: ['ios', 'android'] as const,
  /** Suppliers the promo applies to. v1 = LiteAPI only (see plan). */
  eligibleSuppliers: ['liteapi'] as const,
  /** Hard global redemption cap. £2,500 = 500 × £5 max v1 cost. Owner
   *  can lift this once redemption rate is known. */
  capTotalRedemptions: 500,
  /** One redemption per customer (matched by lowercased email). */
  perEmailLimit: 1,
};

export type PromoEvaluation =
  | {
      eligible: true;
      code: typeof APP_2ND_5OFF.code;
      discountPence: number;
      reason: 'eligible';
    }
  | {
      eligible: false;
      reason:
        | 'not_signed_in'
        | 'wrong_channel'
        | 'wrong_supplier'
        | 'no_prior_booking'
        | 'min_spend'
        | 'already_used'
        | 'cap_reached';
    };

/**
 * Evaluate whether a customer's about-to-be-created booking should
 * receive the APP_2ND_5OFF cashback.
 *
 * Pure function over `listBookings()` — safe to call from /api/hotels/
 * start-booking AND re-call at /api/hotels/book confirmation time as an
 * idempotency check.
 */
export async function evaluateSecondBookingPromo(args: {
  email: string | null;
  channel: Channel;
  supplier: Supplier | string;
  totalPence: number;
}): Promise<PromoEvaluation> {
  const { email, channel, supplier, totalPence } = args;

  if (!email) return { eligible: false, reason: 'not_signed_in' };
  if (!APP_2ND_5OFF.eligibleChannels.includes(channel as 'ios' | 'android')) {
    return { eligible: false, reason: 'wrong_channel' };
  }
  if (!APP_2ND_5OFF.eligibleSuppliers.includes(supplier as 'liteapi')) {
    return { eligible: false, reason: 'wrong_supplier' };
  }
  if (totalPence < APP_2ND_5OFF.minSpendPence) {
    return { eligible: false, reason: 'min_spend' };
  }

  const lower = email.toLowerCase();
  const all = await listBookings();
  const mine = all.filter(b => (b.customerEmail || '').toLowerCase() === lower);

  // One redemption per customer. Count any prior booking that has the
  // promo flag and isn't `cancelled` / `failed` (those don't consume
  // the offer because the cashback wasn't actually paid out). `denied`
  // also counts as not-consumed.
  const alreadyConsumed = mine.some(
    b =>
      b.promoCode === APP_2ND_5OFF.code &&
      (b.promoStatus === 'eligible' || b.promoStatus === 'paid'),
  );
  if (alreadyConsumed) return { eligible: false, reason: 'already_used' };

  // Need ≥1 prior confirmed/completed booking (relaxed — increases
  // conversion without breaking the 2nd-booking spirit; see plan
  // open-decision #3).
  const priorConfirmed = mine.filter(
    b => b.status === 'confirmed' || b.status === 'completed',
  );
  if (priorConfirmed.length === 0) {
    return { eligible: false, reason: 'no_prior_booking' };
  }

  // Hard global cap.
  const usedGlobal = all.filter(
    b =>
      b.promoCode === APP_2ND_5OFF.code &&
      (b.promoStatus === 'eligible' || b.promoStatus === 'paid'),
  ).length;
  if (usedGlobal >= APP_2ND_5OFF.capTotalRedemptions) {
    return { eligible: false, reason: 'cap_reached' };
  }

  return {
    eligible: true,
    code: APP_2ND_5OFF.code,
    discountPence: APP_2ND_5OFF.discountPence,
    reason: 'eligible',
  };
}
