/**
 * Check-in push notifications — the app-notification half of the arrival
 * message.
 *
 * WHY THIS EXISTS (2026-08-29). The owner drove ten hours to Paris with his
 * wife and three children, arrived at a hotel his WIFE had booked, and had to
 * ask a chatbot three things while standing on the pavement outside:
 *
 *   1. whose name the room is held under (give the wrong one and reception
 *      finds nothing),
 *   2. that £20.37 was still payable AT THE PROPERTY on top of the £120.44
 *      already paid,
 *   3. the address, and that check-in opened at 3:00 PM.
 *
 * He said: "this should pop up in app notification".
 *
 * ── Design constraints this file obeys ────────────────────────────────────
 *
 * PUSH IS BEST-EFFORT, EMAIL IS THE GUARANTEE. Tokens are bound to a device
 * only via `push:by-email:<lowercased session email>`, which is written only
 * when /api/push-token is POSTed with a valid session cookie. A guest
 * checkout has no session (the owner's own Paris booking is recorded with
 * promoEligibilityReason 'not_signed_in'), and the mobile app short-circuits
 * its token sync on a local "already synced" flag, so most bookings will
 * resolve to ZERO tokens. That is expected, not an error. The caller must
 * treat a zero-token result as a non-event and must still send the email.
 *
 * EVERY ELEMENT OMITS CLEANLY. Most of the fields this message wants
 * (hotelAddress, checkInTime, roomName, localFeesPence) were only added on
 * 2026-08-28, are absent on every older record, and are never written at all
 * by the deal-card booking path. "Room is under undefined" is far worse than
 * a short notification, so every fact is gated on the record actually
 * carrying it.
 *
 * NO PARTY COUNT. The deal-card path hardcodes `adults: 2` with no way to
 * tell it apart from a real occupancy, so a push claiming "2 adults" would
 * repeat the "Guests 5" class of bug on a family of five. The party is simply
 * not in this message.
 *
 * PRIVACY SHIELD. A push BODY naturally carries the guest's name — that is
 * fine, it goes to that guest's own device. Nothing here logs a name, an
 * email, a phone number or a push token, and nothing here calls reportBug.
 * Counts only.
 */

import { kv } from '@vercel/kv';
import { normaliseEmail } from './session';
import { sendExpoPushToTokens } from './push-send';
import {
  formatPrice,
  roomHeldUnder,
  hotelAddressLine,
} from './notifications';
import type { Booking } from './bookings';

const SITE = 'https://jetmeaway.co.uk';

/** Which arrival message this is. Mirrors ReminderKind in booking-status.ts. */
export type CheckInPushKind = 'check-in-24h' | 'check-in-day';

/* APNs shows roughly four lines; Android two before it collapses. 178 keeps
 * the whole body visible on a locked iPhone without the system ellipsing the
 * facts we care about. */
const MAX_BODY = 178;

/* ─────────────────────────── message building ────────────────────────────*/

function hotelName(booking: Booking): string {
  return (booking.title || '').trim();
}

function buildTitle(booking: Booking, kind: CheckInPushKind): string {
  const name = hotelName(booking);
  /* The supplier's own check-in string, printed verbatim. LiteAPI sends
   * "03:00 PM"; there is no parser for it anywhere in this repo and writing
   * one is how it starts being wrong. */
  const time = (booking.checkInTime || '').trim();

  if (kind === 'check-in-day') {
    if (time && name) return `Check in from ${time} — ${name}`;
    if (time) return `Check in from ${time} today`;
    if (name) return `Check-in today — ${name}`;
    return 'You check in today';
  }
  if (time && name) return `Tomorrow from ${time} — ${name}`;
  if (time) return `Check in tomorrow from ${time}`;
  if (name) return `Tomorrow: ${name}`;
  return 'You check in tomorrow';
}

/**
 * The body: the three facts, in the order a guest on the pavement needs them,
 * separated by " · ". Any fact the record cannot support is dropped silently.
 *
 * Order is deliberate — name first, money second, address last — because the
 * address is the one a truncation is allowed to eat: the guest is already
 * standing at the door.
 */
function buildBody(booking: Booking): string {
  const parts: string[] = [];

  const held = roomHeldUnder(booking);
  if (held) parts.push(`Room is under ${held}`);

  /* Money the PROPERTY collects on arrival. Compressed for the push budget;
   * the amount itself comes from the same formatter the emails use, so the
   * figure can never disagree with the confirmation. Absence of the field
   * means "we were never told" — it must NEVER be rendered as "nothing more
   * to pay". */
  const fees = booking.localFeesPence;
  if (typeof fees === 'number' && fees > 0) {
    parts.push(`${formatPrice(fees)} due at the hotel`);
  }

  const addr = hotelAddressLine(booking);

  let body = parts.join(' · ');
  if (addr) {
    const separator = body ? ' · ' : '';
    const room = MAX_BODY - body.length - separator.length;
    if (room >= 12) {
      body += separator + (addr.length <= room ? addr : `${addr.slice(0, room - 1).trimEnd()}…`);
    }
  }

  if (body.length > MAX_BODY) body = `${body.slice(0, MAX_BODY - 1).trimEnd()}…`;

  /* A record too lean to say anything specific still gets a useful title, so
   * point at the channel that definitely has the details rather than at a tap
   * target the app does not handle yet. */
  return body || 'Your JetMeAway stay — full details are in your confirmation email.';
}

/**
 * Build the push for a booking, or null when it must not be sent.
 * Hotels only: a flight booking stores `checkIn` as its DEPARTURE date, so
 * without this gate a flight customer receives "your room is ready".
 */
export function buildCheckInPush(
  booking: Booking,
  kind: CheckInPushKind,
): { title: string; body: string; data: Record<string, unknown> } | null {
  if (!booking || booking.type !== 'hotel') return null;
  return {
    title: buildTitle(booking, kind),
    body: buildBody(booking),
    /* Deep-link payload. INERT TODAY: the mobile shell registers no
     * addNotificationResponseReceivedListener, so a tap opens the app at
     * whatever it last showed. Sent anyway so the app side is a pure mobile
     * change whenever it ships — and this is exactly why every fact the guest
     * needs is in the BODY rather than behind a tap. */
    data: { url: `${SITE}/account/bookings/${encodeURIComponent(booking.id)}`, kind },
  };
}

/* ──────────────────────────── local-hour guard ───────────────────────────*/

/**
 * Rough local hour at the PROPERTY, from its longitude. 15° of longitude is
 * one hour; political timezones and DST make this wrong by up to ~2 hours,
 * which is far inside the tolerance we need — we are only deciding whether a
 * phone is allowed to buzz, not printing a time.
 *
 * Returns null when the record carries no coordinates (every record written
 * before 2026-08-28, and every deal-card booking).
 */
export function propertyLocalHour(booking: Booking, utcHour: number): number | null {
  const lng = booking.lng;
  if (typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) return null;
  const offset = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  return ((utcHour + offset) % 24 + 24) % 24;
}

/**
 * Cron is UTC; check-in times are local. A single UTC slot lands at 11:00 in
 * Paris (good) and 01:00 in Los Angeles (hostile) — and at 23:00 the PREVIOUS
 * local day in Honolulu, where "you check in today" is simply false.
 *
 * So the PUSH is suppressed outside 06:00–21:00 local. The email is not: an
 * email arriving at an odd hour costs nothing and it is the channel we
 * actually rely on.
 *
 * Unknown location ⇒ allowed. The alternative kills the feature for every
 * pre-2026-08-28 and deal-card record, and this business sells overwhelmingly
 * into UK/Europe where the scheduled slots are already mid-morning.
 */
export function isCivilPushHour(booking: Booking, now: Date): boolean {
  const local = propertyLocalHour(booking, now.getUTCHours());
  if (local === null) return true;
  return local >= 6 && local <= 21;
}

/* ────────────────────────────── delivery ─────────────────────────────────*/

/**
 * The guest's registered devices. Booking.customerEmail is stored verbatim as
 * the guest typed it and is NEVER lower-cased at write time, while the push
 * index is keyed on the lower-cased session email — so building the key from
 * the raw field would silently send to nobody on any capitalised address.
 *
 * Returns [] on anything unexpected. Never throws, never logs the address.
 */
export async function pushTokensForBooking(booking: Booking): Promise<string[]> {
  const email = normaliseEmail(booking.customerEmail);
  if (!email) return [];
  try {
    const tokens = await kv.smembers(`push:by-email:${email}`);
    return Array.isArray(tokens) ? tokens.filter((t): t is string => typeof t === 'string' && !!t) : [];
  } catch {
    return [];
  }
}

export type CheckInPushOutcome = {
  /** How many devices we found for this guest. 0 is normal, not a failure. */
  tokens: number;
  /** How many Expo accepted. */
  delivered: number;
  /** Why nothing was attempted, when nothing was. */
  skipped?: 'not-a-hotel' | 'unsociable-hour' | 'no-tokens';
};

/**
 * Send the arrival push. NEVER throws — a push problem must never stop the
 * email or abort the rest of the cron run.
 */
export async function sendCheckInPush(
  booking: Booking,
  kind: CheckInPushKind,
  now: Date = new Date(),
): Promise<CheckInPushOutcome> {
  try {
    const message = buildCheckInPush(booking, kind);
    if (!message) return { tokens: 0, delivered: 0, skipped: 'not-a-hotel' };
    if (!isCivilPushHour(booking, now)) {
      return { tokens: 0, delivered: 0, skipped: 'unsociable-hour' };
    }

    const tokens = await pushTokensForBooking(booking);
    if (tokens.length === 0) return { tokens: 0, delivered: 0, skipped: 'no-tokens' };

    const results = await sendExpoPushToTokens(tokens, {
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
      /* 'default' is the only channel the shipped Android build registers.
       * It is named "Deal Alerts" and has DEFAULT importance, so this will not
       * pop as a heads-up and a user who muted marketing has muted this too.
       * A dedicated high-importance "Your bookings" channel is a mobile-side
       * change and must not be sent until an EAS build registers it. */
      channelId: 'default',
      priority: 'high',
      /* Worthless once the guest has checked in. */
      ttl: kind === 'check-in-day' ? 6 * 60 * 60 : 20 * 60 * 60,
    });

    return {
      tokens: tokens.length,
      delivered: results.filter((r) => r.status === 'ok').length,
    };
  } catch {
    // Swallowed on purpose: log nothing (a push error object can carry the
    // token) and let the caller carry on to the email.
    return { tokens: 0, delivered: 0 };
  }
}
