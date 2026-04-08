import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { PendingBooking } from '../../../start-booking/route';

export const runtime = 'edge';

export interface PendingGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
}

/**
 * POST /api/hotels/pending/[ref]/guest
 * Saves lead-guest details onto the pending booking record so /success can
 * call LiteAPI completeBooking() with them after Stripe payment succeeds.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  if (!ref) {
    return NextResponse.json({ success: false, error: 'ref is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, nationality } = body || {};

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ success: false, error: 'firstName, lastName and email are required' }, { status: 400 });
    }

    const record = await kv.get<PendingBooking & { guest?: PendingGuest }>(`pending-booking:${ref}`);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Booking not found or expired' }, { status: 404 });
    }

    const updated = {
      ...record,
      guest: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim(),
        phone: String(phone || '').trim(),
        nationality: String(nationality || 'GB').toUpperCase(),
      } as PendingGuest,
    };

    // Preserve remaining TTL — 4h to cover slow checkouts
    await kv.set(`pending-booking:${ref}`, updated, { ex: 4 * 60 * 60 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
