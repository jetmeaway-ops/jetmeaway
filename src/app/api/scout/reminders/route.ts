/**
 * GET /api/scout/reminders — 24-hour pre-check-in reminder cron.
 *
 * Triggered daily by Vercel Cron (see vercel.json). Walks the unified
 * `bookings:all` store, finds every booking whose check-in is exactly
 * tomorrow (calendar-day match), and fires a Scout-voice reminder via
 * email + SMS. Idempotent — once a reminder is sent for a given ref we
 * set a KV flag so a retry / duplicate run never double-sends.
 *
 * Active-Only Shield: every send is gated by `isBookingActive()` from
 * `lib/booking-status.ts` so cancelled / refunded / completed bookings
 * never get a "see you tomorrow" message.
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

export const runtime = 'edge';

const SITE = 'https://jetmeaway.co.uk';

function authorised(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  if (ua.toLowerCase().includes('vercel-cron')) return true;
  const provided = req.nextUrl.searchParams.get('secret') || '';
  const expected = process.env.CRON_SECRET || '';
  return Boolean(expected && provided === expected);
}

function fmtFriendlyDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildReminderEmail(booking: Booking): { subject: string; html: string } {
  const firstName = (booking.customerName || '').trim().split(/\s+/)[0] || '';
  const city = booking.destination || '';
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
      <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 12px;">${friendlyCheckIn ? `You check in <strong>${friendlyCheckIn}</strong>.` : 'You check in tomorrow.'} ${booking.title ? `Your room at <strong>${booking.title}</strong> is ready and waiting.` : ''}</p>
      <p style="font-size:15px;line-height:1.55;color:#374151;margin:0;">Don't forget: your neighbourhood intelligence report includes the best local morning rituals and fitness spots near the hotel. Check your original confirmation for the 'Scout Sidebar' link to access your deep-neighbourhood guide.</p>
    </div>

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
  const city = booking.destination || 'your destination';
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
    console.error('[scout/reminders] email send failed', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }

  const startedAt = Date.now();
  const all = await listBookings();
  const now = new Date();

  // Filter: active + check-in tomorrow + reminder not yet sent.
  const candidates: Booking[] = [];
  for (const b of all) {
    if (!isBookingActive(b, now)) continue;
    if (!checkInIsInDays(b, 1, now)) continue;
    candidates.push(b);
  }

  let emailsSent = 0;
  let smsSent = 0;
  let skippedAlreadySent = 0;
  const failures: Array<{ ref: string; reason: string }> = [];

  for (const b of candidates) {
    const idemp = reminderSentKey(b.id, 'check-in-24h');
    try {
      const already = await kv.get<string>(idemp);
      if (already) { skippedAlreadySent++; continue; }

      // Best-effort: don't fail the whole batch if one channel errors.
      let didEmail = false;
      let didSms = false;
      if (b.customerEmail) {
        didEmail = await sendReminderEmail(b);
        if (didEmail) emailsSent++;
      }
      if (b.customerPhone) {
        const sms = await sendSms(b.customerPhone, buildReminderSms(b));
        didSms = sms.ok;
        if (didSms) smsSent++;
      }

      // Mark sent only when at least one channel succeeded — otherwise we'd
      // never retry on a transient Resend / Twilio outage.
      if (didEmail || didSms) {
        // Keep the marker for 30 days — long enough to absorb any retry
        // window, short enough that KV doesn't grow forever.
        await kv.set(idemp, new Date().toISOString(), { ex: 60 * 60 * 24 * 30 });
      } else {
        failures.push({ ref: b.id, reason: 'no channel succeeded' });
      }
    } catch (err) {
      failures.push({ ref: b.id, reason: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({
    success: true,
    runAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    candidates: candidates.length,
    emailsSent,
    smsSent,
    skippedAlreadySent,
    failures,
  });
}
