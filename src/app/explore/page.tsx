import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LazyExploreContent } from './explore-lazy';
import { PageSchema } from '@/lib/page-schema';
import { EXPLORE_FAQS } from '@/lib/page-faqs';
import PageSeoContent from '@/components/PageSeoContent';
import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';

export const metadata = {
  title: 'Explore Activities & Tours | JetMeAway',
  description: 'Compare activities, tours and experiences from GetYourGuide and Viator. Find things to do worldwide.',
};

export default async function ExplorePage() {
  const t = await getTranslations('explore');
  return (
    <>
      <PageSchema crumbs={[{ name: 'Explore', path: '/explore' }]} faqs={EXPLORE_FAQS} />
      <Header />

      <main>
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#F0FDF4_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-teal-50 text-teal-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🧭 {t('heroBadge')}</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            {t('heroTitlePre')} <em className="italic bg-gradient-to-br from-teal-500 to-emerald-600 bg-clip-text text-transparent">{t('heroTitleHighlight')}</em>
          </h1>
          <p className="text-[1rem] text-[#5C6378] font-semibold max-w-[520px] mx-auto">{t('heroSub')}</p>
        </div>

        <LazyExploreContent />
      </section>

      <PageSeoContent
        heading="Find things to do, worldwide"
        intro={[
          "Compare tours, activities and experiences from GetYourGuide, Viator and Klook in one place — skip-the-line tickets, guided day trips, food tours and more. Read reviews, check what's included and book the experiences that fit your trip.",
          "From a Colosseum tour in Rome to a desert safari in Dubai, browse things to do by destination and add them alongside your flights and hotels.",
        ]}
        linksHeading="Plan the rest of your trip"
        links={[
          { href: '/flights', label: 'Compare flights' },
          { href: '/hotels', label: 'Compare hotels' },
          { href: '/packages', label: 'Holiday packages' },
          { href: '/destinations', label: 'Destination guides' },
          { href: '/blog/best-hotels-rome-2026', label: 'Rome hotels' },
          { href: '/blog/best-hotels-dubai-2026', label: 'Dubai hotels' },
        ]}
        faqs={EXPLORE_FAQS}
      />
      </main>

      <Footer />
    </>
  );
}
