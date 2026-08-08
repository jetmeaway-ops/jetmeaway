import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSchema } from '@/lib/page-schema';
import { redirectUrl } from '@/lib/redirect';
import { CAR_HIRE_LOCATIONS, getCarHireLocation } from '@/data/car-hire-locations';
import { buildEcoBookingsUrl, buildTripComUrl, defaultWindow } from '@/lib/car-hire-links';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return CAR_HIRE_LOCATIONS.map(l => ({ slug: l.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const l = getCarHireLocation(slug);
  if (!l) return { title: 'Car hire not found | JetMeAway' };

  return {
    title: l.seoTitle,
    description: l.metaDescription,
    alternates: { canonical: `https://jetmeaway.co.uk/car-hire/${l.slug}` },
    openGraph: {
      title: l.seoTitle,
      description: l.metaDescription,
      url: `https://jetmeaway.co.uk/car-hire/${l.slug}`,
      type: 'website',
    },
  };
}

export default async function CarHirePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const l = getCarHireLocation(slug);
  if (!l) notFound();

  const { pickupDate, dropoffDate } = defaultWindow();
  const ebHref = redirectUrl(
    buildEcoBookingsUrl({ plc: l.plc, pickupDate, dropoffDate }),
    'EconomyBookings', l.place, 'cars',
  );
  const tripHref = redirectUrl(
    buildTripComUrl({ iata: l.iata, pickupDate, dropoffDate }),
    'Trip.com', l.place, 'cars',
  );

  const others = CAR_HIRE_LOCATIONS.filter(o => o.slug !== l.slug);

  return (
    <>
      <PageSchema
        crumbs={[
          { name: 'Car hire', path: '/cars' },
          { name: `${l.place} car hire`, path: `/car-hire/${l.slug}` },
        ]}
        faqs={l.faqs}
      />
      <Header />

      <main className="bg-[#F8FAFC] min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="max-w-[1000px] mx-auto px-5 py-12 md:py-16">
            <nav className="text-[.7rem] font-semibold opacity-80 mb-3">
              <Link href="/cars" className="hover:underline">Car hire</Link>
              <span className="mx-1.5">/</span>
              <span>{l.place}</span>
            </nav>
            <h1 className="font-poppins font-black text-[1.9rem] md:text-[2.6rem] leading-[1.15] mb-4">
              {l.h1}
            </h1>
            <p className="text-[.98rem] md:text-[1.05rem] leading-relaxed max-w-[760px] opacity-95">
              {l.intro}
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              <span className="bg-white/15 rounded-lg px-3 py-1.5 text-[.75rem] font-bold">
                Typically {l.typicalPrice}
              </span>
              <span className="bg-white/15 rounded-lg px-3 py-1.5 text-[.75rem] font-bold">
                {l.airport} ({l.iata})
              </span>
              <span className="bg-white/15 rounded-lg px-3 py-1.5 text-[.75rem] font-bold">
                No booking fees
              </span>
            </div>
          </div>
        </section>

        {/* Primary CTAs */}
        <section className="max-w-[1000px] mx-auto px-5 -mt-6 md:-mt-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href={ebHref} target="_blank" rel="noopener sponsored"
              className="block bg-white border border-[#E8ECF4] hover:border-emerald-300 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,102,255,0.08)] transition-all">
              <div className="text-[.6rem] font-black uppercase tracking-[2px] text-emerald-600 mb-1">Live prices</div>
              <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">EconomyBookings →</div>
              <div className="text-[.72rem] font-semibold text-[#5C6378] mt-0.5">
                {l.suppliers.slice(0, 5).join(' · ')}
              </div>
            </a>
            <a href={tripHref} target="_blank" rel="noopener sponsored"
              className="block bg-white border border-[#E8ECF4] hover:border-emerald-300 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,102,255,0.08)] transition-all">
              <div className="text-[.6rem] font-black uppercase tracking-[2px] text-emerald-600 mb-1">Compare too</div>
              <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">Trip.com →</div>
              <div className="text-[.72rem] font-semibold text-[#5C6378] mt-0.5">
                A second set of suppliers — worth checking both
              </div>
            </a>
          </div>
          <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-2.5 text-center">
            We compare and pass you through — we never add a markup or a booking fee.
            Prices shown here are typical ranges; tap through for your real dates.
          </p>
        </section>

        {/* Honest take */}
        <section className="max-w-[1000px] mx-auto px-5 pt-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="text-[.62rem] font-black uppercase tracking-[2px] text-amber-700 mb-1.5">
              Straight answer
            </div>
            <p className="text-[.9rem] text-[#1A1D2B] leading-relaxed font-medium">{l.honestTake}</p>
          </div>
        </section>

        {/* Body sections */}
        <section className="max-w-[1000px] mx-auto px-5 py-8">
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 md:p-8 space-y-8">
            {l.sections.map(s => (
              <div key={s.h2}>
                <h2 className="font-poppins font-black text-[1.25rem] text-[#1A1D2B] mb-3">{s.h2}</h2>
                <div className="space-y-3">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-[.92rem] text-[#5C6378] leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="max-w-[1000px] mx-auto px-5 pb-8">
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
            <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">
              Planning the rest of the trip?
            </h2>
            <div className="flex flex-wrap gap-2">
              {l.relatedFlightPost && (
                <Link href={`/blog/${l.relatedFlightPost}`}
                  className="bg-[#F8FAFC] border border-[#E8ECF4] hover:border-[#0066FF] rounded-xl px-4 py-2.5 text-[.82rem] font-bold text-[#1A1D2B] transition-colors">
                  Flights to {l.place} →
                </Link>
              )}
              {l.relatedHotelPost && (
                <Link href={`/blog/${l.relatedHotelPost}`}
                  className="bg-[#F8FAFC] border border-[#E8ECF4] hover:border-[#0066FF] rounded-xl px-4 py-2.5 text-[.82rem] font-bold text-[#1A1D2B] transition-colors">
                  Best hotels in {l.place} →
                </Link>
              )}
              <Link href="/cars"
                className="bg-[#F8FAFC] border border-[#E8ECF4] hover:border-[#0066FF] rounded-xl px-4 py-2.5 text-[.82rem] font-bold text-[#1A1D2B] transition-colors">
                Search car hire anywhere →
              </Link>
            </div>

            {others.length > 0 && (
              <>
                <h3 className="font-poppins font-black text-[.85rem] text-[#8E95A9] uppercase tracking-wider mt-6 mb-2.5">
                  Other car hire guides
                </h3>
                <div className="flex flex-wrap gap-2">
                  {others.map(o => (
                    <Link key={o.slug} href={`/car-hire/${o.slug}`}
                      className="bg-[#F8FAFC] border border-[#E8ECF4] hover:border-[#0066FF] rounded-xl px-4 py-2.5 text-[.82rem] font-bold text-[#1A1D2B] transition-colors">
                      Car hire {o.place} →
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* FAQs */}
        <section className="max-w-[1000px] mx-auto px-5 pb-14">
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 md:p-8">
            <h2 className="font-poppins font-black text-[1.35rem] text-[#1A1D2B] mb-5">
              Car hire {l.place}: your questions answered
            </h2>
            <div className="space-y-5">
              {l.faqs.map(f => (
                <div key={f.q}>
                  <h3 className="font-poppins font-black text-[.95rem] text-[#1A1D2B] mb-1.5">{f.q}</h3>
                  <p className="text-[.88rem] text-[#5C6378] leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
