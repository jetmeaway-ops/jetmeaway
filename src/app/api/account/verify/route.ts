/**
 * GET /api/account/verify?token=…
 *
 * Customer clicks the magic-link email. We verify the HMAC + expiry on the
 * token, mint a 30-day session cookie for the same email, and redirect them
 * to /account.
 *
 * On failure we redirect back to /account with a `?error=expired` query so
 * the page can show a friendly "this link expired, request another" state.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, createSessionToken, sessionCookieHeader } from '@/lib/session';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const email = await verifyMagicToken(token);
  if (!email) {
    // Redirect back to /account with the error — no point showing raw JSON.
    return NextResponse.redirect(new URL('/account?error=expired', req.url), 303);
  }

  const sessionToken = await createSessionToken(email);
  const res = NextResponse.redirect(new URL('/account/bookings', req.url), 303);
  // Set the session cookie via raw header so we control the flags in one
  // place (see sessionCookieHeader for the flag set).
  res.headers.append('Set-Cookie', sessionCookieHeader(sessionToken));
  return res;
}
