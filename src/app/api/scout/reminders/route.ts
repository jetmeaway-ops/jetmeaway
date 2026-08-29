/**
 * GET /api/scout/reminders — pre-arrival reminder cron.
 *
 * Two message kinds, selected by `?kind=` (see vercel.json):
 *
 *   check-in-24h  (default, 09:00 UTC) — EMAIL + push, the day before.
 *                 The email is the guaranteed channel and now carries the
 *                 three things a guest actually needs on arrival.
 *   check-in-day  (07:00 UTC)          — PUSH only, on the morning of
 *                 check-in. "this should pop up in app notification".
 *
 * HOTELS ONLY. Flight bookings store `checkIn` as their DEPARTURE date, so
 * before this gate existed a flight customer was told "You check in tomorrow.
 * Your room at LHR → CDG is ready and waiting."
 *
 * Active-Only Shield: every send is gated by `isBookingActive()` from
 * `lib/booking-status.ts` so cancelled / refunded / completed bookings never
 * get a "see you tomorrow" message.
 *
 * Idempotent PER BOOKING PER KIND PER CHANNEL. One shared marker meant a push
 * success masked an email failure and the email never retried. The pre-2026-
 * 08-29 combined key is still read as a legacy "this kind is done" gate, so
 * bookings that already had their 24-hour reminder can never be sent a second
 * one by this change.
 *
 * Customer SMS is OFF (owner directive 2026-08-29 — "keep it to email only sms
 * cost me"). The call site below is intact and un-deleted; the gate lives in
 * lib/twilio.ts and flips back on with SMS_TO_CUSTOMERS=1.
 *
 * Vercel Cron sets a `User-Agent: vercel-cron/1.0` header. We accept that
 * OR a manual call carrying `?secret=<CRON_SECRET>` so the route can be
 * triggered ad-hoc for testing without exposing it publicly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { listBookings, type Booking } from '@/lib/bookings';
import {
  isBookingActive,
  checkInIsInDays,
  reminderSentKey,
} from '@/lib/booking-status';
import { scoutSalutation } from '@/lib/scout-greeting';
import { neighbourhoodIntel, genericIntel } from '@/lib/neighbourhood-intel';
import { sendSms } from '@/lib/twilio';
import { arrivalDetailRows, escapeHtml } from '@/lib/notifications';
import { sendCheckInPush, type CheckInPushKind } from '@/lib/booking-push';

export const runtime = 'edge';

const SITE = 'https://jetmeaway.co.uk';
/** 30 days — long enough to absorb any retry window, short enough that KV
 *  doesn't grow forever. */
const MARKER_TTL_SECONDS = 60 * 60 * 24 * 30;

function authorised(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  if (ua.toLowerCase().includes('vercel-cron')) return true;
  const provided = req.nextUrl.searchParams.get('secret') || '';
  const expected = process.env.CRON_SECRET || '';
  return Boolean(expected && provided === expected);
}

/** Default is the original 24-hour behaviour, so the existing cron entry —
 *  which carries no query string — keeps doing exactly what it did. */
function parseKind(req: NextRequest): CheckInPushKind {
  return req.nextUrl.searchParams.get('kind') === 'check-in-day'
    ? 'check-in-day'
    : 'check-in-24h';
}

function fmtFriendlyDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The property's own city, falling back to the search box text.
 *  `destination` holds what was TYPED — a booking for a hotel in Paris 75013
 *  is stored as "Eiffel Tower", which greets a Paris guest with "Hello"
 *  instead of "Bonjour" and hands them generic neighbourhood intel. */
function cityFor(booking: Booking): string {
  return (booking.hotelCity || '').trim() || (booking.destination || '').trim();
}

/** The arrival block — Address, Check-in (with the property's own opening
 *  time), Room, Room held under, Payable at the hotel. The WORDING comes from
 *  lib/notifications.ts so this email, the confirmation email and the push can
 *  never describe the same fact three different ways. Renders nothing at all
 *  on a record that carries none of the fields. */
function arrivalCardHtml(booking: Booking): string {
  const rows = arrivalDetailRows(booking);
  const hasCoords = typeof booking.lat === 'number' && typeof booking.lng === 'number';
  if (rows.length === 0 && !hasCoords) return '';

  const table = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:4px 0 0;">
  ${rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 0;color:#8E95A9;font-size:13px;width:40%;vertical-align:top;">${escapeHtml(k)}</td>
        <td style="padding:8px 0;color:#1A1D2B;font-size:14px;font-weight:600;">${escapeHtml(v)}</td>
      </tr>`,
    )
    .join('')}
</table>`
    : '';

  /* Directions from the COORDINATES, not the postal address — a hotel's
     registered address is often not its entrance. */
  const directions = hasCoords
    ? `<p style="margin:14px 0 0;">
      <a href="https://www.google.com/maps/dir/?api=1&amp;destination=${booking.lat},${booking.lng}"
         style="display:inline-block;background:#F1F5FF;border:1px solid #D6E2FF;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:800;color:#0066FF;text-decoration:none;">📍 Get directions</a>
    </p>`
    : '';

  return `
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:800;color:#0066FF;text-transform:uppercase;letter-spacing:2.5px;margin:0 0 8px;">At the desk</p>
      ${table}
      ${directions}
    </div>`;
}

function buildReminderEmail(booking: Booking): { subject: string; html: string } {
  const firstName = (booking.customerName || '').trim().split(/\s+/)[0] || '';
  const city = cityFor(booking);
  const opener = scoutSalutation(city, firstName);
  const intel = neighbourhoodIntel(city) || genericIntel(city);
  const friendlyCheckIn = fmtFriendlyDate(booking.checkIn);
  const bookingUrl = `${SITE}/account/bookings/${encodeURIComponent(booking.id)}`;

  const subject = `Tomorrow: your ${booking.title || city || 'JetMeAway'} stay`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;color:#0a1628;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${SITE}/jetmeaway-logo.png" alt="JetMeAway" width="160" style="display:inline-block;height:auto;max-width:160px;border:0;" />
      <p style="font-size:13px;color:#8E95A9;margin:8px 0 0;">Your travel scout</p>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:800;color:#0066FF;text-transform:uppercase;letter-spacing:2.5px;margin:0 0 12px;">Scout check-in · 24 hours to go</p>
      <h1 style="font-size:22px;font-weight:900;color:#0a1628;margin:0 0 14px;line-height:1.25;">${opener}</h1>
      <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 12px;">${friendlyCheckIn ? `You check in <strong>${friendlyCheckIn}</strong>.` : 'You check in tomorrow.'} ${booking.title ? `Your room at <strong>${escapeHtml(booking.title)}</strong> is ready and waiting.` : ''}</p>
      <p style="font-size:15px;line-height:1.55;color:#374151;margin:0;">Don't forget: your neighbourhood intelligence report includes the best local morning rituals and fitness spots near the hotel. Check your original confirmation for the 'Scout Sidebar' link to access your deep-neighbourhood guide.</p>
    </div>
${arrivalCardHtml(booking)}
    <div style="background:#FAF3E6;border:1px solid #E8D8A8;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:800;color:#8a6d00;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Tomorrow's Scout brief</p>
      <p style="font-size:14px;line-height:1.55;color:#1A1D2B;margin:0 0 10px;"><strong>Morning ritual.</strong> ${intel.morningRitual}</p>
      <p style="font-size:14px;line-height:1.55;color:#1A1D2B;margin:0;"><strong>Fitness / a quiet walk.</strong> ${intel.fitness}</p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${bookingUrl}" style="display:inline-block;background:#0066FF;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 28px;border-radius:10px;">Open your booking → Scout Sidebar</a>
    </div>

    <p style="font-size:14px;line-height:1.55;color:#374151;margin:24px 0 4px;">See you soon,</p>
    <p style="font-size:14px;line-height:1.55;color:#0a1628;font-weight:800;margin:0;">The JetMeAway Scout Team</p>

    <div style="text-align:center;padding:16px 0;border-top:1px solid #E8ECF4;margin-top:24px;">
      <p style="font-size:12px;color:#8E95A9;margin:0 0 4px;">Questions? Contact us at <a href="mailto:contact@jetmeaway.co.uk" style="color:#0066FF;">contact@jetmeaway.co.uk</a></p>
      <p style="font-size:11px;color:#B0B8CC;margin:0;">JETMEAWAY LTD (Company No: 17140522) · 66 Paul Street, London</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

function buildReminderSms(booking: Booking): string {
  const firstName = (booking.customerName || '').trim().split(/\s+/)[0] || '';
  const city = cityFor(booking) || 'your destination';
  const opener = scoutSalutation(city, firstName);
  const bookingUrl = `${SITE}/account/bookings/${encodeURIComponent(booking.id)}`;
  return (
    `${opener} 24 hours to ${city}. ` +
    `Your Scout Sidebar (morning rituals + fitness near the hotel) is on your booking page: ${bookingUrl} ` +
    `— See you soon, JetMeAway`
  );
}

async function sendReminderEmail(booking: Booking): Promise<boolean> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY || !booking.customerEmail) return false;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_KEY);
    const { subject, html } = buildReminderEmail(booking);
    await resend.emails.send({
      from: 'JetMeAway Scout <bookings@jetmeaway.co.uk>',
      to: booking.customerEmail,
      subject,
      html,
      replyTo: 'contact@jetmeaway.co.uk',
    });
    return true;
  } catch (err) {
    // No booking data in the log line — an error object from a mailer can
    // carry the recipient address (Privacy Shield).
    console.error('[scout/reminders] email send failed', err instanceof Error ? err.message : 'unknown');
    return false;
  }
}

/** Read a marker without letting a KV blip look like "already sent". A throw
 *  propagates to the per-booking catch, which skips that ONE booking. */
async function alreadySent(key: string): Promise<boolean> {
  return Boolean(await kv.get<string>(key));
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }

  const startedAt = Date.now();
  // Both members of CheckInPushKind are also members of ReminderKind, so this
  // is accepted by reminderSentKey() without a cast.
  const kind: CheckInPushKind = parseKind(req);
  const days = kind === 'check-in-day' ? 0 : 1;
  /* Day-of is PUSH ONLY. The guest already had the full arrival email
     yesterday; a second email every morning is volume the owner did not ask
     for, and he asked specifically for an app notification. */
  const wantEmail = kind === 'check-in-24h';

  const all = await listBookings();
  const now = new Date();

  // Filter: active + check-in on the target day.
  //
  // 🔴 NOT gated on type here. The arrival facts and the check-in push are
  // hotel-only, and each self-gates (arrivalDetailRows() and buildCheckInPush()
  // both return empty for a flight). Filtering the whole loop to hotels would
  // silently delete the flight 24-hour reminder — a live customer email — in a
  // change whose purpose is hotel wording. The one exception is the check-in-DAY
  // run, which is a hotel concept only.
  const candidates: Booking[] = [];
  for (const b of all) {
    if (kind === 'check-in-day' && b.type !== 'hotel') continue;
    if (!isBookingActive(b, now)) continue;
    if (!checkInIsInDays(b, days, now)) continue;
    candidates.push(b);
  }

  let emailsSent = 0;
  let smsSent = 0;
  let pushesSent = 0;
  let pushDevicesFound = 0;
  let skippedAlreadySent = 0;
  let skippedNoDevices = 0;
  let skippedUnsociableHour = 0;
  const failures: Array<{ ref: string; reason: string }> = [];

  for (const b of candidates) {
    try {
      /* Pre-2026-08-29 combined marker. When it exists this kind is finished
         for this booking — treat BOTH channels as done so the switch to
         per-channel keys can never re-send a reminder the guest already had. */
      const legacyDone =
        kind === 'check-in-24h' ? await alreadySent(reminderSentKey(b.id, kind)) : false;

      const emailKey = reminderSentKey(b.id, kind, 'email');
      const pushKey = reminderSentKey(b.id, kind, 'push');
      const smsKey = reminderSentKey(b.id, kind, 'sms');

      const emailDone = legacyDone || (wantEmail ? await alreadySent(emailKey) : true);
      const pushDone = legacyDone || (await alreadySent(pushKey));

      if (emailDone && pushDone) { skippedAlreadySent++; continue; }

      // ── EMAIL — the guaranteed channel. Runs first and independently: a
      //    push failure below can never stop it, and vice versa.
      if (!emailDone && b.customerEmail) {
        const ok = await sendReminderEmail(b);
        if (ok) {
          emailsSent++;
          await kv.set(emailKey, new Date().toISOString(), { ex: MARKER_TTL_SECONDS });
        } else {
          failures.push({ ref: b.id, reason: 'email failed' });
        }
      }

      // ── PUSH — best effort. Most bookings resolve to zero devices (guest
      //    checkout has no session, so no token is bound to the email); that
      //    is a normal outcome, not a failure, and never touches the email.
      if (!pushDone) {
        const out = await sendCheckInPush(b, kind, now);
        pushDevicesFound += out.tokens;
        pushesSent += out.delivered;
        if (out.skipped === 'no-tokens') skippedNoDevices++;
        if (out.skipped === 'unsociable-hour') skippedUnsociableHour++;
        if (out.delivered > 0) {
          await kv.set(pushKey, new Date().toISOString(), { ex: MARKER_TTL_SECONDS });
        }
      }

      // ── SMS — gated OFF at the Twilio layer (audience defaults to
      //    'customer'; SMS_TO_CUSTOMERS is unset). Left intact so setting the
      //    env var restores it with idempotency still holding. Only ever runs
      //    for the 24-hour message.
      if (wantEmail && b.customerPhone && !legacyDone && !(await alreadySent(smsKey))) {
        const sms = await sendSms(b.customerPhone, buildReminderSms(b));
        if (sms.ok) {
          smsSent++;
          await kv.set(smsKey, new Date().toISOString(), { ex: MARKER_TTL_SECONDS });
        }
      }
    } catch (err) {
      // One booking failing must never abort the run for the rest.
      failures.push({ ref: b.id, reason: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({
    success: true,
    kind,
    runAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    candidates: candidates.length,
    emailsSent,
    pushesSent,
    pushDevicesFound,
    smsSent,
    skippedAlreadySent,
    skippedNoDevices,
    skippedUnsociableHour,
    failures,
  });
}
