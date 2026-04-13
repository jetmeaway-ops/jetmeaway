import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LazyExploreContent } from './explore-lazy';

export const runtime = 'edge';

export const metadata = {
  title: 'Explore Activities & Tours | JetMeAway',
  description: 'Compare activities, tours and experiences from GetYourGuide, Viator, Klook, Tiqets and more. Find things to do worldwide.',
};

export default function ExplorePage() {
  return (
    <>
      <Header />

      <main>
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#F0FDF4_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-teal-50 text-teal-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🧭 Explore</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Things To <em className="italic bg-gradient-to-br from-teal-500 to-emerald-600 bg-clip-text text-transparent">Do</em>
          </h1>
          <p className="text-[1rem] text-[#5C6378] font-semibold max-w-[520px] mx-auto">Compare activities, tours & experiences from 5 trusted providers.</p>
        </div>

        <LazyExploreContent />
      </section>
      </main>

      <Footer />
    </>
  );
}
