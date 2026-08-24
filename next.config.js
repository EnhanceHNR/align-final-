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
  outputFileTracingIncludes: {
    "/**": ["./prisma/generated/client/*.node", "./prisma/generated/client/*.wasm"],
  },
};

module.exports = nextConfig;
