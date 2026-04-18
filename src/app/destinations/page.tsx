import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DESTINATIONS } from '@/data/destinations';

export const metadata: Metadata = {
  title: 'Travel Destinations — Hotels & Flights Guide | JetMeAway',
  description:
    'City-by-city travel guides for UK travellers. Compare hotels, flights, neighbourhoods and visa rules for Dubai, Istanbul, Islamabad, Baku and more.',
  alternates: { canonical: 'https://jetmeaway.co.uk/destinations' },
};

export default function DestinationsIndex() {
  return (
    <>
      <Header />
      <section className="pt-32 pb-10 px-5 text-center bg-[radial-gradient(ellipse_at_top,#EBF3FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[780px] mx-auto">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">
            🌍 Destinations
          </span>
          <h1 className="font-[var(--font-playfair)] text-[2.2rem] md:text-[3rem] font-black tracking-tight mb-4 text-[#1A1D2B]">
            Where UK travellers are going in 2026
          </h1>
          <p className="text-[1rem] text-[#5C6378] font-semibold leading-relaxed max-w-[620px] mx-auto">
            Honest city guides written for UK travellers. Real prices, real
            neighbourhoods, real visa rules — then compare hotels and flights in one click.
          </p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DESTINATIONS.map(d => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="group relative block overflow-hidden rounded-2xl aspect-[4/5] shadow-[0_8px_30px_rgba(0,102,255,0.08)] hover:shadow-[0_12px_40px_rgba(0,102,255,0.18)] transition-shadow"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url(${d.heroImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="text-[.6rem] font-black uppercase tracking-[2.5px] opacity-80 mb-1">
                  {d.country} · {d.iata}
                </div>
                <h2 className="font-[var(--font-playfair)] text-[1.7rem] font-black leading-tight mb-1">
                  {d.city}
                </h2>
                <p className="text-[.82rem] opacity-90 font-medium line-clamp-2 mb-3">{d.tagline}</p>
                <div className="flex items-center gap-3 text-[.72rem] opacity-90 font-semibold">
                  <span>🏨 from £{d.averageNightlyPrice}</span>
                  <span>✈️ {d.flightTimeFromLondonHours}h</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
