'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Mail, Lock, User, School, Eye, EyeOff, GraduationCap } from 'lucide-react';

type RegisterRole = 'SISWA' | 'GURU';

export function RegisterForm() {
  const { setUser, navigateTo } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('SISWA');
  const [schoolCode, setSchoolCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error('Harap isi nama lengkap');
      return false;
    }
    if (!email.trim()) {
      toast.error('Harap isi alamat email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Format email tidak valid');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return false;
    }
    if (!schoolCode.trim()) {
      toast.error('Harap isi kode sekolah');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          schoolCode: schoolCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Registrasi gagal. Silakan coba lagi.');
        return;
      }

      setUser(data);
      toast.success('Registrasi berhasil! Selamat datang.');
      navigateTo('dashboard');
    } catch {
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
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
            Daftar Akun Baru
          </CardTitle>
          <CardDescription>
            Bergabung dengan platform persiapan TKA
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nama Lengkap
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="nama@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">
                Daftar Sebagai
              </Label>
              <RadioGroup
                value={role}
                onValueChange={(val) => setRole(val as RegisterRole)}
                className="grid grid-cols-2 gap-3"
                disabled={isLoading}
              >
                <label
                  htmlFor="role-siswa"
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    role === 'SISWA'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`
                }
                >
                  <RadioGroupItem value="SISWA" id="role-siswa" className="sr-only" />
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm font-medium">Siswa</span>
                </label>
                <label
                  htmlFor="role-guru"
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    role === 'GURU'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`
                }
                >
                  <RadioGroupItem value="GURU" id="role-guru" className="sr-only" />
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm font-medium">Guru</span>
                </label>
              </RadioGroup>
            </div>

            {/* School Code */}
            <div className="space-y-2">
              <Label htmlFor="school-code" className="text-sm font-medium text-slate-700">
                Kode Sekolah
              </Label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="school-code"
                  type="text"
                  placeholder="Masukkan kode sekolah"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-400">
                Dapatkan kode sekolah dari administrator sekolah Anda
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                Konfirmasi Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-400 focus-visible:ring-red-500/30 focus-visible:border-red-500'
                      : ''
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500">Password tidak cocok</p>
              )}
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
                'Daftar'
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
            >
              Sudah punya akun? <span className="font-semibold">Masuk</span>
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
