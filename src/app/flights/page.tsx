import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LazyFlightsContent } from './flights-lazy';

export const runtime = 'edge';

export const metadata = {
  title: 'Compare Cheap Flights from the UK | JetMeAway',
  description: 'Compare flights from 5 providers in seconds. Find the cheapest flights from UK airports to 250+ destinations worldwide.',
};

export default function FlightsPage() {
  return (
    <>
      <Header />

      {/* Hero — server-rendered for instant LCP */}
      <section
        className="relative pt-36 pb-12 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'linear-gradient(160deg, #051327 0%, #0b2342 50%, #03101f 100%)' }}
      >
        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-sky-500/15 to-cyan-500/15 border border-cyan-300/30 text-cyan-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(34,211,238,0.25)]"><span className="text-base leading-none">✈</span> Flight Comparison</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">Cheapest</em> Flights
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">Compare 5 providers in seconds — real prices shown right here.</p>
        </div>

        {/* Search form + results — lazy-loaded */}
        <LazyFlightsContent />
      </section>

      <Footer />
    </>
  );
}
