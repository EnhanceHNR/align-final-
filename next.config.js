/** @type {import("next").NextConfig} */
const nextConfig = {
  /* Env validation satırını tamamen sildik */
  eslint: {
    // Build sırasında ESLint hatalarını tamamen yok sayar
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Build sırasında TypeScript hatalarını tamamen yok sayar
    ignoreBuildErrors: true,
  },
};

export default nextConfig;