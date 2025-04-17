const withNextIntl = require('next-intl/plugin')('./src/app/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vista.uteam.club']
    },
    optimizeCss: true,
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
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Временно упрощена конфигурация webpack для отладки
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
  onDemandEntries: {
    maxInactiveAge: 300,
    pagesBufferLength: 5,
  },
  swcMinify: true,
  transpilePackages: ['@supabase/supabase-js', 'uuid', 'date-fns'],
  modularizeImports: {
    '@heroicons/react': {
      transform: '@heroicons/react/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  // Определение динамических маршрутов для правильного статического экспорта
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    // Базовые статические пути
    return {
      '/': { page: '/' },
      '/404': { page: '/404' },
      '/500': { page: '/500' },
      '/ru': { page: '/ru' },
      '/en': { page: '/en' },
    };
  },
  // Указать, что маршруты dashboard требуют динамической генерации
  dynamicRoutes: [
    '/[locale]/dashboard/**',
    '/api/**',
  ],
};

module.exports = withNextIntl(nextConfig); 