'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Shield, UserCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@nalar.id', icon: Shield },
  { label: 'Admin Sekolah', email: 'admin@sma1jkt.sch.id', icon: UserCheck },
  { label: 'Guru', email: 'guru.bindo@sma1jkt.sch.id', icon: GraduationCap },
  { label: 'Siswa', email: 'siswa1@sma1jkt.sch.id', icon: GraduationCap },
];

export function LoginForm() {
  const { setUser, navigateTo } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Harap isi email dan password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login gagal. Periksa kembali email dan password.');
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

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="h-8 w-8 text-amber-500" />
            <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              PANDAI
            </span>
          </div>
          <CardTitle className="text-xl font-semibold text-slate-800">
            Masuk ke PANDAI
          </CardTitle>
          <CardDescription>
            Platform Persiapan TKA Multi-Sekolah
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-base shadow-md transition-all duration-200"
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
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Akun Demo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleDemoLogin(account.email)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 text-left group"
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-amber-700 truncate transition-colors">
                      {account.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Semua akun demo menggunakan password: <span className="font-mono text-slate-500">password123</span>
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigateTo('register')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
            >
              Belum punya akun? <span className="font-semibold">Daftar</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Kembali ke Beranda
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}