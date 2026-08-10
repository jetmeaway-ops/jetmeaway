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
    ];
  },
  async headers() {
    return [
      {
        // Security headers, ALL routes. Added after a clickjacking disclosure
        // on /account (2026-08). We never frame our own pages — the only
        // iframe we render points OUT to Kyte's Ryanair confirmation host,
        // which these response headers do not affect — so full DENY is safe.
        // frame-ancestors is the modern directive; X-Frame-Options is the
        // legacy fallback. nosniff + Referrer-Policy pre-empt the usual
        // follow-up scanner findings. (No script/style CSP here — that needs
        // its own careful pass against the CDN/Stripe/Unsplash allowlist.)
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
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