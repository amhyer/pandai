'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Mail, Lock, User, School, Eye, EyeOff, GraduationCap,
  Search, ShieldCheck, MapPin, Award, Calendar, BookOpen, Building2, Phone, Loader2
} from 'lucide-react';

type RegisterRole = 'SISWA' | 'GURU' | 'ADMIN_SCHOOL';

interface DapodikSchool {
  npsn: string;
  name: string;
  address: string;
  province: string;
  city: string;
  district: string;
  principalName: string;
  accreditation: string;
  schoolType: string;
  established: string;
  curriculum: string;
  phone: string;
  emailDomain: string;
  source: string;
}

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

  // Dapodik / Admin Sekolah state
  const [npsnInput, setNpsnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dapodikSchool, setDapodikSchool] = useState<DapodikSchool | null>(null);
  const [dapodikVerified, setDapodikVerified] = useState(false);

  const isSchoolAdmin = role === 'ADMIN_SCHOOL';

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
    if (isSchoolAdmin) {
      if (!dapodikVerified || !dapodikSchool) {
        toast.error('Harap verifikasi data sekolah melalui Dapodik terlebih dahulu');
        return false;
      }
    } else {
      if (!schoolCode.trim()) {
        toast.error('Harap isi kode sekolah');
        return false;
      }
    }
    return true;
  };

  const handleSearchNpsn = async () => {
    const q = npsnInput.trim();
    if (!q) {
      toast.error('Masukkan NPSN atau nama sekolah');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/schools/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        toast.error('Sekolah tidak ditemukan dalam database Dapodik');
        setDapodikSchool(null);
        setDapodikVerified(false);
        return;
      }

      // Pick the first result
      const school = data[0];
      setDapodikSchool(school);
      setDapodikVerified(true);
      toast.success('Data sekolah ditemukan dari Dapodik');
    } catch {
      toast.error('Gagal mencari data sekolah. Coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isSchoolAdmin && dapodikSchool) {
        // Admin Sekolah registration via /api/auth/register-school
        const res = await fetch('/api/auth/register-school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            schoolData: {
              npsn: dapodikSchool.npsn,
              name: dapodikSchool.name,
              address: dapodikSchool.address,
              province: dapodikSchool.province,
              city: dapodikSchool.city,
              district: dapodikSchool.district,
              principalName: dapodikSchool.principalName,
              accreditation: dapodikSchool.accreditation,
              schoolType: dapodikSchool.schoolType,
              phone: dapodikSchool.phone,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Registrasi gagal. Silakan coba lagi.');
          return;
        }

        setUser(data);
        toast.success('Registrasi berhasil! Selamat datang, Admin Sekolah.');
        navigateTo('dashboard');
      } else {
        // Siswa / Guru registration via /api/auth/register
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
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (val: string) => {
    setRole(val as RegisterRole);
    if (val === 'ADMIN_SCHOOL') {
      setDapodikSchool(null);
      setDapodikVerified(false);
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
            {/* Role Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">
                Daftar Sebagai
              </Label>
              <RadioGroup
                value={role}
                onValueChange={handleRoleChange}
                className="grid grid-cols-3 gap-2"
                disabled={isLoading}
              >
                <label
                  htmlFor="role-siswa"
                  className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    role === 'SISWA'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`
                }
                >
                  <RadioGroupItem value="SISWA" id="role-siswa" className="sr-only" />
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Siswa</span>
                </label>
                <label
                  htmlFor="role-guru"
                  className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    role === 'GURU'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`
                }
                >
                  <RadioGroupItem value="GURU" id="role-guru" className="sr-only" />
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Guru</span>
                </label>
                <label
                  htmlFor="role-admin"
                  className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    role === 'ADMIN_SCHOOL'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`
                }
                >
                  <RadioGroupItem value="ADMIN_SCHOOL" id="role-admin" className="sr-only" />
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Admin</span>
                </label>
              </RadioGroup>
              {isSchoolAdmin && (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verifikasi data sekolah melalui database Dapodik
                </p>
              )}
            </div>

            {/* ===== ADMIN_SCHOOL: Dapodik Verification Section ===== */}
            {isSchoolAdmin && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">
                  Verifikasi Data Sekolah
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Masukkan NPSN atau nama sekolah"
                      value={npsnInput}
                      onChange={(e) => {
                        setNpsnInput(e.target.value);
                        if (dapodikVerified) {
                          setDapodikVerified(false);
                          setDapodikSchool(null);
                        }
                      }}
                      className="pl-10 h-11 border-slate-300 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                      disabled={isLoading || isSearching}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchNpsn(); } }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchNpsn}
                    disabled={isLoading || isSearching || !npsnInput.trim()}
                    className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 transition-colors"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Cari</span>
                  </Button>
                </div>

                {/* Dapodik School Card */}
                {dapodikVerified && dapodikSchool && (
                  <div className="border-l-4 border-emerald-500 bg-emerald-50/60 rounded-r-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700">Data Terverifikasi Dapodik</span>
                      </div>
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium">
                        {dapodikSchool.npsn}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        <School className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{dapodikSchool.name}</p>
                          <p className="text-slate-500 text-xs">{dapodikSchool.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs truncate">{dapodikSchool.district}, {dapodikSchool.city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs truncate">{dapodikSchool.province}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-6">
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs font-medium">
                          {dapodikSchool.schoolType}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Award className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Akreditasi <strong>{dapodikSchool.accreditation}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Berdiri {dapodikSchool.established}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-6 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-emerald-500" />
                          <span>KS: {dapodikSchool.principalName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{dapodikSchool.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  placeholder={isSchoolAdmin ? 'Nama Kepala Sekolah / Admin' : 'Masukkan nama lengkap'}
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
                  placeholder={isSchoolAdmin && dapodikSchool ? `nama@${dapodikSchool.emailDomain}` : 'nama@sekolah.sch.id'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* School Code (only for Siswa / Guru) */}
            {!isSchoolAdmin && (
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
            )}

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
                  placeholder="Minimal 6 karakter"
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
              className={`w-full h-11 text-white font-semibold text-base shadow-md transition-all duration-200 ${
                isSchoolAdmin
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
              }`}
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
                isSchoolAdmin ? 'Daftar & Buat Sekolah' : 'Daftar'
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
