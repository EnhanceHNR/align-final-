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
    "/**": ["./node_modules/**/*.node", "./node_modules/**/*.wasm"],
  },
};

module.exports = nextConfig;
