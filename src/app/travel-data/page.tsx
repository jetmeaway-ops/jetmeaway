import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPostBySlug, formatPostDate } from '@/lib/blog';

export const metadata = {
  title: 'Travel Data & Fare Research | JetMeAway',
  description:
    'Original UK travel fare research from JetMeAway — the cheapest months to fly, the best-value destinations, and the real price data behind them. Free to cite with attribution.',
  alternates: { canonical: 'https://jetmeaway.co.uk/travel-data' },
  openGraph: {
    title: 'Travel Data & Fare Research | JetMeAway',
    description:
      'Original UK travel fare research from JetMeAway — cheapest months to fly, best-value destinations, and the real price data behind them.',
    url: 'https://jetmeaway.co.uk/travel-data',
    type: 'website',
  },
};

// The original-data studies featured in the hub. Append a slug here when a
// new fare study ships — the card resolves its metadata automatically.
const STUDY_SLUGS = [
  'cheapest-uk-destinations-2026',
  'cheapest-month-to-fly-from-uk-2026',
];

// Headline, cite-worthy figures pulled from the studies above.
const STATS: { value: string; label: string }[] = [
  { value: '£11', label: 'Cheapest one-way fare from the UK (Barcelona, Palma, Venice)' },
  { value: '81%', label: 'Most you can save by flying in the cheapest month vs the dearest' },
  { value: 'June', label: 'The single most common cheapest month to fly' },
  { value: '£144', label: 'Cheapest long-haul fare from the UK (Dubai)' },
];

export default function TravelDataPage() {
  const studies = STUDY_SLUGS.map((slug) => getPostBySlug(slug)).filter(
    (p): p is NonNullable<typeof p> => p != null,
  );

  return (
    <>
      <Header />

      <main className="pt-36 pb-20 px-5 min-h-screen bg-[radial-gradient(ellipse_at_top,#EBF3FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[1100px] mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">
              📊 Travel Data
            </span>
            <h1 className="font-poppins text-[2.4rem] md:text-[3.4rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
              JetMeAway <em className="italic bg-gradient-to-br from-[#0066FF] to-[#0052CC] bg-clip-text text-transparent">Travel Data</em>
            </h1>
            <p className="text-[1rem] text-[#5C6378] font-semibold max-w-[620px] mx-auto leading-relaxed">
              We publish original UK fare research pulled from our own live search feed — not scraped
              averages. Every figure below is free to cite with a link back to the source study.
            </p>
          </div>

          {/* Headline stat band */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-white border border-[#E8ECF4] rounded-2xl p-5 text-center shadow-[0_8px_28px_-18px_rgba(0,102,255,0.25)]"
              >
                <div className="font-poppins text-[1.8rem] md:text-[2.2rem] font-black text-[#0066FF] leading-none mb-2">
                  {s.value}
                </div>
                <div className="text-[.72rem] text-[#5C6378] font-semibold leading-snug">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Studies */}
          <h2 className="font-poppins text-[1.5rem] md:text-[1.8rem] font-black text-[#1A1D2B] mb-6">
            The research
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {studies.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="relative h-48 overflow-hidden bg-[#F1F3F7]">
                  <img
                    src={post.heroImage}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0066FF] text-[.6rem] font-black uppercase tracking-[1.5px] px-2.5 py-1 rounded-full shadow-sm">
                    Data study
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B] mb-2 leading-snug group-hover:text-[#0066FF] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="text-[.7rem] text-[#8E95A9] font-semibold">
                    {formatPostDate(post.date)} · {post.readTime}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* For journalists / cite this data */}
          <div className="bg-[#0a1628] rounded-3xl p-8 md:p-10 text-white">
            <h2 className="font-poppins text-[1.3rem] md:text-[1.6rem] font-black mb-3">
              For journalists &amp; writers
            </h2>
            <p className="text-[.9rem] text-white/80 font-semibold leading-relaxed mb-5 max-w-[680px]">
              Our fare data is free to reference in articles, reports and round-ups. We just ask for a
              credit and a link back to the source study so readers can see the full methodology.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-[.8rem] text-white/70 font-semibold mb-1">Suggested attribution</p>
              <p className="text-[.88rem] text-white font-semibold">
                &ldquo;According to fare research by JetMeAway (jetmeaway.co.uk)…&rdquo;
              </p>
            </div>
            <p className="text-[.82rem] text-white/70 font-semibold">
              Need a custom data cut, a specific route, or a quote? Email{' '}
              <a href="mailto:contact@jetmeaway.co.uk" className="text-[#7FB2FF] hover:text-white underline">
                contact@jetmeaway.co.uk
              </a>
              .
            </p>
          </div>

          {/* CTA */}
          <div className="text-center mt-14">
            <Link
              href="/flights"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-poppins font-black text-[.9rem] shadow-[0_8px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_32px_rgba(0,102,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Compare live flight prices <i className="fa-solid fa-arrow-right text-[.8rem]" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
