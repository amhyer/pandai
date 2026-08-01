'use client';

import { useState, useCallback } from 'react';
import { Metadata } from 'next';

type View = 'landing' | 'login' | 'register' | 'dashboard';

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = type === 'success'
    ? 'bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-[fadeIn_0.3s]'
    : 'bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-[fadeIn_0.3s]';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const handleLogin = useCallback(async () => {
    if (!loginId.trim() || !loginPw.trim()) {
      showToast('Harap isi username dan password', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId.trim(), password: loginPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Login gagal', 'error');
        return;
      }
      localStorage.setItem('pandai_user', JSON.stringify(data));
      showToast(`Selamat datang, ${data.name}!`);
      setView('dashboard');
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [loginId, loginPw]);

  // Landing Page
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
            </svg>
            <span className="text-xl font-bold text-white tracking-tight">PANDAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('login')} className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              Masuk
            </button>
            <button onClick={() => setView('register')} className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors">
              Daftar
            </button>
          </div>
        </header>

        <main className="flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-1.5 mb-6">
            <span className="text-sm font-medium text-amber-400">Platform Persiapan TKA Multi-Sekolah</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Tingkatkan Skor TKA<br />
            <span className="text-amber-400">Siswa Anda</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mb-10">
            Diagnostic test, latihan adaptif, bank soal HOTS, dan tryout berkala dengan analisis mendalam.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setView('login')} className="px-8 py-3 text-base font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-lg shadow-amber-500/25 transition-colors">
              Mulai Sekarang →
            </button>
            <button onClick={() => setView('register')} className="px-8 py-3 text-base font-semibold text-white border border-white/20 hover:bg-white/10 rounded-lg transition-colors">
              Buat Akun Sekolah
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
            {[
              { emoji: '📚', title: 'Bank Soal HOTS', desc: 'Ribuan soal berkualitas tinggi dengan analisis butir soal mendalam' },
              { emoji: '📊', title: 'Analisis Adaptif', desc: 'Diagnostic test yang mengidentifikasi kekuatan dan kelemahan siswa' },
              { emoji: '🏫', title: 'Multi-Sekolah', desc: 'Dikelola per sekolah dengan data terpisah dan laporan terintegrasi' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-white/5 backdrop-blur border border-white/10 p-6 text-left">
                <div className="text-2xl mb-3">{f.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-16">
            {[['10,000+', 'Soal Tersedia'], ['500+', 'Sekolah Terdaftar'], ['50,000+', 'Siswa Aktif']].map(([v, l]) => (
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

  // Login Page
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
              </svg>
              <span className="text-3xl font-bold text-amber-500">PANDAI</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Masuk ke PANDAI</h2>
            <p className="text-sm text-slate-500">Platform Persiapan TKA Multi-Sekolah</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email</label>
              <input type="text" placeholder="Email, NIP/NIK, NISN, atau nama orang tua"
                value={loginId} onChange={(e) => setLoginId(e.target.value)}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
              <p className="text-[11px] text-slate-400 mt-1">
                Guru: <span className="font-mono">NIP/NIK</span> · Siswa: <span className="font-mono">NISN</span> · Orang Tua: <span className="font-mono">nama depan</span> · Admin: <span className="font-mono">email</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" placeholder="Masukkan password"
                value={loginPw} onChange={(e) => setLoginPw(e.target.value)}
                className="w-full h-11 px-4 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Quick login buttons */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-center text-slate-400 mb-3 font-medium uppercase tracking-wider">Akun Demo</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Super Admin', id: 'superadmin@pandai.id', pw: 'password123' },
                { label: 'Admin Sekolah', id: 'admin.sman1@pandai.id', pw: 'password123' },
                { label: 'Guru (NIP)', id: '198504152010011001', pw: 'password123' },
                { label: 'Siswa (NISN)', id: '0051234567', pw: 'password123' },
                { label: 'Orang Tua', id: 'rahman', pw: '123' },
              ].map((acc) => (
                <button key={acc.label} type="button"
                  onClick={() => { setLoginId(acc.id); setLoginPw(acc.pw); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-left transition-all text-xs font-medium text-slate-600 hover:text-amber-700">
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center space-y-2">
            <button onClick={() => setView('register')} className="text-sm text-amber-600 hover:underline font-medium">
              Belum punya akun? <strong>Daftar</strong>
            </button>
            <br />
            <button onClick={() => setView('landing')} className="text-sm text-slate-400 hover:text-slate-600">
              ← Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Register placeholder
  if (view === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Pendaftaran</h2>
          <p className="text-sm text-slate-500 mb-6">Halaman pendaftaran dalam pengembangan.</p>
          <button onClick={() => setView('login')} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // Dashboard placeholder (after login)
  if (view === 'dashboard') {
    const userData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pandai_user') || '{}') : {};
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#1F3864]">PANDAI</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{userData.role || 'User'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{userData.name || 'User'}</span>
            <button onClick={() => { localStorage.removeItem('pandai_user'); setView('landing'); }}
              className="text-sm text-red-600 hover:underline font-medium">
              Keluar
            </button>
          </div>
        </header>
        <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
          <div className="rounded-2xl bg-amber-50 p-6">
            <svg className="h-12 w-12 text-amber-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Selamat Datang, {userData.name || 'User'}!</h2>
          <p className="text-muted-foreground max-w-md text-center">
            Dashboard {userData.role === 'SUPER_ADMIN' ? 'Super Admin' : userData.role === 'GURU' ? 'Guru' : userData.role === 'SISWA' ? 'Siswa' : userData.role === 'ORANG_TUA' ? 'Orang Tua' : 'Admin'} dalam pengembangan.
          </p>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            🚧 Dalam Pengembangan
          </span>
        </main>
      </div>
    );
  }

  return null;
}
