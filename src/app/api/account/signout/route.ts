/**
 * POST /api/account/signout
 *
 * Clears the session cookie and redirects home. POST-only so browsers don't
 * accidentally sign the user out via a link prefetch.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/session';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url), 303);
  res.headers.append('Set-Cookie', clearSessionCookieHeader());
  return res;
}
