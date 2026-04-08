export const runtime = 'edge';

import './globals.css';
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
        {/* Preconnect to Font Awesome CDN for faster icon loading */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
        {/* Poppins is self-hosted via next/font — no Google Fonts request needed */}
      </head>
      <body>
        {children}
        <Analytics />
        <ScoutChat />
      </body>
    </html>
  );
}
