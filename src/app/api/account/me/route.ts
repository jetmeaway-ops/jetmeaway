/**
 * GET /api/account/me
 *
 * Returns the signed-in customer's email and their bookings (filtered by
 * customerEmail from the unified bookings KV). 401 when there's no session.
 *
 * This is the single API call /account/bookings uses — keeps the page
 * component small and server-agnostic.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSessionEmail } from '@/lib/session';
import { listBookings } from '@/lib/bookings';

// Node runtime — `listBookings` reads from Vercel KV, and we also want
// reliable cookie parsing in production behind Vercel's edge. KV works from
// both runtimes, but node is the safer default for a data read.
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  // Fetch all bookings and filter by email. This is the same store the admin
  // dashboard reads from, which is currently small; we can swap in an
  // indexed-by-email read later without breaking the contract.
  const all = await listBookings();
  const mine = all.filter((b) => (b.customerEmail || '').toLowerCase() === email);

  // Strip internal/sensitive fields before returning to the customer. They
  // don't need to see margin, netPence, stripePaymentId.
  const bookings = mine.map((b) => ({
    id: b.id,
    type: b.type,
    supplier: b.supplier,
    supplierRef: b.supplierRef,
    status: b.status,
    title: b.title,
    destination: b.destination,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    totalPence: b.totalPence,
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));

  return NextResponse.json({ success: true, email, bookings });
}
