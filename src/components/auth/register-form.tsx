'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Search, ShieldCheck, MapPin, Award, Calendar, BookOpen, Building2, Phone, Loader2, Sparkles,
  Upload, Database, FileSpreadsheet, AlertCircle, Download
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
  email: string;
  emailDomain: string;
  source: string;
  sourceDetail?: string;
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

  // Track whether fields were auto-filled from Dapodik
  const [nameAutoFilled, setNameAutoFilled] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(false);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  // Toggle between NPSN search and file upload
  const [lookupMode, setLookupMode] = useState<'npsn' | 'upload'>('npsn');

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSchoolAdmin = role === 'ADMIN_SCHOOL';

  // Auto-fill nama kepala sekolah & email sekolah when Dapodik data is verified
  useEffect(() => {
    if (dapodikVerified && dapodikSchool) {
      // Auto-fill Nama Lengkap with principal name
      if (dapodikSchool.principalName) {
        setName(dapodikSchool.principalName);
        setNameAutoFilled(true);
      }
      // Auto-fill Email: prefer direct email, otherwise construct from emailDomain
      const schoolEmail = dapodikSchool.email || '';
      if (schoolEmail) {
        setEmail(schoolEmail);
        setEmailAutoFilled(true);
      } else if (dapodikSchool.emailDomain) {
        const constructedEmail = `info@${dapodikSchool.emailDomain}`;
        setEmail(constructedEmail);
        setEmailAutoFilled(true);
      } else {
        setEmail('');
        setEmailAutoFilled(false);
      }
    } else {
      setNameAutoFilled(false);
      setEmailAutoFilled(false);
    }
  }, [dapodikVerified, dapodikSchool]);

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
      toast.error('Masukkan NPSN (8 digit)');
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

      const school = data[0];
      setDapodikSchool(school);
      setDapodikVerified(true);

      if (school.source === 'dapodik-live') {
        toast.success(`Data sekolah "${school.name}" ditemukan dari Dapodik`);
      } else {
        toast.success(`Data sekolah "${school.name}" ditemukan`);
      }
    } catch {
      toast.error('Gagal mencari data sekolah. Coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadConnector = async () => {
    try {
      const res = await fetch('/api/dapodik/connector/download');
      if (!res.ok) {
        toast.error('Gagal mengunduh connector script');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pandai-dapodik-connector.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Script berhasil diunduh! Jalankan di laptop dengan DAPODIK Desktop.');
    } catch {
      toast.error('Gagal mengunduh script. Coba lagi.');
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const ext = file.name.toLowerCase().split('.').pop();
    const allowed = ['db', 'sqlite', 'sqlite3', 'db3', 'xlsx', 'xls', 'csv', 'json'];
    if (!ext || !allowed.includes(ext)) {
      toast.error('Format file tidak didukung. Gunakan: .db, .sqlite, .xlsx, .xls, .csv');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File terlalu besar (maksimal 50MB)');
      return;
    }

    setIsUploading(true);
    setUploadFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/dapodik/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Gagal membaca file Dapodik');
        setDapodikSchool(null);
        setDapodikVerified(false);
        return;
      }

      // Successfully parsed — apply same flow as NPSN lookup
      setDapodikSchool(data);
      setDapodikVerified(true);

      const srcLabel = data.source === 'dapodik-file' ? 'file Dapodik' : 'Dapodik';
      toast.success(`Data sekolah "${data.name}" berhasil dibaca dari ${srcLabel}`);
    } catch {
      toast.error('Gagal mengunggah file. Coba lagi.');
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isSchoolAdmin && dapodikSchool) {
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
              email: dapodikSchool.email || dapodikSchool.emailDomain || '',
              curriculum: dapodikSchool.curriculum,
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
      setName('');
      setEmail('');
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
                  }`}
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
                  }`}
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
                  }`}
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

                {/* Mode Toggle: NPSN Search vs File Upload */}
                <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setLookupMode('npsn')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                      lookupMode === 'npsn'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Cari NPSN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookupMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                      lookupMode === 'upload'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload File Dapodik
                  </button>
                </div>

                {/* NPSN Search Mode */}
                {lookupMode === 'npsn' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Masukkan NPSN (8 digit)"
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
                    <p className="text-[11px] text-slate-400">
                      Cari berdasarkan NPSN atau nama sekolah dari database lokal
                    </p>
                  </div>
                )}

                {/* File Upload Mode */}
                {lookupMode === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".db,.sqlite,.sqlite3,.db3,.xlsx,.xls,.csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isUploading}
                      className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                      ) : uploadFileName ? (
                        <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                      ) : (
                        <Upload className="h-8 w-8 text-emerald-500" />
                      )}
                      <div className="text-center">
                        {isUploading ? (
                          <p className="text-sm font-medium text-emerald-600">Membaca file...</p>
                        ) : uploadFileName ? (
                          <>
                            <p className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{uploadFileName}</p>
                            <p className="text-[11px] text-slate-400">Klik untuk ganti file</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-700">
                              Klik untuk upload file Dapodik
                            </p>
                            <p className="text-[11px] text-slate-400">
                              JSON (.json) / Database (.db, .sqlite) / Excel (.xlsx, .csv)
                            </p>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Info box about finding DAPODIK data */}
                    {!dapodikVerified && (
                      <div className="space-y-2">
                        <div className="flex gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <Database className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div className="text-[11px] text-emerald-800 space-y-1">
                            <p className="font-medium">Cara Terbaik: Gunakan PANDAI Connector</p>
                            <p className="text-emerald-700">
                              Download script Python yang menarik data langsung dari DAPODIK Lokal di laptop Anda.
                            </p>
                            <p className="text-emerald-700">
                              DAPODIK Lokal memiliki <strong>Webservice REST API</strong> di port 5774 — script ini membaca data dari sana.
                            </p>
                            <button
                              type="button"
                              onClick={handleDownloadConnector}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Download pandai-dapodik-connector.py
                            </button>
                          </div>
                        </div>
                        <details className="text-[11px]">
                          <summary className="text-slate-500 cursor-pointer hover:text-slate-700 font-medium">
                            Cara manual: Upload database DAPODIK langsung
                          </summary>
                          <div className="flex gap-2 p-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                            <div className="text-slate-600 space-y-0.5">
                              <p><strong>Lokasi database DAPODIK:</strong></p>
                              <p>• Windows: C:\Users\[User]\AppData\Local\Dapodikdasmen\</p>
                              <p>• File: <code className="bg-slate-100 px-0.5 rounded">dapo.db</code> / <code className="bg-slate-100 px-0.5 rounded">PD-Data.db</code></p>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

                {/* Dapodik School Card */}
                {dapodikVerified && dapodikSchool && (
                  <div className="border-l-4 border-emerald-500 bg-emerald-50/60 rounded-r-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700">
                          Data Terverifikasi {dapodikSchool.source === 'dapodik-file' ? 'dari File Dapodik' : 'Dapodik'}
                        </span>
                      </div>
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium">
                        {dapodikSchool.npsn || '-'}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        <School className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{dapodikSchool.name || '-'}</p>
                          <p className="text-slate-500 text-xs">{dapodikSchool.address || '-'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs truncate">{dapodikSchool.district}{dapodikSchool.district && dapodikSchool.city ? ', ' : ''}{dapodikSchool.city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs truncate">{dapodikSchool.province}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pl-6">
                        {dapodikSchool.schoolType && (
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs font-medium">
                            {dapodikSchool.schoolType}
                          </Badge>
                        )}
                        {dapodikSchool.accreditation && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Award className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Akreditasi <strong>{dapodikSchool.accreditation}</strong></span>
                          </div>
                        )}
                        {dapodikSchool.established && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Berdiri {dapodikSchool.established}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pl-6 text-xs text-slate-500">
                        {dapodikSchool.principalName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-emerald-500" />
                            <span>KS: {dapodikSchool.principalName}</span>
                          </div>
                        )}
                        {dapodikSchool.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{dapodikSchool.phone}</span>
                          </div>
                        )}
                        {dapodikSchool.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{dapodikSchool.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Source detail */}
                    {dapodikSchool.sourceDetail && (
                      <p className="text-[10px] text-emerald-600/70 flex items-center gap-1 pl-1">
                        <Database className="h-3 w-3" />
                        {dapodikSchool.sourceDetail}
                      </p>
                    )}

                    {/* Auto-fill indicator */}
                    {(nameAutoFilled || emailAutoFilled) && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">
                          Nama & email telah diisi otomatis dari data Dapodik
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Nama Lengkap
                </Label>
                {nameAutoFilled && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                    <Sparkles className="h-3 w-3" />
                    Auto-terisi (Kepala Sekolah)
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder={isSchoolAdmin ? 'Nama Kepala Sekolah / Admin' : 'Masukkan nama lengkap'}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameAutoFilled(false);
                  }}
                  className={`pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 ${
                    nameAutoFilled ? 'bg-emerald-50/50 border-emerald-300' : ''
                  }`}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                {emailAutoFilled && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                    <Sparkles className="h-3 w-3" />
                    Auto-terisi (Email Sekolah)
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder={isSchoolAdmin && dapodikSchool ? `nama@${dapodikSchool.emailDomain}` : 'nama@sekolah.sch.id'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailAutoFilled(false);
                  }}
                  className={`pl-10 h-11 border-slate-300 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 ${
                    emailAutoFilled ? 'bg-emerald-50/50 border-emerald-300' : ''
                  }`}
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
