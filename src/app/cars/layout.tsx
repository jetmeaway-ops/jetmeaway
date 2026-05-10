export const metadata = {
  title: 'Compare Car Hire Prices | JetMeAway',
  description: 'Compare car rental prices from Economy Bookings, Localrent, Qeeq, GetRentaCar and Expedia. Find the cheapest car hire deals.',
  // Canonical URL — collapse parameterised variants (?utm_*, ?ref=…, etc.)
  // back to the bare /cars URL so PageRank consolidates. From 2026-05-10
  // daily SEO audit (HIGH-impact, one-line fix per route).
  alternates: { canonical: 'https://jetmeaway.co.uk/cars' },
  openGraph: {
    title: 'Compare Car Hire Prices | JetMeAway',
    description: 'Compare car rental prices from 5 trusted providers. Find the cheapest car hire deals.',
    url: 'https://jetmeaway.co.uk/cars',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
