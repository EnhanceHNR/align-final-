const path = require("path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb',
    },
    middlewareClientMaxBodySize: '1000mb',
  }
};

module.exports = nextConfig;
