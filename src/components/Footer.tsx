'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { blogHref } from '@/i18n/config';
import DealAlertForm from './DealAlertForm';
import AppStoreBadges from './AppStoreBadges';
import PaymentTrustStrip from './PaymentTrustStrip';

/* Client component — copy comes from the `footer` namespace via next-intl's
   useTranslations hook. Footer is rendered by BOTH server pages (home,
   flights…) AND 'use client' pages (cars, esim, insurance); a server-only
   getTranslations() would crash inside the client-page bundle, so the client
   hook is the safe universal choice (still SSR'd, so no SEO loss). Brand/
   partner names and the legal company identifiers stay untranslated by design. */
export default function Footer() {
  const t = useTranslations('footer');
  const tc = useTranslations('common');
  const locale = useLocale();
  return (
    <footer className="bg-[#0F1119] pt-14 pb-7 px-5 mt-12">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-9 mb-10">
          <div>
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7 w-auto brightness-0 invert mb-2.5" loading="lazy" width={109} height={28} />
            <p className="text-[.75rem] text-white/75 leading-relaxed font-semibold">{t('tagline')}</p>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">{t('compare')}</h2>
            <Link href="/flights" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">✈ {t('links.flights')}</Link>
            <Link href="/hotels" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">🏨 {t('links.hotels')}</Link>
            <Link href="/packages" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">📦 {t('links.packages')}</Link>
            <Link href="/cars" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">🚗 {t('links.carHire')}</Link>
            <Link href="/insurance" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">🛡 {t('links.insurance')}</Link>
            <Link href="/esim" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">📱 {t('links.esimPlans')}</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">{t('company')}</h2>
            <Link href="/about" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.about')}</Link>
            <Link href={blogHref(locale)} className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.blog')}</Link>
            <Link href="/travel-data" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.travelData')}</Link>
            <Link href="/privacy" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.privacyPolicy')}</Link>
            <Link href="/terms" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.termsOfService')}</Link>
            <Link href="/refund" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.refundPolicy')}</Link>
            <Link href="/affiliate" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.affiliateDisclosure')}</Link>
            <Link href="/financial-protection" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.financialProtection')}</Link>
            <Link href="/contact" className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 md:mb-2.5 text-[.75rem] text-white/75 font-semibold transition-colors hover:text-white">{t('links.contactUs')}</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">{t('dealAlerts')}</h2>
            <DealAlertForm />
          </div>
        </div>
        <div className="h-px bg-white/[.06] mb-7"></div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">{t('affiliateNotice')} <Link href="/affiliate" className="text-white/85 hover:text-white underline">{t('affiliateLink')}</Link>.</p>
        </div>
        {/* Machine-translation disclaimer — the 11 non-English catalogs are
            auto-translated, so tell readers English is the reference. Never
            rendered for the English default (owner: "not on english"). */}
        {locale !== 'en' && (
          <div className="max-w-[800px] mb-7">
            <p className="text-[.72rem] text-white/60 leading-relaxed font-semibold">
              <i className="fa-solid fa-language me-1.5" aria-hidden="true" />
              {tc('translationNote')}
            </p>
          </div>
        )}
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mb-1.5">{t('bookingSupport')}</div>
          <a href="tel:+448006526699" className="inline-block font-poppins font-bold text-[.75rem] text-[#FFD700] hover:text-white transition-colors mb-1.5">
            +44 800 652 6699 <span className="text-[.6rem] font-bold uppercase tracking-[1.5px] text-emerald-300 ms-1">{t('free')}</span>
          </a>
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">
            {t.rich('support247', {
              email: (chunks) => <a href="mailto:contact@jetmeaway.co.uk" className="text-white/85 hover:text-white underline">{chunks}</a>,
            })}
          </p>
        </div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/75 leading-relaxed font-semibold">
            {t.rich('atolNotice', {
              link: (chunks) => <Link href="/financial-protection" className="text-white/85 hover:text-white underline">{chunks}</Link>,
            })}
          </p>
        </div>
        {/* Our apps — a normal dofollow footer backlink (site-wide) to Safeinest,
            the owner's other apps, so Google discovers and indexes them.
            Real visible anchor text, kept in English for a consistent backlink
            across every locale; NO rel="nofollow" by design. External site, so
            they open in a new tab with rel="noopener" (a security attr only —
            does not affect link equity). Owner SEO request: Safeinest 2026-08-17,
            VisaKnot 2026-08-18. */}
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mb-1.5">{t('ourApps')}</div>
          <a
            href="https://safeinest.com"
            target="_blank"
            rel="noopener"
            className="inline-block font-poppins font-semibold text-[.75rem] text-white/85 hover:text-white underline"
          >
            Safeinest — parental controls for iPhone
          </a>
          <a
            href="https://visaknot.com"
            target="_blank"
            rel="noopener"
            className="mt-1.5 block font-poppins font-semibold text-[.75rem] text-white/85 hover:text-white underline"
          >
            VisaKnot — organise your UK family &amp; spouse visa evidence
          </a>
        </div>
        {/* Popular Destinations row — passes footer link equity to the
            most-crawl-worthy destination pages on every route. From the
            2026-05-09 daily SEO audit (#8). Eight destinations chosen
            for traffic potential + GSC indexing priority. Plain rounded
            chips so they don't compete with the social row below. */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 me-1">{t('popularDestinations')}</span>
          {([
            { key: 'dubai',     slug: 'dubai' },
            { key: 'istanbul',  slug: 'istanbul' },
            { key: 'barcelona', slug: 'barcelona' },
            { key: 'london',    slug: 'london' },
            { key: 'marrakech', slug: 'marrakech' },
            { key: 'budapest',  slug: 'budapest' },
            { key: 'lisbon',    slug: 'lisbon' },
            { key: 'porto',     slug: 'porto' },
            { key: 'muscat',    slug: 'muscat' },
            { key: 'abuDhabi',  slug: 'abu-dhabi' },
            { key: 'doha',      slug: 'doha' },
          ] as const).map(d => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="inline-flex items-center min-h-[42px] text-[.7rem] font-semibold text-white/75 hover:text-white transition-colors px-3.5 rounded-full bg-white/[.06] hover:bg-white/[.12] border border-white/10 hover:border-white/20"
            >
              {t(`cities.${d.key}`)}
            </Link>
          ))}
        </div>

        {/* Social row — sits above the © line. Brand-coloured hovers,
            opens in new tab, rel=me improves cross-platform identity
            verification (Mastodon, etc.) and is harmless elsewhere. */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          <span className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 me-1">{t('followUs')}</span>
          {[
            { name: 'LinkedIn',  href: 'https://www.linkedin.com/company/115094573', icon: 'fa-brands fa-linkedin-in', hover: 'hover:bg-[#0A66C2]' },
            { name: 'Instagram', href: 'https://www.instagram.com/jetmeaway/',       icon: 'fa-brands fa-instagram',  hover: 'hover:bg-[#E1306C]' },
            { name: 'TikTok',    href: 'https://www.tiktok.com/@jetmeaway',          icon: 'fa-brands fa-tiktok',     hover: 'hover:bg-[#000000]' },
            { name: 'X',         href: 'https://x.com/jetmeawayy',                   icon: 'fa-brands fa-x-twitter',  hover: 'hover:bg-[#000000]' },
            // Trustpilot has no Font Awesome brand glyph — star in TP green.
            { name: 'Trustpilot', href: 'https://uk.trustpilot.com/review/jetmeaway.co.uk', icon: 'fa-solid fa-star', hover: 'hover:bg-[#00B67A]' },
          ].map(s => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={`JetMeAway on ${s.name}`}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/[.08] border border-white/15 text-white text-[1.05rem] transition-all ${s.hover} hover:border-transparent hover:-translate-y-0.5`}
            >
              <i className={s.icon} aria-hidden="true" />
            </a>
          ))}
        </div>

        {/* App download row — promotes the JetMeAway iOS + Android apps.
            iOS Smart App Banner (configured in metadata.itunes in
            layout.tsx) covers iPhone Safari users automatically; this
            row ensures everyone else (Android, desktop, in-app browsers)
            sees the apps exist. Uses the shared AppStoreBadges component
            so the footer matches the hero / category-page badge rows. */}
        <div className="mb-6 flex justify-start">
          <AppStoreBadges variant="dark" />
        </div>

        {/* Payment trust strip — Stripe is the MoR rail for direct bookings
            (Duffel + Kyte flights, DOTW hotels). Card-network logos signal
            checkout safety site-wide; requested by owner 2026-06-10. */}
        <PaymentTrustStrip variant="footer" />

        <div className="flex justify-between items-center flex-wrap gap-3">
          <p className="text-[.6rem] text-white/75">© 2026 JETMEAWAY LTD (Company No: 17140522 · DUNS: 234726109 · ICO: ZC125217). 66 Paul Street, EC2A 4NA, London. {t('allRightsReserved')}</p>
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
