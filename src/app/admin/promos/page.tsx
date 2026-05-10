import Link from 'next/link';
import { listBookings, fmtGbp, fmtDateTime, type Booking } from '@/lib/bookings';
import { APP_2ND_5OFF } from '@/lib/promo';
import { MarkPaidButton } from './MarkPaidButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // always fresh from KV

export const metadata = {
  title: 'Promo Redemptions — JetMeAway Admin',
  robots: 'noindex, nofollow',
};

/**
 * /admin/promos — operational queue for the £5-off-2nd-booking-via-app
 * cashback (v1).
 *
 * Owner workflow:
 *   1. Customer's 2nd app booking confirms → this row appears with
 *      promoStatus='eligible'.
 *   2. Owner refunds £5 manually (LiteAPI dashboard partial refund, or
 *      out-of-pocket via Stripe / Wise / PayPal).
 *   3. Owner clicks "Mark as paid" with a short note (e.g. the LiteAPI
 *      refund txn ID). promoStatus flips to 'paid', the row drops out of
 *      the eligible queue.
 *
 * v2 will automate steps 2-3. See ditch-the-5-cash-hazy-toast.md.
 */
export default async function PromosAdminPage() {
  const all = await listBookings();
  const promos = all
    .filter((b) => b.promoCode === APP_2ND_5OFF.code)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const eligible = promos.filter((b) => b.promoStatus === 'eligible');
  const paid = promos.filter((b) => b.promoStatus === 'paid');
  const denied = promos.filter((b) => b.promoStatus === 'denied');

  const eligiblePence = eligible.reduce(
    (s, b) => s + (b.promoDiscountPence || 0),
    0,
  );
  const paidPence = paid.reduce(
    (s, b) => s + (b.promoDiscountPence || 0),
    0,
  );
  const totalRedemptions = eligible.length + paid.length;
  const capProgress = (totalRedemptions / APP_2ND_5OFF.capTotalRedemptions) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-black text-[#1A1D2B]">
          Promo Redemptions
        </h1>
        <p className="text-sm text-[#5C6378] mt-1">
          £5-off-2nd-booking-via-app cashback queue.{' '}
          <Link
            href="/terms/promo-second-booking"
            className="text-[#0066FF] underline hover:text-[#0052CC]"
            target="_blank"
          >
            T&amp;Cs
          </Link>
          .
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Awaiting payout"
          value={String(eligible.length)}
          sublabel={fmtGbp(eligiblePence)}
          tone="amber"
        />
        <StatCard
          label="Paid"
          value={String(paid.length)}
          sublabel={fmtGbp(paidPence)}
          tone="green"
        />
        <StatCard
          label="Denied"
          value={String(denied.length)}
          sublabel="re-validation race"
          tone="gray"
        />
        <StatCard
          label="Cap progress"
          value={`${totalRedemptions}/${APP_2ND_5OFF.capTotalRedemptions}`}
          sublabel={`${capProgress.toFixed(0)}% used`}
          tone={capProgress > 80 ? 'red' : 'blue'}
        />
      </div>

      {/* Awaiting payout queue */}
      <section className="bg-white border border-[#E8ECF4] rounded-2xl">
        <header className="px-5 py-4 border-b border-[#F1F3F7] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#1A1D2B]">
            Awaiting payout ({eligible.length})
          </h2>
          <p className="text-xs text-[#8E95A9]">
            Refund £5 manually, then click Mark as paid.
          </p>
        </header>
        {eligible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#8E95A9]">
            No pending payouts. New eligible 2nd-booking redemptions will
            appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#8E95A9] border-b border-[#F1F3F7]">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Channel</th>
                  <th className="px-3 py-3 font-semibold">Hotel</th>
                  <th className="px-3 py-3 font-semibold text-right">Total</th>
                  <th className="px-3 py-3 font-semibold">Confirmed</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {eligible.map((b) => (
                  <PromoRow key={b.id} booking={b} action="mark-paid" />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recently paid */}
      <section className="bg-white border border-[#E8ECF4] rounded-2xl">
        <header className="px-5 py-4 border-b border-[#F1F3F7]">
          <h2 className="font-bold text-base text-[#1A1D2B]">
            Recently paid ({paid.length})
          </h2>
        </header>
        {paid.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#8E95A9]">
            No paid redemptions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#8E95A9] border-b border-[#F1F3F7]">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Channel</th>
                  <th className="px-3 py-3 font-semibold">Paid at</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {paid.slice(0, 30).map((b) => (
                  <PromoRow key={b.id} booking={b} action="paid-row" />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Denied (visibility only — likely a race or fraud check) */}
      {denied.length > 0 && (
        <section className="bg-white border border-[#E8ECF4] rounded-2xl">
          <header className="px-5 py-4 border-b border-[#F1F3F7]">
            <h2 className="font-bold text-base text-[#1A1D2B]">
              Denied ({denied.length})
            </h2>
            <p className="text-xs text-[#8E95A9] mt-1">
              Re-validation refused these at confirmation time. Usually a
              parallel-checkout race; check the bug inbox for details.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#8E95A9] border-b border-[#F1F3F7]">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Channel</th>
                  <th className="px-3 py-3 font-semibold">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {denied.slice(0, 30).map((b) => (
                  <PromoRow key={b.id} booking={b} action="denied-row" />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: 'amber' | 'green' | 'gray' | 'blue' | 'red';
}) {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-emerald-200 bg-emerald-50',
    gray: 'border-gray-200 bg-gray-50',
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
  }[tone];
  return (
    <div className={`rounded-xl border ${toneClasses} px-4 py-3`}>
      <p className="text-xs font-semibold text-[#5C6378] uppercase tracking-wide">
        {label}
      </p>
      <p className="font-poppins text-2xl font-black text-[#1A1D2B] mt-0.5">
        {value}
      </p>
      <p className="text-xs text-[#8E95A9] mt-0.5">{sublabel}</p>
    </div>
  );
}

function PromoRow({
  booking,
  action,
}: {
  booking: Booking;
  action: 'mark-paid' | 'paid-row' | 'denied-row';
}) {
  const channelLabel =
    booking.channel === 'ios'
      ? '📱 iOS'
      : booking.channel === 'android'
      ? '🤖 Android'
      : booking.channel || '—';

  return (
    <tr className="border-b border-[#F1F3F7] last:border-b-0">
      <td className="px-5 py-3 font-mono text-xs text-[#1A1D2B]">
        <Link
          href={`/admin/bookings/${booking.id}`}
          className="text-[#0066FF] hover:underline"
        >
          {booking.id}
        </Link>
      </td>
      <td className="px-3 py-3 text-[#5C6378]">
        {booking.customerEmail || '—'}
      </td>
      <td className="px-3 py-3 text-[#5C6378]">{channelLabel}</td>
      {action === 'mark-paid' && (
        <>
          <td className="px-3 py-3 text-[#5C6378] truncate max-w-[200px]">
            {booking.title}
          </td>
          <td className="px-3 py-3 text-right text-[#1A1D2B] font-semibold">
            {fmtGbp(booking.totalPence)}
          </td>
          <td className="px-3 py-3 text-xs text-[#8E95A9]">
            {fmtDateTime(booking.createdAt)}
          </td>
          <td className="px-5 py-3 text-right">
            <MarkPaidButton ref={booking.id} />
          </td>
        </>
      )}
      {action === 'paid-row' && (
        <>
          <td className="px-3 py-3 text-xs text-[#8E95A9]">
            {booking.promoPaidAt ? fmtDateTime(booking.promoPaidAt) : '—'}
          </td>
          <td className="px-5 py-3 text-xs text-[#5C6378] truncate max-w-[300px]">
            {booking.promoPaidNote || '—'}
          </td>
        </>
      )}
      {action === 'denied-row' && (
        <td className="px-3 py-3 text-xs text-[#8E95A9]">
          {fmtDateTime(booking.createdAt)}
        </td>
      )}
    </tr>
  );
}
