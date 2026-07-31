import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
