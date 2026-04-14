import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  listBookings,
  fmtGbp,
  fmtDate,
  statusColor,
  supplierLabel,
  typeIcon,
  type BookingStatus,
} from '@/lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BookingsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  const sp = await searchParams;
  const q = (sp.q || '').toLowerCase().trim();
  const statusFilter = sp.status || '';

  let bookings = await listBookings();

  if (q) {
    bookings = bookings.filter(b =>
      [b.id, b.customerName, b.customerEmail, b.title, b.destination, b.supplierRef || '']
        .join(' ').toLowerCase().includes(q),
    );
  }
  if (statusFilter) {
    bookings = bookings.filter(b => b.status === statusFilter as BookingStatus);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-1">Bookings</h1>
          <p className="text-[#5C6378] text-sm">
            {bookings.length} result{bookings.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <form method="get" className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, reference, destination..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-[#0066FF] focus:outline-none"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:border-[#0066FF] focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold rounded-xl"
          >
            Filter
          </button>
          {(q || statusFilter) && (
            <Link
              href="/admin/bookings"
              className="px-4 py-2 text-[#5C6378] hover:text-[#0066FF] text-sm self-center"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[#5C6378] text-left">
              <tr>
                <th className="px-6 py-3 font-semibold">Ref</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-6 py-3 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#8E95A9]">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
              {bookings.map(b => (
                <tr
                  key={b.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="text-[#0066FF] hover:underline"
                    >
                      {b.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">{b.customerName}</div>
                    <div className="text-xs text-[#8E95A9]">{b.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid ${typeIcon(b.type)} text-[#8E95A9]`} />
                      <div>
                        <div className="font-medium truncate max-w-[220px]">{b.title}</div>
                        <div className="text-xs text-[#8E95A9]">{b.destination}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#5C6378]">{fmtDate(b.checkIn)}</td>
                  <td className="px-4 py-4 text-[#5C6378]">{supplierLabel(b.supplier)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${statusColor(b.status)}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">
                    {b.totalPence > 0 ? fmtGbp(b.totalPence) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-green-700">
                    {fmtGbp(b.marginPence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
