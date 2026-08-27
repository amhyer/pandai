'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Server,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  School,
  Search,
  RefreshCw,
  Eye,
  KeyRound,
  Globe,
  ShieldCheck,
  Zap,
  BookOpen,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';
const EMERALD = '#059669';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface DapodikSchool {
  npsn: string;
  nama: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  bentuk_pendidikan: string;
  akreditasi: string;
}

interface ConnectionState {
  connected: boolean;
  message: string;
  totalSchools: number;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function DapodikLocalTab() {
  // Connection form
  const [serverUrl, setServerUrl] = useState('localhost:8881');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // States
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [schools, setSchools] = useState<DapodikSchool[]>([]);
  const [filterBentuk, setFilterBentuk] = useState<'all' | 'SD' | 'SMP'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<DapodikSchool | null>(null);
  const [setupGuideOpen, setSetupGuideOpen] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTION TEST
  // ═══════════════════════════════════════════════════════════════════════

  async function testConnection() {
    setIsTesting(true);
    setConnection(null);
    setSchools([]);
    setSelectedSchool(null);

    try {
      const res = await fetch('/api/dapodik/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          token: token || undefined,
          action: 'test',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setConnection({
          connected: true,
          message: data.message,
          totalSchools: data.totalSchools,
        });
        toast.success('Koneksi berhasil!', {
          description: data.message,
        });
      } else {
        setConnection({
          connected: false,
          message: data.error,
          totalSchools: 0,
        });
        toast.error('Koneksi gagal', {
          description: data.error,
        });
      }
    } catch {
      toast.error('Gagal terhubung', { description: 'Periksa jaringan dan coba lagi.' });
      setConnection({
        connected: false,
        message: 'Gagal terhubung ke server.',
        totalSchools: 0,
      });
    } finally {
      setIsTesting(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH SCHOOLS
  // ═══════════════════════════════════════════════════════════════════════

  async function fetchSchools() {
    setIsFetching(true);
    setSelectedSchool(null);

    try {
      const body: Record<string, unknown> = {
        serverUrl,
        token: token || undefined,
        action: 'schools',
      };
      if (filterBentuk !== 'all') body.bentuk = filterBentuk;

      const res = await fetch('/api/dapodik/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setSchools(data.schools || []);
        toast.success(`${data.total} data sekolah ditemukan`, {
          description: filterBentuk !== 'all' ? `Filter: ${filterBentuk}` : 'Semua jenjang',
        });
      } else {
        toast.error('Gagal mengambil data', { description: data.error });
      }
    } catch {
      toast.error('Gagal mengambil data', { description: 'Periksa koneksi dan coba lagi.' });
    } finally {
      setIsFetching(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERED SCHOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const filteredSchools = schools.filter((s) => {
    const matchBentuk =
      filterBentuk === 'all' ||
      s.bentuk_pendidikan.toUpperCase().includes(filterBentuk);
    const matchSearch =
      !searchQuery ||
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.npsn.includes(searchQuery);
    return matchBentuk && matchSearch;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Connection Setup Card ── */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Server className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg" style={{ color: BRAND }}>
                Koneksi API Dapodik Lokal
              </CardTitle>
              <CardDescription className="text-sm">
                Hubungkan ke API Dapodik yang berjalan di laptop operator sekolah
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Server URL */}
            <div className="space-y-2">
              <Label htmlFor="serverUrl" className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                URL Server
              </Label>
              <Input
                id="serverUrl"
                placeholder="localhost:8881"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Contoh: <code className="bg-muted px-1 rounded">192.168.1.100:8881</code> atau <code className="bg-muted px-1 rounded">localhost:8881</code>
              </p>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Token Bearer
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="Gunakan token default jika kosong"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token dari <code className="bg-muted px-1 rounded">config.yaml → auth.valid_token</code>
              </p>
            </div>
          </div>

          {/* Connect Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={testConnection}
              disabled={isTesting || !serverUrl.trim()}
              className="rounded-lg font-semibold text-white shadow-sm"
              style={{ backgroundColor: EMERALD }}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghubungkan...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Hubungkan
                </>
              )}
            </Button>

            {/* Connection Status */}
            {connection && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                connection.connected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}>
                {connection.connected ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>{connection.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Setup Guide ── */}
      <Collapsible open={setupGuideOpen} onOpenChange={setSetupGuideOpen}>
        <Card className="rounded-xl border shadow-sm">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors rounded-t-xl cursor-pointer">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Panduan Setup API Dapodik Lokal</span>
              </div>
              {setupGuideOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-2 pb-4">
              <div className="space-y-3">
                {[
                  {
                    num: 1,
                    title: 'Unduh & Build dapodik-api',
                    desc: 'Clone repo github.com/devmaarifnu/dapodik-api, lalu jalankan: go build -o dapodik-api ./cmd/api/',
                  },
                  {
                    num: 2,
                    title: 'Buat config.yaml',
                    desc: 'Sesuaikan database MySQL (dari Dapodik desktop) dan atur port (default: 8881) serta token.',
                  },
                  {
                    num: 3,
                    title: 'Jalankan API',
                    desc: 'Eksekusi: ./dapodik-api --config config.yaml --timeout 5. Server akan berjalan di port 8881.',
                  },
                  {
                    num: 4,
                    title: 'Hubungkan ke PANDAI',
                    desc: 'Masukkan URL server (IP laptop + port) dan token, lalu klik "Hubungkan".',
                  },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-amber-500">
                      {step.num}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-800">
                      <p className="font-semibold">Keamanan:</p>
                      <p className="mt-0.5">Data Dapodik hanya diakses dari jaringan lokal. API hanya bisa diakses dengan token Bearer yang benar.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Fetch & Browse Schools ── */}
      {connection?.connected && (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289]">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg" style={{ color: BRAND }}>
                    Data Sekolah
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Jumlah data di server: {connection.totalSchools} sekolah
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={fetchSchools}
                disabled={isFetching}
                variant="outline"
                className="rounded-lg"
                style={{ borderColor: BRAND, color: BRAND }}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Ambil Data
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama sekolah atau NPSN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg pl-9"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'SD', 'SMP'] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={filterBentuk === type ? 'default' : 'outline'}
                    onClick={() => setFilterBentuk(type)}
                    className={cn(
                      'rounded-lg text-xs font-medium',
                      filterBentuk === type && 'text-white shadow-sm'
                    )}
                    style={filterBentuk === type ? { backgroundColor: BRAND } : { borderColor: BRAND, color: BRAND }}
                  >
                    {type === 'all' ? 'Semua' : type}
                    {type !== 'all' && schools.length > 0 && (
                      <span className="ml-1 opacity-70">
                        ({schools.filter((s) => s.bentuk_pendidikan.toUpperCase().includes(type)).length})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Schools Table */}
            {filteredSchools.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10 text-center text-xs">#</TableHead>
                        <TableHead className="text-xs">NPSN</TableHead>
                        <TableHead className="text-xs">Nama Sekolah</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Alamat</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Kecamatan</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Kab/Kota</TableHead>
                        <TableHead className="text-xs">Jenjang</TableHead>
                        <TableHead className="text-xs">Akre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchools.map((school, idx) => (
                        <TableRow
                          key={school.npsn}
                          className={cn(
                            'cursor-pointer hover:bg-muted/40 transition-colors',
                            selectedSchool?.npsn === school.npsn && 'bg-emerald-50/50'
                          )}
                          onClick={() => setSelectedSchool(
                            selectedSchool?.npsn === school.npsn ? null : school
                          )}
                        >
                          <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-mono font-medium">{school.npsn}</TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate">{school.nama}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate hidden md:table-cell">{school.alamat}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{school.kecamatan}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{school.kabupaten}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-[10px] font-semibold rounded-full px-2 py-0.5',
                                school.bentuk_pendidikan.toUpperCase().includes('SD')
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              )}
                            >
                              {school.bentuk_pendidikan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {school.akreditasi ? (
                              <Badge className={cn(
                                'text-[10px] font-bold rounded-full px-2 py-0.5',
                                school.akreditasi === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                school.akreditasi === 'B' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              )}>
                                {school.akreditasi}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20 border-t flex items-center justify-between">
                  <span>
                    Menampilkan {filteredSchools.length} dari {schools.length} sekolah
                    {filterBentuk !== 'all' && ` (${filterBentuk})`}
                  </span>
                  {searchQuery && (
                    <span>Filter: &quot;{searchQuery}&quot;</span>
                  )}
                </div>
              </div>
            ) : schools.length > 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada sekolah yang cocok dengan filter &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : isFetching ? null : (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Klik &quot;Ambil Data&quot; untuk menampilkan daftar sekolah dari Dapodik lokal
                </p>
              </div>
            )}

            {/* Selected School Detail */}
            {selectedSchool && (
              <Card className="rounded-xl border-2 border-emerald-300 bg-emerald-50/30 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-sm font-semibold text-emerald-800">
                        Detail Sekolah Terpilih
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedSchool(null)}
                      className="text-xs h-7 rounded-md"
                    >
                      Tutup
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Nama', value: selectedSchool.nama },
                      { label: 'NPSN', value: selectedSchool.npsn },
                      { label: 'Alamat', value: selectedSchool.alamat || '-' },
                      { label: 'Kecamatan', value: selectedSchool.kecamatan || '-' },
                      { label: 'Kabupaten/Kota', value: selectedSchool.kabupaten || '-' },
                      { label: 'Provinsi', value: selectedSchool.provinsi || '-' },
                      { label: 'Jenjang', value: selectedSchool.bentuk_pendidikan },
                      { label: 'Akreditasi', value: selectedSchool.akreditasi || '-' },
                    ].map((field) => (
                      <div key={field.label} className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground min-w-[100px]">{field.label}</span>
                        <span className="text-xs font-medium">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── No Connection Banner ── */}
      {!connection?.connected && connection !== null && (
        <Card className="rounded-xl border border-dashed border-muted-foreground/30">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <WifiOff className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Belum terhubung ke API Dapodik lokal</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Hubungkan terlebih dahulu untuk melihat data sekolah
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
