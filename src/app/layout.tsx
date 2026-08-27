// Root layout runs on Node.js (the Next.js 16 default). Individual
// routes that need Edge still declare `export const runtime = 'edge'`
// at the page/route level — removing it from the root lets the
// auto-generated _not-found function stay under Vercel's Hobby-plan
// 1MB Edge limit while keeping per-route Edge opt-ins intact.
// Fluid Compute is enabled on the Vercel project, so Node functions
// get near-Edge cold-start performance anyway.

import type { Viewport } from 'next';
import './globals.css';
import Script from 'next/script';
import { Poppins, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { RTL_LOCALES } from '@/i18n/config';
// Vercel Analytics + GA Ads + GA4 + Microsoft Clarity all live inside
// DeferredWidgets now so their scripts never compete with LCP/FCP. See
// components/DeferredWidgets.tsx + components/DeferredAnalytics.tsx.
//
// BackToTopButton + AndroidAppBanner moved into DeferredWidgets too on
// 2026-06-03 — neither is needed in the LCP window, so loading them
// eagerly was paying for chrome that wouldn't fire until well after
// the page was paintable.
import DeferredWidgets from '@/components/DeferredWidgets';
import ClientErrorReporter from '@/components/ClientErrorReporter';
// Vercel Speed Insights — real-user Core Web Vitals telemetry (LCP, FCP,
// CLS, INP, TTFB). Mounted EAGERLY (not in DeferredWidgets) because CLS
// is a continuous measurement: a buffered PerformanceObserver can
// backfill LCP/FCP/INP that fired before observation started, but layout
// shifts that happened before the observer attached are lost forever.
// The component is small (~5KB) and uses Vercel's queue-stub pattern so
// the actual telemetry POST is still async — eager mount only costs us
// the queue init, not the network or heavy lifting.
import { SpeedInsights } from '@vercel/speed-insights/next';
import ZoomGuard from '@/components/ZoomGuard';

const poppins = Poppins({
  // 2026-08-03: Poppins is now the SINGLE UI/body font (DM Sans dropped —
  // owner's 2-font system: Playfair for headings, Poppins for everything
  // else). 400 re-added because body copy that used to be DM Sans 400/500
  // now renders in Poppins; without a 400 face the browser would synthesize
  // it from 600 and body text would read too heavy. 600/700/900 unchanged.
  weight: ['400', '500', '600', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-poppins',
  // Keep preload: Poppins renders the mobile hero H1 (LCP element).
});

const playfair = Playfair_Display({
  weight: ['900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  // preload: false — Playfair only renders on desktop H1 + below-fold
  // H2s; mobile hero uses Poppins (`[font-family:var(--next-poppins)]`
  // in page.tsx). Preloading the serif on every page wasted ~30-50KB
  // of mobile bandwidth in the FCP window. font-display: swap means
  // text still paints in fallback before Playfair arrives.
  preload: false,
});

/**
 * Viewport — required for correct mobile rendering. Without an explicit
 * viewport tag, iOS Safari falls back to a default ~980px desktop
 * viewport and shrinks the whole page to fit, which:
 *   - made the entire site render at ~30-40% scale on first paint
 *   - triggered iOS's auto-zoom-on-input quirk when a focused <input>
 *     fell below the 16px threshold (every form input in the site
 *     hits this — see hotels-client.tsx:952, flights-client.tsx:709,833,
 *     packages-client.tsx:165,206)
 *   - prevented `viewport-fit=cover` so the safe-area-insets we depend
 *     on for the iOS notch on the dark hero didn't apply
 *
 * 40% of traffic is iOS (per Vercel Analytics). Without this tag every
 * one of those visitors saw a broken page on first paint.
 *
 * Notes:
 *  - Next.js 16's viewport export auto-emits the <meta> in <head>.
 *  - Deliberately NOT setting maximumScale / userScalable=false — those
 *    block accessibility pinch-zoom and violate WCAG 1.4.4.
 *  - themeColor is left as a manual <meta> below (already there); moving
 *    it here too would emit it twice.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  // Title trimmed 2026-05-09 from 79 → 60 chars per the daily SEO audit.
  // Google truncates SERP titles at ~60 chars; the previous form lost
  // "UK Travel Comparison" mid-display. Brand recognition lives in the
  // visible tail now.
  title: 'JetMeAway | Flights, Hotels, Holidays — UK Travel Comparison',
  description: 'Compare flights, hotels, car hire and package holidays from trusted providers. Find the cheapest deals for your next trip. Free UK travel comparison site.',
  openGraph: {
    title: 'JetMeAway | Compare Flights, Hotels, Car Hire & Holidays',
    description: 'Compare flights, hotels, car hire and package holidays from trusted providers. Find the cheapest deals for your next trip.',
    url: 'https://jetmeaway.co.uk',
    siteName: 'JetMeAway',
    type: 'website',
    locale: 'en_GB',
    // images: handled by src/app/opengraph-image.tsx (1200x630 dynamic).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JetMeAway | UK Travel Comparison',
    description: 'Compare flights, hotels, car hire and holidays from trusted providers.',
    // images: inherited from openGraph (Next auto-wires).
  },
  metadataBase: new URL('https://jetmeaway.co.uk'),
  // NOTE: deliberately NO `alternates.canonical` here. Next.js merges
  // metadata down the route tree, so a canonical set in this root layout
  // cascades to every child page that doesn't override it — silently
  // telling Google that /about, /contact, /privacy etc. are duplicates of
  // the homepage. Each page now declares its own canonical instead (the
  // homepage's lives in page.tsx).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JetMeAway',
  },
  // Smart App Banner — when an iPhone Safari user lands on jetmeaway.co.uk,
  // iOS renders a thin native banner at the top of the page suggesting they
  // install (or open) the JetMeAway app. `appId` is our App Store numeric
  // ID. `appArgument` is the URL forwarded to the app when the banner is
  // tapped — handled by our universal-links AASA so the app deep-links to
  // the same page the user was on.
  itunes: {
    appId: '6765715611',
    appArgument: 'https://jetmeaway.co.uk',
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
  // Spelling variants people actually search. "Jetaway" / "Jet me away"
  // captures the brand-misspell traffic surfacing in GSC at position ~13
  // (2026-05-07). Telling Google these aliases all map to JetMeAway helps
  // it surface us correctly when users drop the "Me" or add a space.
  alternateName: ['JetMeAway Travel Comparison', 'Jet Me Away', 'Jetaway'],
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
    'https://www.linkedin.com/company/115094573',
    'https://www.instagram.com/jetmeaway/',
    'https://www.tiktok.com/@jetmeaway',
    'https://x.com/jetmeawayy',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale resolved by src/proxy.ts (cookie → Accept-Language → country → en)
  // and loaded by src/i18n/request.ts. Bots get English — SEO unchanged.
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir} className={`${poppins.variable} ${playfair.variable}`}>
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
        {/* Apple touch icons. src/app/apple-icon.png now emits the primary
            180x180 slot automatically (the exact size iOS asks for), so the
            old untagged 192 duplicate has been dropped — it declared the same
            file twice. These two remain as larger options for iPad slots. */}
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
        {/* Poppins + Playfair self-hosted via next/font — no Google Fonts request */}
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        {/* ClientErrorReporter stays eager — it has to catch first-paint
            errors before any deferred mount could pick them up. The
            other chrome (BackToTopButton, AndroidAppBanner) now mounts
            via DeferredWidgets at +6s. */}
        <ClientErrorReporter />
        {/* Pinch-zoom crash guard — flags <html> with `is-zoomed` while the
            visual viewport is actually zoomed, so globals.css can hide the
            decorative fixed backdrops and pause backdrop-filter surfaces.
            Deep pinch-zoom was OOM-killing WKWebView (the iOS app went
            white-card) because those layers rasterise at zoomed resolution
            (owner report + app-switcher proof, 2026-08-27). */}
        <ZoomGuard />
        {/* SpeedInsights also eager — see import comment. CLS observation
            must start before any layout shift fires. */}
        <SpeedInsights />
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
      {/* Analytics scripts (GA Ads + GA4 + Microsoft Clarity) now mount
          inside DeferredWidgets 6s after hydration so they never compete
          with LCP paint. See components/DeferredAnalytics.tsx. */}
    </html>
  );
}
