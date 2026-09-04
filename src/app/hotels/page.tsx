import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrustBar from '@/components/TrustBar';
import { LazyHotelsContent } from './hotels-lazy';
import { PageSchema } from '@/lib/page-schema';
import { HOTELS_FAQS } from '@/lib/page-faqs';
import PageSeoContent from '@/components/PageSeoContent';
import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';

export const metadata = {
  title: 'Book Hotels Direct — Live Wholesale Rates | JetMeAway',
  description: 'Book hotels direct with JetMeAway. Live wholesale rates from 30+ suppliers, total prices including all taxes & fees, free cancellation on most rooms. No booking fees.',
  // Canonical to the bare /hotels path. Every parameterised variant
  // (?destination=…, ?city=…, ?region=…) shares this template + metadata,
  // so they're indexed as duplicates. Declaring canonical consolidates link
  // equity to /hotels and removes the dupes from Google's index.
  alternates: { canonical: 'https://jetmeaway.co.uk/hotels' },
};

export default async function HotelsPage() {
  const t = await getTranslations('hotels');
  return (
    <>
      <PageSchema crumbs={[{ name: 'Hotels', path: '/hotels' }]} faqs={HOTELS_FAQS} />
      <Header />

      <main>
      {/* Always-dark anti-flash base. The hotels client paints the searched
          city's image as a second fixed layer (z-index -10) on top of this
          one once a search runs — see DestinationBackdrop in hotels-client. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -20, background: 'linear-gradient(160deg, #1f1410 0%, #2c1a18 50%, #160a08 100%)' }}
      />
      <section
        className="relative pt-36 pb-12 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'transparent' }}
      >
        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          {/* Value-prop banner — sits above the page badge so it's the
              first thing the visitor reads. Honest framing: we're a
              UK-registered comparison engine pulling 30+ wholesale rates
              live. No comparative claims against named competitors. */}
          <div className="mx-auto max-w-[640px] mb-4 backdrop-blur-md bg-emerald-500/10 border border-emerald-300/30 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
            <span className="text-base leading-none" aria-hidden="true">🏆</span>
            <p className="text-[.78rem] sm:text-[.82rem] font-semibold text-emerald-100 leading-snug text-left">
              {t('valueProp1')} <span className="text-white font-bold">{t('valueProp2')}</span> {t('valueProp3')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-300/30 text-amber-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(245,158,11,0.25)]"><span className="text-base leading-none">🏨</span> {t('heroBadge')}</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            {t('heroTitlePre')} <em className="italic bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-transparent">{t('heroTitleHighlight')}</em> {t('heroTitlePost')}
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">{t('heroSub')}</p>
        </div>

        <LazyHotelsContent />

        {/* Trust pills — visible directly under the search form so first-
            time visitors landing here via Google see verifiable signals
            (Companies House link, Trustpilot, secure payments) before
            they decide whether to type a destination. */}
        <TrustBar />
      </section>

      <PageSeoContent
        heading="Compare hotel prices the honest way"
        intro={[
          "JetMeAway compares live hotel rates from our direct partners — LiteAPI, RateHawk and Webbeds — alongside Expedia, Trip.com, Hotels.com, Agoda and Trivago, so you see the cheapest room for your dates side by side. Prices are the total including taxes and fees, with no JetMeAway mark-up and no booking fees.",
          "Search any city worldwide, filter by budget, board type and free cancellation, then book refundable rooms direct. Whether it's a UK city break, a family holiday or a long-haul trip, you compare the real price before you decide.",
        ]}
        linksHeading="Popular right now"
        links={[
          { href: '/flights', label: 'Compare flights' },
          { href: '/packages', label: 'Holiday packages' },
          { href: '/cars', label: 'Car hire' },
          { href: '/destinations', label: 'Destination guides' },
          { href: '/blog/best-hotels-munich-2026', label: 'Munich hotels' },
          { href: '/blog/best-hotels-prague-2026', label: 'Prague hotels' },
          { href: '/blog/best-hotels-dubai-2026', label: 'Dubai hotels' },
          { href: '/blog/best-hotels-las-vegas-2026', label: 'Las Vegas hotels' },
        ]}
        faqs={HOTELS_FAQS}
      />
      </main>

      <Footer />
    </>
  );
}
