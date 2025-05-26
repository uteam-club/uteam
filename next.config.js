/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Исправление проблемы с UUID в Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
      // Для next-auth, который пытается импортировать из устаревшего пути
      'uuid/dist/esm-node/index.js': require.resolve('uuid'),
    };
    
    return config;
  },
};

module.exports = nextConfig; 