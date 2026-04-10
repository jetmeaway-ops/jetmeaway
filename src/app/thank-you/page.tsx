export const runtime = 'edge';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Thank You | JetMeAway',
  description: 'Your search is being processed. We are finding you the best travel deals from 15+ providers.',
};

export default function ThankYou() {
  return (
    <>
      <Header />

      <section className="pt-40 pb-20 px-5 min-h-[70vh] bg-[radial-gradient(ellipse_at_top,#EBF3FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[640px] mx-auto text-center">
          {/* Success icon — plane with gradient circle */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] shadow-[0_12px_40px_rgba(0,102,255,0.25)] mb-8">
            <span className="text-5xl" role="img" aria-label="airplane">✈️</span>
          </div>

          {/* Heading */}
          <h1 className="font-poppins text-[2.6rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-4">
            Thank <em className="italic bg-gradient-to-br from-[#0066FF] to-[#0052CC] bg-clip-text text-transparent">You!</em>
          </h1>

          {/* Subtitle */}
          <p className="text-[1rem] md:text-[1.1rem] text-[#5C6378] font-semibold max-w-[520px] mx-auto mb-10 leading-relaxed">
            Your search is being processed. We&apos;re finding you the best deals from <strong className="text-[#1A1D2B]">15+ providers</strong>.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border-2 border-[#E8ECF4] bg-white text-[#1A1D2B] font-poppins font-black text-[.9rem] hover:border-[#0066FF] hover:text-[#0066FF] transition-all w-full sm:w-auto"
            >
              <i className="fa-solid fa-house text-[.8rem]" />
              Back to Home
            </a>
            <a
              href="/hotels"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-poppins font-black text-[.9rem] shadow-[0_8px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_32px_rgba(0,102,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all w-full sm:w-auto"
            >
              Search Again
              <i className="fa-solid fa-arrow-right text-[.8rem]" />
            </a>
          </div>

          {/* Subtle reassurance line */}
          <p className="text-[.75rem] text-[#8E95A9] font-semibold mt-10">
            No booking fees · Real prices · 15+ trusted providers
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
