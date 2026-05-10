export const metadata = {
  title: 'Compare Travel eSIM Plans | JetMeAway',
  description: 'Compare eSIM data plans for international travel. Stay connected in 200+ countries from $4.50. No roaming charges.',
  // Canonical URL — see /cars/layout.tsx for full reasoning. 2026-05-10 audit.
  alternates: { canonical: 'https://jetmeaway.co.uk/esim' },
  openGraph: {
    title: 'Compare Travel eSIM Plans | JetMeAway',
    description: 'Compare eSIM data plans for international travel. Stay connected in 200+ countries.',
    url: 'https://jetmeaway.co.uk/esim',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function EsimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
