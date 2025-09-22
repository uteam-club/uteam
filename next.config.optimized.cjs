/** @type {import('next').NextConfig} */
const nextConfig = {
  // Включаем экспериментальные функции для оптимизации
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Оптимизация webpack
  webpack: (config, { dev, isServer }) => {
    // Оптимизация для production
    if (!dev && !isServer) {
      // Включаем tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Оптимизация chunk splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // GPS components chunk
          gps: {
            test: /[\\/]src[\\/]components[\\/]gps[\\/]/,
            name: 'gps-components',
            chunks: 'all',
            priority: 20,
          },
          // UI components chunk
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 15,
          },
          // Utils chunk
          utils: {
            test: /[\\/]src[\\/]lib[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 5,
          },
        },
      };

      // Минификация
      config.optimization.minimize = true;
    }

    // Оптимизация для всех режимов
    config.resolve.alias = {
      ...config.resolve.alias,
      // Алиасы для более коротких импортов
      '@': require('path').resolve(__dirname, 'src'),
      '@components': require('path').resolve(__dirname, 'src/components'),
      '@lib': require('path').resolve(__dirname, 'src/lib'),
      '@db': require('path').resolve(__dirname, 'src/db'),
    };

    return config;
  },

  // Оптимизация компиляции
  compiler: {
    // Удаляем console.log в production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Оптимизация headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
    ];
  },

  // Оптимизация redirects
  async redirects() {
    return [
      {
        source: '/gps',
        destination: '/dashboard/gps',
        permanent: true,
      },
    ];
  },

  // Оптимизация rewrites
  async rewrites() {
    return [
      {
        source: '/api/gps/health',
        destination: '/api/health',
      },
    ];
  },

  // Настройки для production
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    poweredByHeader: false,
    generateEtags: false,
  }),
};

module.exports = nextConfig;
