import { NextRequest, NextResponse } from 'next/server';
import {
  commitBooking,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/commit

   Ryanair OTA-only step. Sits between BookAncillaries and Payment:

     /search → /book → ancillaries (seat etc.) → THIS ROUTE → iframe → /payment

   ⚠ Node runtime (undici.ProxyAgent for Fixie). ⚠ TODO before production:
   session auth.

   Body:
     { transactionId, bookingId }

   Response (200):
     { ticketStatus, currentBalance, currency, sessionToken }
     - sessionToken: pass into the iframe via the `session` URL param
     - ticketStatus: usually 'heldBooking' at this stage (becomes 'ticketed' after Payment)

   Response (4xx/5xx):
     { error }

   See: docs.sandbox.gokyte.com KH-Iframe-Ryanair.pdf — full OTA flow.
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

type Body = {
  transactionId?: string;
  bookingId?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const transactionId = (body.transactionId || '').trim();
  const bookingId = (body.bookingId || '').trim();
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  try {
    const { body: commitBody, sessionToken } = await commitBooking(bookingId, { transactionId });
    if (!sessionToken) {
      // Production iframe needs the session token. If it's missing the
      // OTA flow can't continue. Surface as 502 so the client retries
      // or surfaces the error to support.
      return NextResponse.json(
        {
          error: 'kyte commit returned no x-session-token header',
          ticketStatus: commitBody.booking?.ticketStatus,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ticketStatus: commitBody.booking?.ticketStatus,
      currentBalance: commitBody.booking?.currentBalance ?? commitBody.currentBalance,
      currency: commitBody.currency ?? commitBody.booking?.currency,
      sessionToken,
    });
  } catch (e) {
    return mapError(e);
  }
}

function mapError(err: unknown): NextResponse {
  if (err instanceof KyteConfigError) {
    return NextResponse.json({ error: 'kyte not configured' }, { status: 503 });
  }
  if (err instanceof KyteProxyError) {
    return NextResponse.json({ error: 'kyte proxy error' }, { status: 502 });
  }
  if (err instanceof KyteAuthError) {
    return NextResponse.json({ error: 'kyte auth/IP rejected' }, { status: 502 });
  }
  if (err instanceof KyteValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof KyteServerError) {
    return NextResponse.json({ error: 'kyte upstream error' }, { status: 502 });
  }
  return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
}
