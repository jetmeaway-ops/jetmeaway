export const metadata = {
  title: 'Compare Hotel Prices | JetMeAway',
  description: 'Compare hotel rates across trusted providers. Search hotels worldwide including UK, Europe, Asia and beyond. Real prices shown instantly.',
  openGraph: {
    title: 'Compare Hotel Prices | JetMeAway',
    description: 'Compare hotel rates across trusted providers. Search hotels worldwide.',
    url: 'https://jetmeaway.co.uk/hotels',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function HotelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
