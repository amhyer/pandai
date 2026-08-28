import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: "standalone" — dihapus untuk Vercel deployment.
  // Aktifkan kembali jika deploy ke Docker/VPS.
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
