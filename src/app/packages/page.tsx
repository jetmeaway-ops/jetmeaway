import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LazyPackagesContent } from './packages-lazy';
import { PageSchema } from '@/lib/page-schema';
import { PACKAGES_FAQS } from '@/lib/page-faqs';

export const runtime = 'edge';

export const metadata = {
  title: 'Compare Holiday Packages | JetMeAway',
  description: 'Compare flight + hotel package deals from Expedia and Trip.com. ATOL-protected holiday bundles at the best prices.',
};

export default function PackagesPage() {
  return (
    <>
      <PageSchema crumbs={[{ name: 'Packages', path: '/packages' }]} faqs={PACKAGES_FAQS} />
      <Header />

      <main>
      <section
        className="relative pt-36 pb-12 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'linear-gradient(160deg, #1c0a22 0%, #2e0d2c 50%, #160516 100%)' }}
      >
        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-pink-300/30 text-pink-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(236,72,153,0.25)]"><span className="text-base leading-none">📦</span> Holiday Packages</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            Complete <em className="italic bg-gradient-to-br from-pink-300 via-purple-400 to-fuchsia-500 bg-clip-text text-transparent">Holiday</em> Packages
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">Flight + hotel bundles — compare prices across 2 package providers.</p>
        </div>

        <LazyPackagesContent />
      </section>
      </main>

      <Footer />
    </>
  );
}
