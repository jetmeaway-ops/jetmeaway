import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

export const metadata = {
  title: 'JetMeAway Admin',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';

  // Allow access to /admin/login without auth
  // (handled via explicit check in the login page itself)
  const authed = !!secret && token === secret;

  if (!authed) {
    // Let the login page itself render unprotected
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1A1D2B] overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <a href="/admin" className="flex items-center gap-2 font-black text-lg">
              <span className="text-[#0066FF]">Jet</span>MeAway
              <span className="text-xs font-medium text-[#8E95A9] bg-gray-100 px-2 py-0.5 rounded-full">
                Admin
              </span>
            </a>
            <form action="/api/admin/logout" method="post" className="sm:hidden">
              <button
                type="submit"
                className="text-xs text-[#5C6378] hover:text-red-600 font-medium"
              >
                Logout
              </button>
            </form>
          </div>
          <nav className="flex items-center gap-3 sm:gap-4 text-sm font-medium overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide whitespace-nowrap">
            <a href="/admin" className="text-[#5C6378] hover:text-[#0066FF] shrink-0">Dashboard</a>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/admin/bookings?type=flight"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/15 transition text-xs font-semibold"
              >
                <i className="fa-solid fa-plane" /> Flights
              </a>
              <a
                href="/admin/bookings?type=hotel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition text-xs font-semibold"
              >
                <i className="fa-solid fa-hotel" /> Hotels
              </a>
              <a
                href="/admin/bookings?type=car"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition text-xs font-semibold"
              >
                <i className="fa-solid fa-car" /> Cars
              </a>
              <a
                href="https://dashboard.stripe.com/balance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#635BFF]/10 text-[#635BFF] hover:bg-[#635BFF]/15 transition text-xs font-semibold"
              >
                <i className="fa-solid fa-credit-card" /> Stripe ↗
              </a>
            </div>
            <a href="/" className="text-[#5C6378] hover:text-[#0066FF] shrink-0">View site ↗</a>
            <form action="/api/admin/logout" method="post" className="hidden sm:block shrink-0">
              <button
                type="submit"
                className="text-[#5C6378] hover:text-red-600"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
