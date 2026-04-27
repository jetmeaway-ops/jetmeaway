import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LazyHotelsContent } from './hotels-lazy';
import { PageSchema } from '@/lib/page-schema';
import { HOTELS_FAQS } from '@/lib/page-faqs';

export const runtime = 'edge';

export const metadata = {
  title: 'Compare Hotel Prices from 6 Providers | JetMeAway',
  description: 'Compare hotel prices from Booking.com, Expedia, Trip.com, Hotels.com, Agoda and Trivago. Find the best hotel deals worldwide.',
};

export default function HotelsPage() {
  return (
    <>
      <PageSchema crumbs={[{ name: 'Hotels', path: '/hotels' }]} faqs={HOTELS_FAQS} />
      <Header />

      <main>
      <section
        className="relative pt-36 pb-12 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'linear-gradient(160deg, #1f1410 0%, #2c1a18 50%, #160a08 100%)' }}
      >
        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          {/* Value-prop banner — sits above the page badge so it's the
              first thing the visitor reads. Honest framing: we're a
              UK-registered comparison engine pulling 30+ wholesale rates
              live. No comparative claims against named competitors. */}
          <div className="mx-auto max-w-[640px] mb-4 backdrop-blur-md bg-emerald-500/10 border border-emerald-300/30 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
            <span className="text-base leading-none" aria-hidden="true">🏆</span>
            <p className="text-[.78rem] sm:text-[.82rem] font-semibold text-emerald-100 leading-snug text-left">
              Compare <span className="text-white font-bold">30+ wholesale rates</span> in seconds — UK-registered, no booking fees
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-300/30 text-amber-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(245,158,11,0.25)]"><span className="text-base leading-none">🏨</span> Hotel Comparison</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-transparent">Best</em> Hotels
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">Compare trusted hotel providers — real prices shown right here.</p>
        </div>

        <LazyHotelsContent />
      </section>
      </main>

      <Footer />
    </>
  );
}
