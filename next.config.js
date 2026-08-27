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
  serverActions: {
    bodySizeLimit: '1000mb',
  },
  experimental: {
    middlewareClientMaxBodySize: '1000mb',
  }
};

module.exports = nextConfig;
