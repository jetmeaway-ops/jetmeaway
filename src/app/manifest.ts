import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'JetMeAway — Your Personal Travel Scout',
    short_name: 'JetMeAway',
    description: 'Compare flights, hotels, car hire and holidays from 15+ trusted providers. Real prices, in seconds.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#0a1628',
    theme_color: '#0a1628',
    orientation: 'portrait',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Compare flights',
        short_name: 'Flights',
        description: 'Find the cheapest flight across 3 providers',
        url: '/flights?source=pwa-shortcut',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Compare hotels',
        short_name: 'Hotels',
        description: 'Find the cheapest hotel across 6 providers',
        url: '/hotels?source=pwa-shortcut',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Explore destinations',
        short_name: 'Explore',
        description: 'Activities and tours worldwide',
        url: '/explore?source=pwa-shortcut',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
    categories: ['travel', 'lifestyle', 'navigation'],
  };
}
