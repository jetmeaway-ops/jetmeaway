import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HotelPhoto from '@/components/blog/HotelPhoto';
import { PageSchema } from '@/lib/page-schema';
import { redirectUrl } from '@/lib/redirect';
import { WC_CITIES, type WorldCupCity } from '@/data/world-cup-cities';
import {
  hotelExpediaUrl,
  hotelTripcomUrl,
  flightAviasalesUrl,
  flightTripUrl,
  flightExpediaUrl,
  WC_DATES,
} from '@/lib/wc-deeplinks';
import FlightPicker from './FlightPicker';

export const runtime = 'edge';

export const metadata = {
  title: 'World Cup 2026 Host Cities — Hotels & Flights | JetMeAway',
  description:
    "Follow the 2026 World Cup across all 11 host cities. Boutique hotels near every stadium, flights between host cities, and England's confirmed route — Dallas, Boston, New York. No booking fees.",
  alternates: { canonical: 'https://jetmeaway.co.uk/world-cup-2026' },
};

// England's two inter-city legs + marquee inter-host-city hops. Built server-side.
const FEATURED_ROUTES = [
  { from: 'DFW', to: 'BOS', fromCity: 'Dallas', toCity: 'Boston', dep: '2026-06-19', tag: "England's route" },
  { from: 'BOS', to: 'EWR', fromCity: 'Boston', toCity: 'New York', dep: '2026-06-25', tag: "England's route" },
  { from: 'JFK', to: 'LAX', fromCity: 'New York', toCity: 'Los Angeles', dep: WC_DATES.flightDep },
  { from: 'MIA', to: 'ATL', fromCity: 'Miami', toCity: 'Atlanta', dep: WC_DATES.flightDep },
  { from: 'LAX', to: 'SFO', fromCity: 'Los Angeles', toCity: 'San Francisco', dep: WC_DATES.flightDep },
  { from: 'SEA', to: 'YVR', fromCity: 'Seattle', toCity: 'Vancouver', dep: WC_DATES.flightDep },
  { from: 'YYZ', to: 'JFK', fromCity: 'Toronto', toCity: 'New York', dep: WC_DATES.flightDep },
  { from: 'ATL', to: 'DFW', fromCity: 'Atlanta', toCity: 'Dallas', dep: WC_DATES.flightDep },
  { from: 'MIA', to: 'JFK', fromCity: 'Miami', toCity: 'New York', dep: WC_DATES.flightDep },
  { from: 'MEX', to: 'LAX', fromCity: 'Mexico City', toCity: 'Los Angeles', dep: WC_DATES.flightDep },
];

const FAQS = [
  {
    q: 'Where is the 2026 World Cup being held?',
    a: 'Across 16 host cities in the USA, Canada and Mexico. This page covers the 11 major host cities for UK fans, from 11 June to 19 July 2026, with the final at New York New Jersey Stadium (MetLife).',
  },
  {
    q: 'Which cities do England play in?',
    a: "England's Group L games are in Dallas (vs Croatia, 17 June), Boston (vs Ghana, 23 June) and New York/New Jersey (vs Panama, 27 June).",
  },
  {
    q: 'How do I book hotels and flights for the World Cup?',
    a: 'JetMeAway compares live prices with no booking fees. Pick a host city below for boutique hotels near the stadium, then use the flight links to hop between host cities.',
  },
];

function HotelCard({ city, hotel }: { city: WorldCupCity; hotel: WorldCupCity['hotels'][number] }) {
  const expedia = redirectUrl(
    hotelExpediaUrl(hotel.name, WC_DATES.hotelCin, WC_DATES.hotelCout, 2),
    'expedia',
    city.shortName,
    'hotels',
  );
  const trip = redirectUrl(
    hotelTripcomUrl(hotel.name, WC_DATES.hotelCin, WC_DATES.hotelCout, 2),
    'tripcom',
    city.shortName,
    'hotels',
  );
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-[0_8px_30px_-12px_rgba(0,102,255,0.12)] transition-shadow hover:shadow-[0_16px_44px_-14px_rgba(0,102,255,0.22)]">
      <HotelPhoto
        hotelName={hotel.name}
        city={city.shortName}
        className="h-[180px] w-full object-cover"
      />
      <div className="p-4">
        <h4 className="font-poppins text-[1.02rem] font-black leading-tight text-[#1A1D2B]">{hotel.name}</h4>
        <p className="mt-0.5 text-[.72rem] font-bold uppercase tracking-[1px] text-[#0066FF]">{hotel.neighbourhood}</p>
        <p className="mt-2 text-[.86rem] font-medium leading-snug text-[#5C6378]">{hotel.hook}</p>
        <div className="mt-4 flex gap-2">
          <a
            href={expedia}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex-1 rounded-lg bg-[#0066FF] py-2.5 text-center font-poppins text-[.78rem] font-black text-white transition-colors hover:bg-[#0052CC]"
          >
            Expedia
          </a>
          <a
            href={trip}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex-1 rounded-lg border border-[#0066FF] bg-white py-2.5 text-center font-poppins text-[.78rem] font-black text-[#0066FF] transition-colors hover:bg-blue-50"
          >
            Trip.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default function WorldCup2026Page() {
  return (
    <>
      <PageSchema crumbs={[{ name: 'World Cup 2026', path: '/world-cup-2026' }]} faqs={FAQS} />
      {/* Soccer-ball button styling (the ONE special button on the page). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.wc-ball{
  background:
    radial-gradient(circle at 50% 19%, #0a1628 0 9px, transparent 10px),
    radial-gradient(circle at 17% 43%, #0a1628 0 9px, transparent 10px),
    radial-gradient(circle at 83% 43%, #0a1628 0 9px, transparent 10px),
    radial-gradient(circle at 31% 81%, #0a1628 0 9px, transparent 10px),
    radial-gradient(circle at 69% 81%, #0a1628 0 9px, transparent 10px),
    #ffffff;
  border:3px solid #0a1628;
}
.wc-ball:hover{ transform: rotate(360deg) scale(1.04); }
`,
        }}
      />
      <Header />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          id="top"
          className="relative px-5 pt-32 pb-16 md:pt-36"
          style={{ background: 'linear-gradient(160deg,#0b1f3a 0%,#0a1628 55%,#060c18 100%)' }}
        >
          <div className="relative z-[1] mx-auto max-w-[820px] text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[.65rem] font-black uppercase tracking-[2.5px] text-white/80 backdrop-blur">
              <i className="fa-solid fa-futbol text-[.85rem]" aria-hidden="true" /> World Cup 2026 · USA · Canada · Mexico
            </span>
            <h1 className="font-poppins text-[2.4rem] font-black leading-[1.05] tracking-tight text-white md:text-[3.6rem]">
              Follow the World Cup across{' '}
              <span className="bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">
                11 host cities
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[1rem] font-semibold text-white/65">
              Boutique hotels near every stadium and flights between host cities — plus England&apos;s confirmed route through
              Dallas, Boston and New York. No markups, no booking fees.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
              {/* THE single soccer-ball button */}
              <a
                href="#host-cities"
                aria-label="Explore the 11 host cities"
                className="wc-ball group relative inline-flex h-32 w-32 items-center justify-center rounded-full text-center font-poppins text-[.82rem] font-black leading-tight text-[#0a1628] shadow-[0_18px_50px_-12px_rgba(0,102,255,0.55)] transition-transform duration-700 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="relative z-10 px-2">
                  Explore
                  <br />
                  Host&nbsp;Cities
                </span>
              </a>

              <Link
                href="/blog/england-world-cup-2026"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] px-7 py-3.5 font-poppins text-[.95rem] font-black text-white shadow-[0_8px_24px_rgba(0,102,255,0.3)] transition-all hover:-translate-y-0.5"
              >
                Read the full England guide <i className="fa-solid fa-arrow-right text-[.8rem]" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── England's route strip ────────────────────────────────────── */}
        <section id="england-route" className="bg-[#F8FAFC] px-5 py-14">
          <div className="mx-auto max-w-[1000px]">
            <h2 className="text-center font-poppins text-[1.6rem] font-black text-[#1A1D2B] md:text-[2rem]">
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 England&apos;s Group L Route
            </h2>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-[.92rem] font-semibold text-[#5C6378]">
              Three cities on the US East Coast — a kind draw for travelling fans.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {WC_CITIES.filter((c) => c.englandMatch).map((c) => (
                <a
                  key={c.slug}
                  href={`#city-${c.slug}`}
                  className="group rounded-2xl border border-[#E8ECF4] bg-white p-5 text-center shadow-[0_8px_30px_-12px_rgba(0,102,255,0.12)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_44px_-14px_rgba(0,102,255,0.22)]"
                >
                  <p className="text-[.7rem] font-black uppercase tracking-[1.5px] text-[#0066FF]">{c.englandMatch!.date}</p>
                  <p className="mt-1 font-poppins text-[1.4rem] font-black text-[#1A1D2B]">{c.shortName}</p>
                  <p className="mt-1 text-[.85rem] font-semibold text-[#5C6378]">{c.englandMatch!.label}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Host cities ──────────────────────────────────────────────── */}
        <section id="host-cities" className="px-5 py-16">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">
              The 11 Host Cities &amp; Where to Stay
            </h2>
            <p className="mx-auto mt-3 max-w-[600px] text-center text-[.95rem] font-semibold text-[#5C6378]">
              Hand-picked boutique and characterful hotels near each stadium — the kind of stays you won&apos;t find on a
              generic chain list.
            </p>

            <div className="mt-12 space-y-16">
              {WC_CITIES.map((city) => (
                <div key={city.slug} id={`city-${city.slug}`} className="scroll-mt-28">
                  {/* City header */}
                  <div className="flex flex-col gap-3 border-b border-[#E8ECF4] pb-5 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="font-poppins text-[1.7rem] font-black leading-none text-[#1A1D2B]">
                        {city.flag} {city.name}
                      </h3>
                      <p className="mt-2 text-[.9rem] font-semibold text-[#5C6378]">
                        <i className="fa-solid fa-location-dot mr-1.5 text-[#0066FF]" aria-hidden="true" />
                        {city.stadiumFifa} <span className="text-[#8E95A9]">({city.stadiumCommercial})</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {city.englandMatch && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[.68rem] font-black uppercase tracking-[1px] text-[#D9281B]">
                            🏴󠁧󠁢󠁥󠁮󠁧󠁿 England play here · {city.englandMatch.date}
                          </span>
                        )}
                        {city.note && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[.68rem] font-black uppercase tracking-[1px] text-[#0066FF]">
                            {city.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/blog/${city.blogSlug}`}
                      className="shrink-0 self-start rounded-xl border border-[#0066FF] px-4 py-2.5 font-poppins text-[.82rem] font-black text-[#0066FF] transition-colors hover:bg-blue-50 md:self-auto"
                    >
                      Full {city.shortName} hotel guide →
                    </Link>
                  </div>

                  {/* Niche hotel cards */}
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {city.hotels.map((hotel) => (
                      <HotelCard key={hotel.name} city={city} hotel={hotel} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flights between host cities ──────────────────────────────── */}
        <section id="flights" className="bg-[#0a1628] px-5 py-16">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-white md:text-[2.4rem]">
              Flights Between Host Cities
            </h2>
            <p className="mx-auto mt-3 max-w-[600px] text-center text-[.95rem] font-semibold text-white/60">
              North America is vast. Hop between host cities with the cheapest fares — compared across Aviasales, Trip.com and
              Expedia.
            </p>

            {/* Featured routes */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_ROUTES.map((r) => {
                const av = redirectUrl(flightAviasalesUrl(r.from, r.to, r.dep, null, 1), 'aviasales', r.toCity, 'flights');
                const tp = redirectUrl(flightTripUrl(r.from, r.to, r.dep, null, 1), 'tripcom', r.toCity, 'flights');
                const ex = redirectUrl(flightExpediaUrl(r.from, r.to, r.dep, null, 1), 'expedia', r.toCity, 'flights');
                return (
                  <div key={`${r.from}-${r.to}`} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    {r.tag && (
                      <span className="mb-2 inline-block rounded-full bg-[#0066FF]/20 px-2.5 py-0.5 text-[.6rem] font-black uppercase tracking-[1.5px] text-cyan-300">
                        {r.tag}
                      </span>
                    )}
                    <p className="font-poppins text-[1.15rem] font-black text-white">
                      {r.fromCity} <span className="text-white/40">→</span> {r.toCity}
                    </p>
                    <p className="mt-0.5 text-[.78rem] font-semibold text-white/45">
                      {r.from} → {r.to}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <a href={av} target="_blank" rel="noopener noreferrer sponsored" className="flex-1 rounded-lg bg-[#0066FF] py-2 text-center font-poppins text-[.72rem] font-black text-white transition-colors hover:bg-[#0052CC]">
                        Aviasales
                      </a>
                      <a href={tp} target="_blank" rel="noopener noreferrer sponsored" className="flex-1 rounded-lg bg-white/10 py-2 text-center font-poppins text-[.72rem] font-black text-white transition-colors hover:bg-white/20">
                        Trip.com
                      </a>
                      <a href={ex} target="_blank" rel="noopener noreferrer sponsored" className="flex-1 rounded-lg bg-white/10 py-2 text-center font-poppins text-[.72rem] font-black text-white transition-colors hover:bg-white/20">
                        Expedia
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive picker */}
            <div className="mx-auto mt-10 max-w-[760px]">
              <p className="mb-3 text-center text-[.8rem] font-black uppercase tracking-[2px] text-white/50">
                Or build any route
              </p>
              <FlightPicker />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ───────────────────────────────────────────────── */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-[760px] rounded-3xl border border-[#E8ECF4] bg-gradient-to-br from-[#EBF3FF] to-[#F8FAFC] p-8 text-center md:p-10">
            <h2 className="font-poppins text-[1.5rem] font-black text-[#1A1D2B] md:text-[1.8rem]">
              Plan the whole England trip in one place
            </h2>
            <p className="mx-auto mt-2 max-w-[460px] text-[.9rem] font-semibold text-[#5C6378]">
              History, the 2026 fixtures, host-city guides and the full booking funnel — all in our complete England guide.
            </p>
            <Link
              href="/blog/england-world-cup-2026"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] px-7 py-3.5 font-poppins text-[.92rem] font-black text-white shadow-[0_8px_24px_rgba(0,102,255,0.28)] transition-all hover:-translate-y-0.5"
            >
              Read the England World Cup guide <i className="fa-solid fa-arrow-right text-[.8rem]" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
