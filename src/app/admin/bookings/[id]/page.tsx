import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getBooking,
  fmtGbp,
  fmtDate,
  fmtDateTime,
  statusColor,
  supplierLabel,
  typeIcon,
} from '@/lib/bookings';
import CancelButton from './CancelButton';
import NotificationButtons from './NotificationButtons';
import RefundButton from './RefundButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-[#5C6378]">
        <Link href="/admin/bookings" className="hover:text-[#0066FF]">
          ← All bookings
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <i className={`fa-solid ${typeIcon(b.type)} text-[#0066FF] text-2xl`} />
            <h1 className="text-3xl font-black">{b.title}</h1>
          </div>
          <div className="font-mono text-sm text-[#8E95A9]">{b.id}</div>
        </div>
        <span
          className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${statusColor(b.status)}`}
        >
          {b.status.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <NotificationButtons
          bookingRef={b.id}
          hasEmail={Boolean(b.customerEmail)}
          hasPhone={Boolean(b.customerPhone)}
        />
        <CancelButton
          bookingRef={b.id}
          disabled={b.status === 'cancelled' || b.status === 'refunded'}
        />
        <RefundButton
          bookingRef={b.id}
          totalPence={b.totalPence}
          disabled={
            !b.stripePaymentId ||
            b.paymentStatus === 'refunded' ||
            b.status === 'refunded'
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-sm text-[#5C6378] uppercase tracking-wide mb-4">
            Customer
          </h2>
          <div className="space-y-2">
            <div className="font-semibold text-lg">{b.customerName}</div>
            <a
              href={`mailto:${b.customerEmail}`}
              className="block text-[#0066FF] hover:underline text-sm"
            >
              {b.customerEmail}
            </a>
            {b.customerPhone && (
              <a
                href={`tel:${b.customerPhone}`}
                className="block text-[#5C6378] hover:text-[#0066FF] text-sm"
              >
                {b.customerPhone}
              </a>
            )}
          </div>
        </div>

        {/* Trip */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-sm text-[#5C6378] uppercase tracking-wide mb-4">
            Trip
          </h2>
          <div className="space-y-2 text-sm">
            <DetailRow label="Destination" value={b.destination} />
            <DetailRow label="Check-in" value={fmtDate(b.checkIn)} />
            <DetailRow label="Check-out" value={fmtDate(b.checkOut)} />
            <DetailRow label="Guests" value={String(b.guests)} />
          </div>
        </div>

        {/* Supplier */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-sm text-[#5C6378] uppercase tracking-wide mb-4">
            Supplier
          </h2>
          <div className="space-y-2 text-sm">
            <DetailRow label="Source" value={supplierLabel(b.supplier)} />
            <DetailRow label="Supplier ref" value={b.supplierRef || '—'} mono />
            <DetailRow label="Created" value={fmtDateTime(b.createdAt)} />
            <DetailRow label="Updated" value={fmtDateTime(b.updatedAt)} />
          </div>
        </div>
      </div>

      {/* Money */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-bold text-sm text-[#5C6378] uppercase tracking-wide mb-4">
          Financials
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MoneyCard label="Customer paid" value={fmtGbp(b.totalPence)} />
          <MoneyCard label="Paid to supplier" value={fmtGbp(b.netPence)} />
          <MoneyCard label="Our margin" value={fmtGbp(b.marginPence)} accent />
          <MoneyCard
            label="Payment"
            value={b.paymentStatus}
            sub={b.stripePaymentId || undefined}
          />
        </div>
      </div>

      {/* Notes */}
      {b.notes && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-sm text-[#5C6378] uppercase tracking-wide mb-3">
            Notes
          </h2>
          <div className="text-sm text-[#1A1D2B] whitespace-pre-wrap">{b.notes}</div>
        </div>
      )}

      <p className="text-xs text-[#8E95A9]">
        Resend email/SMS sends live via Resend + Twilio. Cancellation calls LiteAPI / supplier. Manual refund calls Stripe directly — doesn&apos;t touch the supplier; use cancel for that.
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[#8E95A9]">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs font-medium text-[#8E95A9] uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-xl font-black ${accent ? 'text-green-700' : 'text-[#1A1D2B]'}`}>
        {value}
      </div>
      {sub && (
        <div className="text-xs text-[#8E95A9] font-mono mt-1 truncate">{sub}</div>
      )}
    </div>
  );
}
