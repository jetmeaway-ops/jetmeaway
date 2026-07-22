import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrustBar from '@/components/TrustBar';
import { LazyFlightsContent } from './flights-lazy';
import { PageSchema } from '@/lib/page-schema';
import { FLIGHTS_FAQS } from '@/lib/page-faqs';
import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';

export const metadata = {
  title: 'Compare Cheap Flights from the UK | JetMeAway',
  description: 'Compare flights from 5 providers in seconds. Find the cheapest flights from UK airports to 250+ destinations worldwide.',
  // Canonical to the bare /flights path. Every parameterised variant
  // (?to=…, ?destination=…) shares this template + metadata, so they're
  // indexed as duplicates. Declaring canonical consolidates link equity
  // to /flights and removes the dupes from Google's index.
  alternates: { canonical: 'https://jetmeaway.co.uk/flights' },
};

export default async function FlightsPage() {
  const t = await getTranslations('flights');
  return (
    <>
      <PageSchema crumbs={[{ name: 'Flights', path: '/flights' }]} faqs={FLIGHTS_FAQS} />
      <Header />

      <main>
      {/* Always-dark anti-flash base. The flights client paints the searched
          destination city's image as a second fixed layer (z-index -10) on
          top of this one once a search runs — see DestinationBackdrop. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -20, background: 'linear-gradient(160deg, #051327 0%, #0b2342 50%, #03101f 100%)' }}
      />
      {/* Hero — server-rendered for instant LCP */}
      <section
        className="relative pt-36 pb-12 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'transparent' }}
      >
        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-sky-500/15 to-cyan-500/15 border border-cyan-300/30 text-cyan-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(34,211,238,0.25)]"><span className="text-base leading-none">✈</span> {t('heroBadge')}</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            {t('heroTitlePre')} <em className="italic bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">{t('heroTitleHighlight')}</em> {t('heroTitlePost')}
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">{t('heroSub')}</p>
        </div>

        {/* Search form + results — lazy-loaded */}
        <LazyFlightsContent />

        {/* Trust pills — visible directly under the search form so first-
            time visitors landing here via Google see verifiable signals
            (Companies House link, Trustpilot, secure payments) before
            they decide whether to enter origin and destination. */}
        <TrustBar />
      </section>
      </main>

      <Footer />
    </>
  );
}
