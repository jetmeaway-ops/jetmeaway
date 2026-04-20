import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RoomsSkeleton from './RoomsSkeleton';

/* ═══════════════════════════════════════════════════════════════════════════
   Instant route-level loading UI. Next.js streams this shell to the browser
   the moment the user clicks a hotel card — before the client bundle
   downloads, before identity data is in hand. The shape mirrors the real
   page (hero band, title, gallery strip, rooms table skeleton) so the
   transition feels like an app, not a page reload.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HotelLoading() {
  return (
    <>
      <Header />
      <main className="max-w-[1100px] mx-auto px-5 pt-28 pb-16">
        {/* Breadcrumb-style back link */}
        <div className="animate-pulse mb-4 h-4 w-40 bg-[#F1F3F7] rounded" />

        {/* Hero photo + title bar */}
        <div className="animate-pulse bg-[#F1F3F7] rounded-3xl h-[320px] md:h-[420px] mb-5" />
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="animate-pulse h-7 w-64 bg-[#F1F3F7] rounded" />
          <div className="animate-pulse h-5 w-24 bg-[#F4F6FA] rounded-full" />
        </div>
        <div className="animate-pulse h-4 w-80 bg-[#F4F6FA] rounded mb-6" />

        {/* Gallery strip */}
        <div className="hidden md:flex gap-2 mb-8 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex-shrink-0 w-24 h-16 bg-[#F1F3F7] rounded-lg" />
          ))}
        </div>

        {/* Main grid — skeleton rooms table + sidebar */}
        <div className="grid md:grid-cols-[1fr_340px] gap-6">
          <div>
            <RoomsSkeleton />
            <div className="animate-pulse bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 space-y-3">
              <div className="h-5 w-40 bg-[#F1F3F7] rounded" />
              <div className="h-3 w-full bg-[#F4F6FA] rounded" />
              <div className="h-3 w-11/12 bg-[#F4F6FA] rounded" />
              <div className="h-3 w-9/12 bg-[#F4F6FA] rounded" />
            </div>
          </div>
          <aside className="animate-pulse bg-white border border-[#E8ECF4] rounded-3xl p-6 h-[320px]" />
        </div>
      </main>
      <Footer />
    </>
  );
}
