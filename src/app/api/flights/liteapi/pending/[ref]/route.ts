import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { PendingFlight } from '../../start-booking/route';

export const runtime = 'edge';

/**
 * Parking gate (Kyte pattern). Flag off → 404 (same as the write routes). When
 * the flag is off start-booking never mints a record, so this route would 404
 * on lookup anyway; the explicit gate keeps the parked surface uniform.
 */
const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

/**
 * GET /api/flights/liteapi/pending/[ref]
 *
 * Returns the SANITIZED pending-flight record the /flights/liteapi/checkout/[ref]
 * page renders as a trip summary + passenger form state. NEVER exposes offerId,
 * secretKey, or transactionId (server-side booking secrets). See spec §3.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { ref } = await params;
  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  try {
    const record = await kv.get<PendingFlight>(`pending-flight:${ref}`);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      ref: record.ref,
      state: record.state,
      trip: record.trip,
      // Echoed so the checkout form can re-populate on reload. Absent until the
      // passengers step has saved.
      ...(Array.isArray(record.passengers) ? { passengers: record.passengers } : {}),
      hasContact: !!record.contact,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[flights/liteapi/pending]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
