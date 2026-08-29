/**
 * Booking notifications — email (Resend) + SMS (Twilio).
 *
 * One-stop helpers the booking orchestrators call on every terminal
 * state. Each call is fire-and-forget: we never block the HTTP response
 * on delivery, and failures are logged but never thrown. A booking
 * outcome is never held hostage by a mailer or SMS gateway.
 *
 * Two entry points:
 *   - notifyBookingConfirmed(booking)   — happy path
 *   - notifyBookingDeclined(booking, reason) — refund/failure path
 *
 * Edge/Node agnostic: uses fetch for Resend + the existing Edge-safe
 * twilio helper in src/lib/twilio.ts.
 */

import { sendSms, type SmsAudience } from './twilio';
import { fmtGbp, type Booking } from './bookings';
import { sentryCapture } from './sentry-edge';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = 'JetMeAway <bookings@jetmeaway.co.uk>';
const REPLY_TO = 'contact@jetmeaway.co.uk';
/** Owner ops inbox — Kyte agency-card charges, booking events, ops alerts. */
const OWNER_OPS_EMAIL = 'waqar@jetmeaway.co.uk';

/* --------------------------- Resend via fetch ---------------------------- */

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_KEY) return { ok: false, error: 'resend_not_configured' };
  if (!opts.to || !opts.to.includes('@')) return { ok: false, error: 'invalid_email' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        reply_to: REPLY_TO,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Resend send failed:', res.status, txt.slice(0, 200));
      return { ok: false, error: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    console.error('Resend exception:', err?.message || 'unknown');
    return { ok: false, error: 'resend_exception' };
  }
}

/* ------------------------------ formatters ------------------------------- */

/** Money for customer-facing copy.
 *
 *  The unified booking store has no currency field: every amount in it is GBP
 *  pence by construction (PRICEABLE_CURRENCIES is {GBP} and lib/liteapi.ts
 *  FX-converts every supplier price to GBP before we ever store it). So the
 *  currency is declared ONCE, here, as an ISO code handed to Intl — never as a
 *  bare '£' glyph scattered through the templates. If local-currency pricing
 *  ever lands, this is the single place that has to learn about it. */
export function formatPrice(pence: number): string {
  return fmtGbp(pence);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/* -------------------------- email shell (shared) ------------------------- */

function shellHtml(opts: {
  heading: string;
  accent: string; // hex
  subheading: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1D2B;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;font-size:22px;font-weight:700;color:#0066FF;letter-spacing:-0.5px;">JetMeAway</span>
      </div>
      <div style="background:#ffffff;border:1px solid #E8ECF4;border-radius:16px;overflow:hidden;">
        <div style="background:${opts.accent};padding:24px 28px;color:#ffffff;">
          <div style="font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;opacity:0.9;">${opts.subheading}</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">${opts.heading}</div>
        </div>
        <div style="padding:28px;font-size:15px;line-height:1.6;color:#5C6378;">
          ${opts.body}
        </div>
      </div>
      <div style="text-align:center;color:#8E95A9;font-size:12px;margin-top:20px;line-height:1.6;">
        Questions? Reply to this email or write to
        <a href="mailto:${REPLY_TO}" style="color:#0066FF;text-decoration:none;">${REPLY_TO}</a>.<br/>
        JetMeAway — UK travel comparison &amp; booking.
      </div>
    </div>
  </body>
</html>`;
}

function detailsTable(rows: Array<[string, string]>): string {
  return `
<table style="width:100%;border-collapse:collapse;margin:12px 0;">
  ${rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 0;color:#8E95A9;font-size:13px;width:40%;">${escapeHtml(k)}</td>
        <td style="padding:8px 0;color:#1A1D2B;font-size:14px;font-weight:600;">${escapeHtml(v)}</td>
      </tr>`,
    )
    .join('')}
</table>`;
}

/** Postal address from the three parts we store, without repeating a part the
 *  supplier already wrote into the street line. LiteAPI's address for the
 *  owner's Paris hotel is "2-16, rue Theroigne de Mericourt, Paris, 75013", so
 *  appending city and country naively produced "... Paris, 75013, Paris,
 *  France". A doubled city on the document a guest shows at reception reads as
 *  carelessness. */
export function joinAddress(
  street?: string | null,
  city?: string | null,
  country?: string | null,
): string {
  const s = (street || '').trim();
  const parts = [s];
  const seen = s.toLowerCase();
  for (const extra of [city, country]) {
    const e = (extra || '').trim();
    if (!e) continue;
    // Word-boundary match, so "Paris" is not swallowed by "Parisian Road".
    const already = new RegExp(`(^|[\\s,])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,]|$)`, 'i').test(seen);
    if (!already) parts.push(e);
  }
  return parts.filter(Boolean).join(', ');
}

/* ───────────────────── arrival facts — worded ONCE ────────────────────────
   The three things the owner had to ask a chatbot for while standing outside
   a Paris hotel at night with his family: whose name the room is under, how
   much the property still wants at the desk, and where the property actually
   is. They now appear in the confirmation email, the 24-hour reminder email
   and the check-in push.

   Every one of them is defined HERE and nowhere else. Three renderers wording
   the same fact three different ways is how "GBP 20.37 payable at the
   property" turns into a guest arguing with a receptionist. Each helper
   returns null when the record cannot support the claim — an omitted line is
   always better than a confident wrong one. Values come back RAW; each
   renderer escapes them (detailsTable already does). */

/** The name the hotel holds the room under — often NOT the person reading the
 *  message. The owner's family trip was booked in his wife's name.
 *  Returns null for the 'Guest' fallback that both mirror functions write when
 *  no guest record exists: "Room held under: Guest" is visibly fake, and this
 *  is the one fact that has to be trustworthy. */
export function roomHeldUnder(booking: Booking): string | null {
  const name = (booking.customerName || '').trim();
  if (!name) return null;
  if (name.toLowerCase() === 'guest') return null;
  return name;
}

/** Money the PROPERTY still collects on arrival — city tax, VAT, resort fee —
 *  which is NOT part of totalPence. Returns null when the record carries no
 *  figure. Silence must stay silence: absence means "we were never told",
 *  never "there is nothing more to pay". */
export function localFeesLine(booking: Booking): string | null {
  const pence = booking.localFeesPence;
  if (typeof pence !== 'number' || !(pence > 0)) return null;
  return `${formatPrice(pence)} — city tax and local fees, collected on arrival`;
}

/** "Fri 29 Aug 2026 from 03:00 PM". The time is the supplier's own string,
 *  printed verbatim — LiteAPI sends "03:00 PM", there is no parser for it
 *  anywhere in this repo, and inventing one would be how it becomes wrong. */
export function checkInLine(booking: Booking): string | null {
  if (!booking.checkIn) return null;
  const t = booking.checkInTime ? ` from ${booking.checkInTime}` : '';
  return formatDate(booking.checkIn) + t;
}

/** The property's real postal address. `destination` is the SEARCH BOX TEXT
 *  ("Eiffel Tower") and is never an address. */
/** LiteAPI returns an ISO-3166 alpha-2 country code, not a name — verified in
 *  src/lib/liteapi.ts (getHotelDetail passes `h.country` straight through, and
 *  the wrong-continent guard's own comment quotes a property "with country
 *  'be'"). Printing it raw ends the address a guest shows at reception with a
 *  bare ", FR". Expand the countries we actually sell into; for anything else
 *  drop the code entirely — no country reads better than a cryptic one, and the
 *  city is already there. */
const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom', FR: 'France', ES: 'Spain', IT: 'Italy', DE: 'Germany',
  PT: 'Portugal', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
  IE: 'Ireland', GR: 'Greece', HR: 'Croatia', CZ: 'Czechia', PL: 'Poland',
  HU: 'Hungary', TR: 'Turkey', MA: 'Morocco', EG: 'Egypt', AE: 'United Arab Emirates',
  US: 'United States', CA: 'Canada', MX: 'Mexico', TH: 'Thailand', JP: 'Japan',
  NP: 'Nepal', IN: 'India', ID: 'Indonesia', VN: 'Vietnam', MY: 'Malaysia',
  SG: 'Singapore', AU: 'Australia', NZ: 'New Zealand', ZA: 'South Africa',
  DK: 'Denmark', SE: 'Sweden', NO: 'Norway', FI: 'Finland', IS: 'Iceland',
  RO: 'Romania', BG: 'Bulgaria', SK: 'Slovakia', SI: 'Slovenia', EE: 'Estonia',
  LV: 'Latvia', LT: 'Lithuania', CY: 'Cyprus', MT: 'Malta', LU: 'Luxembourg',
  AL: 'Albania', RS: 'Serbia', BA: 'Bosnia and Herzegovina', ME: 'Montenegro',
  GE: 'Georgia', AM: 'Armenia', AZ: 'Azerbaijan', QA: 'Qatar', SA: 'Saudi Arabia',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', PE: 'Peru', CO: 'Colombia',
};

export function countryName(raw?: string | null): string | null {
  const c = (raw || '').trim();
  if (!c) return null;
  if (c.length !== 2) return c;                    // already a name
  return COUNTRY_NAMES[c.toUpperCase()] ?? null;   // unknown code: say nothing
}

export function hotelAddressLine(booking: Booking): string | null {
  const addr = joinAddress(booking.hotelAddress, booking.hotelCity, countryName(booking.hotelCountry));
  return addr || null;
}

/**
 * The arrival block, as label/value rows, in the order a guest standing at a
 * reception desk needs them. Empty array for flights and for records that
 * carry none of the fields (everything written before 2026-08-28).
 *
 * Renderers supply their own chrome; the WORDS come from here.
 */
export function arrivalDetailRows(booking: Booking): Array<[string, string]> {
  if (booking.type !== 'hotel') return [];
  const rows: Array<[string, string]> = [];
  const addr = hotelAddressLine(booking);
  if (addr) rows.push(['Address', addr]);
  const ci = checkInLine(booking);
  if (ci) rows.push(['Check-in', ci]);
  if (booking.roomName) rows.push(['Room', booking.roomName]);
  const held = roomHeldUnder(booking);
  if (held) rows.push(['Room held under', held]);
  const fees = localFeesLine(booking);
  if (fees) rows.push(['Payable at the hotel', fees]);
  return rows;
}

/* ------------------------- confirmation notification --------------------- */

function confirmationHtml(booking: Booking): string {
  const isFlight = booking.type === 'flight';
  const ref = booking.supplierRef || booking.id;
  const rows: Array<[string, string]> = [
    ['Booking reference', ref],
    [isFlight ? 'Route' : 'Hotel', booking.title],
    [isFlight ? 'Destination' : 'City', booking.destination],
  ];
  // The hotel's real postal address, when the record carries one.
  if (!isFlight) {
    const addr = hotelAddressLine(booking);
    if (addr) rows.push(['Address', addr]);
  }
  if (booking.checkIn) {
    if (isFlight) {
      rows.push(['Travel date', formatDate(booking.checkIn)]);
    } else {
      const ci = checkInLine(booking);
      if (ci) rows.push(['Check-in', ci]);
    }
  }
  if (booking.checkOut && !isFlight) {
    const t = booking.checkOutTime ? ` until ${booking.checkOutTime}` : '';
    rows.push(['Check-out', formatDate(booking.checkOut) + t]);
  }
  if (!isFlight && booking.roomName) rows.push(['Room', booking.roomName]);
  if (!isFlight && booking.boardName) rows.push(['Meals', booking.boardName]);
  /* A SINGLE NUMBER CANNOT DESCRIBE A FAMILY. This row read "Guests 5" — and
     on the other confirmation path, "Guests 2" for a family of five, which is
     what the owner found on his own booking. Print the actual party, with the
     children's ages, because that is what a hotel checks a child booking
     against. Falls back to the bare count on records that carry no breakdown. */
  if (!isFlight && (booking.adults || booking.children)) {
    const a = Math.max(0, booking.adults || 0);
    const c = Math.max(0, booking.children || 0);
    const ages = booking.childAges?.length ? ` (${booking.childAges.join(', ')})` : '';
    rows.push([
      'Guests',
      [`${a} adult${a === 1 ? '' : 's'}`, ...(c > 0 ? [`${c} child${c === 1 ? '' : 'ren'}${ages}`] : [])].join(' + '),
    ]);
  } else if (booking.guests) {
    rows.push([isFlight ? 'Passengers' : 'Guests', String(booking.guests)]);
  }
  // The name the hotel holds the room under — often not the person reading
  // this. The owner's family trip was booked in his wife's name. Suppressed
  // for the 'Guest' fallback (see roomHeldUnder).
  if (!isFlight) {
    const held = roomHeldUnder(booking);
    if (held) rows.push(['Room held under', held]);
  }
  rows.push(['Total paid', formatPrice(booking.totalPence)]);
  // Money the PROPERTY still collects. Printing a total under a no-surprises
  // promise while the desk asks for more is the surprise.
  if (!isFlight) {
    const fees = localFeesLine(booking);
    if (fees) rows.push(['Payable at the hotel', fees]);
  }

  const supplierNote = isFlight
    ? `Your e-ticket will arrive directly from the airline within a few hours. If you haven't received it by tomorrow, check your spam folder or reply to this email.`
    : `Your hotel confirmation voucher will arrive by email shortly. Present it at check-in.`;

  // £5-off-2nd-booking-via-app cashback section. Renders only when the
  // booking was flagged eligible at confirmation. v1: manual payout by
  // the owner — copy matches the 7-working-day expectation set on the
  // checkout page so the customer doesn't get a surprise. See
  // ditch-the-5-cash-hazy-toast.md.
  const promoBlock =
    booking.promoCode === 'APP_2ND_5OFF' &&
    (booking.promoStatus === 'eligible' || booking.promoStatus === 'paid')
      ? `
    <div style="margin:16px 0 0 0;padding:14px 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;">
      <p style="margin:0 0 4px 0;color:#064E3B;font-size:14px;font-weight:700;">£5 cashback on the way</p>
      <p style="margin:0;color:#065F46;font-size:13px;line-height:1.5;">
        Thanks for booking your 2nd hotel via the JetMeAway app — we'll send £${(((booking.promoDiscountPence ?? 500)) / 100).toFixed(2)} to your card within 7 working days.
        <a href="https://jetmeaway.co.uk/terms/promo-second-booking" style="color:#065F46;text-decoration:underline;">T&amp;Cs apply</a>.
      </p>
    </div>`
      : '';

  /* Driving directions, from the hotel's COORDINATES rather than its postal
     address — a hotel's registered address is often not its entrance. Shown
     only for hotels, and only when the record carries a position. */
  const directionsBlock =
    !isFlight && typeof booking.lat === 'number' && typeof booking.lng === 'number'
      ? `
    <p style="margin:14px 0 0 0;">
      <a href="https://www.google.com/maps/dir/?api=1&amp;destination=${booking.lat},${booking.lng}"
         style="display:inline-block;background:#F1F5FF;border:1px solid #D6E2FF;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:800;color:#0066FF;text-decoration:none;">📍 Get directions</a>
    </p>`
      : '';

  const body = `
    <p style="margin:0 0 12px 0;color:#1A1D2B;">Hi ${escapeHtml(booking.customerName || 'there')},</p>
    <p style="margin:0 0 16px 0;">We've confirmed your booking. Here are the details:</p>
    ${detailsTable(rows)}
    ${directionsBlock}
    <p style="margin:16px 0 0 0;color:#5C6378;font-size:14px;">${supplierNote}</p>
    ${promoBlock}
  `;

  return shellHtml({
    heading: 'Booking confirmed',
    subheading: isFlight ? 'Flight' : 'Hotel',
    accent: '#0FA968',
    body,
  });
}

function confirmationSms(booking: Booking): string {
  const ref = booking.supplierRef || booking.id;
  if (booking.type === 'flight') {
    const date = formatDate(booking.checkIn);
    return `JetMeAway: Flight confirmed ✈️ Ref ${ref} — ${booking.title}${date ? ` on ${date}` : ''}. E-ticket comes from the airline. jetmeaway.co.uk`;
  }
  return `JetMeAway: Hotel booked ✅ Ref ${ref} — ${booking.title}${booking.checkIn ? `, ${formatDate(booking.checkIn)}` : ''}. Voucher by email. jetmeaway.co.uk`;
}

/**
 * `opts.smsAudience` exists for ONE caller: /api/admin/resend-notification,
 * where the owner has deliberately pressed "Send SMS" / "Send both". It must
 * bypass the automatic-customer-SMS gate in lib/twilio.ts, or the admin UI
 * would render a green "✅ Confirmation SMS sent" over a silent no-op.
 * Every automatic caller omits it and gets the gated 'customer' default.
 */
export async function notifyBookingConfirmed(
  booking: Booking,
  opts?: { smsAudience?: SmsAudience },
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (booking.customerEmail) {
    tasks.push(
      sendEmail({
        to: booking.customerEmail,
        subject: `Booking confirmed — ${booking.supplierRef || booking.id}`,
        html: confirmationHtml(booking),
      }),
    );
  }
  if (booking.customerPhone) {
    // allSettled below: a disabled/failed SMS can never affect the email.
    tasks.push(sendSms(booking.customerPhone, confirmationSms(booking), {
      audience: opts?.smsAudience ?? 'customer',
    }));
  }
  try {
    await Promise.allSettled(tasks);
  } catch (err) {
    // Promise.allSettled shouldn't throw, but belt-and-braces.
    console.error('notifyBookingConfirmed:', err);
  }
}

/* ---------------------------- decline notification ----------------------- */

function declineHtml(booking: Booking, reason: string): string {
  const isFlight = booking.type === 'flight';
  const refundLine = booking.type === 'flight'
    ? // LiteAPI flights: the customer already paid our flight partner (merchant of
      // record) before the book call, so there's no Stripe PI on our side. A book
      // failure auto-reverses that charge — never say "no payment taken" here.
      `Your payment was taken by our flight partner and any charge will be automatically reversed to your card, usually within 5–10 business days.`
    : booking.stripePaymentId
    ? `We've issued a full refund of ${formatPrice(booking.totalPence)} to your card. It usually lands within 5–10 business days.`
    : `No payment has been taken — nothing will appear on your card.`;

  const body = `
    <p style="margin:0 0 12px 0;color:#1A1D2B;">Hi ${escapeHtml(booking.customerName || 'there')},</p>
    <p style="margin:0 0 16px 0;">
      Unfortunately we couldn't complete your ${isFlight ? 'flight' : 'hotel'} booking. We're sorry for the inconvenience.
    </p>
    ${detailsTable([
      ['Reference', booking.id],
      [isFlight ? 'Route' : 'Hotel', booking.title],
      ['Reason', escapeHtml(friendlyReason(reason, isFlight))],
    ])}
    <p style="margin:16px 0 8px 0;color:#5C6378;font-size:14px;">${refundLine}</p>
    <p style="margin:8px 0 0 0;color:#5C6378;font-size:14px;">
      Try again with a different date or flight from jetmeaway.co.uk, or reply to this email and we'll help you sort it.
    </p>
  `;

  return shellHtml({
    heading: 'Booking could not be completed',
    subheading: isFlight ? 'Flight' : 'Hotel',
    accent: '#B91C1C',
    body,
  });
}

function declineSms(booking: Booking): string {
  const refundBit = booking.type === 'flight'
    ? ' Any charge is reversed automatically.'
    : booking.stripePaymentId ? ' Full refund issued.' : '';
  return `JetMeAway: We couldn't complete your ${booking.type === 'flight' ? 'flight' : 'hotel'} booking ${booking.id}.${refundBit} Check your email for details — reply or email contact@jetmeaway.co.uk.`;
}

export async function notifyBookingDeclined(
  booking: Booking,
  reason: string,
  opts?: { smsAudience?: SmsAudience },
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (booking.customerEmail) {
    tasks.push(
      sendEmail({
        to: booking.customerEmail,
        subject: `We couldn't complete your booking — ${booking.id}`,
        html: declineHtml(booking, reason),
      }),
    );
  }
  if (booking.customerPhone) {
    tasks.push(sendSms(booking.customerPhone, declineSms(booking), {
      audience: opts?.smsAudience ?? 'customer',
    }));
  }
  try {
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('notifyBookingDeclined:', err);
  }
}

/* -------------------------------- utils ---------------------------------- */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Translate internal refund reasons (e.g. "Ancillary drift £2.40", "Duffel
 * failed: insufficient_balance") into something the customer can parse.
 * We keep a tiny mapping and fall back to a generic line — never expose
 * supplier error codes or stack traces.
 */
function friendlyReason(raw: string, isFlight = false): string {
  const r = raw.toLowerCase();
  if (
    (r.includes('offer') && (r.includes('unavailable') || r.includes('no longer'))) ||
    r.includes('sold out') ||
    r.includes('soldout')
  ) {
    return isFlight
      ? 'The fare was withdrawn by the airline before we could confirm.'
      : 'That room was taken before we could confirm it.';
  }
  if (r.includes('drift') || r.includes('price')) {
    return 'The price changed between quote and confirmation.';
  }
  if (r.includes('ancillary') || r.includes('service')) {
    return 'One of the extras you selected became unavailable.';
  }
  // FLIGHT bookings (LiteAPI or Duffel) must NEVER fall through to hotel copy.
  // The raw error string contains "liteapi" for LiteAPI flights too, so the
  // booking TYPE — not string matching — decides the vocabulary here.
  if (isFlight) {
    return 'The airline could not confirm the booking at the last step.';
  }
  if (r.includes('duffel') || r.includes('supplier') || r.includes('balance')) {
    return 'The airline rejected the booking at the last step.';
  }
  if (r.includes('liteapi') || r.includes('hotel')) {
    return 'The hotel could not confirm availability at the last step.';
  }
  return 'A technical issue prevented us from completing the booking.';
}

/* ───────────────────────── owner ops alerts ─────────────────────────── */

/**
 * Fire an ops alert to the owner — both an email to OWNER_OPS_EMAIL and a
 * Sentry info-level event. Used for non-error events the owner needs
 * visibility on: Kyte agency-card charges incoming, manual-reconcile
 * cases, integration milestones, etc.
 *
 * Two channels because:
 *  - Sentry gives structured tracking + filters (volume / health over time)
 *  - Email gives instant inbox visibility ("did this booking just happen?")
 *
 * Fire-and-forget. Failures logged but never thrown.
 */
export async function notifyOwnerOpsAlert(opts: {
  subject: string;
  body: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}): Promise<void> {
  // Sentry channel — owner can build filter rules on tags.ops
  try {
    sentryCapture({
      level: 'info',
      message: opts.subject,
      tags: { ops: 'owner-alert', ...(opts.tags || {}) },
      extra: opts.extra,
    });
  } catch (err) {
    console.error('[ops alert] sentry failed:', (err as Error).message);
  }

  // Email channel — quick visual digest, no PII beyond destination
  try {
    const html = shellHtml({
      heading: opts.subject,
      accent: '#0066FF',
      subheading: 'JetMeAway · Owner ops',
      body: `<p style="margin:0 0 12px;">${opts.body}</p>
${opts.extra ? `<pre style="background:#F8FAFC;border:1px solid #E8ECF4;border-radius:8px;padding:12px;font-size:12px;color:#1A1D2B;white-space:pre-wrap;word-break:break-all;">${escapeHtml(JSON.stringify(opts.extra, null, 2))}</pre>` : ''}
<p style="margin-top:16px;font-size:13px;color:#8E95A9;">Auto-generated by JetMeAway ops pipeline. This is an INFO event, not an error.</p>`,
    });
    await sendEmail({
      to: OWNER_OPS_EMAIL,
      subject: opts.subject,
      html,
    });
  } catch (err) {
    console.error('[ops alert] email failed:', (err as Error).message);
  }
}
