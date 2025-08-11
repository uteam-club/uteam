/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  eslint: {
    // Не блокировать production build из-за предупреждений линтера
    ignoreDuringBuilds: true,
  },
  // Настройки для изображений
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
        port: '',
        pathname: '/uteam-media/**',
      },
    ],
    domains: ['storage.yandexcloud.net'],
    unoptimized: true, // Отключаем оптимизацию Next.js для Yandex Cloud
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'], // Поддержка современных форматов
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней кеширования
  },
  webpack: (config, { isServer }) => {
    // Исправление проблемы с UUID в Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      // Для next-auth, который пытается импортировать из устаревшего пути
      'uuid/dist/esm-node/index.js': require.resolve('uuid'),
    };
    // Явно указываем расширения для резолва
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    return config;
  },
  // Настройки для API роутов
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://*.uteam.club' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // Настройки для динамических роутов
  serverRuntimeConfig: {
    api: {
      bodyParser: true,
      externalResolver: true,
    },
  },
  // Настройки для поддоменов
  experimental: {
    allowedRevalidateHeaderKeys: ['x-revalidate-secret'],
  },
  // Отключаем статическую оптимизацию для всех страниц
  staticPageGenerationTimeout: 0,
};

module.exports = nextConfig; 