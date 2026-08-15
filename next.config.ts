import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["*"],
  // Disable source maps in production to reduce build size & memory
  productionBrowserSourceMaps: false,
};
