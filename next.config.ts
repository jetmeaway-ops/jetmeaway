import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// i18n (Phase 1, 2026-07-17): loads src/i18n/request.ts per request so every
// page can read the visitor's locale. No URL/routing changes.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      // Old slug contained "booking-com"; Booking.com is not a partner so the
      // brand was purged from the URL too. 308 permanent redirect preserves the
      // page's indexing/backlinks on the clean slug.
      {
        source: '/blog/is-it-cheaper-to-book-hotel-direct-vs-booking-com-vs-expedia',
        destination: '/blog/is-it-cheaper-to-book-hotel-direct-vs-otas',
        permanent: true,
      },
      // The short-lived /car-hire/[slug] landing pages (live ~1 day, Aug 2026,
      // never submitted to search engines) were re-homed as blog posts so they
      // join the Read-next graph, blog index and llms-full instead of sitting
      // orphaned outside the content system. 301 keeps any early crawls.
      {
        source: '/car-hire/alicante-airport',
        destination: '/blog/car-hire-alicante-airport-2026',
        permanent: true,
      },
      {
        source: '/car-hire/malaga-airport',
        destination: '/blog/car-hire-malaga-airport-2026',
        permanent: true,
      },
      {
        source: '/car-hire/faro-airport',
        destination: '/blog/car-hire-faro-airport-2026',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);