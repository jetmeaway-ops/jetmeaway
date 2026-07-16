import Header from '@/components/Header';
import Footer from '@/components/Footer';

/* ═══════════════════════════════════════════════════════════════════════════
   Shared instant route-level loading shell (2026-07-16).

   Every main route is edge-dynamic; without a loading boundary the App
   Router waits for the FULL server payload + route JS before anything on
   screen changes, so tapping "Hotels"/"Flights" felt dead for many seconds
   on phones (owner report). Next streams this skeleton the instant the link
   is clicked — and once a route has a loading boundary, <Link> prefetching
   makes the transition feel immediate.

   Shape mirrors the search pages: hero band → search card → result rows.
   Used by src/app/<route>/loading.tsx one-liners.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RouteLoading() {
  return (
    <>
      <Header />
      <main className="max-w-[1100px] mx-auto px-5 pt-32 md:pt-36 pb-16">
        {/* Hero title area */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-pulse h-5 w-40 bg-[#F1F3F7] rounded-full mb-4" />
          <div className="animate-pulse h-9 w-72 md:w-96 bg-[#F1F3F7] rounded mb-3" />
          <div className="animate-pulse h-4 w-56 bg-[#F4F6FA] rounded" />
        </div>

        {/* Search card */}
        <div className="bg-white border border-[#E8ECF4] rounded-3xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.12)] p-6 mb-10">
          <div className="animate-pulse flex gap-3 mb-5">
            <div className="h-8 w-24 bg-[#F1F3F7] rounded-full" />
            <div className="h-8 w-24 bg-[#F4F6FA] rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="animate-pulse h-12 bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl" />
            <div className="animate-pulse h-12 bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl" />
            <div className="animate-pulse h-12 bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl" />
            <div className="animate-pulse h-12 bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl" />
          </div>
          <div className="animate-pulse h-12 bg-[#E5EEFF] rounded-xl" />
        </div>

        {/* Result-row skeletons */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-white border border-[#E8ECF4] rounded-2xl p-5 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F1F3F7] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-[#F1F3F7] rounded" />
              <div className="h-3 w-1/2 bg-[#F4F6FA] rounded" />
            </div>
            <div className="h-6 w-20 bg-[#F1F3F7] rounded" />
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
