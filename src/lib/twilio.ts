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
 * Normalise a phone string to E.164 (keeps leading +, strips whitespace/dashes/parens).
 * Returns null if the result isn't a plausible E.164 number.
 */
function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;
  return null;
}

/**
 * Send a single SMS via Twilio. Never throws — returns { ok, error? } so the
 * calling booking flow cannot be blocked by SMS delivery issues.
 */
export async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
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
    `Check your email for full details and your Deep Neighbourhood guide. - JetMeAway`
  );
}
