export const runtime = 'edge';

import './globals.css';
import ScoutChat from '@/components/ScoutChat';

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
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ScoutChat />
      </body>
    </html>
  );
}
