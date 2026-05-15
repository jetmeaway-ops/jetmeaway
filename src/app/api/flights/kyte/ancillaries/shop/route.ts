import { NextRequest, NextResponse } from 'next/server';
import {
  shopAncillaries,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/ancillaries/shop

   Post-Book lookup for available ancillaries on an existing booking.
   Returns the seatMap (per segment) + bag offerings so the customer can
   pick a seat (mandatory for easyJet/Ryanair bundle fares) and bag.

   ⚠ Node runtime (undici.ProxyAgent). Pass `bookingId` for post-Book
   ancillaries (the standard customer flow). The same Kyte endpoint also
   accepts `offerId` for pre-Book browsing — exposed via the `id` field
   so the route doesn't care which.

   Body:
     { transactionId, id (bookingId or offerId), types? }
       types = subset of ['bag','seat','meal','sportsEquipment','service','bundle']
       defaults to ['seat','bag']

   Response (200): pass-through Kyte response
     { seatMap?, bags?, currency, errors, warnings, ... }
   Response (4xx/5xx): { error }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_TYPES = ['bag', 'seat', 'meal', 'sportsEquipment', 'service', 'bundle'] as const;
type AncillaryType = typeof VALID_TYPES[number];

type Body = {
  transactionId?: string;
  id?: string;
  bookingId?: string;
  offerId?: string;
  types?: AncillaryType[];
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const transactionId = (body.transactionId || '').trim();
  const id = (body.id || body.bookingId || body.offerId || '').trim();
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id (bookingId or offerId) is required' }, { status: 400 });
  }

  const types = Array.isArray(body.types)
    ? (body.types.filter((t): t is AncillaryType =>
        (VALID_TYPES as readonly string[]).includes(t),
      ) as AncillaryType[])
    : (['seat', 'bag'] as AncillaryType[]);

  try {
    const res = await shopAncillaries(id, types, { transactionId });
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
