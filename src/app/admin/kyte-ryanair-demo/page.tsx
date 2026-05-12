import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DemoClient from './DemoClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function KyteRyanairDemoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-bold text-[#1A1D2B]">Kyte · Ryanair OTA iframe demo</h1>
        <p className="text-sm text-[#5C6378] mt-2">
          Admin-only. Runs the full Ryanair sandbox OTA flow against the live Kyte sandbox via our
          API routes (search → book → ancillaries → commit), then renders the official Ryanair
          flight-confirmation iframe. Test card used by the smoke is the documented Ryanair
          sandbox PAN. Each run lands a sandbox booking in <code>/admin/bookings</code>.
        </p>
        <DemoClient />
      </div>
    </main>
  );
}
