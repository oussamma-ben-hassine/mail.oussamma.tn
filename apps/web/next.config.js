/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@mail/contracts', '@mail/ui'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_INTERNAL_URL
          ? `${process.env.API_INTERNAL_URL}/api/:path*`
          : 'http://mail-api:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
