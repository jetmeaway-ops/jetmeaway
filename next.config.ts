/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.booking.com' },
      { protocol: 'https', hostname: '**.expedia.com' },
      { protocol: 'https', hostname: '**.hotels.com' },
      { protocol: 'https', hostname: '**.duffel.com' }, // Add this if using Duffel images
    ],
  },
};

module.exports = nextConfig;