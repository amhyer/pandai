import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: "standalone" — diaktifkan HANYA untuk build CI/Docker
  // (script "build" -> scripts/build.mjs yang set BUILD_STANDALONE=1).
  // Build Vercel (npm run build:vercel) tidak men-set env ini sehingga
  // tetap non-standalone, sesuai kebutuhan deployment Vercel.
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  typescript: {
    // tsc --noEmit sudah 0 error dan dijaga oleh job "Code Quality" di CI,
    // jadi build tidak perlu lagi melewatkan pemeriksaan tipe.
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "jspdf", "mammoth"],
  allowedDevOrigins: ["*"],
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["recharts", "framer-motion", "date-fns", "lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
