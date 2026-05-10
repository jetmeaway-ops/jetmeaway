import Link from 'next/link';
import DealAlertForm from './DealAlertForm';

export default function Footer() {
  return (
    <footer className="bg-[#0F1119] pt-14 pb-7 px-5 mt-12">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-9 mb-10">
          <div>
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7 w-auto brightness-0 invert mb-2.5" loading="lazy" width={109} height={28} />
            <p className="text-[.75rem] text-white/75 leading-relaxed font-semibold">Your AI-powered travel scout. Compare flights, hotels, packages &amp; more from 15+ trusted providers.</p>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Compare</h2>
            <Link href="/flights" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">✈ Flights</Link>
            <Link href="/hotels" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">🏨 Hotels</Link>
            <Link href="/packages" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">📦 Packages</Link>
            <Link href="/cars" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">🚗 Car Hire</Link>
            <Link href="/insurance" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">🛡 Insurance</Link>
            <Link href="/esim" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">📱 eSIM Plans</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Company</h2>
            <Link href="/about" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">About</Link>
            <Link href="/blog" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Blog</Link>
            <Link href="/privacy" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Terms of Service</Link>
            <Link href="/refund" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Refund Policy</Link>
            <Link href="/affiliate" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Affiliate Disclosure</Link>
            <Link href="/financial-protection" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Financial Protection</Link>
            <Link href="/contact" className="block text-[.75rem] text-white/75 font-semibold mb-2.5 transition-colors hover:text-white">Contact Us</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Deal Alerts</h2>
            <DealAlertForm />
          </div>
        </div>
        <div className="h-px bg-white/[.06] mb-7"></div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">We may earn commissions when you book through our links at no extra cost to you. <Link href="/affiliate" className="text-white/85 hover:text-white underline">Read our Affiliate Disclosure</Link>.</p>
        </div>
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mb-1.5">Booking Support</div>
          <a href="tel:+448006526699" className="inline-block font-poppins font-bold text-[.75rem] text-[#FFD700] hover:text-white transition-colors mb-1.5">
            +44 800 652 6699 <span className="text-[.6rem] font-bold uppercase tracking-[1.5px] text-emerald-300 ml-1">Free</span>
          </a>
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">24/7 for active bookings. Email <a href="mailto:contact@jetmeaway.co.uk" className="text-white/85 hover:text-white underline">contact@jetmeaway.co.uk</a> for other enquiries.</p>
        </div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">Flight-inclusive packages are ATOL protected via Expedia (5788) &amp; Trip.com (11572). <Link href="/financial-protection" className="text-white/85 hover:text-white underline">Read our Financial Protection Notice</Link>.</p>
        </div>
        {/* Popular Destinations row — passes footer link equity to the
            most-crawl-worthy destination pages on every route. From the
            2026-05-09 daily SEO audit (#8). Eight destinations chosen
            for traffic potential + GSC indexing priority. Plain rounded
            chips so they don't compete with the social row below. */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mr-1">Popular Destinations</span>
          {[
            { name: 'Dubai',     slug: 'dubai' },
            { name: 'Istanbul',  slug: 'istanbul' },
            { name: 'Barcelona', slug: 'barcelona' },
            { name: 'London',    slug: 'london' },
            { name: 'Marrakech', slug: 'marrakech' },
            { name: 'Budapest',  slug: 'budapest' },
            { name: 'Lisbon',    slug: 'lisbon' },
            { name: 'Porto',     slug: 'porto' },
            { name: 'Muscat',    slug: 'muscat' },
            { name: 'Abu Dhabi', slug: 'abu-dhabi' },
            { name: 'Doha',      slug: 'doha' },
          ].map(d => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="text-[.7rem] font-semibold text-white/75 hover:text-white transition-colors px-2.5 py-1 rounded-full bg-white/[.06] hover:bg-white/[.12] border border-white/10 hover:border-white/20"
            >
              {d.name}
            </Link>
          ))}
        </div>

        {/* Social row — sits above the © line. Brand-coloured hovers,
            opens in new tab, rel=me improves cross-platform identity
            verification (Mastodon, etc.) and is harmless elsewhere. */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          <span className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mr-1">Follow JetMeAway</span>
          {[
            { name: 'LinkedIn',  href: 'https://www.linkedin.com/company/115094573', icon: 'fa-linkedin-in', hover: 'hover:bg-[#0A66C2]' },
            { name: 'Instagram', href: 'https://www.instagram.com/jetmeaway/',       icon: 'fa-instagram',  hover: 'hover:bg-[#E1306C]' },
            { name: 'TikTok',    href: 'https://www.tiktok.com/@jetmeaway',          icon: 'fa-tiktok',     hover: 'hover:bg-[#000000]' },
            { name: 'X',         href: 'https://x.com/jetmeawayy',                   icon: 'fa-x-twitter',  hover: 'hover:bg-[#000000]' },
          ].map(s => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={`JetMeAway on ${s.name}`}
              className={`w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/[.08] border border-white/15 text-white text-[.95rem] transition-all ${s.hover} hover:border-transparent hover:-translate-y-0.5`}
            >
              <i className={`fa-brands ${s.icon}`} aria-hidden="true" />
            </a>
          ))}
        </div>

        {/* App download row — promotes the JetMeAway iOS + Android apps.
            iOS Smart App Banner (configured in metadata.itunes in
            layout.tsx) covers iPhone Safari users automatically; this
            row ensures everyone else (Android, desktop, in-app browsers)
            sees the apps exist. Generic Tailwind buttons styled to match
            footer aesthetic — deliberately not mimicking the trademarked
            Apple/Google badge layouts. Brand glyphs come from Font
            Awesome's brand set, which is licensed for this use. */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mr-1">Get the JetMeAway app</span>
          <a
            href="https://apps.apple.com/gb/app/jetmeaway/id6765715611"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get JetMeAway on the App Store"
            className="inline-flex items-center gap-2.5 rounded-xl bg-white/[.08] border border-white/15 px-4 py-2 text-white transition-all hover:bg-white hover:text-[#0F1119] hover:border-transparent hover:-translate-y-0.5"
          >
            <i className="fa-brands fa-apple text-[1.4rem]" aria-hidden="true" />
            <span className="flex flex-col leading-tight text-left">
              <span className="text-[.55rem] uppercase tracking-[1.5px] font-bold opacity-75">iOS app</span>
              <span className="text-[.78rem] font-extrabold">App Store</span>
            </span>
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=uk.co.jetmeaway.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get JetMeAway on Google Play"
            className="inline-flex items-center gap-2.5 rounded-xl bg-white/[.08] border border-white/15 px-4 py-2 text-white transition-all hover:bg-white hover:text-[#0F1119] hover:border-transparent hover:-translate-y-0.5"
          >
            <i className="fa-brands fa-google-play text-[1.2rem]" aria-hidden="true" />
            <span className="flex flex-col leading-tight text-left">
              <span className="text-[.55rem] uppercase tracking-[1.5px] font-bold opacity-75">Android app</span>
              <span className="text-[.78rem] font-extrabold">Google Play</span>
            </span>
          </a>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-3">
          <p className="text-[.6rem] text-white/75">© 2026 JETMEAWAY LTD (Company No: 17140522 · DUNS: 234726109 · ICO: ZC125217). 66 Paul Street, EC2A 4NA, London. All rights reserved.</p>
          {/* Partner strip — only suppliers we have signed/active relationships
              with. Booking.com explicitly excluded (the affiliate cut is too
              small vs the LiteAPI/RateHawk/Webbeds direct contracts and the
              brand association leaks trust). 2026-05-06 added Viator,
              Webbeds, RateHawk, Kyte. */}
          <div className="flex flex-wrap gap-3 md:gap-4 opacity-60 hover:opacity-80 transition-opacity">
            {[
              'Expedia','Trip.com','Aviasales','GetYourGuide','Viator',
              'Klook','Airalo','Webbeds','RateHawk','Kyte',
            ].map(p => (
              <span key={p} className="font-poppins font-extrabold text-[.65rem] text-white uppercase tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
