export const metadata = {
  title: 'Compare Holiday Packages | JetMeAway',
  description: 'Compare flight + hotel package deals from Expedia and Trip.com. Find the best value holiday packages from UK airports.',
  openGraph: {
    title: 'Compare Holiday Packages | JetMeAway',
    description: 'Compare flight + hotel package deals from Expedia and Trip.com.',
    url: 'https://jetmeaway.co.uk/packages',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
