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
 * Two response shapes, switched by `Accept` header:
 *   - `Accept: application/json` (native iOS/Android app) → JSON body, cookie
 *     cleared via Set-Cookie. Lets the native client call signOut() locally
 *     and route to the home tab without ever leaving the app.
 *   - default (web `<form>` POST) → 303 redirect to /account-deleted with the
 *     session cookie cleared. Same behaviour as before.
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { readSessionEmail, clearSessionCookieHeader } from '@/lib/session';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const wantsJson = (req.headers.get('accept') || '').toLowerCase().includes('application/json');
  const email = await readSessionEmail(req.headers.get('cookie'));

  if (!email) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, error: 'not_signed_in' },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL('/account?error=expired', req.url), 303);
  }

  await kv.del(`saved-searches:${email}`);

  const subscribers = (await kv.get<string[]>('deal_alert_subscribers')) || [];
  if (subscribers.includes(email)) {
    const next = subscribers.filter((s) => s !== email);
    await kv.set('deal_alert_subscribers', next);
  }

  if (wantsJson) {
    const res = NextResponse.json({ ok: true, email });
    res.headers.append('Set-Cookie', clearSessionCookieHeader());
    return res;
  }

  const res = NextResponse.redirect(new URL('/account-deleted', req.url), 303);
  res.headers.append('Set-Cookie', clearSessionCookieHeader());
  return res;
}
