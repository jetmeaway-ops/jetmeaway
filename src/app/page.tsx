export const runtime = 'edge';

import Header from '@/components/Header';
import DiscoverPopup from '@/components/DiscoverPopup';
import HomepageClient from './homepage-client';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    logo: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    description: 'UK travel price comparison platform',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://jetmeaway.co.uk/flights?to={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

export default function Home() {
  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <DiscoverPopup />
      <Header />
      <HomepageClient />
    </>
  );
}
