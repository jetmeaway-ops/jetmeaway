/**
 * POST /api/account/delete
 *
 * Permanent account deletion endpoint required by App Store Guideline 5.1.1(v).
 * Wipes the data tied to the signed-in email:
 *   - saved-searches:{email}              (per-user search-watch list)
 *   - {email} entry in deal_alert_subscribers   (mailing list)
 *   - The session cookie
 *
 * What we DO NOT delete:
 *   - bookings:all rows that reference this customerEmail. Those are financial
 *     records (refunds, fraud disputes, tax). The CLAUDE.md "DO NOT change KV
 *     shape" rule plus legal-retention requirements both forbid this. The
 *     /delete-account page tells the user this in plain language.
 *
 * Returns a 303 redirect to /account-deleted with the session cookie cleared.
 * 303 is safe here — this is a POST from a form on the same origin, no
 * WKWebView Set-Cookie race (the cookie clear is a Max-Age=0, the browser
 * commits it before following the redirect).
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { readSessionEmail, clearSessionCookieHeader } from '@/lib/session';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) {
    return NextResponse.redirect(new URL('/account?error=expired', req.url), 303);
  }

  await kv.del(`saved-searches:${email}`);

  const subscribers = (await kv.get<string[]>('deal_alert_subscribers')) || [];
  if (subscribers.includes(email)) {
    const next = subscribers.filter((s) => s !== email);
    await kv.set('deal_alert_subscribers', next);
  }

  const res = NextResponse.redirect(new URL('/account-deleted', req.url), 303);
  res.headers.append('Set-Cookie', clearSessionCookieHeader());
  return res;
}
