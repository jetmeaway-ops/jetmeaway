// Root layout runs on Node.js (the Next.js 16 default). Individual
// routes that need Edge still declare `export const runtime = 'edge'`
// at the page/route level — removing it from the root lets the
// auto-generated _not-found function stay under Vercel's Hobby-plan
// 1MB Edge limit while keeping per-route Edge opt-ins intact.
// Fluid Compute is enabled on the Vercel project, so Node functions
// get near-Edge cold-start performance anyway.

import './globals.css';
import Script from 'next/script';
import { Poppins, Playfair_Display, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@next/third-parties/google';
import DeferredWidgets from '@/components/DeferredWidgets';

// Google tag ID. `AW-*` = Google Ads conversion tag (not GA4). The
// <GoogleAnalytics> component from @next/third-parties just injects
// gtag.js with this id and runs it through Next's afterInteractive
// strategy, so it never blocks first paint. If we later add GA4
// (G-*), both IDs can load through the same gtag.js — we'll call
// gtag('config', 'G-...') from a separate tag.
const GOOGLE_TAG_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ACCOUNT_ID || 'AW-18079068295';

// GA4 measurement ID — property created 2026-04-23 so we can wire the
// GBP profile to a verified analytics account and start collecting
// behaviour data (bounce rate, scroll depth, conversions) alongside
// the Ads conversion pixel.
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-4H2K83LKQM';

const poppins = Poppins({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-poppins',
});

const playfair = Playfair_Display({
  weight: ['900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  preload: true,
});

const dmSans = DM_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata = {
  title: 'JetMeAway | Compare Flights, Hotels, Car Hire & Holidays — UK Travel Comparison',
  description: 'Compare flights, hotels, car hire and package holidays from trusted providers. Find the cheapest deals for your next trip. Free UK travel comparison site.',
  openGraph: {
    title: 'JetMeAway | Compare Flights, Hotels, Car Hire & Holidays',
    description: 'Compare flights, hotels, car hire and package holidays from trusted providers. Find the cheapest deals for your next trip.',
    url: 'https://jetmeaway.co.uk',
    siteName: 'JetMeAway',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png', width: 512, height: 512, alt: 'JetMeAway Logo' }],
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary',
    title: 'JetMeAway | UK Travel Comparison',
    description: 'Compare flights, hotels, car hire and holidays from trusted providers.',
    images: ['https://jetmeaway.co.uk/jetmeaway-logo.png'],
  },
  metadataBase: new URL('https://jetmeaway.co.uk'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JetMeAway',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

/**
 * Site-wide JSON-LD. Two schemas injected into every page:
 *
 *  • Organization — who we are. Picked up by Google's Knowledge Panel,
 *    partner due-diligence tools (RateHawk, Webbeds etc. scrape this
 *    during approval checks), and LLM retrieval bots to establish
 *    E-E-A-T authority.
 *  • WebSite — enables the SearchAction sitelinks-search-box in Google
 *    and gives LLMs a canonical site name + search intent.
 *
 * These render in the <head> so they load before any client JS.
 */
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  '@id': 'https://jetmeaway.co.uk/#organization',
  name: 'JetMeAway',
  alternateName: 'JetMeAway Travel Comparison',
  url: 'https://jetmeaway.co.uk',
  logo: {
    '@type': 'ImageObject',
    url: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    width: 512,
    height: 512,
  },
  image: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
  description:
    'UK travel comparison engine for flights, hotels, car hire, holiday packages, travel insurance and eSIM data. Founded 2026, registered in England & Wales.',
  email: 'contact@jetmeaway.co.uk',
  founder: {
    '@type': 'Person',
    name: 'Waqar Ul Hassan Sabir',
  },
  foundingDate: '2026',
  areaServed: {
    '@type': 'Country',
    name: 'United Kingdom',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB',
  },
  // Multiple legitimacy identifiers — partner due-diligence tools
  // (RateHawk, Webbeds, ATOL umbrella providers) scrape these to
  // cross-check the entity against public registries before approval.
  identifier: [
    {
      '@type': 'PropertyValue',
      name: 'Companies House',
      propertyID: 'UK Companies House Registration Number',
      value: '17140522',
    },
    {
      '@type': 'PropertyValue',
      name: 'DUNS',
      propertyID: 'Dun & Bradstreet DUNS Number',
      value: '234726109',
    },
    {
      '@type': 'PropertyValue',
      name: 'ICO',
      propertyID: 'UK Information Commissioner\u2019s Office Registration',
      value: 'ZC125217',
    },
  ],
  sameAs: [
    // Keep this list short and factual. Add profiles only as they
    // go live so the schema never advertises dead links.
    'https://find-and-update.company-information.service.gov.uk/company/17140522',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contact@jetmeaway.co.uk',
    availableLanguage: ['English'],
    areaServed: 'GB',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://jetmeaway.co.uk/#website',
  url: 'https://jetmeaway.co.uk',
  name: 'JetMeAway',
  description:
    'Compare flights, hotels, car hire and holiday packages from trusted UK providers.',
  publisher: { '@id': 'https://jetmeaway.co.uk/#organization' },
  inLanguage: 'en-GB',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate:
        'https://jetmeaway.co.uk/hotels?destination={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* Theme colour: dark navy matches hero bg so the iOS status bar
            blends into the app rather than flashing blue on launch. */}
        <meta name="theme-color" content="#0a1628" />
        {/* iOS standalone / "Add to Home Screen" polish — makes the PWA
            launch fullscreen with a themed status bar and our brand title
            instead of "JetMeAway — Your Personal Travel…" truncated. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JetMeAway" />
        <meta name="application-name" content="JetMeAway" />
        <meta name="format-detection" content="telephone=no" />
        {/* Apple touch icons — iOS picks the closest size. 192px scales
            cleanly to the 180/167/152/120 slots across iPhone/iPad. */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        <link rel="mask-icon" href="/icon-192x192.png" color="#0a1628" />
        {/* Site-wide structured data — Organization + WebSite. Loaded in <head>
            so crawlers see it before any client JS runs. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {/* Preconnect + DNS prefetch to Font Awesome CDN (cheap, non-blocking) */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/*
          Font Awesome is NOT loaded in the initial HTML — it would block first
          paint by ~200-400ms. Instead, it's injected client-side via a
          <Script strategy="lazyOnload"> below. Icons appear a fraction of a
          second after first paint, but the page renders immediately.

          <noscript> fallback: without JS we fall back to the sync stylesheet
          so icons still work for users with JS disabled.
        */}
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
            crossOrigin="anonymous"
          />
        </noscript>
        {/* Poppins + Playfair + DM Sans self-hosted via next/font — no Google Fonts request */}
      </head>
      <body>
        {children}
        <Analytics />
        <DeferredWidgets />
        {/* Font Awesome — injected client-side during idle time so it never
            blocks first paint. Icons (star ratings, step icons, etc) appear
            a moment after the rest of the page is already visible. */}
        <Script id="load-font-awesome" strategy="lazyOnload">
          {`(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';l.crossOrigin='anonymous';document.head.appendChild(l);})();`}
        </Script>
        {/* Trustpilot TrustBox bootstrap — loads lazily so it never blocks
            first paint. Any <TrustpilotReviewCollector /> (or future
            TrustBox) rendered on a page will bind automatically once this
            script finishes loading. */}
        <Script
          id="trustpilot-bootstrap"
          src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
          strategy="lazyOnload"
        />
        {/* Travelpayouts tracker removed — causes CORS errors on tp-em.com
            that hurt Best Practices score. Re-add if TP fixes their CORS. */}
      </body>
      {/* Google tag (gtag.js) for Google Ads conversion tracking.
          afterInteractive strategy — loads after hydration so it never
          competes with LCP. Conversion events fire via sendGAEvent()
          at the point of booking success. */}
      <GoogleAnalytics gaId={GOOGLE_TAG_ID} />
      {/* GA4 property — injected via the same gtag.js runtime, so both
          the Ads tag above and this GA4 tag share one gtag('js', ...)
          init. Next's third-party helper dedupes the script import. */}
      <GoogleAnalytics gaId={GA4_ID} />
    </html>
  );
}
