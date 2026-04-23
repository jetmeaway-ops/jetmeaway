import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// pSEO seed — first neighbourhood-level landing page.
// Template: if Trastevere earns traffic in 90 days, clone this shape for
// Alfama (Lisbon), Ribeira (Porto), Mitte (Berlin), Downtown Dubai, etc.

export const revalidate = 86400;

const CITY = 'Rome';
const HOOD = 'Trastevere';
const IATA = 'FCO';
const AVG_NIGHT = 145;

export const metadata: Metadata = {
  title: 'Where to Stay in Trastevere, Rome — Hotels, Mornings & Local Scout | JetMeAway',
  description:
    'Trastevere hotels from £145/night, the 6am coffee ritual, cobbled quiet-streets map and which side of Viale di Trastevere to pick. UK travellers\u2019 Scout guide to Rome\u2019s loudest-and-quietest neighbourhood.',
  alternates: { canonical: 'https://jetmeaway.co.uk/destinations/rome/trastevere' },
  openGraph: {
    title: 'Trastevere, Rome — Scout Guide for UK Travellers',
    description:
      'Cobbles, trattorias, 6am espresso. Where to stay, where to avoid the noise, and how to walk Trastevere before the tourists wake up.',
    url: 'https://jetmeaway.co.uk/destinations/rome/trastevere',
    type: 'article',
  },
};

const faqs = [
  {
    q: 'Is Trastevere too loud to sleep in?',
    a: 'North of Viale di Trastevere (around Piazza di Santa Maria) is loud Thursday-Saturday until 2am. South of Viale (towards Porta Portese) is residential and quiet every night. Book south if you value sleep over nightlife; book north if you want to walk home from dinner.',
  },
  {
    q: 'Best Trastevere hotel streets for first-time UK visitors?',
    a: 'Via della Lungaretta, Vicolo del Cinque and Via dei Genovesi hit the sweet spot \u2014 10 minutes on foot to the Pantheon across Ponte Sisto, cobbled but walkable, and you can hear the church bells without the nightclub bass.',
  },
  {
    q: 'Is Trastevere safe at night?',
    a: 'Yes \u2014 it\u2019s one of Rome\u2019s busiest evening neighbourhoods, well-lit and policed, with a visible Carabinieri post on Viale Trastevere. Standard big-city awareness applies: watch for pickpockets around Piazza Trilussa on Friday and Saturday nights.',
  },
  {
    q: 'How do I get from Fiumicino (FCO) to Trastevere?',
    a: 'Leonardo Express to Roma Termini then Tram 8 direct to Trastevere (45 minutes total, ~\u20AC18). Or a fixed-fare taxi from FCO to inside the Aurelian Walls is \u20AC55 (30-45 minutes) \u2014 worth it after a long-haul via Rome.',
  },
  {
    q: 'The 6am Trastevere ritual?',
    a: 'Walk to Piazza di Santa Maria in Trastevere at dawn \u2014 the fountain is yours, the mosaic facade catches first light. Espresso and a cornetto at Biscottificio Innocenti on Via della Luce opens at 7am, the cleaners chat in dialect, and you\u2019re back at the hotel before the tour groups land.',
  },
  {
    q: 'Is Trastevere better than Centro Storico for UK couples?',
    a: 'For a second Rome trip \u2014 yes. Cheaper by ~20%, more neighbourhood feel, still 15 minutes walking to the Pantheon. For a first trip where you want the Colosseum and Forum walkable, Centro Storico wins on location.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const attractionSchema = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: `${HOOD}, ${CITY}`,
  description:
    'Cobbled, trattoria-heavy neighbourhood on the west bank of the Tiber. The best morning coffee culture in Rome and the highest density of family-run restaurants inside the Aurelian Walls.',
  image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80',
  containedInPlace: {
    '@type': 'TouristDestination',
    name: CITY,
    address: { '@type': 'PostalAddress', addressCountry: 'Italy', addressLocality: 'Rome' },
  },
  touristType: ['UK travellers', 'city breaks', 'foodies', 'couples'],
};

const reserveActionSchema = {
  '@context': 'https://schema.org',
  '@type': 'ReserveAction',
  name: `Compare hotels in ${HOOD}, ${CITY}`,
  object: {
    '@type': 'LodgingBusiness',
    name: `${HOOD} hotels`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'Italy',
      addressLocality: 'Rome',
      addressRegion: HOOD,
    },
    priceRange: `\u00A3${AVG_NIGHT}/night avg`,
  },
  target: {
    '@type': 'EntryPoint',
    urlTemplate: `https://jetmeaway.co.uk/hotels?destination=${encodeURIComponent(HOOD + ', ' + CITY)}`,
    actionPlatform: [
      'http://schema.org/DesktopWebPlatform',
      'http://schema.org/MobileWebPlatform',
    ],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'JetMeAway', item: 'https://jetmeaway.co.uk' },
    { '@type': 'ListItem', position: 2, name: 'Destinations', item: 'https://jetmeaway.co.uk/destinations' },
    { '@type': 'ListItem', position: 3, name: CITY, item: 'https://jetmeaway.co.uk/destinations/rome' },
    { '@type': 'ListItem', position: 4, name: HOOD, item: 'https://jetmeaway.co.uk/destinations/rome/trastevere' },
  ],
};

export default function TrastevereLandingPage() {
  return (
    <>
      <Header />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(attractionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reserveActionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-5 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
        <div className="relative max-w-[900px] mx-auto text-center">
          <nav className="text-[.7rem] font-semibold uppercase tracking-[2px] text-white/70 mb-4">
            <Link href="/destinations" className="hover:text-white">Destinations</Link>
            <span className="mx-2">/</span>
            <Link href="/destinations/rome" className="hover:text-white">Rome</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Trastevere</span>
          </nav>
          <div className="inline-block bg-white/15 backdrop-blur-sm text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 border border-white/20">
            Rome · Neighbourhood Guide
          </div>
          <h1 className="font-[var(--font-playfair)] text-[2.4rem] md:text-[3.4rem] font-black tracking-tight mb-4 leading-[1.05]">
            Trastevere
          </h1>
          <p className="text-[1.05rem] md:text-[1.2rem] font-semibold max-w-[680px] mx-auto leading-relaxed opacity-95">
            Rome&apos;s loudest-and-quietest neighbourhood. Cobbles, trattorias, and the best 6am coffee walk in Europe.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Link
              href={`/hotels?destination=${encodeURIComponent('Trastevere, Rome')}`}
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
            >
              Compare Trastevere Hotels →
            </Link>
            <Link
              href={`/flights?to=${IATA}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-white/30 transition-colors"
            >
              Flights to Rome (FCO)
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-[.8rem] opacity-90 font-semibold">
            <span>✈️ 2h 40m from London</span>
            <span>🏨 From £{AVG_NIGHT}/night</span>
            <span>🍝 180+ trattorias in 1km²</span>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-[780px] mx-auto px-5 py-12 space-y-6">
        <p className="text-[1.05rem] text-[#1A1D2B] leading-relaxed font-medium">
          Trastevere sits on the west bank of the Tiber, tucked under the Janiculum hill, and it has been Rome&apos;s
          working-class village for 2,000 years. The name literally means &quot;across the Tiber&quot; — until the 1980s
          the locals spoke a dialect the rest of Rome didn&apos;t understand. Today it&apos;s the neighbourhood UK
          couples pick for a second Rome trip, when the Colosseum has been ticked and you want dinner at 10pm under
          bougainvillea instead.
        </p>
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-6">
          <h2 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-2">The one-line map</h2>
          <p className="text-[.92rem] text-[#5C6378] leading-relaxed">
            Viale di Trastevere cuts the neighbourhood in half. North of the Viale = nightlife, tourists, Piazza di
            Santa Maria. South = residential, Porta Portese market, quieter sleep. Pick your side before you book.
          </p>
        </div>
      </section>

      {/* Scout Report */}
      <section className="max-w-[1000px] mx-auto px-5 pb-12">
        <div className="bg-gradient-to-br from-[#0a1628] to-[#0F1119] rounded-3xl p-7 md:p-10 text-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-block bg-[#FFD700]/15 text-[#FFD700] text-[.6rem] font-black uppercase tracking-[2.5px] px-3 py-1.5 rounded-full border border-[#FFD700]/30">
              🔍 Scout Report — Trastevere
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#FFD700] mb-2">🌅 Morning Ritual</div>
              <p className="text-[.85rem] text-white/85 leading-relaxed">
                Piazza di Santa Maria at 6:30am — the fountain is yours, the 12th-century mosaic facade catches first
                light. Espresso and a cornetto at Biscottificio Innocenti on Via della Luce at 7am. Back at the hotel
                before the tour groups land.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#FFD700] mb-2">🧘 Wellness</div>
              <p className="text-[.85rem] text-white/85 leading-relaxed">
                Walk the Janiculum hill at dawn — 15 minutes up, best panoramic view of Rome, the cannon fires at noon.
                QC Terme Roma is a 20-minute taxi for a proper Roman thermal-spa afternoon (€55 day pass).
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#FFD700] mb-2">🔒 Privacy</div>
              <p className="text-[.85rem] text-white/85 leading-relaxed">
                Stay south of Viale di Trastevere — Via dei Genovesi, Via di San Francesco a Ripa. Residential, double
                glazing standard, shutters closed by 11pm. You get the charm without the 2am stag-do chants.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Streets guide */}
      <section className="max-w-[1000px] mx-auto px-5 pb-12">
        <h2 className="font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#1A1D2B] text-center mb-8">
          Which street should you book?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-[#F1F3F7] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,102,255,0.05)]">
            <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#0066FF] mb-2">North — Lively</div>
            <h3 className="font-poppins font-bold text-[1rem] text-[#1A1D2B] mb-2">Via della Lungaretta</h3>
            <p className="text-[.88rem] text-[#5C6378] leading-relaxed">
              Main pedestrian spine, lined with trattorias. 3 minutes to Piazza di Santa Maria, 10 minutes across
              Ponte Sisto to Campo de&apos; Fiori. Loud Thu–Sat until 1am — pick a room facing an internal courtyard.
            </p>
          </div>
          <div className="bg-white border border-[#F1F3F7] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,102,255,0.05)]">
            <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#0066FF] mb-2">Central — Balanced</div>
            <h3 className="font-poppins font-bold text-[1rem] text-[#1A1D2B] mb-2">Vicolo del Cinque</h3>
            <p className="text-[.88rem] text-[#5C6378] leading-relaxed">
              Narrow cobbled alley off Piazza Trilussa — the best mid-range boutique stays, walkable to everything,
              quieter than Lungaretta but still alive. Our default recommendation for 3-night first-time stays.
            </p>
          </div>
          <div className="bg-white border border-[#F1F3F7] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,102,255,0.05)]">
            <div className="text-[.65rem] font-black uppercase tracking-[2px] text-[#0066FF] mb-2">South — Quiet</div>
            <h3 className="font-poppins font-bold text-[1rem] text-[#1A1D2B] mb-2">Via dei Genovesi</h3>
            <p className="text-[.88rem] text-[#5C6378] leading-relaxed">
              Residential side, south of Viale di Trastevere, 5 minutes to the Porta Portese Sunday market. Quiet
              every night, 15 minutes walk to the centre. Best for slow 4+ night stays and light-sleeper couples.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[780px] mx-auto px-5 pb-12">
        <h2 className="font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#1A1D2B] text-center mb-8">
          Trastevere travel FAQ
        </h2>
        <div className="space-y-3">
          {faqs.map(f => (
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

      {/* Back to Rome + CTA */}
      <section className="max-w-[780px] mx-auto px-5 pb-16 space-y-6">
        <div className="bg-gradient-to-br from-[#0066FF] to-[#0033AA] rounded-3xl p-8 md:p-10 text-center text-white">
          <h2 className="font-[var(--font-playfair)] text-[1.6rem] md:text-[2rem] font-black mb-3">
            Book Trastevere, not just Rome
          </h2>
          <p className="text-[.95rem] opacity-90 mb-6 max-w-[520px] mx-auto">
            Filter by neighbourhood on the hotel search — our price grid pulls from 6 providers with no markup.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/hotels?destination=${encodeURIComponent('Trastevere, Rome')}`}
              className="bg-white text-[#0066FF] hover:bg-[#FFD700] hover:text-[#1A1D2B] font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full transition-colors"
            >
              Compare Trastevere Hotels
            </Link>
            <Link
              href="/destinations/rome"
              className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-poppins font-bold text-[.9rem] px-6 py-3 rounded-full border border-white/40 transition-colors"
            >
              Full Rome Guide
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
