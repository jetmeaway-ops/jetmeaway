import { NextRequest, NextResponse } from 'next/server';
import {
  retrieveBooking,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type RetrieveInfoKey,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/retrieve

   Final step in the booking flow — pulls the airline-issued booking
   record back from Kyte for confirmation pages, IVR lookup, and admin.

   ⚠ Node runtime. ⚠ TODO before production: session auth.

   Body:
     { transactionId, bookingId, forceRefresh?, requestedInfo? }

   Response (200): full Kyte retrieve response (passed through)
   Response (4xx/5xx): { error }

   Per Kyte: `forceRefresh: true` after payment to pull the latest from
   the airline. Default `false` for subsequent reads (cache).
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_INFO: RetrieveInfoKey[] = [
  'PNR',
  'passengerDetails',
  'ticketInfo',
  'itinerary',
  'ancillaries',
  'paymentInfo',
  'pricingBreakdown',
];

type Body = {
  transactionId?: string;
  bookingId?: string;
  forceRefresh?: boolean;
  requestedInfo?: RetrieveInfoKey[];
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

  const requestedInfo = Array.isArray(body.requestedInfo)
    ? body.requestedInfo.filter((k): k is RetrieveInfoKey => VALID_INFO.includes(k))
    : undefined;

  try {
    const res = await retrieveBooking(
      bookingId,
      { forceRefresh: body.forceRefresh === true, requestedInfo },
      { transactionId },
    );
    return NextResponse.json(res);
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
