import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getDestination } from '@/data/destinations';
import { WHERE_TO_STAY, type PriceBand, type WhereToStayCity } from '@/data/where-to-stay';

/**
 * /destinations/<city>/where-to-stay
 *
 * Targets the "best area to stay in <city>" / "best neighbourhoods in <city>"
 * query family — the one part of the external keyword research worth building
 * on. The searcher has already picked the city and is picking a postcode, which
 * is as close to booking intent as an informational query gets.
 *
 * Deliberately a route rather than a blog post: Search Console currently has
 * 144 blog URLs sitting at "Discovered — currently not indexed", and
 * /destinations/* is a small, well-linked, fully-sitemapped section.
 *
 * Content lives in src/data/where-to-stay.ts; the city facts (hero image, IATA,
 * average nightly rate, flight time) are read from DESTINATIONS so this page and
 * /destinations/<city> can never disagree with each other.
 */

export const dynamicParams = false;
export const revalidate = 86400;

const BASE = 'https://jetmeaway.co.uk';

/** Only cities that have BOTH a destination record and a where-to-stay record. */
function guides(): { guide: WhereToStayCity; slug: string }[] {
  return WHERE_TO_STAY
    .filter(g => getDestination(g.citySlug))
    .map(g => ({ guide: g, slug: g.citySlug }));
}

export function generateStaticParams() {
  return guides().map(({ slug }) => ({ city: slug }));
}

/** Trim to `max` chars on a word boundary, so a meta description never ends mid-word. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,—–-]+$/, '')}…`;
}

function lookup(citySlug: string) {
  const guide = WHERE_TO_STAY.find(g => g.citySlug === citySlug);
  const dest = getDestination(citySlug);
  if (!guide || !dest) return null;
  return { guide, dest };
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> },
): Promise<Metadata> {
  const { city } = await params;
  const found = lookup(city);
  if (!found) return { title: 'Guide not found | JetMeAway' };
  const { guide, dest } = found;

  // Title kept under ~60 chars so Google doesn't truncate mid-brand.
  const title = `Where to Stay in ${dest.city}: Best Areas 2026 | JetMeAway`;
  // Two area names, then the promise. Clamped on a word boundary — a hard
  // .slice() left descriptions ending mid-word, which is what Google renders.
  const description = clamp(
    `${guide.areas[0].name}, ${guide.areas[1].name} or somewhere cheaper? The best areas to stay in ${dest.city} compared — who each one suits, and the honest downside.`,
    155,
  );

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/destinations/${dest.slug}/where-to-stay` },
    openGraph: {
      title: `Where to Stay in ${dest.city} — Neighbourhood Guide`,
      description,
      url: `${BASE}/destinations/${dest.slug}/where-to-stay`,
      type: 'article',
    },
  };
}

const BAND_STYLES: Record<PriceBand, string> = {
  Premium: 'bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20',
  'Mid-range': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  Value: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
};

export default async function WhereToStayPage(
  { params }: { params: Promise<{ city: string }> },
) {
  const { city } = await params;
  const found = lookup(city);
  if (!found) notFound();
  const { guide, dest } = found;

  const url = `${BASE}/destinations/${dest.slug}/where-to-stay`;
  const hotelsHref = `/hotels?city=${encodeURIComponent(dest.city)}`;

  const verdictRows: { label: string; area: string }[] = [
    { label: 'First time in the city', area: guide.verdict.firstTime },
    { label: 'Best value', area: guide.verdict.value },
    { label: 'Families', area: guide.verdict.families },
    { label: 'Nightlife', area: guide.verdict.nightlife },
    { label: 'Couples', area: guide.verdict.couples },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JetMeAway', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Destinations', item: `${BASE}/destinations` },
      { '@type': 'ListItem', position: 3, name: dest.city, item: `${BASE}/destinations/${dest.slug}` },
      { '@type': 'ListItem', position: 4, name: 'Where to stay', item: url },
    ],
  };

  // ItemList of the areas — gives the neighbourhood names a machine-readable
  // home, which is what this page is actually "about".
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best areas to stay in ${dest.city}`,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    numberOfItems: guide.areas.length,
    itemListElement: guide.areas.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${a.name}, ${dest.city}`,
      description: a.summary,
      url: `${url}#${a.slug}`,
    })),
  };

  return (
    <>
      <Header />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <main>
        {/* Hero */}
        <section className="relative pt-28 pb-14 px-5 text-white overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${dest.heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />
          <div className="relative max-w-[900px] mx-auto text-center">
            <nav className="text-[.7rem] font-semibold uppercase tracking-[2px] text-white/70 mb-4">
              <Link href="/destinations" className="hover:text-white">Destinations</Link>
              <span className="mx-2">/</span>
              <Link href={`/destinations/${dest.slug}`} className="hover:text-white">{dest.city}</Link>
              <span className="mx-2">/</span>
              <span className="text-white">Where to stay</span>
            </nav>
            <div className="inline-block bg-white/15 backdrop-blur-sm text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 border border-white/20">
              {dest.city} · Neighbourhood Guide
            </div>
            <h1 className="font-poppins text-[2.1rem] md:text-[3.1rem] font-black tracking-tight mb-4 leading-[1.06]">
              Where to Stay in {dest.city}
            </h1>
            <p className="text-[1.02rem] md:text-[1.15rem] font-semibold max-w-[700px] mx-auto leading-relaxed opacity-95">
              {guide.areas.length} areas compared — what each one is actually like, who it suits, and the honest
              reason not to book there.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <Link
                href={hotelsHref}
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
              >
                Compare {dest.city} Hotels →
              </Link>
              <Link
                href={`/flights?to=${dest.iata}`}
                className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-white/30 transition-colors"
              >
                Flights to {dest.city} ({dest.iata})
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-[.8rem] opacity-90 font-semibold">
              <span>🏨 £{dest.averageNightlyPrice}/night city average</span>
              {dest.flightTimeFromLondonHours > 0 && (
                <span>✈️ {dest.flightTimeFromLondonHours}h from London</span>
              )}
              <span>📍 {guide.areas.length} areas compared</span>
            </div>
          </div>
        </section>

        {/* The short answer */}
        <section className="max-w-[900px] mx-auto px-5 py-12">
          <p className="text-[1.05rem] text-[#1A1D2B] leading-relaxed font-medium mb-8">{guide.intro}</p>

          <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-6 md:p-8">
            <h2 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B] mb-1">
              The short answer
            </h2>
            <p className="text-[.85rem] text-[#8E95A9] font-semibold mb-5">
              If you only read one thing on this page.
            </p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {verdictRows.map(row => (
                <li
                  key={row.label}
                  className="bg-white border border-[#F1F3F7] rounded-2xl px-4 py-3 flex items-baseline justify-between gap-3"
                >
                  <span className="text-[.82rem] text-[#5C6378] font-semibold">{row.label}</span>
                  <span className="text-[.88rem] text-[#0066FF] font-bold text-right">{row.area}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comparison table */}
        <section className="max-w-[1000px] mx-auto px-5 pb-12">
          <h2 className="font-poppins font-black text-[1.4rem] text-[#1A1D2B] mb-4">
            {dest.city} areas at a glance
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-[#F1F3F7] shadow-[0_4px_20px_rgba(0,102,255,0.06)]">
            <table className="w-full min-w-[640px] text-left border-collapse bg-white">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  <th className="px-4 py-3 text-[.78rem] font-black uppercase tracking-wider text-[#8E95A9]">Area</th>
                  <th className="px-4 py-3 text-[.78rem] font-black uppercase tracking-wider text-[#8E95A9]">Price band</th>
                  <th className="px-4 py-3 text-[.78rem] font-black uppercase tracking-wider text-[#8E95A9]">Best for</th>
                  <th className="px-4 py-3 text-[.78rem] font-black uppercase tracking-wider text-[#8E95A9]">Watch out for</th>
                </tr>
              </thead>
              <tbody>
                {guide.areas.map(a => (
                  <tr key={a.slug} className="border-t border-[#F1F3F7] align-top">
                    <td className="px-4 py-3">
                      <a href={`#${a.slug}`} className="text-[.9rem] font-bold text-[#0066FF] hover:underline">
                        {a.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[.7rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${BAND_STYLES[a.band]}`}>
                        {a.band}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[.85rem] text-[#5C6378] font-medium">{a.bestFor}</td>
                    <td className="px-4 py-3 text-[.85rem] text-[#5C6378] font-medium">{a.watchOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[.78rem] text-[#8E95A9] mt-3">
            Price bands are relative to this city, not to other destinations. £{dest.averageNightlyPrice} is the
            average nightly rate we see across {dest.city} as a whole — tap through for live prices on your dates.
          </p>
        </section>

        {/* Area detail */}
        <section className="max-w-[900px] mx-auto px-5 pb-6 space-y-6">
          {guide.areas.map(a => (
            <article
              key={a.slug}
              id={a.slug}
              className="scroll-mt-28 bg-white border border-[#F1F3F7] rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,102,255,0.06)]"
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">{a.name}</h2>
                <span className={`text-[.7rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${BAND_STYLES[a.band]}`}>
                  {a.band}
                </span>
              </div>
              <p className="text-[.82rem] font-bold text-[#0066FF] uppercase tracking-wider mb-4">
                Best for: {a.bestFor}
              </p>
              <p className="text-[.98rem] text-[#5C6378] leading-relaxed mb-5">{a.summary}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4">
                  <h3 className="font-poppins font-bold text-[.8rem] text-[#1A1D2B] mb-1.5">🚶 Walk to</h3>
                  <p className="text-[.86rem] text-[#5C6378] leading-relaxed">{a.walk}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <h3 className="font-poppins font-bold text-[.8rem] text-[#1A1D2B] mb-1.5">⚠️ Watch out for</h3>
                  <p className="text-[.86rem] text-[#5C6378] leading-relaxed">{a.watchOut}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Getting in from the airport */}
        <section className="max-w-[900px] mx-auto px-5 py-8">
          <div className="bg-[#0F1119] text-white rounded-3xl p-6 md:p-8">
            <h2 className="font-poppins font-black text-[1.15rem] mb-3">
              Getting in from the airport
            </h2>
            <p className="text-[.95rem] text-white/75 leading-relaxed mb-5">{guide.airport}</p>
            <Link
              href={`/flights?to=${dest.iata}`}
              className="inline-block bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.85rem] px-5 py-2.5 rounded-full transition-colors"
            >
              Compare UK flights to {dest.city} ({dest.iata}) →
            </Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="max-w-[900px] mx-auto px-5 pb-12">
          <h2 className="font-poppins font-black text-[1.4rem] text-[#1A1D2B] mb-5">
            Where to stay in {dest.city} — common questions
          </h2>
          <div className="space-y-3">
            {guide.faqs.map(f => (
              <details
                key={f.q}
                className="group bg-white border border-[#F1F3F7] rounded-2xl px-5 py-4 shadow-[0_2px_12px_rgba(0,102,255,0.04)]"
              >
                <summary className="cursor-pointer list-none font-poppins font-bold text-[.95rem] text-[#1A1D2B] flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-[#0066FF] text-[1.2rem] leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-[.9rem] text-[#5C6378] leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Close + internal links */}
        <section className="max-w-[900px] mx-auto px-5 pb-16">
          <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-6 md:p-8 text-center">
            <h2 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-2">
              Picked your area in {dest.city}?
            </h2>
            <p className="text-[.92rem] text-[#5C6378] mb-5 max-w-[560px] mx-auto">
              Compare live rates across our hotel partners — total prices including taxes and fees, no booking fee
              on top.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={hotelsHref}
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
              >
                Compare {dest.city} Hotels →
              </Link>
              <Link
                href={`/destinations/${dest.slug}`}
                className="bg-white hover:bg-[#F1F3F7] text-[#1A1D2B] font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-[#F1F3F7] transition-colors"
              >
                Full {dest.city} guide
              </Link>
            </div>
          </div>

          <nav className="mt-8">
            <h2 className="font-poppins font-bold text-[.85rem] uppercase tracking-wider text-[#8E95A9] mb-3">
              Where to stay in other cities
            </h2>
            <ul className="flex flex-wrap gap-2">
              {guides()
                .filter(g => g.slug !== dest.slug)
                .map(({ slug }) => {
                  const other = getDestination(slug);
                  if (!other) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/destinations/${slug}/where-to-stay`}
                        className="inline-block bg-white border border-[#F1F3F7] hover:border-[#0066FF] text-[.82rem] font-semibold text-[#5C6378] hover:text-[#0066FF] px-3.5 py-2 rounded-full transition-colors"
                      >
                        {other.city}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </section>
      </main>

      <Footer />
    </>
  );
}
