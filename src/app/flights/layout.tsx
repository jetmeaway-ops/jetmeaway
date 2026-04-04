export const metadata = {
  title: 'Compare Cheap Flights | JetMeAway',
  description: 'Compare flight prices across Aviasales, Trip.com and Expedia. Find the cheapest flights from UK airports. Real prices, no hidden fees.',
  openGraph: {
    title: 'Compare Cheap Flights | JetMeAway',
    description: 'Compare flight prices across Aviasales, Trip.com and Expedia. Find the cheapest flights from UK airports.',
    url: 'https://jetmeaway.co.uk/flights',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function FlightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
