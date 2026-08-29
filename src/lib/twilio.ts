/**
 * Twilio SMS helper — Edge Runtime compatible.
 * Uses the Twilio REST API directly via fetch (the Twilio Node SDK is not Edge-safe).
 *
 * Privacy Shield: the recipient number is used ONLY for the specific
 * notification passed in and is never logged, cached, or persisted elsewhere.
 */

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM || '';
// Optional alphanumeric sender ID (e.g. "JetMeAway"). When set, it's used
// instead of the phone number as the displayed sender. UK/EU only — US
// carriers reject alphanumeric IDs, so we fall back to the phone number
// if the destination is a +1 number.
const TWILIO_SENDER_ID = process.env.TWILIO_SENDER_ID || '';

/**
 * Normalise a phone string to E.164.
 *
 * Handles three common UK customer inputs plus generic E.164:
 *   - "+447432820415" / "+1..."  → accepted as-is
 *   - "07432820415"              → coerced to "+447432820415" (UK local)
 *   - "00447432820415"           → coerced to "+447432820415" (int dial prefix)
 *
 * Returns null if the result isn't a plausible E.164 number. This matters
 * because Twilio rejects non-E.164 destinations and silently dropped UK
 * customers entering their mobile without country code.
 */
function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;
  // UK local — 11 digits starting with 0 (e.g. mobile 07..., landline 01..., 02...)
  if (/^0\d{10}$/.test(cleaned)) return `+44${cleaned.slice(1)}`;
  // International dialling prefix form e.g. 0044...
  if (/^00[1-9]\d{6,14}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  return null;
}

/**
 * Who a message is for.
 *
 *   'customer' — an automatic send to a paying guest. OFF unless
 *                SMS_TO_CUSTOMERS=1. This is the default, deliberately:
 *                a new call site that forgets to declare an audience is
 *                silent rather than expensive.
 *   'owner'    — the owner's own phone, or a message the owner explicitly
 *                pressed a button to send. Never gated.
 */
export type SmsAudience = 'customer' | 'owner';

/**
 * THE ONE SMS SWITCH.
 *
 * Owner directive 2026-08-29: "keep it to email only sms cost me". Customer
 * notifications are EMAIL + APP PUSH. Every Twilio message is money out of a
 * business that has made £0 in real revenue, and there are nine paths into
 * this function — two of them (/api/book, /api/create-order) are dead routes
 * that are still publicly POST-able, so gating per call site would leak.
 *
 * So the gate lives HERE, above everything, and it is opt-IN: customer SMS
 * sends only when SMS_TO_CUSTOMERS=1 is present in the environment. Nothing
 * is deleted. To turn customer SMS back on, set SMS_TO_CUSTOMERS=1 in the
 * Vercel dashboard — no code change, no redeploy of logic.
 *
 * Deliberately NOT gated — these three pass audience:'owner':
 *   - src/app/success/page.tsx — the BOOKING FAILED alert to the owner's own
 *     number. A customer paid and got nothing; silence is far worse than the
 *     cost of a rare text.
 *   - src/app/api/admin/send-booking-sms — the owner pressing a button.
 *   - src/app/api/admin/resend-notification — same, via notifications.ts.
 */
function customerSmsEnabled(): boolean {
  return process.env.SMS_TO_CUSTOMERS === '1';
}

/**
 * Send a single SMS via Twilio. Never throws — returns { ok, error? } so the
 * calling booking flow cannot be blocked by SMS delivery issues.
 *
 * `opts.audience` defaults to 'customer', which is gated OFF (see
 * customerSmsEnabled above). Every existing caller already treats a
 * `{ ok: false }` return as a non-event, so nothing downstream breaks.
 */
export async function sendSms(
  to: string,
  body: string,
  opts?: { audience?: SmsAudience },
): Promise<{ ok: boolean; error?: string }> {
  const audience: SmsAudience = opts?.audience ?? 'customer';
  if (audience === 'customer' && !customerSmsEnabled()) {
    // Not an error — a deliberate, reversible business decision. No log:
    // the recipient number must never reach the logs (Privacy Shield).
    return { ok: false, error: 'sms_customer_disabled' };
  }

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { ok: false, error: 'twilio_not_configured' };
  }

  const normalised = toE164(to);
  if (!normalised) {
    return { ok: false, error: 'invalid_phone' };
  }

  try {
    // Choose sender: alphanumeric ID for non-US destinations if configured,
    // otherwise the registered phone number.
    const isUsDestination = normalised.startsWith('+1');
    const sender = (TWILIO_SENDER_ID && !isUsDestination) ? TWILIO_SENDER_ID : TWILIO_FROM;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const form = new URLSearchParams();
    form.append('To', normalised);
    form.append('From', sender);
    form.append('Body', body);

    // Basic auth header (Edge-compatible — no Buffer).
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const txt = await res.text();
      // Log error WITHOUT the phone number (Privacy Shield).
      console.error('Twilio send failed:', res.status, txt.slice(0, 200));
      return { ok: false, error: `twilio_${res.status}` };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Twilio send exception:', err?.message || 'unknown');
    return { ok: false, error: 'twilio_exception' };
  }
}

/**
 * Booking confirmation SMS — the "Personal Scout" notification.
 * Includes the booking reference and route/date so passengers have the
 * key details at a glance.
 */
export function scoutBookingMessage(params: {
  bookingRef: string;
  origin: string;
  destination: string;
  departureDate: string; // e.g. "Fri 15 May"
}): string {
  const { bookingRef, origin, destination, departureDate } = params;
  return (
    `Your Scout has secured your flight! ${origin} to ${destination}, ${departureDate}. ` +
    `Booking ref: ${bookingRef}. ` +
    `Check your email for full details and your Deep Neighbourhood guide. - JetMeAway jetmeaway.co.uk`
  );
}

/**
 * Hotel booking confirmation SMS — Scout-voice with destination-aware greeting.
 * SMS budget keeps it terse: greeting + escape line + ref + email-CTA, all
 * inside ~160 chars where possible.
 */
export function hotelBookingMessage(params: {
  bookingRef: string;
  hotelName: string;
  checkIn: string;  // e.g. "Tue 15 Apr"
  checkOut: string; // e.g. "Fri 18 Apr"
  city: string;
  firstName?: string | null;
}): string {
  const { bookingRef, hotelName, checkIn, checkOut, city, firstName } = params;
  // Lazy-import to avoid a cycle (twilio.ts is loaded by lots of routes).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scoutSalutation } = require('./scout-greeting') as typeof import('./scout-greeting');
  const opener = scoutSalutation(city, firstName ?? null);
  return (
    `${opener} Your ${city} escape is on the map — ${hotelName}, ` +
    `${checkIn} to ${checkOut}. Ref: ${bookingRef}. ` +
    `Full details in your email. — JetMeAway jetmeaway.co.uk`
  );
}
