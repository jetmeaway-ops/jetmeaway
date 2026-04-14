import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  listBookings,
  summarise,
  fmtGbp,
  fmtDate,
  statusColor,
  supplierLabel,
  typeIcon,
} from '@/lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  const bookings = await listBookings();
  const stats = summarise(bookings);
  const recent = bookings.slice(0, 10);

  const upcoming = bookings
    .filter(b => {
      if (b.status !== 'confirmed' || !b.checkIn) return false;
      const ci = new Date(b.checkIn).getTime();
      const now = Date.now();
      return ci >= now && ci <= now + 14 * 86400_000;
    })
    .sort((a, b) => new Date(a.checkIn!).getTime() - new Date(b.checkIn!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">Dashboard</h1>
        <p className="text-[#5C6378] text-sm">
          Unified view across all suppliers — {stats.total} total bookings
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Gross revenue" value={fmtGbp(stats.grossGbp * 100)} accent="text-[#0066FF]" />
        <KpiCard label="Margin (our take)" value={fmtGbp(stats.marginGbp * 100)} accent="text-green-600" />
        <KpiCard label="Last 7 days" value={`${stats.last7Days} bookings`} accent="text-[#1A1D2B]" />
        <KpiCard label="Upcoming (7d)" value={`${stats.upcomingCheckIns} check-ins`} accent="text-amber-600" />
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Status breakdown</h2>
          <span className="text-xs text-[#8E95A9]">Live</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusPill label="Confirmed" count={stats.confirmed} tone="green" />
          <StatusPill label="Pending" count={stats.pending} tone="amber" />
          <StatusPill label="Cancelled/Refunded" count={stats.cancelled} tone="gray" />
          <StatusPill label="Total" count={stats.total} tone="blue" />
        </div>
      </div>

      {/* Upcoming check-ins */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg mb-4">Upcoming check-ins (next 14 days)</h2>
          <div className="space-y-2">
            {upcoming.map(b => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
              >
                <i className={`fa-solid ${typeIcon(b.type)} text-[#0066FF] w-6 text-center`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{b.customerName}</div>
                  <div className="text-xs text-[#5C6378] truncate">{b.title}</div>
                </div>
                <div className="text-sm text-[#5C6378] hidden sm:block">{b.destination}</div>
                <div className="text-sm font-semibold text-[#1A1D2B]">
                  {fmtDate(b.checkIn)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookings table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">Recent bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-sm text-[#0066FF] hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[#5C6378] text-left">
              <tr>
                <th className="px-6 py-3 font-semibold">Ref</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-6 py-3 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(b => (
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
                        <div className="font-medium truncate max-w-[200px]">{b.title}</div>
                        <div className="text-xs text-[#8E95A9]">{b.destination}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#5C6378]">
                    {supplierLabel(b.supplier)}
                  </td>
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

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="text-xs font-medium text-[#8E95A9] uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className={`text-2xl font-black ${accent}`}>{value}</div>
    </div>
  );
}

function StatusPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'green' | 'amber' | 'gray' | 'blue';
}) {
  const cls = {
    green: 'bg-green-50 text-green-800 border-green-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-75">
        {label}
      </div>
      <div className="text-2xl font-black">{count}</div>
    </div>
  );
}
