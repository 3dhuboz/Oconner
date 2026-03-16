/** @type {import('next').NextConfig} */
const { withNextOnPages } = require('@cloudflare/next-on-pages/next-config');

const nextConfig = {
  transpilePackages: ['@butcher/shared', '@butcher/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
    ],
    unoptimized: true,
  },
};

module.exports = withNextOnPages(nextConfig);
