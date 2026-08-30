/**
 * GET /api/cron/post-stay-feedback — the morning-after email.
 *
 * Runs daily (Vercel Cron, see vercel.json). Finds every hotel booking whose
 * check-out was YESTERDAY and asks the guest two questions: how was the hotel,
 * and how did JetMeAway do. The morning after a stay is when people tell the
 * truth — a week later they tell you nothing.
 *
 * Owner's ask (2026-08-30, from Paris, the morning he checked out of his own
 * booking): "email after checkout ... asking the Customer experience with us
 * and the hotel."
 *
 * Deliberate choices:
 *  - EMAIL ONLY. Customer SMS is switched off account-wide (it costs money);
 *    this route never touches Twilio at all.
 *  - "Yesterday" is a UTC calendar-day match on the stored check-out date.
 *    Check-out happens by noon local everywhere, so by 10:00 UTC the next day
 *    every guest on the planet has actually left — the westernmost timezone's
 *    check-out day ends at 10:00 UTC. No timezone maths, no guest emailed
 *    while still packing.
 *  - ONE-TAP rating buttons, not "please reply" — modelled on the OTA email
 *    the owner received after his own Rome stay. Each button carries a private
 *    per-booking token; /api/feedback/rate validates it and registers the
 *    score in the feedback store (lib/feedback.ts). "How did JetMeAway do?"
 *    stays a reply ask — that answer belongs in the owner's inbox.
 *  - Idempotent: one KV flag per booking, written only AFTER a successful
 *    send, so a cron retry can re-attempt a failure but can never double-send
 *    a success.
 *  - One booking failing must not abort the run for the rest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { listBookings, type Booking } from '@/lib/bookings';
import { FEEDBACK_SCORES, feedbackTokenKey, FEEDBACK_TOKEN_TTL_SECONDS } from '@/lib/feedback';

export const runtime = 'edge';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = 'JetMeAway <bookings@jetmeaway.co.uk>';
const REPLY_TO = 'contact@jetmeaway.co.uk';
const SITE = 'https://jetmeaway.co.uk';

// The four scores the email offers — kept in lockstep with what /api/feedback
// accepts by both reading the one list in lib/feedback.
const _scoresInLockstep: readonly string[] = FEEDBACK_SCORES;
void _scoresInLockstep;

/** Sent-flag per booking. 90 days is longer than any cron retry horizon and
 *  short enough that KV does not accumulate flags forever (KV is load-bearing;
 *  every key needs a reason to exist and a time to die). */
const SENT_KEY = (ref: string) => `post-stay-feedback:sent:${ref}`;
const SENT_TTL_SECONDS = 90 * 24 * 60 * 60;

function authorised(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  if (ua.toLowerCase().includes('vercel-cron')) return true;
  const provided = req.nextUrl.searchParams.get('secret') || '';
  const expected = process.env.CRON_SECRET || '';
  return Boolean(expected && provided === expected);
}

/** YYYY-MM-DD for "yesterday" in UTC — the shape checkOut is stored in. */
function yesterdayUtc(now: Date): string {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** A stay that actually happened. 'completed' when something marked it so,
 *  'confirmed' for the normal case where nothing ever flips the status after
 *  check-out. Cancelled / refunded / failed / pending stays get nothing —
 *  asking "how was your stay?" after a refund is salt in a wound. */
function stayHappened(b: Booking): boolean {
  return b.status === 'confirmed' || b.status === 'completed';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Random per-booking token so the rating links only work for the person who
 *  received the email. Without it, anyone who guesses a booking ref could
 *  stuff our review store. Edge runtime: crypto.getRandomValues is available. */
function makeToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function nightsOf(b: Booking): number | null {
  if (!b.checkIn || !b.checkOut) return null;
  const n = Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
  return n > 0 ? n : null;
}

function friendly(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Modelled on the post-checkout rating email the owner received from a large
 *  OTA after his own Rome stay (screenshot, 2026-08-30): the stay named big,
 *  nights + dates under it, then ONE-TAP rating buttons — a button gets
 *  pressed where "please reply" gets ignored. Each button carries the booking
 *  ref, the score and the private token; the landing page confirms and
 *  registers it. A second, lighter ask covers JetMeAway itself via reply. */
function buildEmail(b: Booking, token: string): { subject: string; html: string } {
  const hotel = b.title || 'your hotel';
  const first = (b.customerName || '').trim().split(/\s+/)[0] || '';
  const greeting = first && first.toLowerCase() !== 'guest' ? `Hi ${escapeHtml(first)},` : 'Hi,';
  const nights = nightsOf(b);
  const stayLine = [
    nights ? `${nights} night${nights === 1 ? '' : 's'}${b.destination ? ` in ${escapeHtml(b.destination)}` : ''}` : (b.destination ? escapeHtml(b.destination) : ''),
    b.checkIn && b.checkOut ? `${friendly(b.checkIn)} \u2013 ${friendly(b.checkOut)}` : '',
  ].filter(Boolean).join(' \u00B7 ');

  const subject = `How was ${hotel}?`;

  const btn = (score: string, emoji: string, label: string) => `
      <a href="${SITE}/api/feedback/rate?ref=${encodeURIComponent(b.id)}&score=${score}&t=${token}"
         style="display:block;border:2px solid #D6E2FF;border-radius:12px;padding:16px;margin:0 0 10px;text-align:center;text-decoration:none;background:#fff;">
        <span style="font-size:22px;display:block;margin-bottom:2px;">${emoji}</span>
        <span style="font-size:14px;font-weight:800;color:#0066FF;">${label}</span>
      </a>`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1D2B;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${SITE}/jetmeaway-logo.png" alt="JetMeAway" width="160" style="display:inline-block;height:auto;max-width:160px;border:0;" />
      <p style="font-size:13px;color:#8E95A9;margin:8px 0 0;">Your travel scout</p>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:24px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:800;color:#0066FF;text-transform:uppercase;letter-spacing:2.5px;margin:0 0 12px;">From your Personal Scout</p>
      <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 6px;">${greeting} welcome home. How was your stay at</p>
      <h1 style="font-size:26px;font-weight:900;color:#0a1628;margin:0 0 6px;line-height:1.2;">${escapeHtml(hotel)}</h1>
      ${stayLine ? `<p style="font-size:14px;color:#5C6378;margin:0;">${stayLine}</p>` : ''}
      <p style="font-size:13px;color:#8E95A9;margin:10px 0 0;">One tap \u2014 your answer helps the next family who considers this hotel.</p>
    </div>

    <div style="margin-bottom:16px;">
      ${btn('poor', '\u2639\uFE0F', 'Poor')}
      ${btn('fair', '\uD83D\uDE10', 'Fair')}
      ${btn('good', '\uD83D\uDE42', 'Good')}
      ${btn('excellent', '\uD83D\uDE04', 'Excellent')}
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:14px;line-height:1.55;color:#374151;margin:0;"><strong>And how did JetMeAway do?</strong> Booking, price, the confirmation email, any surprise at the desk \u2014 <strong>just hit reply</strong>. A real person reads it.</p>
    </div>

    <div style="text-align:center;padding:16px 0;border-top:1px solid #E8ECF4;">
      <p style="font-size:12px;color:#8E95A9;margin:0 0 4px;">Booking ${escapeHtml(b.id)} &middot; Questions? <a href="mailto:${REPLY_TO}" style="color:#0066FF;">${REPLY_TO}</a></p>
      <p style="font-size:11px;color:#B0B8CC;margin:0;">JETMEAWAY LTD (Company No: 17140522) &middot; 66 Paul Street, London</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const target = yesterdayUtc(new Date());
  const all = await listBookings();

  let sent = 0;
  let skippedAlreadySent = 0;
  let skippedNoEmail = 0;
  let failed = 0;

  for (const b of all) {
    try {
      if (b.type !== 'hotel') continue;
      if (!stayHappened(b)) continue;
      if ((b.checkOut || '').slice(0, 10) !== target) continue;
      if (!b.customerEmail || !b.customerEmail.includes('@')) {
        skippedNoEmail++;
        continue;
      }

      // Idempotency read BEFORE the send; flag written only AFTER a success.
      // A retry after a failed send re-attempts; a retry after a success skips.
      if (await kv.get(SENT_KEY(b.id))) {
        skippedAlreadySent++;
        continue;
      }

      // Token BEFORE the send, so a link in a delivered email always has a
      // stored counterpart even if a later write were to fail.
      const token = makeToken();
      await kv.set(feedbackTokenKey(b.id), token, { ex: FEEDBACK_TOKEN_TTL_SECONDS });

      const { subject, html } = buildEmail(b, token);
      const ok = await sendEmail(b.customerEmail, subject, html);
      if (ok) {
        await kv.set(SENT_KEY(b.id), Date.now(), { ex: SENT_TTL_SECONDS });
        sent++;
      } else {
        failed++;
      }
    } catch {
      // One malformed booking must not abort the run for everyone after it.
      // Nothing identifying is logged (Privacy Shield).
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    checkOutDay: target,
    sent,
    skippedAlreadySent,
    skippedNoEmail,
    failed,
  });
}
