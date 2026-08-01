'use client';

import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/use-store';
import { GraduationCap, ArrowRight, Users, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';

export default function LandingPageSimple() {
  const { navigateTo } = useAppStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-amber-400" />
          <span className="text-xl font-bold text-white">PANDAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigateTo('login')}>
            Masuk
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold" onClick={() => navigateTo('register')}>
            Daftar
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-1.5 mb-6">
          <span className="text-sm font-medium text-amber-400">Platform Persiapan TKA Multi-Sekolah</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Tingkatkan Skor TKA
          <br />
          <span className="text-amber-400">Siswa Anda</span>
        </h1>

        <p className="text-lg text-white/70 max-w-2xl mb-10">
          Diagnostic test, latihan adaptif, bank soal HOTS, dan tryout berkala dengan analisis mendalam.
          Satu platform untuk semua kebutuhan persiapan ujian.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-base px-8 shadow-lg shadow-amber-500/25" onClick={() => navigateTo('login')}>
            Mulai Sekarang <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold text-base px-8" onClick={() => navigateTo('register')}>
            Buat Akun Sekolah
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          {[
            { icon: BookOpen, title: 'Bank Soal HOTS', desc: 'Ribuan soal berkualitas tinggi dengan analisis butir soal mendalam' },
            { icon: BarChart3, title: 'Analisis Adaptif', desc: 'Diagnostic test yang mengidentifikasi kekuatan dan kelemahan siswa' },
            { icon: ShieldCheck, title: 'Multi-Sekolah', desc: 'Dikelola per sekolah dengan data terpisah dan laporan terintegrasi' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white/5 backdrop-blur border border-white/10 p-6 text-left">
              <f.icon className="h-8 w-8 text-amber-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-16">
          {[
            { val: '10,000+', label: 'Soal Tersedia' },
            { val: '500+', label: 'Sekolah Terdaftar' },
            { val: '50,000+', label: 'Siswa Aktif' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-amber-400">{s.val}</p>
              <p className="text-sm text-white/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/10 w-full">
          <p className="text-sm text-white/40">
            © 2024 PANDAI by NALAR. Platform Persiapan TKA Multi-Sekolah.
          </p>
        </footer>
      </main>
    </div>
  );
}
