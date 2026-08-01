'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';

// ─── Auth (static import — small) ──────────────────────────────────
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

// ─── All authenticated views in one dynamic bundle ────────────────
const AuthenticatedApp = dynamic(
  () => import('./authenticated-app'),
  { loading: () => <AppLoading />, ssr: false }
);

// ─── Loading State ────────────────────────────────────────────────

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#1F3864] animate-pulse">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Memuat...</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Landing Page — lightweight inline
// ═══════════════════════════════════════════════════════════════════

function LandingPageInline() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1a2744] to-slate-900">
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
          </svg>
          <span className="text-xl font-bold text-white tracking-tight">PANDAI</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('login')} className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            Masuk
          </button>
          <button onClick={() => navigateTo('register')} className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors">
            Daftar
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-1.5 mb-6">
          <span className="text-sm font-medium text-amber-400">Platform Persiapan TKA Multi-Sekolah</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Tingkatkan Skor TKA<br /><span className="text-amber-400">Siswa Anda</span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mb-10">
          Diagnostic test, latihan adaptif, bank soal HOTS, dan tryout berkala dengan analisis mendalam.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => navigateTo('login')} className="px-8 py-3 text-base font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-lg shadow-amber-500/25 transition-colors">
            Mulai Sekarang →
          </button>
          <button onClick={() => navigateTo('register')} className="px-8 py-3 text-base font-semibold text-white border border-white/20 hover:bg-white/10 rounded-lg transition-colors">
            Buat Akun Sekolah
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          {[
            { icon: '📚', title: 'Bank Soal HOTS', desc: 'Ribuan soal berkualitas tinggi dengan analisis butir soal mendalam' },
            { icon: '📊', title: 'Analisis Adaptif', desc: 'Diagnostic test yang mengidentifikasi kekuatan dan kelemahan siswa' },
            { icon: '🏫', title: 'Multi-Sekolah', desc: 'Dikelola per sekolah dengan data terpisah dan laporan terintegrasi' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white/5 backdrop-blur border border-white/10 p-6 text-left hover:bg-white/8 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-8 mt-16">
          {[
            ['10,000+', 'Soal Tersedia'],
            ['500+', 'Sekolah Terdaftar'],
            ['50,000+', 'Siswa Aktif'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-bold text-amber-400">{v}</p>
              <p className="text-sm text-white/50 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-20 pt-8 border-t border-white/10 max-w-7xl mx-auto px-6 pb-4">
        <p className="text-sm text-white/40 text-center">
          © 2024 PANDAI by NALAR. Platform Persiapan TKA Multi-Sekolah.
        </p>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentView = useAppStore((s) => s.currentView);

  if (!isAuthenticated) {
    switch (currentView) {
      case 'login':
        return <LoginForm />;
      case 'register':
        return <RegisterForm />;
      case 'landing':
      default:
        return <LandingPageInline />;
    }
  }

  return <AuthenticatedApp />;
}
