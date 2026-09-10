import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/geist-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "PANDAI - Platform Persiapan TKA Multi-Sekolah",
  description: "Tingkatkan skor TKA siswa Anda melalui diagnostic test, latihan adaptif, bank soal HOTS, dan tryout berkala dengan analisis mendalam.",
  keywords: ["PANDAI", "TKA", "Tes Kemampuan Akademik", "persiapan ujian", "latihan soal", "tryout", "education", "Indonesia"],
  authors: [{ name: "NALAR" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PANDAI - Platform Persiapan TKA",
    description: "Platform persiapan Tes Kemampuan Akademik multi-sekolah berbasis langganan",
    siteName: "PANDAI by NALAR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
