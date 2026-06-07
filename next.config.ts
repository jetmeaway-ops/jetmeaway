import type { NextConfig } from "next";

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

export default nextConfig;