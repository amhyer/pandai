'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, GraduationCap, Shield, UserCheck, Users, ArrowLeft, BookOpen, Sparkles, ChevronRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', username: 'superadmin@pandai.id', password: 'password123', icon: Shield, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100', text: 'text-violet-700', iconColor: 'text-violet-500' },
  { label: 'Admin Sekolah', username: 'admin.sman1@pandai.id', password: 'password123', icon: UserCheck, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-100', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
  { label: 'Guru (NIP)', username: '198504152010011001', password: 'password123', icon: BookOpen, color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', border: 'border-sky-200', hoverBg: 'hover:bg-sky-100', text: 'text-sky-700', iconColor: 'text-sky-500' },
  { label: 'Siswa (NISN)', username: '0051234567', password: 'password123', icon: GraduationCap, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100', text: 'text-amber-700', iconColor: 'text-amber-500' },
  { label: 'Orang Tua', username: 'ahmad', password: '123', icon: Users, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100', text: 'text-rose-700', iconColor: 'text-rose-500' },
];

export function LoginForm() {
  const { setUser, navigateTo } = useAppStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error('Harap isi username/email dan password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login gagal. Periksa kembali username dan password.');
        return;
      }

      setUser(data);
      toast.success(`Selamat datang, ${data.name}!`);
      navigateTo('dashboard');
    } catch {
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (username: string, pwd: string) => {
    setIdentifier(username);
    setPassword(pwd);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login gagal. Periksa kembali username dan password.');
        return;
      }
      setUser(data);
      toast.success(`Selamat datang, ${data.name}!`);
      navigateTo('dashboard');
    } catch {
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F3864] via-[#2a4a7a] to-[#1a2744] p-4 animate-[fadeIn_0.6s_ease-out]">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1F3864]/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl shadow-2xl overflow-hidden">
        {/* ── Left Side: Branding (desktop only) ── */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#1F3864] to-[#162d50] text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-400/5 rounded-full" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white/3 rounded-full" />

          <div className="relative z-10">
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors group mb-8"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Kembali ke Beranda
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-amber-400" />
              </div>
              <span className="text-3xl font-bold tracking-tight">
                PANDAI
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="h-px bg-white/10 w-full" />
            <div className="space-y-4">
              <h2 className="text-2xl font-bold leading-snug">
                Platform Persiapan TKA{' '}
                <span className="text-amber-400">Multi-Sekolah</span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Diagnostic test, latihan adaptif, bank soal HOTS, dan tryout berkala dengan analisis mendalam untuk meningkatkan skor TKA siswa Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { num: '10K+', label: 'Soal HOTS' },
                { num: '500+', label: 'Sekolah' },
                { num: '50K+', label: 'Siswa Aktif' },
                { num: '7×24', label: 'Akses' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{s.num}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/30 pt-4">
            © 2024 PANDAI by NALAR
          </p>
        </div>

        {/* ── Right Side: Form ── */}
        <Card className="w-full lg:max-w-none rounded-2xl shadow-xl border-0 bg-white lg:rounded-l-none">
          <CardHeader className="text-center space-y-2 pb-2 pt-8 px-6 lg:px-10">
            {/* Mobile: back button + logo */}
            <div className="lg:hidden flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => navigateTo('landing')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Beranda
              </button>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-amber-400" />
                <span className="text-xl font-bold tracking-tight text-[#1F3864]">PANDAI</span>
              </div>
              <div className="w-16" />
            </div>

            {/* Desktop logo */}
            <div className="hidden lg:flex items-center justify-center gap-2 mb-1">
              <GraduationCap className="h-7 w-7 text-amber-400" />
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                PANDAI
              </span>
            </div>
            <CardTitle className="text-xl font-semibold text-slate-800">
              Masuk ke Akun Anda
            </CardTitle>
            <CardDescription className="text-slate-500">
              Platform Persiapan TKA Multi-Sekolah
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-2 px-6 lg:px-10 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username / Email */}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                  Username / Email
                </Label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Email, NIP/NIK, NISN, atau nama orang tua"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-2 focus-visible:ring-[#1F3864]/20 focus-visible:border-[#1F3864]/40 focus-visible:bg-white transition-all duration-200"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Guru: <span className="font-mono">NIP</span> / <span className="font-mono">NIK</span> · Siswa: <span className="font-mono">NISN</span> · Orang Tua: <span className="font-mono">nama depan</span> · Admin: <span className="font-mono">email</span>
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-[#1F3864]/60 hover:text-[#1F3864] font-medium transition-colors"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-2 focus-visible:ring-[#1F3864]/20 focus-visible:border-[#1F3864]/40 focus-visible:bg-white transition-all duration-200"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#1F3864] to-[#2a4a7a] hover:from-[#162d50] hover:to-[#1F3864] text-white font-semibold text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Demo Accounts */}
            <div className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Akun Demo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => handleDemoLogin(account.username, account.password)}
                      disabled={isLoading}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${account.border} ${account.bg} ${account.hoverBg} hover:shadow-sm active:scale-[0.97] transition-all duration-200 text-left group disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center shrink-0 shadow-sm`}
                    >
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className={`text-xs font-medium ${account.text} truncate transition-colors`}>
                        {account.label}
                      </span>
                      <ChevronRight className={`h-3 w-3 ml-auto ${account.iconColor} opacity-0 group-hover:opacity-60 transition-all duration-200`} />
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Orang Tua login: nama depan, password: <span className="font-mono text-slate-500">123</span>
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="text-sm text-slate-500 hover:text-[#1F3864] font-medium transition-colors group"
              >
                Belum punya akun?{' '}
                <span className="font-semibold text-[#1F3864] group-hover:underline">Daftar Sekarang</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
