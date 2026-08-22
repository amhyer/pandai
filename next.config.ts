import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["pdfkit", "jspdf", "mammoth"],
  allowedDevOrigins: ["*"],
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["recharts", "framer-motion", "date-fns", "lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
