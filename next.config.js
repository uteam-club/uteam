const withNextIntl = require('next-intl/plugin')('./src/app/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gtmpyyttkzjoiufiizwl.supabase.co',
        pathname: '**',
      },
    ],
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig); 