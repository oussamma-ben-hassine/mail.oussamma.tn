const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@mail/contracts', '@mail/ui'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_INTERNAL_URL
          ? `${process.env.API_INTERNAL_URL}/api/:path*`
          : 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
