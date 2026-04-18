import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DESTINATIONS, getDestination } from '@/data/destinations';

export const dynamicParams = false;

export function generateStaticParams() {
  return DESTINATIONS.map(d => ({ city: d.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> },
): Promise<Metadata> {
  const { city } = await params;
  const d = getDestination(city);
  if (!d) return { title: 'Destination not found | JetMeAway' };

  const title = `${d.city} Travel Guide — Hotels, Flights & Neighbourhoods | JetMeAway`;
  const description = `Compare ${d.city} hotels and flights from the UK. ${d.tagline} Average hotel £${d.averageNightlyPrice}/night, ${d.flightTimeFromLondonHours}h flight from London.`;

  return {
    title,
    description,
    alternates: { canonical: `https://jetmeaway.co.uk/destinations/${d.slug}` },
    openGraph: {
      title,
      description,
      url: `https://jetmeaway.co.uk/destinations/${d.slug}`,
      images: [{ url: d.heroImage, width: 1600, height: 900, alt: `${d.city}, ${d.country}` }],
      type: 'article',
    },
  };
}

export default async function DestinationPage(
  { params }: { params: Promise<{ city: string }> },
) {
  const { city } = await params;
  const d = getDestination(city);
  if (!d) notFound();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: d.city,
    description: d.intro,
    image: d.heroImage,
    address: { '@type': 'PostalAddress', addressCountry: d.country },
    touristType: ['UK travellers', 'city breaks', 'first-time visitors'],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JetMeAway', item: 'https://jetmeaway.co.uk' },
      { '@type': 'ListItem', position: 2, name: 'Destinations', item: 'https://jetmeaway.co.uk/destinations' },
      { '@type': 'ListItem', position: 3, name: d.city, item: `https://jetmeaway.co.uk/destinations/${d.slug}` },
    ],
  };

  return (
    <>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-5 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${d.heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        <div className="relative max-w-[900px] mx-auto text-center">
          <div className="inline-block bg-white/15 backdrop-blur-sm text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 border border-white/20">
            {d.country} · {d.iata}
          </div>
          <h1 className="font-[var(--font-playfair)] text-[2.4rem] md:text-[3.4rem] font-black tracking-tight mb-4 leading-[1.05]">
            {d.city}
          </h1>
          <p className="text-[1.05rem] md:text-[1.2rem] font-semibold max-w-[680px] mx-auto leading-relaxed opacity-95">
            {d.tagline}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Link
              href={`/hotels?destination=${encodeURIComponent(d.city)}`}
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
            >
              Compare {d.city} Hotels →
            </Link>
            <Link
              href={`/flights?to=${d.iata}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-white/30 transition-colors"
            >
              Find Flights to {d.iata}
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-[.8rem] opacity-90 font-semibold">
            <span>✈️ {d.flightTimeFromLondonHours}h from London</span>
            <span>🏨 Hotels from £{d.averageNightlyPrice}/night</span>
            <span>🗓 Best: {d.bestTime.split('.')[0]}</span>
          </div>
        </div>
      </section>

      {/* Intro + Why go */}
      <section className="max-w-[780px] mx-auto px-5 py-12 space-y-6">
        <p className="text-[1.05rem] text-[#1A1D2B] leading-relaxed font-medium">{d.intro}</p>
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-6">
          <h2 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-2">Why UK travellers go</h2>
          <p className="text-[.92rem] text-[#5C6378] leading-relaxed">{d.whyGo}</p>
        </div>
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-6">
          <h2 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-2">Best time to visit</h2>
          <p className="text-[.92rem] text-[#5C6378] leading-relaxed">{d.bestTime}</p>
        </div>
      </section>

      {/* Neighbourhoods */}
      <section className="max-w-[1000px] mx-auto px-5 pb-12">
        <h2 className="font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#1A1D2B] text-center mb-8">
          Where to stay in {d.city}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {d.neighbourhoods.map(n => (
            <div key={n.name} className="bg-white border border-[#F1F3F7] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,102,255,0.05)]">
              <h3 className="font-poppins font-bold text-[1rem] text-[#1A1D2B] mb-2">{n.name}</h3>
              <p className="text-[.88rem] text-[#5C6378] leading-relaxed">{n.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[780px] mx-auto px-5 pb-12">
        <h2 className="font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#1A1D2B] text-center mb-8">
          {d.city} travel FAQ
        </h2>
        <div className="space-y-3">
          {d.faqs.map(f => (
            <details key={f.q} className="group bg-white border border-[#F1F3F7] rounded-2xl px-6 py-5">
              <summary className="cursor-pointer font-poppins font-bold text-[.95rem] text-[#1A1D2B] list-none flex justify-between items-center">
                {f.q}
                <span className="text-[#0066FF] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-[.88rem] text-[#5C6378] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[780px] mx-auto px-5 pb-16">
        <div className="bg-gradient-to-br from-[#0066FF] to-[#0033AA] rounded-3xl p-8 md:p-10 text-center text-white">
          <h2 className="font-[var(--font-playfair)] text-[1.6rem] md:text-[2rem] font-black mb-3">
            Ready to book {d.city}?
          </h2>
          <p className="text-[.95rem] opacity-90 mb-6 max-w-[520px] mx-auto">
            Compare live prices across 15+ providers. No markups, no retargeting emails, no data sold.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/hotels?destination=${encodeURIComponent(d.city)}`}
              className="bg-white text-[#0066FF] hover:bg-[#FFD700] hover:text-[#1A1D2B] font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
            >
              Compare Hotels
            </Link>
            <Link
              href={`/flights?to=${d.iata}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-white/40 transition-colors"
            >
              Compare Flights
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
