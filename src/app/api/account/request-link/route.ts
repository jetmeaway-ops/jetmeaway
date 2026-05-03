/**
 * POST /api/account/request-link
 *
 * Customer enters their email on /account. We mint a signed magic-link token
 * (valid 1 hour) and email it via Resend. Clicking the link hits
 * /api/account/verify which swaps the magic token for a session cookie.
 *
 * Important: we ALWAYS return { success: true } regardless of whether the
 * email matches a booking. This prevents address-enumeration attacks — an
 * attacker can't tell from our response whether a given email has booked.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMagicToken, normaliseEmail } from '@/lib/session';

export const runtime = 'edge';

function originOf(req: NextRequest): string {
  // Prefer the forwarded host (when behind Vercel's edge) so the link in the
  // email points at the public domain, not a preview URL. Fall back to the
  // request URL's origin.
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normaliseEmail(body?.email);
    if (!email) {
      return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
    }

    const token = await createMagicToken(email);
    const link = `${originOf(req)}/api/account/verify?token=${encodeURIComponent(token)}`;

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) {
      // Same error-shape as contact route — log, don't leak.
      console.error('[account/request-link] RESEND_API_KEY not set');
      // Return success anyway so callers can't probe our config.
      return NextResponse.json({ success: true });
    }

    // Scout-toned email. Plain-text body included for clients that block HTML.
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0a1628;">
        <h1 style="font-size:22px;margin:0 0 12px;color:#0a1628;">Sign in to JetMeAway</h1>
        <p style="font-size:15px;line-height:1.55;color:#5C6378;margin:0 0 20px;">
          Tap the button below to open your trips. The link is good for the next hour — if it expires, just request a new one.
        </p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;background:#0a1628;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:15px;">
            Open my trips →
          </a>
        </p>
        <p style="font-size:13px;line-height:1.55;color:#8E95A9;margin:0 0 6px;">
          Or paste this into your browser:
        </p>
        <p style="font-size:12px;word-break:break-all;color:#5C6378;margin:0 0 28px;">${link}</p>
        <hr style="border:none;border-top:1px solid #E8ECF4;margin:24px 0;" />
        <p style="font-size:12px;color:#8E95A9;margin:0;">
          If you didn't ask for this, you can safely ignore the email — no one can sign in without clicking the link.
        </p>
      </div>
    `;
    const text = [
      'Sign in to JetMeAway',
      '',
      'Open your trips using this link (valid for 1 hour):',
      link,
      '',
      "If you didn't request this, you can ignore the email.",
    ].join('\n');

    // Build the unsubscribe / preferences URL up-front. Magic-link emails
    // are transactional, so "unsubscribe" really means "stop trying to
    // sign me in" — point at /contact rather than a marketing-prefs page.
    const unsubscribeUrl = `${originOf(req)}/contact?topic=email-stop&e=${encodeURIComponent(email)}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'JetMeAway <account@jetmeaway.co.uk>',
        reply_to: 'contact@jetmeaway.co.uk',
        to: [email],
        // Subject change: "sign-in link" is a known phishing-keyword
        // trigger across Gmail/M365 spam scoring. "Open your trips" is
        // value-led and reads as transactional.
        subject: 'Open your JetMeAway trips',
        html,
        text,
        // RFC 8058 / Gmail+Yahoo bulk-sender requirement. Even for
        // transactional mail, including these headers signals
        // "legitimate sender that respects opt-out" and keeps us out
        // of the junk bucket while domain reputation is young.
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:contact@jetmeaway.co.uk?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `magic-link-${Date.now()}`,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[account/request-link] Resend error:', errBody);
      // Still return success — don't tip off spammers which addresses exist.
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[account/request-link]', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
