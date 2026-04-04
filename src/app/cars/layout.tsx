export const metadata = {
  title: 'Compare Car Hire Prices | JetMeAway',
  description: 'Compare car rental prices from Economy Bookings, Localrent, Qeeq, GetRentaCar and Expedia. Find the cheapest car hire deals.',
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
