export const metadata = {
  title: 'Compare Travel Insurance | JetMeAway',
  description: 'Compare travel insurance from trusted providers. Medical cover, cancellation protection and luggage insurance from £3/day.',
  // Canonical URL — see /cars/layout.tsx for full reasoning. 2026-05-10 audit.
  alternates: { canonical: 'https://jetmeaway.co.uk/insurance' },
  openGraph: {
    title: 'Compare Travel Insurance | JetMeAway',
    description: 'Compare travel insurance from trusted providers. Medical cover, cancellation protection and luggage insurance.',
    url: 'https://jetmeaway.co.uk/insurance',
    images: [{ url: 'https://jetmeaway.co.uk/jetmeaway-logo.png' }],
  },
};

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
