/** @type {import('next').NextConfig} */
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

module.exports = nextConfig;
