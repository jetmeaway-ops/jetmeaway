export const runtime = 'edge';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlightSearch from './search';
import DiscoverPopup from '@/components/DiscoverPopup';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    logo: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    description: 'UK travel price comparison platform',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://jetmeaway.co.uk/flights?to={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

export default function Home() {
  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <DiscoverPopup />
      <Header />

      {/* HERO */}
      <section className="pt-40 md:pt-44 pb-20 px-6 bg-[radial-gradient(circle_at_top_right,#E8F0FE_0%,#fff_50%,#F8FAFC_100%)] relative">
        <div className="absolute top-[10%] right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(79,70,229,0.04)_0%,transparent_70%)] rounded-full"></div>
        <div className="max-w-[800px] mx-auto text-center relative z-[1]">
          <h1 className="font-poppins text-[2.4rem] md:text-[4.5rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-4">
            Travel <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">Intelligently.</em>
          </h1>
          <p className="text-[1.05rem] text-[#8E95A9] font-medium mb-10">
            Comparing 20+ providers in real-time to find your perfect escape.
          </p>

          {/* Category nav */}
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {[
              { href: '/flights', icon: '✈', label: 'Flights' },
              { href: '/hotels', icon: '🏨', label: 'Hotels' },
              { href: '/packages', icon: '📦', label: 'Packages' },
              { href: '/cars', icon: '🚗', label: 'Car Hire' },
              { href: '/esim', icon: '📱', label: 'eSIM' },
              { href: '/explore', icon: '🧭', label: 'Explore' },
            ].map(({ href, icon, label }) => (
              <a key={href} href={href}
                className="flex items-center gap-1.5 bg-white border border-[#E8ECF4] hover:border-[#0066FF] hover:text-[#0066FF] text-[#5C6378] font-poppins font-bold text-[.75rem] px-4 py-2 rounded-full shadow-sm transition-all">
                <span>{icon}</span>{label}
              </a>
            ))}
          </div>

          {/* SEARCH COMPONENT */}
          <FlightSearch />

          {/* Partner strip */}
          <div className="max-w-[720px] mx-auto mt-5 flex items-center justify-center gap-5 opacity-30">
            {['Expedia','Trip.com','Aviasales','GetYourGuide','Klook','Airalo'].map((p, i) => (
              <span key={p}>
                <span className="font-poppins font-extrabold text-[.7rem] uppercase tracking-wider text-[#1A1D2B]">{p}</span>
                {i < 5 && <span className="inline-block w-[3px] h-[3px] rounded-full bg-[#8E95A9] mx-2.5 align-middle"></span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="max-w-[900px] mx-auto px-6 py-10">
        <div className="bg-blue-50/50 border border-blue-100/50 rounded-3xl p-7 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#0066FF] text-2xl shadow-sm flex-shrink-0">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h4 className="font-poppins font-black text-[.85rem] text-[#1A1D2B] mb-1.5">Our Trust Commitment</h4>
            <p className="text-[.78rem] text-[#5C6378] leading-relaxed font-semibold">
              Jetmeaway is a comparison engine, not a travel agency. We find you the best rates from partners like Expedia, Trip.com, GetYourGuide, and Aviasales. We receive a commission for referrals, which keeps our tools free. We never add fees or mark up prices.{' '}
              <a href="/terms" className="text-[#0066FF] font-black">Full Transparency Policy</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ESSENTIALS SECTION */}
      <section className="max-w-[1100px] mx-auto px-6 pb-10">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">Quick Access</p>
        <h2 className="font-poppins text-[1.4rem] font-black text-[#1A1D2B] mb-6">Travel Essentials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EssentialCard href="https://tp.media/r?campaign_id=541&marker=714449&p=8310&trs=512633&u=https%3A%2F%2Fwww.airalo.com%2F" icon="fa-signal" color="indigo" name="eSIM Data" desc="Stay connected in 200+ countries from $4.50." providers={['Airalo','Yesim']} />
          <EssentialCard href="https://tp.media/r?campaign_id=225&marker=714449&p=5869&trs=512633&u=https%3A%2F%2Fektatraveling.com" icon="fa-shield-halved" color="green" name="Travel Insurance" desc="Medical, cancellation & luggage from £3/day." providers={['Ekta Traveling']} />
          <EssentialCard href="https://tp.media/r?campaign_id=1&marker=714449&p=647&trs=512633&u=https%3A%2F%2Fkiwitaxi.com" icon="fa-van-shuttle" color="orange" name="Airport Transfers" desc="Book your ride from airport to hotel." providers={['KiwiTaxi','Welcome Pickups','GetTransfer']} />
        </div>
      </section>

      {/* APP PROMO */}
      <section className="max-w-[1100px] mx-auto px-6 pb-10">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-12 md:p-14 relative overflow-hidden">
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-[#E8F0FE] rounded-full opacity-50"></div>
          <div className="relative z-[1] max-w-[420px]">
            <span className="inline-block bg-white text-[#0066FF] text-[.62rem] font-black py-1.5 px-3.5 rounded-full uppercase tracking-[2px] shadow-sm border border-[#F1F3F7] mb-4">Coming Soon</span>
            <h2 className="font-poppins text-[1.8rem] font-black text-[#1A1D2B] leading-tight tracking-tight mb-3">
              Your AI Concierge,<br/><em className="text-[#0066FF] italic">In Your Pocket.</em>
            </h2>
            <p className="text-[.88rem] text-[#5C6378] leading-relaxed font-semibold mb-5">
              The Jetmeaway mobile app is coming. Get real-time price-drop alerts, manage trips offline, and unlock mobile-only deals.
            </p>
            <div className="flex gap-2.5 flex-wrap opacity-30 grayscale">
              <div className="flex items-center gap-2.5 bg-[#0F1119] text-white py-2.5 px-4.5 rounded-xl">
                <i className="fa-brands fa-apple text-xl"></i>
                <div><span className="block text-[.52rem] uppercase text-white/50 tracking-wider">Coming soon on</span><span className="font-poppins font-extrabold text-[.88rem]">App Store</span></div>
              </div>
              <div className="flex items-center gap-2.5 bg-[#0F1119] text-white py-2.5 px-4.5 rounded-xl">
                <i className="fa-brands fa-google-play text-xl"></i>
                <div><span className="block text-[.52rem] uppercase text-white/50 tracking-wider">Coming soon on</span><span className="font-poppins font-extrabold text-[.88rem]">Google Play</span></div>
              </div>
            </div>
            <p className="text-[.7rem] text-[#8E95A9] italic mt-3">Target Launch: Summer 2026</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function EssentialCard({ href, icon, color, name, desc, providers }: { href: string; icon: string; color: string; name: string; desc: string; providers: string[] }) {
  const colors: Record<string, { bg: string; text: string; hover: string }> = {
    indigo: { bg: 'bg-indigo-50/50', text: 'text-indigo-600', hover: 'hover:border-indigo-200' },
    green: { bg: 'bg-emerald-50/50', text: 'text-emerald-600', hover: 'hover:border-emerald-200' },
    orange: { bg: 'bg-orange-50/50', text: 'text-orange-500', hover: 'hover:border-orange-200' },
  };
  const c = colors[color] || colors.indigo;

  return (
    <a href={href} target="_blank" rel="noopener" className={`block p-5 rounded-2xl ${c.bg} border border-transparent ${c.hover} transition-all group`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg mb-3.5 ${c.bg} ${c.text}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div className="font-poppins font-extrabold text-[.92rem] text-[#1A1D2B] mb-1">{name}</div>
      <p className="text-[.78rem] text-[#5C6378] leading-relaxed font-semibold mb-3">{desc}</p>
      <div className="flex gap-1.5 flex-wrap">
        {providers.map(p => (
          <span key={p} className="text-[.65rem] font-bold py-1 px-2.5 rounded-full bg-white/80 text-[#5C6378] border border-[#F1F3F7]">{p}</span>
        ))}
      </div>
    </a>
  );
}
