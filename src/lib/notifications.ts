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

import { sendSms } from './twilio';
import type { Booking } from './bookings';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = 'JetMeAway <bookings@jetmeaway.co.uk>';
const REPLY_TO = 'contact@jetmeaway.co.uk';

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

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(iso: string | null): string {
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
        <td style="padding:8px 0;color:#8E95A9;font-size:13px;width:40%;">${k}</td>
        <td style="padding:8px 0;color:#1A1D2B;font-size:14px;font-weight:600;">${v}</td>
      </tr>`,
    )
    .join('')}
</table>`;
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
  if (booking.checkIn) rows.push([isFlight ? 'Travel date' : 'Check-in', formatDate(booking.checkIn)]);
  if (booking.checkOut && !isFlight) rows.push(['Check-out', formatDate(booking.checkOut)]);
  if (booking.guests) rows.push([isFlight ? 'Passengers' : 'Guests', String(booking.guests)]);
  rows.push(['Total paid', formatPrice(booking.totalPence)]);

  const supplierNote = isFlight
    ? `Your e-ticket will arrive directly from the airline within a few hours. If you haven't received it by tomorrow, check your spam folder or reply to this email.`
    : `Your hotel confirmation voucher will arrive by email shortly. Present it at check-in.`;

  const body = `
    <p style="margin:0 0 12px 0;color:#1A1D2B;">Hi ${escapeHtml(booking.customerName || 'there')},</p>
    <p style="margin:0 0 16px 0;">We've confirmed your booking. Here are the details:</p>
    ${detailsTable(rows)}
    <p style="margin:16px 0 0 0;color:#5C6378;font-size:14px;">${supplierNote}</p>
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

export async function notifyBookingConfirmed(booking: Booking): Promise<void> {
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
    tasks.push(sendSms(booking.customerPhone, confirmationSms(booking)));
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
  const refundLine = booking.stripePaymentId
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
      ['Reason', escapeHtml(friendlyReason(reason))],
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
  const refundBit = booking.stripePaymentId ? ' Full refund issued.' : '';
  return `JetMeAway: We couldn't complete your ${booking.type === 'flight' ? 'flight' : 'hotel'} booking ${booking.id}.${refundBit} Check your email for details — reply or email contact@jetmeaway.co.uk.`;
}

export async function notifyBookingDeclined(booking: Booking, reason: string): Promise<void> {
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
    tasks.push(sendSms(booking.customerPhone, declineSms(booking)));
  }
  try {
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('notifyBookingDeclined:', err);
  }
}

/* -------------------------------- utils ---------------------------------- */

function escapeHtml(s: string): string {
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
function friendlyReason(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('offer') && (r.includes('unavailable') || r.includes('no longer'))) {
    return 'The fare was withdrawn by the airline before we could confirm.';
  }
  if (r.includes('drift') || r.includes('price')) {
    return 'The price changed between quote and confirmation.';
  }
  if (r.includes('ancillary') || r.includes('service')) {
    return 'One of the extras you selected became unavailable.';
  }
  if (r.includes('duffel') || r.includes('supplier') || r.includes('balance')) {
    return 'The airline rejected the booking at the last step.';
  }
  if (r.includes('liteapi') || r.includes('hotel')) {
    return 'The hotel could not confirm availability at the last step.';
  }
  return 'A technical issue prevented us from completing the booking.';
}
