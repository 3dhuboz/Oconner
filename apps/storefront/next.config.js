/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://oconner-api.steve-700.workers.dev',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.oconnoragriculture.com.au',
    NEXT_PUBLIC_SQUARE_APP_ID: process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? '',
    NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? 'LMRR0D22RZ2Y3',
  },
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
