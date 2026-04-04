import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Activities & Things to Do | JetMeAway',
  description:
    'Discover tours, activities and experiences worldwide. Compare prices from GetYourGuide, Viator, Klook, Tiqets and WeGoTrip — book direct, no markup.',
  openGraph: {
    title: 'Explore Activities & Things to Do | JetMeAway',
    description:
      'Discover tours, activities and experiences worldwide. Compare prices from GetYourGuide, Viator, Klook, Tiqets and WeGoTrip.',
    url: 'https://jetmeaway.co.uk/explore',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
