import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSchema } from '@/lib/page-schema';
import { WC_CITIES, WC_DATES, STADIUM_COORDS, type WorldCupCity } from '@/data/world-cup-cities';
import { WC_BUDGET, WC_CHECKLIST, WC_COMMUTE_BY_SLUG, WC_SQUAD, WC_GROUP_STAGE } from '@/data/world-cup-content';
import WorldCupVenueMap from '@/components/WorldCupVenueMap';
import WorldCupFanWall from '@/components/WorldCupFanWall';
import FlightPicker from './FlightPicker';
import PrintButton from './PrintButton';

export const runtime = 'edge';
// Re-render every request so the date-based city filter + hotel pre-fill dates
// are always evaluated against the live "today" (cities drop off after their
// last match; hotel links pre-fill to each city's next match).
export const dynamic = 'force-dynamic';

/* ── Date helpers (match-aware hotel dates + auto-hide) ──────────────────── */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Earliest match date that is today or later, or null if all have passed. */
function nextMatchDate(dates: string[], today: string): string | null {
  const upcoming = dates.filter((d) => d >= today).sort();
  return upcoming[0] ?? null;
}
/** "14–16 Jun" style label for a check-in → check-out window. */
function fmtRange(cin: string, cout: string): string {
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDate();
  const mon = new Date(`${cout}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const cinMon = new Date(`${cin}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return cinMon === mon ? `${day(cin)}–${day(cout)} ${mon}` : `${day(cin)} ${cinMon} – ${day(cout)} ${mon}`;
}

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

function StadiumCard({
  city,
  cin,
  cout,
}: {
  city: WorldCupCity;
  cin: string;
  cout: string;
}) {
  // ONE card per city, headed by the STADIUM — because the button searches live
  // hotels CENTRED ON THE VENUE (lat/lng = the geo-filter centroid), not a named
  // hotel. Dates pre-filled to the next match (+2 nights). No affiliate redirect.
  const s = STADIUM_COORDS[city.slug];
  const commute = WC_COMMUTE_BY_SLUG[city.slug];
  const bookUrl = s
    ? `/hotels?destination=${encodeURIComponent(city.shortName)}&checkin=${cin}&checkout=${cout}&lat=${s.lat}&lng=${s.lng}&radius=${s.radiusKm}`
    : `/hotels?destination=${encodeURIComponent(city.shortName)}&checkin=${cin}&checkout=${cout}`;
  return (
    <div className="overflow-hidden rounded-3xl border border-[#E8ECF4] bg-white shadow-[0_10px_36px_-14px_rgba(0,102,255,0.16)] transition-shadow hover:shadow-[0_18px_48px_-16px_rgba(0,102,255,0.26)] md:flex">
      {/* Destination visual — the curated city hero (reliable Unsplash), not a
          per-hotel photo, so it never breaks. */}
      <div className="relative h-[200px] md:h-auto md:w-2/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={city.heroImage}
          alt={`${city.shortName} — hotels near ${city.stadiumCommercial}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      {/* Body — stadium is the header */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
        <p className="text-[.7rem] font-black uppercase tracking-[1.5px] text-[#0066FF]">
          <i className="fa-solid fa-location-dot mr-1.5" aria-hidden="true" />
          Stay closest to the ground
        </p>
        <h4 className="mt-2 font-poppins text-[1.5rem] font-black leading-tight text-[#1A1D2B]">
          {city.stadiumCommercial}
        </h4>
        <p className="mt-1 text-[.85rem] font-semibold text-[#8E95A9]">{city.stadiumFifa}</p>
        <p className="mt-3 max-w-[440px] text-[.9rem] font-medium leading-snug text-[#5C6378]">
          Live, bookable hotels around the stadium — with your match dates pre-filled. No markups, no booking fees.
        </p>
        {commute && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-[#F8FAFC] p-3 text-[.78rem] font-medium leading-snug text-[#5C6378]">
            <p><i className="fa-solid fa-plane-arrival mr-1.5 text-[#0066FF]" aria-hidden="true" />{commute.airportToStadium}</p>
            <p><i className="fa-solid fa-temperature-half mr-1.5 text-[#0066FF]" aria-hidden="true" />{commute.climate}</p>
          </div>
        )}
        <Link
          href={bookUrl}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-6 py-3.5 font-poppins text-[.9rem] font-black text-white transition-colors hover:bg-[#0052CC] sm:w-auto"
        >
          <i className="fa-solid fa-bolt text-[.8rem]" aria-hidden="true" /> Live hotels near stadium · {fmtRange(cin, cout)}
        </Link>
      </div>
    </div>
  );
}

/* ── England group-stage scenario ───────────────────────────────────────── */
function GroupStageSection() {
  const g = WC_GROUP_STAGE;
  return (
    <section id="group-stage" className="px-5 py-16">
      <div className="mx-auto max-w-[1000px]">
        <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">
          🏴󠁧󠁢󠁥󠁮󠁧󠁿 England&apos;s Group L — the run-down
        </h2>
        <p className="mx-auto mt-3 max-w-[660px] text-center text-[.95rem] font-semibold text-[#5C6378]">{g.summary}</p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {g.fixtures.map((f) => (
            <div key={f.match} className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-[0_8px_30px_-14px_rgba(0,102,255,0.12)]">
              <p className="text-[.7rem] font-black uppercase tracking-[1.5px] text-[#0066FF]">{f.date}</p>
              <p className="mt-2 font-poppins text-[1.02rem] font-black leading-tight text-[#1A1D2B]">{f.match}</p>
              <p className="mt-1 text-[.84rem] font-semibold text-[#5C6378]">{f.city}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-[#F8FAFC] p-5">
            <p className="text-[.72rem] font-black uppercase tracking-[1.5px] text-[#0066FF]"><i className="fa-solid fa-route mr-1.5" aria-hidden="true" />Travel between games</p>
            <p className="mt-2 text-[.88rem] font-medium leading-snug text-[#5C6378]">{g.travel}</p>
          </div>
          <div className="rounded-2xl bg-[#F8FAFC] p-5">
            <p className="text-[.72rem] font-black uppercase tracking-[1.5px] text-[#0066FF]"><i className="fa-solid fa-cloud-sun mr-1.5" aria-hidden="true" />Climate to expect</p>
            <p className="mt-2 text-[.88rem] font-medium leading-snug text-[#5C6378]">{g.climate}</p>
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-[760px] text-center text-[.72rem] font-medium text-[#8E95A9]">{g.disclaimer}</p>
      </div>
    </section>
  );
}

/* ── Tuchel tactical blueprint + predicted XI ───────────────────────────── */
function SquadSection() {
  const sq = WC_SQUAD;
  return (
    <section id="squad" className="bg-[#0a1628] px-5 py-16">
      <div className="mx-auto max-w-[1000px]">
        <h2 className="text-center font-poppins text-[1.8rem] font-black text-white md:text-[2.4rem]">
          Tuchel&apos;s England — predicted blueprint
        </h2>
        <div className="mt-4 flex justify-center">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-[.8rem] font-black tracking-wide text-cyan-300">{sq.formation}</span>
        </div>
        <p className="mx-auto mt-4 max-w-[700px] text-center text-[.93rem] font-semibold text-white/70">{sq.blueprint}</p>

        <p className="mt-10 text-center text-[.72rem] font-black uppercase tracking-[2px] text-white/45">Predicted starting XI</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sq.predictedXI.map((p) => (
            <div key={p.name} className="rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10">
              <p className="text-[.6rem] font-black uppercase tracking-[1px] text-cyan-300">{p.position}</p>
              <p className="mt-1 font-poppins text-[.92rem] font-black leading-tight text-white">{p.name}</p>
              {p.club && <p className="mt-0.5 text-[.72rem] font-semibold text-white/45">{p.club}</p>}
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {sq.spotlights.map((s) => (
            <div key={s.name} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="font-poppins text-[1.02rem] font-black text-white"><i className="fa-solid fa-star mr-2 text-amber-400" aria-hidden="true" />{s.name}</p>
              <p className="mt-2 text-[.85rem] font-medium leading-snug text-white/65">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-[760px] text-center text-[.72rem] font-medium text-white/40">{sq.disclaimer}</p>
      </div>
    </section>
  );
}

/* ── Tiered budget breakdowns ───────────────────────────────────────────── */
function BudgetSection() {
  const b = WC_BUDGET;
  return (
    <section id="budget" className="bg-[#F8FAFC] px-5 py-16">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">What will it cost?</h2>
        <p className="mx-auto mt-3 max-w-[600px] text-center text-[.95rem] font-semibold text-[#5C6378]">
          Three honest tiers for a UK fan — estimates only. Compare live prices before you book.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {b.tiers.map((t, i) => (
            <div key={t.name} className={`rounded-3xl border bg-white p-6 ${i === 1 ? 'border-[#0066FF] shadow-[0_16px_44px_-14px_rgba(0,102,255,0.28)]' : 'border-[#E8ECF4]'}`}>
              {i === 1 && <span className="mb-2 inline-block rounded-full bg-[#0066FF] px-2.5 py-0.5 text-[.58rem] font-black uppercase tracking-[1.5px] text-white">Sweet spot</span>}
              <h3 className="font-poppins text-[1.3rem] font-black text-[#1A1D2B]">{t.name}</h3>
              <p className="mt-1 text-[.82rem] font-semibold text-[#8E95A9]">{t.vibe}</p>
              <p className="mt-4 font-poppins text-[1.55rem] font-black text-[#0066FF]">{t.dailyPerPersonGBP}<span className="text-[.78rem] font-bold text-[#8E95A9]"> /day pp</span></p>
              <p className="text-[.82rem] font-bold text-[#5C6378]">≈ {t.weekTotalPerPersonGBP} total pp</p>
              <ul className="mt-4 space-y-2">
                {t.includes.map((inc) => (
                  <li key={inc} className="flex gap-2 text-[.82rem] font-medium leading-snug text-[#5C6378]"><i className="fa-solid fa-check mt-0.5 shrink-0 text-[#0066FF]" aria-hidden="true" />{inc}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-[820px] text-center text-[.74rem] font-medium text-[#8E95A9]">
          {b.assumptions} JetMeAway is a comparison engine — guidance estimates, not financial advice or quotes.
        </p>
      </div>
    </section>
  );
}

/* ── Fan packing + documents checklist ──────────────────────────────────── */
function ChecklistSection() {
  const c = WC_CHECKLIST;
  return (
    <section id="checklist" className="px-5 py-16">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">Fan packing &amp; documents checklist</h2>
          <p className="max-w-[640px] text-[.95rem] font-semibold text-[#5C6378]">Everything to sort before you fly — tick it off, then print or save it as a PDF.</p>
          <PrintButton />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {c.entry.map((e) => (
            <div key={e.country} className="rounded-2xl border border-[#E8ECF4] bg-white p-5">
              <p className="font-poppins text-[1.05rem] font-black text-[#1A1D2B]"><i className="fa-solid fa-passport mr-2 text-[#0066FF]" aria-hidden="true" />{e.country}</p>
              <p className="mt-2 text-[.79rem] font-medium leading-snug text-[#5C6378]">{e.requirement}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-6">
            <p className="font-poppins text-[1.05rem] font-black text-[#1A1D2B]">Packing list</p>
            <ul className="mt-3 space-y-2.5">
              {c.packing.map((p) => (
                <li key={p} className="flex gap-2.5 text-[.84rem] font-medium leading-snug text-[#5C6378]"><span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border-2 border-[#0066FF]" />{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-6">
            <p className="font-poppins text-[1.05rem] font-black text-[#1A1D2B]">Smart-fan tips</p>
            <ul className="mt-3 space-y-2.5">
              {c.tips.map((t) => (
                <li key={t} className="flex gap-2.5 text-[.84rem] font-medium leading-snug text-[#5C6378]"><i className="fa-solid fa-lightbulb mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WorldCup2026Page() {
  const today = todayISO();
  // A city stays on the page only while it still has a match today or later.
  const visibleCities = WC_CITIES.filter((c) => c.matchDates.some((d) => d >= today));
  // England route strip: only games still to come.
  const englandCities = WC_CITIES.filter((c) => c.englandMatch && c.englandMatch.iso >= today);

  return (
    <>
      <PageSchema crumbs={[{ name: 'World Cup 2026', path: '/world-cup-2026' }]} faqs={FAQS} />
      {/* Soccer-ball button styling (the ONE special button on the page). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.wc-ball-img{ transition: transform .7s ease; }
.wc-ball:hover .wc-ball-img{ transform: rotate(360deg) scale(1.04); }
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
              {/* THE single soccer-ball button — the real adidas Trionda
                  2026 match ball, with the label below (text over the ball
                  would clash with the FIFA logo / swirls). */}
              <a
                href="#host-cities"
                aria-label="Explore the 11 host cities"
                className="wc-ball group inline-flex flex-col items-center gap-3 focus:outline-none"
              >
                <span className="relative inline-flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_18px_50px_-12px_rgba(0,102,255,0.55)] ring-1 ring-black/10 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/wc-2026-ball.webp"
                    alt="adidas Trionda — the official 2026 World Cup match ball"
                    className="wc-ball-img h-full w-full scale-[1.06] object-cover"
                  />
                </span>
                <span className="inline-flex items-center gap-2 font-poppins text-[.92rem] font-black uppercase tracking-[1px] text-white">
                  Explore Host Cities
                  <i className="fa-solid fa-chevron-down text-[.78rem]" aria-hidden="true" />
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

        {/* ── England's route strip (only while games are still to come) ── */}
        {englandCities.length > 0 && (
        <section id="england-route" className="bg-[#F8FAFC] px-5 py-14">
          <div className="mx-auto max-w-[1000px]">
            <h2 className="text-center font-poppins text-[1.6rem] font-black text-[#1A1D2B] md:text-[2rem]">
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 England&apos;s Group L Route
            </h2>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-[.92rem] font-semibold text-[#5C6378]">
              England&apos;s remaining group games — book the match-day stay before rooms go.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {englandCities.map((c) => (
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
        )}

        {/* ── England's group-stage scenario ───────────────────────────── */}
        <GroupStageSection />

        {/* ── Tuchel blueprint + predicted XI ──────────────────────────── */}
        <SquadSection />

        {/* ── Interactive venue map ────────────────────────────────────── */}
        <section id="venues" className="bg-[#F8FAFC] px-5 py-16">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">Where the matches are</h2>
            <p className="mx-auto mt-3 max-w-[640px] text-center text-[.95rem] font-semibold text-[#5C6378]">
              Every host stadium and the airport you fly into — tap a pin for the detail.
            </p>
            <div className="mt-8">
              <WorldCupVenueMap citySlugs={visibleCities.map((c) => c.slug)} />
            </div>
            <div className="mt-4 flex justify-center gap-6 text-[.78rem] font-semibold text-[#5C6378]">
              <span>⚽ Stadium</span>
              <span>✈️ Airport</span>
            </div>
          </div>
        </section>

        {/* ── Host cities ──────────────────────────────────────────────── */}
        <section id="host-cities" className="px-5 py-16">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">
              {visibleCities.length > 0
                ? `${visibleCities.length} Host ${visibleCities.length === 1 ? 'City' : 'Cities'} & Where to Stay`
                : 'The 2026 World Cup Has Wrapped'}
            </h2>
            <p className="mx-auto mt-3 max-w-[600px] text-center text-[.95rem] font-semibold text-[#5C6378]">
              {visibleCities.length > 0
                ? 'Hand-picked boutique hotels near each stadium, with dates pre-filled for the next match in town — once a city’s games are done, it drops off this list.'
                : 'Every host city’s matches have finished. Browse our full hotel guides instead.'}
            </p>

            {visibleCities.length === 0 && (
              <div className="mt-8 text-center">
                <Link
                  href="/blog/england-world-cup-2026"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] px-7 py-3.5 font-poppins text-[.92rem] font-black text-white"
                >
                  Read the England World Cup guide <i className="fa-solid fa-arrow-right text-[.8rem]" aria-hidden="true" />
                </Link>
              </div>
            )}

            <div className="mt-12 space-y-16">
              {visibleCities.map((city) => {
                const cin = nextMatchDate(city.matchDates, today) ?? city.matchDates[city.matchDates.length - 1];
                const cout = addDaysISO(cin, 2);
                return (
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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[.68rem] font-black uppercase tracking-[1px] text-emerald-700">
                          <i className="fa-solid fa-calendar-check" aria-hidden="true" /> Dates pre-filled · {fmtRange(cin, cout)}
                        </span>
                        {city.englandMatch && city.englandMatch.iso >= today && (
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

                  {/* One stadium card — searches live hotels near the venue,
                      dates pre-filled to the next match. */}
                  <div className="mt-6">
                    <StadiumCard city={city} cin={cin} cout={cout} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Tiered budget breakdowns ─────────────────────────────────── */}
        <BudgetSection />

        {/* ── Fan packing + documents checklist ────────────────────────── */}
        <ChecklistSection />

        {/* ── Flights between host cities ──────────────────────────────── */}
        <section id="flights" className="bg-[#0a1628] px-5 py-16">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-white md:text-[2.4rem]">
              Flights Between Host Cities
            </h2>
            <p className="mx-auto mt-3 max-w-[600px] text-center text-[.95rem] font-semibold text-white/60">
              North America is vast. Hop between host cities — search live fares and book direct on JetMeAway, no booking
              fees.
            </p>

            {/* Featured routes */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_ROUTES.map((r) => {
                // Direct flight search on JetMeAway (Duffel) — no affiliate redirect.
                const flightUrl = `/flights?origin=${r.from}&dest=${r.to}&departure=${r.dep}&adults=1`;
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
                    <Link
                      href={flightUrl}
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#0066FF] py-2.5 text-center font-poppins text-[.75rem] font-black text-white transition-colors hover:bg-[#0052CC]"
                    >
                      <i className="fa-solid fa-bolt text-[.7rem]" aria-hidden="true" /> Search direct on JetMeAway
                    </Link>
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

        {/* ── Fan wall + ask-the-expert ────────────────────────────────── */}
        <section id="fan-wall" className="bg-[#F8FAFC] px-5 py-16">
          <div className="mx-auto max-w-[1000px]">
            <h2 className="text-center font-poppins text-[1.8rem] font-black text-[#1A1D2B] md:text-[2.4rem]">Fan wall &amp; travel buddies</h2>
            <p className="mx-auto mt-3 max-w-[620px] text-center text-[.95rem] font-semibold text-[#5C6378]">
              Swap tips, find people to travel with, or ask the travel desk a question. Keep it friendly.
            </p>
            <div className="mt-8">
              <WorldCupFanWall />
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
