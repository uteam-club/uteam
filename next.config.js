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
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'date-fns',
      '@heroicons/react',
      'lucide-react'
    ],
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
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.devtool = false;
    }
    
    // Оптимизация сборки
    if (!dev && !isServer) {
      // Разделение бандла на чанки
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            chunks: 'all',
          },
          commons: {
            name: 'commons',
            test: /[\\/]node_modules[\\/]/,
            priority: 30,
            chunks: 'all',
          },
          lib: {
            test(module) {
              return (
                module.size() > 80000 &&
                /node_modules[\\/]/.test(module.identifier())
              );
            },
            name(module) {
              const hash = module.libIdent({ context: __dirname });
              return `lib-${hash.replace(/node_modules[\\/]/, '')}`;
            },
            priority: 20,
            minChunks: 1,
          },
        },
      };
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
};

module.exports = withNextIntl(nextConfig); 