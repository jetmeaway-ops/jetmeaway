import { NextRequest, NextResponse } from 'next/server';
import {
  bookAncillaries,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type BookAncillariesRequest,
  type BookAncillaryEntry,
  type BookAncillaryType,
  type BookAncillaryAction,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/ancillaries/book

   Adds (or removes) an ancillary on an existing booking — typically a
   seat selection for the bundle-fare carriers (easyJet, Ryanair) and
   optional bags / sports kit.

   ⚠ Node runtime.

   Body:
     {
       transactionId, bookingId,
       passengers: [
         {
           id: '1' | 'P1' | ...,
           ancillaries: [
             { id: '12A', type: 'seat', action: 'add', quantity: 1,
               flightSegments: ['U28672-LGW-AMS'] }
           ]
         }
       ]
     }

   Response (200): pass-through. The new `currentBalance` reflects the
   updated total after the ancillary fee.
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_ACTIONS: BookAncillaryAction[] = ['add', 'remove'];
const VALID_TYPES: BookAncillaryType[] = [
  'seat',
  'bag',
  'meal',
  'sportsEquipment',
  'service',
  'bundle',
];

type InEntry = {
  id?: string;
  type?: BookAncillaryType;
  action?: BookAncillaryAction;
  quantity?: number;
  flightSegments?: string[];
};
type InPassenger = { id?: string; ancillaries?: InEntry[] };
type Body = {
  transactionId?: string;
  bookingId?: string;
  passengers?: InPassenger[];
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

  const inPax = Array.isArray(body.passengers) ? body.passengers : [];
  if (inPax.length === 0) {
    return NextResponse.json({ error: 'at least one passenger entry is required' }, { status: 400 });
  }

  const passengers: BookAncillariesRequest['passengers'] = [];
  for (let i = 0; i < inPax.length; i++) {
    const p = inPax[i] || {};
    const paxId = (p.id || '').trim();
    if (!paxId) {
      return NextResponse.json(
        { error: `passengers[${i}].id is required` },
        { status: 400 },
      );
    }
    const ancs: BookAncillaryEntry[] = [];
    const inAncs = Array.isArray(p.ancillaries) ? p.ancillaries : [];
    for (let j = 0; j < inAncs.length; j++) {
      const a = inAncs[j] || {};
      const ancId = (a.id || '').trim();
      const ancType = a.type;
      const ancAction = a.action;
      const qty = Number(a.quantity);
      const segs = Array.isArray(a.flightSegments) ? a.flightSegments.filter(Boolean) : [];
      if (!ancId || !ancType || !ancAction || !Number.isInteger(qty) || qty < 1 || segs.length === 0) {
        return NextResponse.json(
          {
            error: `passengers[${i}].ancillaries[${j}] requires id, type, action, quantity, flightSegments`,
          },
          { status: 400 },
        );
      }
      if (!VALID_TYPES.includes(ancType)) {
        return NextResponse.json(
          { error: `unknown ancillary type ${ancType}` },
          { status: 400 },
        );
      }
      if (!VALID_ACTIONS.includes(ancAction)) {
        return NextResponse.json(
          { error: `unknown ancillary action ${ancAction}` },
          { status: 400 },
        );
      }
      ancs.push({ id: ancId, type: ancType, action: ancAction, quantity: qty, flightSegments: segs });
    }
    passengers.push({ id: paxId, ancillaries: ancs });
  }

  try {
    const res = await bookAncillaries(bookingId, { passengers }, { transactionId });
    return NextResponse.json({
      currentBalance: res.currentBalance ?? res.booking?.currentBalance,
      currency: res.currency || res.booking?.currency,
      raw: res,
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
