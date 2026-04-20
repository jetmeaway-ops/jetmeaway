import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listBookings } from '@/lib/bookings';
import { getBookingFromSupplier } from '@/lib/liteapi';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/admin/reconcile-liteapi
 *
 * Admin-only. For every booking we hold that has a LiteAPI supplierRef,
 * asks LiteAPI what it thinks the current state is. Returns a side-by-side
 * report so we can see which records are genuinely live on the supplier
 * vs already cancelled/missing.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const all = await listBookings();
  const liteapiBookings = all.filter(
    (b) => b.supplier === 'liteapi' && !!b.supplierRef,
  );

  const rows = await Promise.all(
    liteapiBookings.map(async (b) => {
      const snap = await getBookingFromSupplier(b.supplierRef!);
      return {
        ref: b.id,
        supplierRef: b.supplierRef,
        customerName: b.customerName,
        adminStatus: b.status,
        supplier: {
          found: snap.ok,
          httpStatus: snap.httpStatus,
          status: snap.status,
          hotelConfirmationCode: snap.hotelConfirmationCode,
          guestName: snap.guestName,
          checkin: snap.checkin,
          checkout: snap.checkout,
          price: snap.price,
          currency: snap.currency,
          error: snap.error ?? null,
        },
      };
    }),
  );

  const summary = {
    total: rows.length,
    supplierFound: rows.filter((r) => r.supplier.found).length,
    supplierMissing: rows.filter((r) => !r.supplier.found).length,
    supplierCancelled: rows.filter(
      (r) => (r.supplier.status || '').toLowerCase().includes('cancel'),
    ).length,
  };

  return NextResponse.json({ success: true, summary, rows });
}
