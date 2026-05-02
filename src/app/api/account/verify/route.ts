/**
 * GET /api/account/verify?token=…
 *
 * Customer clicks the magic-link email. We verify the HMAC + expiry on the
 * token, mint a 30-day session cookie for the same email, and send them on
 * to /account/bookings.
 *
 * Why a 200 HTML interstitial and not a 303 redirect:
 *   iOS WKWebView (the engine inside the JetMeAway app) intermittently
 *   drops Set-Cookie when it's attached to a 30x response — the redirect
 *   target loads before the cookie commits to WKHTTPCookieStore, so
 *   /account/bookings runs without `jma_sess` and bounces the user back
 *   to the sign-in form. Returning a 200 page with the Set-Cookie header
 *   forces the cookie to commit before the meta-refresh / JS navigation
 *   fires, eliminating the race. Desktop browsers behave identically —
 *   they just see a 30ms blank flash then land on /account/bookings.
 *
 * On failure we still redirect back to /account with `?error=expired` —
 * no cookie to set, so no race to avoid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, createSessionToken, sessionCookieHeader } from '@/lib/session';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const email = await verifyMagicToken(token);
  if (!email) {
    return NextResponse.redirect(new URL('/account?error=expired', req.url), 303);
  }

  const sessionToken = await createSessionToken(email);
  const target = new URL('/account/bookings', req.url).toString();

  // Minimal HTML — no app shell, no fonts, no flash. Both meta-refresh and
  // an inline script point at /account/bookings so we cover JS-disabled
  // edge cases too.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing you in…</title><meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"></head><body style="font-family:system-ui,sans-serif;color:#5C6378;background:#F8FAFC;margin:0;padding:40px;text-align:center"><p>Signing you in…</p><script>window.location.replace(${JSON.stringify(target)})</script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': sessionCookieHeader(sessionToken),
    },
  });
}
