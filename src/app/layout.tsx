export const runtime = 'edge';

import './globals.css';
import Script from 'next/script';
import { Poppins, Playfair_Display, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import ScoutChat from '@/components/ScoutChat';

const poppins = Poppins({
  weight: ['400', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-poppins',
});

const playfair = Playfair_Display({
  weight: ['400', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* Preconnect + DNS prefetch to Font Awesome CDN (cheap, non-blocking) */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
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
        <ScoutChat />
        {/* Font Awesome — injected client-side during idle time so it never
            blocks first paint. Icons (star ratings, step icons, etc) appear
            a moment after the rest of the page is already visible. */}
        <Script id="load-font-awesome" strategy="lazyOnload">
          {`(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';l.crossOrigin='anonymous';document.head.appendChild(l);})();`}
        </Script>
        {/* Travelpayouts tracking pixel — fires on every page */}
        <Script
          id="travelpayouts-tracker"
          src="https://tp-em.com/NTEyNjMz.js?t=512633"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
