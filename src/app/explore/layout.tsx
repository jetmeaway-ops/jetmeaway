import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Activities & Things to Do | JetMeAway',
  description:
    'Discover tours, activities and experiences worldwide. Compare prices from GetYourGuide and Viator — book direct, no markup.',
  // Canonical URL — see /cars/layout.tsx for full reasoning. 2026-05-10 audit.
  alternates: { canonical: 'https://jetmeaway.co.uk/explore' },
  openGraph: {
    title: 'Explore Activities & Things to Do | JetMeAway',
    description:
      'Discover tours, activities and experiences worldwide. Compare prices from GetYourGuide and Viator.',
    url: 'https://jetmeaway.co.uk/explore',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
