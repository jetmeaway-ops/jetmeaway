/**
 * /account/bookings — signed-in customer's booking list
 *
 * Pulls from /api/account/me (server-side via cookies) so we can render the
 * tabs + card list in one round-trip. Tabs partition by time:
 *   - Upcoming   — confirmed bookings where checkOut is today or later
 *   - Past       — completed / checkOut in the past
 *   - Cancelled  — cancelled / refunded / failed
 *
 * Each card shows: hotel name, dates, guests, total, booking ref, status chip.
 * A "Contact support" fallback link keeps the page useful for customers whose
 * booking predates the unified KV store.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readSessionEmail } from '@/lib/session';
import { listBookings, fmtGbp, fmtDate, statusColor, typeIcon, supplierLabel, type Booking } from '@/lib/bookings';
import BookingsTabs from './BookingsTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function partition(all: Booking[]): { upcoming: Booking[]; past: Booking[]; cancelled: Booking[] } {
  const now = Date.now();
  const upcoming: Booking[] = [];
  const past: Booking[] = [];
  const cancelled: Booking[] = [];
  for (const b of all) {
    if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'failed') {
      cancelled.push(b);
      continue;
    }
    const end = b.checkOut ? new Date(b.checkOut).getTime() : 0;
    if (Number.isFinite(end) && end > 0 && end < now) past.push(b);
    else upcoming.push(b);
  }
  // Newest first in each bucket.
  const byNewest = (a: Booking, b: Booking) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return {
    upcoming: upcoming.sort(byNewest),
    past: past.sort(byNewest),
    cancelled: cancelled.sort(byNewest),
  };
}

export default async function AccountBookingsPage() {
  const cookieStore = await cookies();
  const email = await readSessionEmail(cookieStore.toString());
  if (!email) {
    redirect('/account');
  }

  const all = await listBookings();
  const mine = all.filter((b) => (b.customerEmail || '').toLowerCase() === email);
  const buckets = partition(mine);

  return (
    <>
      <Header />
      <main className="max-w-[960px] mx-auto px-5 pt-28 pb-16">
        {/* Header strip — email + sign-out */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[.72rem] font-black uppercase tracking-[1.8px] text-[#8a6d00]">Signed in as</p>
            <h1 className="font-[var(--font-playfair)] font-black text-[1.8rem] md:text-[2.2rem] text-[#0a1628] tracking-tight leading-tight mt-1">
              {email}
            </h1>
          </div>
          <form action="/api/account/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8ECF4] bg-white hover:bg-[#FCFAF5] text-[#0a1628] font-poppins font-bold text-[.78rem] transition-colors"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[.7rem]" />
              Sign out
            </button>
          </form>
        </div>

        {/* Empty state — no bookings on this email yet */}
        {mine.length === 0 ? (
          <div className="bg-white border border-[#E8ECF4] rounded-3xl p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] mb-4">
              <i className="fa-solid fa-suitcase-rolling text-[1.4rem]" />
            </div>
            <h2 className="font-[var(--font-playfair)] font-black text-[1.4rem] text-[#0a1628] mb-1">No trips yet</h2>
            <p className="text-[.88rem] text-[#5C6378] font-medium max-w-[460px] mx-auto">
              Once you book through JetMeAway, your upcoming stays appear here with full details and vouchers.
            </p>
            <a
              href="/hotels"
              className="inline-block mt-5 bg-[#0a1628] hover:bg-[#0066FF] text-white font-poppins font-bold text-[.88rem] px-6 py-3 rounded-full transition-all"
            >
              Find a hotel →
            </a>
            <p className="text-[.72rem] text-[#8E95A9] font-medium mt-4">
              Booked via email but can&apos;t see it here? <a href="/contact" className="underline font-semibold text-[#0066FF]">Contact support</a>.
            </p>
          </div>
        ) : (
          <BookingsTabs
            counts={{ upcoming: buckets.upcoming.length, past: buckets.past.length, cancelled: buckets.cancelled.length }}
            buckets={{
              upcoming: buckets.upcoming.map(serialise),
              past: buckets.past.map(serialise),
              cancelled: buckets.cancelled.map(serialise),
            }}
          />
        )}

        <p className="text-[.72rem] text-[#8E95A9] font-medium text-center mt-8">
          Refundable bookings can be cancelled straight from the card above, up to the free-cancel deadline on your rate. For everything else, please <a href="/contact" className="underline font-semibold text-[#0066FF]">contact support</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}

/** Trim booking → only the fields the client view actually renders. */
function serialise(b: Booking) {
  // BACKLOG B3 (2026-04-21): compute self-cancel eligibility here on the
  // server so the client doesn't have to know our gating rules.
  // Rule mirrors /api/account/bookings/cancel — supplier=liteapi, status not
  // already-terminal, deadline ISO, deadline still in the future.
  const deadline = b.cancellationDeadline ? new Date(b.cancellationDeadline) : null;
  const deadlineValid = deadline && !Number.isNaN(deadline.getTime());
  const canCancel =
    b.supplier === 'liteapi' &&
    !['cancelled', 'refunded', 'failed', 'completed'].includes(b.status) &&
    deadlineValid &&
    deadline!.getTime() > Date.now();
  return {
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
    totalFormatted: fmtGbp(b.totalPence),
    checkInFormatted: fmtDate(b.checkIn),
    checkOutFormatted: fmtDate(b.checkOut),
    statusColor: statusColor(b.status),
    typeIcon: typeIcon(b.type),
    supplierLabel: supplierLabel(b.supplier),
    canCancel,
    cancellationDeadlineFormatted: deadlineValid
      ? deadline!.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null,
  };
}

export type ClientBooking = ReturnType<typeof serialise>;
