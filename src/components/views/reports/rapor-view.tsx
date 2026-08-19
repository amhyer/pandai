'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Download, Printer, Users, BarChart3, Loader2, Eye, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface RaporData {
  school: {
    name: string;
    npsn: string;
    address: string;
    province: string;
    city: string;
    accreditation: string;
  };
  student: {
    name: string;
    nisn: string;
    kelas: string;
    jk: string;
    ortuName: string;
  };
  kepsek: {
    name: string;
    nip: string;
  };
  term: string;
  components: {
    name: string;
    weight: number;
    score: number | null;
    weighted: number | null;
  }[];
  finalGrade: number | null;
  totalWeightFilled: number;
  totalWeightAll: number;
  predikat: string;
  attendance: {
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
  };
  habits: Record<string, number>;
  profilLulusan: Record<string, number>;
}

interface RekapData {
  kelas: { id: string; name: string; school: { id: string; name: string } };
  term: string;
  students: {
    studentId: string;
    name: string;
    nisn: string;
    finalGrade: number | null;
    predikat: string;
  }[];
  rataRata: number | null;
  nilaiTertinggi: number | null;
  nilaiTerendah: number | null;
  jumlahSiswa: number;
}

interface LeggerData {
  kelas: { id: string; name: string; school: { id: string; name: string } };
  term: string;
  components: { id: string; name: string; weight: number }[];
  rows: {
    studentId: string;
    name: string;
    nisn: string;
    scores: Record<string, number | null>;
    finalGrade: number | null;
    predikat: string;
  }[];
  rataRataPerKomponen: Record<string, number>;
  rataRataFinal: number | null;
}

interface ClassItem {
  id: string;
  name: string;
}

interface StudentItem {
  id: string;
  name: string;
  nisn?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_TERM = '2024/2025-Ganjil';

const HABIT_LABELS: Record<string, string> = {
  sholat: 'Sholat Berjamaah',
  sholat_dhuha: 'Sholat Dhuha',
  tilawah: 'Tilawah Al-Quran',
  dzikir: 'Dzikir',
  infaq: 'Infaq / Sedekah',
  kebersihan: 'Kebersihan',
  ketepatan: 'Ketepatan Waktu',
};

const RATING_LABELS: Record<number, string> = {
  1: 'Kurang',
  2: 'Cukup',
  3: 'Baik',
  4: 'Sangat Baik',
};

const DIMENSION_LABELS: Record<string, string> = {
  beriman: 'Beriman & Bertakwa',
  berakhlak: 'Berakhlak Mulia',
  mandiri: 'Mandiri',
  bernalar: 'Bernalar Kritis',
  gotong_royong: 'Gotong Royong',
  kreatif: 'Kreatif & Inovatif',
  sehat: 'Sehat Jasmani & Rohani',
  literasi: 'Melek Literasi & Digital',
};

function getPredikatColor(predikat: string) {
  switch (predikat?.toLowerCase()) {
    case 'a':
    case 'sangat baik':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'b':
    case 'baik':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'c':
    case 'cukup':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'd':
    case 'kurang':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// ═══════════════════════════════════════════════════════════════════
// PDF HELPERS
// ═══════════════════════════════════════════════════════════════════

async function fetchPdfBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Gagal mengunduh PDF');
      throw new Error(errText);
    }
    return await res.blob();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    toast.error(message);
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openBlobInTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADERS
// ═══════════════════════════════════════════════════════════════════

function RaporSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-48" />
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════
// RAPOR DISPLAY (JSON)
// ═══════════════════════════════════════════════════════════════════

function RaporDisplay({
  data,
  studentLabel,
}: {
  data: RaporData;
  studentLabel?: string;
}) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);

  const studentId = studentLabel || data.student.nisn;
  const termSlug = data.term.replace(/\//g, '-').replace(/\s+/g, '-');

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const blob = await fetchPdfBlob(
      `/api/reports/rapor-siswa?studentId=${encodeURIComponent(data.student.nisn)}&term=${encodeURIComponent(data.term)}&format=pdf`
    );
    setDownloadingPdf(false);
    if (blob) {
      downloadBlob(blob, `Rapor-${data.student.name}-${termSlug}.pdf`);
      toast.success('PDF berhasil diunduh');
    }
  };

  const handleOpenPdf = async () => {
    setOpeningPdf(true);
    const blob = await fetchPdfBlob(
      `/api/reports/rapor-siswa?studentId=${encodeURIComponent(data.student.nisn)}&term=${encodeURIComponent(data.term)}&format=pdf`
    );
    setOpeningPdf(false);
    if (blob) {
      openBlobInTab(blob);
      toast.success('PDF dibuka di tab baru');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Rapor Siswa</h2>
          <p className="text-sm text-muted-foreground">{data.term}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Unduh PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPdf}
            disabled={openingPdf}
          >
            {openingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Buka PDF
          </Button>
        </div>
      </div>

      {/* School header */}
      <Card>
        <CardContent className="p-6 text-center border-b">
          <h3 className="text-lg font-bold">{data.school.name}</h3>
          <p className="text-sm text-muted-foreground">
            NPSN: {data.school.npsn}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.school.address}, {data.school.city}, {data.school.province}
          </p>
          {data.school.accreditation && (
            <Badge variant="secondary" className="mt-2">
              Akreditasi {data.school.accreditation}
            </Badge>
          )}
          <p className="text-sm font-semibold mt-3 uppercase tracking-wide">
            Laporan Hasil Belajar Siswa (Rapor)
          </p>
          <p className="text-sm text-muted-foreground">Semester {data.term}</p>
        </CardContent>
      </Card>

      {/* Student info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Nama Siswa</span>
              <p className="font-semibold">{data.student.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">NIS/NISN</span>
              <p className="font-semibold">{data.student.nisn}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Kelas</span>
              <p className="font-semibold">{data.student.kelas}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Jenis Kelamin</span>
              <p className="font-semibold">{data.student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Nama Orang Tua / Wali</span>
              <p className="font-semibold">{data.student.ortuName || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade components table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Nilai Per Komponen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Komponen</TableHead>
                  <TableHead className="text-center">Bobot (%)</TableHead>
                  <TableHead className="text-center">Nilai</TableHead>
                  <TableHead className="text-center">Terbobot</TableHead>
                  <TableHead className="text-center">Predikat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.components.map((comp, idx) => {
                  let predikat = '-';
                  if (comp.score !== null) {
                    if (comp.score >= 90) predikat = 'A';
                    else if (comp.score >= 80) predikat = 'B';
                    else if (comp.score >= 70) predikat = 'C';
                    else predikat = 'D';
                  }
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell className="text-center">{comp.weight}</TableCell>
                      <TableCell className="text-center">
                        {comp.score !== null ? comp.score.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.weighted !== null ? comp.weighted.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs font-semibold',
                            getPredikatColor(predikat)
                          )}
                        >
                          {predikat}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Final grade row */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">Nilai Akhir:</span>
                {data.finalGrade !== null ? (
                  <>
                    <span className="text-2xl font-bold text-primary">
                      {data.finalGrade.toFixed(1)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn('font-semibold', getPredikatColor(data.predikat))}
                    >
                      {data.predikat || '-'}
                    </Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">Belum ada nilai</span>
                )}
              </div>
              {data.totalWeightFilled < data.totalWeightAll && (
                <p className="text-xs text-muted-foreground italic">
                  * Dinormalisasi: bobot terisi {data.totalWeightFilled}% dari {data.totalWeightAll}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Rekap Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {data.attendance.hadir}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Hadir</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {data.attendance.izin}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Izin</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {data.attendance.sakit}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Sakit</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {data.attendance.alpa}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Alpa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7 Kebiasaan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            7 Kebiasaan
          </CardTitle>
          <CardDescription>Laporan kebiasaan harian siswa</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {Object.keys(data.habits).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(data.habits).map(([key, rating]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <span className="text-sm font-medium">
                    {HABIT_LABELS[key] || key}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-semibold',
                      rating >= 3
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    )}
                  >
                    {RATING_LABELS[rating] || `${rating}`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Belum ada data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profil Lulusan 8 Dimensi */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Profil Lulusan 8 Dimensi
          </CardTitle>
          <CardDescription>
            Rata-rata penilaian per dimensi profil lulusan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {Object.keys(data.profilLulusan).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(data.profilLulusan).map(([key, avgRating]) => (
                <div
                  key={key}
                  className="text-center p-4 rounded-lg border bg-card"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {DIMENSION_LABELS[key] || key}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {avgRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {RATING_LABELS[Math.round(avgRating)] || '-'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Belum ada data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Catatan Guru */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Catatan Guru / Wali Kelas</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="min-h-[80px] border rounded-lg p-3">
            <p className="text-sm text-muted-foreground italic">Belum ada catatan</p>
          </div>
        </CardContent>
      </Card>

      {/* Signature area */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <p className="text-sm font-medium">Wali Kelas</p>
              <div className="border-b border-muted-foreground/40 h-16" />
              <p className="text-xs text-muted-foreground">( ........................ )</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Orang Tua / Wali</p>
              <div className="border-b border-muted-foreground/40 h-16" />
              <p className="text-xs text-muted-foreground">( ........................ )</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Kepala Sekolah</p>
              <div className="border-b border-muted-foreground/40 h-16" />
              {data.kepsek?.name && (
                <p className="text-xs text-muted-foreground">
                  ( {data.kepsek.name} )
                  {data.kepsek.nip && (
                    <span className="block">NIP. {data.kepsek.nip}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REKAP KELAS DISPLAY
// ═══════════════════════════════════════════════════════════════════

function RekapKelasDisplay({ data }: { data: RekapData }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-primary">{data.jumlahSiswa}</p>
            <p className="text-xs text-muted-foreground">Jumlah Siswa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-primary">
              {data.rataRata !== null ? data.rataRata.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Rata-Rata</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold text-emerald-600">
              {data.nilaiTertinggi !== null ? data.nilaiTertinggi.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Nilai Tertinggi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">
              {data.nilaiTerendah !== null ? data.nilaiTerendah.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Nilai Terendah</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rekap Nilai — {data.kelas.name}
          </CardTitle>
          <CardDescription>Semester {data.term}</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NISN</TableHead>
                  <TableHead className="text-center">Nilai Akhir</TableHead>
                  <TableHead className="text-center">Predikat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Tidak ada data siswa
                    </TableCell>
                  </TableRow>
                ) : (
                  data.students.map((s, idx) => (
                    <TableRow key={s.studentId}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.nisn || '-'}</TableCell>
                      <TableCell className="text-center">
                        {s.finalGrade !== null ? s.finalGrade.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={cn('text-xs font-semibold', getPredikatColor(s.predikat))}
                        >
                          {s.predikat || '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {data.students.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      Rata-Rata Kelas
                    </TableCell>
                    <TableCell className="text-center text-primary">
                      {data.rataRata !== null ? data.rataRata.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEGGER DISPLAY
// ═══════════════════════════════════════════════════════════════════

function LeggerDisplay({ data }: { data: LeggerData }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const blob = await fetchPdfBlob(
      `/api/reports/legger?classId=${encodeURIComponent(data.kelas.id)}&term=${encodeURIComponent(data.term)}&format=pdf`
    );
    setDownloadingPdf(false);
    if (blob) {
      downloadBlob(blob, `Legger-${data.kelas.name}-${data.term.replace(/\//g, '-').replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF Legger berhasil diunduh');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Legger Nilai</h2>
          <p className="text-sm text-muted-foreground">
            {data.kelas.name} — Semester {data.term}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Unduh PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center sticky left-0 bg-background z-10">No</TableHead>
                  <TableHead className="min-w-[140px] sticky left-10 bg-background z-10">Nama</TableHead>
                  <TableHead className="min-w-[100px]">NISN</TableHead>
                  {data.components.map((comp) => (
                    <TableHead key={comp.id} className="text-center min-w-[80px]">
                      <span className="block text-xs font-semibold">{comp.name}</span>
                      <span className="block text-[10px] text-muted-foreground">({comp.weight}%)</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Nilai Akhir</TableHead>
                  <TableHead className="text-center">Predikat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + data.components.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data siswa
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row, idx) => (
                    <TableRow key={row.studentId}>
                      <TableCell className="text-center sticky left-0 bg-background z-10">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium sticky left-10 bg-background z-10">
                        {row.name}
                      </TableCell>
                      <TableCell>{row.nisn || '-'}</TableCell>
                      {data.components.map((comp) => (
                        <TableCell key={comp.id} className="text-center">
                          {row.scores[comp.id] !== null && row.scores[comp.id] !== undefined
                            ? row.scores[comp.id]!.toFixed(1)
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold">
                        {row.finalGrade !== null ? row.finalGrade.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={cn('text-xs font-semibold', getPredikatColor(row.predikat))}
                        >
                          {row.predikat || '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Average row */}
                {data.rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell
                      colSpan={2}
                      className="text-right sticky left-0 bg-muted/50 z-10"
                    >
                      Rata-Rata
                    </TableCell>
                    <TableCell />
                    {data.components.map((comp) => (
                      <TableCell key={comp.id} className="text-center text-primary">
                        {data.rataRataPerKomponen[comp.id] !== undefined
                          ? data.rataRataPerKomponen[comp.id].toFixed(1)
                          : '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-primary">
                      {data.rataRataFinal !== null ? data.rataRataFinal.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RAPOR TAB (GURU / KEPALA_SEKOLAH / ADMIN_SCHOOL)
// ═══════════════════════════════════════════════════════════════════

function RaporSiswaTab({
  classes,
  schoolId,
}: {
  classes: ClassItem[];
  schoolId?: string;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [raporData, setRaporData] = useState<RaporData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchStudents = useCallback(async (classId: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(
        `/api/users?role=SISWA&classId=${encodeURIComponent(classId)}`
      );
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data || json || []);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
    }
    setLoadingStudents(false);
  }, []);

  const fetchRapor = useCallback(async (studentId: string, termValue: string) => {
    if (!studentId) return;
    setLoading(true);
    setRaporData(null);
    try {
      const res = await fetch(
        `/api/reports/rapor-siswa?studentId=${encodeURIComponent(studentId)}&term=${encodeURIComponent(termValue)}`
      );
      if (res.ok) {
        const json = await res.json();
        setRaporData(json);
      } else {
        toast.error('Gagal memuat data rapor');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data rapor');
    }
    setLoading(false);
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudentId('');
    setRaporData(null);
    setStudents([]);
    if (classId) {
      fetchStudents(classId);
    }
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId) {
      fetchRapor(studentId, term);
    } else {
      setRaporData(null);
    }
  };

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
    if (selectedStudentId) {
      fetchRapor(selectedStudentId, newTerm);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Pilih Kelas</label>
          <Select value={selectedClassId} onValueChange={handleClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Pilih Siswa</label>
          <Select
            value={selectedStudentId}
            onValueChange={handleStudentChange}
            disabled={!selectedClassId || loadingStudents}
          >
            <SelectTrigger>
              {loadingStudents ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat...
                </span>
              ) : (
                <SelectValue placeholder={selectedClassId ? 'Pilih siswa...' : 'Pilih kelas terlebih dahulu'} />
              )}
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}{s.nisn ? ` (${s.nisn})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="text-sm font-medium mb-1.5 block">Semester</label>
          <Select value={term} onValueChange={handleTermChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025-Ganjil">2024/2025 — Ganjil</SelectItem>
              <SelectItem value="2024/2025-Genap">2024/2025 — Genap</SelectItem>
              <SelectItem value="2023/2024-Ganjil">2023/2024 — Ganjil</SelectItem>
              <SelectItem value="2023/2024-Genap">2023/2024 — Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? <RaporSkeleton /> : raporData ? <RaporDisplay data={raporData} /> : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {selectedClassId
                ? 'Pilih siswa untuk melihat rapor'
                : 'Pilih kelas terlebih dahulu'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REKAP KELAS TAB
// ═══════════════════════════════════════════════════════════════════

function RekapKelasTab({ classes }: { classes: ClassItem[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [rekapData, setRekapData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRekap = useCallback(async (classId: string, termValue: string) => {
    if (!classId) return;
    setLoading(true);
    setRekapData(null);
    try {
      const res = await fetch(
        `/api/reports/rekap-kelas?classId=${encodeURIComponent(classId)}&term=${encodeURIComponent(termValue)}`
      );
      if (res.ok) {
        const json = await res.json();
        setRekapData(json);
      } else {
        toast.error('Gagal memuat rekap kelas');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat rekap kelas');
    }
    setLoading(false);
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (classId) {
      fetchRekap(classId, term);
    } else {
      setRekapData(null);
    }
  };

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
    if (selectedClassId) {
      fetchRekap(selectedClassId, newTerm);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Pilih Kelas</label>
          <Select value={selectedClassId} onValueChange={handleClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="text-sm font-medium mb-1.5 block">Semester</label>
          <Select value={term} onValueChange={handleTermChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025-Ganjil">2024/2025 — Ganjil</SelectItem>
              <SelectItem value="2024/2025-Genap">2024/2025 — Genap</SelectItem>
              <SelectItem value="2023/2024-Ganjil">2023/2024 — Ganjil</SelectItem>
              <SelectItem value="2023/2024-Genap">2023/2024 — Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <TableSkeleton /> : rekapData ? <RekapKelasDisplay data={rekapData} /> : (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Pilih kelas untuk melihat rekap nilai</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEGGER TAB
// ═══════════════════════════════════════════════════════════════════

function LeggerTab({ classes }: { classes: ClassItem[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [leggerData, setLeggerData] = useState<LeggerData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLegger = useCallback(async (classId: string, termValue: string) => {
    if (!classId) return;
    setLoading(true);
    setLeggerData(null);
    try {
      const res = await fetch(
        `/api/reports/legger?classId=${encodeURIComponent(classId)}&term=${encodeURIComponent(termValue)}`
      );
      if (res.ok) {
        const json = await res.json();
        setLeggerData(json);
      } else {
        toast.error('Gagal memuat data legger');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data legger');
    }
    setLoading(false);
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (classId) {
      fetchLegger(classId, term);
    } else {
      setLeggerData(null);
    }
  };

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
    if (selectedClassId) {
      fetchLegger(selectedClassId, newTerm);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Pilih Kelas</label>
          <Select value={selectedClassId} onValueChange={handleClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="text-sm font-medium mb-1.5 block">Semester</label>
          <Select value={term} onValueChange={handleTermChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025-Ganjil">2024/2025 — Ganjil</SelectItem>
              <SelectItem value="2024/2025-Genap">2024/2025 — Genap</SelectItem>
              <SelectItem value="2023/2024-Ganjil">2023/2024 — Ganjil</SelectItem>
              <SelectItem value="2023/2024-Genap">2023/2024 — Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <TableSkeleton /> : leggerData ? <LeggerDisplay data={leggerData} /> : (
        <Card>
          <CardContent className="p-8 text-center">
            <Printer className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Pilih kelas untuk melihat legger nilai</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ORANG_TUA VIEW
// ═══════════════════════════════════════════════════════════════════

function OrangTuaView() {
  const user = useAppStore((s) => s.user);
  const [children, setChildren] = useState<StudentItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [raporData, setRaporData] = useState<RaporData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Fetch children linked to this parent
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (initialLoaded || !user?.id) return;
    let cancelled = false;
    async function loadChildren() {
      try {
        const parentId = user?.id;
        const res = await fetch(`/api/users?role=SISWA&parentId=${encodeURIComponent(parentId || '')}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          const list = json.data || json || [];
          setChildren(list);
          if (list.length === 1) {
            const childId = list[0].id;
            setSelectedChildId(childId);
            // Fetch rapor for the auto-selected child
            try {
              const raporRes = await fetch(
                `/api/reports/rapor-siswa?studentId=${encodeURIComponent(childId)}&term=${encodeURIComponent(DEFAULT_TERM)}`
              );
              if (raporRes.ok && !cancelled) {
                const raporJson = await raporRes.json();
                setRaporData(raporJson);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        if (!cancelled) setChildren([]);
      }
      if (!cancelled) {
        setLoadingChildren(false);
        setInitialLoaded(true);
      }
    }
    loadChildren();
    return () => { cancelled = true; };
  }, [user?.id, initialLoaded]);

  const fetchRapor = useCallback(async (studentId: string, termValue: string) => {
    if (!studentId) return;
    setLoading(true);
    setRaporData(null);
    try {
      const res = await fetch(
        `/api/reports/rapor-siswa?studentId=${encodeURIComponent(studentId)}&term=${encodeURIComponent(termValue)}`
      );
      if (res.ok) {
        const json = await res.json();
        setRaporData(json);
      } else {
        toast.error('Gagal memuat data rapor');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data rapor');
    }
    setLoading(false);
  }, []);

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
    if (childId) {
      fetchRapor(childId, term);
    } else {
      setRaporData(null);
    }
  };

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
    if (selectedChildId) {
      fetchRapor(selectedChildId, newTerm);
    }
  };

  if (loadingChildren) {
    return <RaporSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Rapor Anak</h2>
        <p className="text-sm text-muted-foreground">
          Lihat laporan hasil belajar anak Anda
        </p>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1.5 block">Pilih Anak</label>
          <Select value={selectedChildId} onValueChange={handleChildChange}>
            <SelectTrigger>
              <SelectValue placeholder={children.length === 0 ? 'Tidak ada data anak' : 'Pilih anak...'} />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.nisn ? ` (${c.nisn})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="text-sm font-medium mb-1.5 block">Semester</label>
          <Select value={term} onValueChange={handleTermChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025-Ganjil">2024/2025 — Ganjil</SelectItem>
              <SelectItem value="2024/2025-Genap">2024/2025 — Genap</SelectItem>
              <SelectItem value="2023/2024-Ganjil">2023/2024 — Ganjil</SelectItem>
              <SelectItem value="2023/2024-Genap">2023/2024 — Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? <RaporSkeleton /> : raporData ? <RaporDisplay data={raporData} /> : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {children.length === 0
                ? 'Tidak ada data anak yang terdaftar'
                : 'Pilih anak untuk melihat rapor'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SISWA VIEW
// ═══════════════════════════════════════════════════════════════════

function SiswaView() {
  const user = useAppStore((s) => s.user);
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [raporData, setRaporData] = useState<RaporData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Initial load on mount
  useEffect(() => {
    if (initialLoaded || !user?.id) return;
    let cancelled = false;
    async function loadRapor() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/rapor-siswa?studentId=${encodeURIComponent(user?.id ?? '')}&term=${encodeURIComponent(DEFAULT_TERM)}`
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          setRaporData(json);
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        setLoading(false);
        setInitialLoaded(true);
      }
    }
    loadRapor();
    return () => { cancelled = true; };
  }, [user?.id, initialLoaded]);

  const fetchRapor = useCallback(async (studentId: string, termValue: string) => {
    if (!studentId) return;
    setLoading(true);
    setRaporData(null);
    try {
      const res = await fetch(
        `/api/reports/rapor-siswa?studentId=${encodeURIComponent(studentId)}&term=${encodeURIComponent(termValue)}`
      );
      if (res.ok) {
        const json = await res.json();
        setRaporData(json);
      } else {
        toast.error('Gagal memuat data rapor');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data rapor');
    }
    setLoading(false);
  }, []);

  const handleTermChange = (newTerm: string) => {
    setTerm(newTerm);
    if (user?.id) {
      fetchRapor(user.id, newTerm);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Rapor Saya</h2>
          <p className="text-sm text-muted-foreground">
            Laporan hasil belajar Anda
          </p>
        </div>
        <div className="sm:w-48">
          <Select value={term} onValueChange={handleTermChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025-Ganjil">2024/2025 — Ganjil</SelectItem>
              <SelectItem value="2024/2025-Genap">2024/2025 — Genap</SelectItem>
              <SelectItem value="2023/2024-Ganjil">2023/2024 — Ganjil</SelectItem>
              <SelectItem value="2023/2024-Genap">2023/2024 — Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <RaporSkeleton /> : raporData ? <RaporDisplay data={raporData} /> : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada data rapor untuk semester ini</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function RaporView() {
  const user = useAppStore((s) => s.user);
  const role = user?.role;

  // Shared state for GURU, KEPALA_SEKOLAH, ADMIN_SCHOOL
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const isStaff =
    role === 'GURU' || role === 'KEPALA_SEKOLAH' || role === 'ADMIN_SCHOOL';

  // Fetch classes for staff roles
  const [classesLoaded, setClassesLoaded] = useState(false);

  useEffect(() => {
    if (!isStaff || classesLoaded) return;
    let cancelled = false;
    async function loadClasses() {
      try {
        const params = new URLSearchParams();
        if (user?.schoolId) params.set('schoolId', user.schoolId);
        const res = await fetch(`/api/classes?${params.toString()}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setClasses(json.data || json || []);
        }
      } catch {
        if (!cancelled) setClasses([]);
      }
      if (!cancelled) {
        setLoadingClasses(false);
        setClassesLoaded(true);
      }
    }
    loadClasses();
    return () => { cancelled = true; };
  }, [isStaff, user?.schoolId, classesLoaded]);

  // ── SISWA ──
  if (role === 'SISWA') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SiswaView />
      </motion.div>
    );
  }

  // ── ORANG_TUA ──
  if (role === 'ORANG_TUA') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <OrangTuaView />
      </motion.div>
    );
  }

  // ── GURU / KEPALA_SEKOLAH / ADMIN_SCHOOL ──
  if (isStaff) {
    if (loadingClasses) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TableSkeleton />
        </motion.div>
      );
    }

    const defaultTab = 'rapor-siswa';

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Laporan & Rapor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === 'GURU'
              ? 'Kelola rapor, rekap kelas, dan legger nilai'
              : 'Akses rapor dan rekap seluruh kelas'}
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="rapor-siswa" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Rapor Siswa</span>
              <span className="sm:hidden">Rapor</span>
            </TabsTrigger>
            <TabsTrigger value="rekap-kelas" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Rekap Kelas</span>
              <span className="sm:hidden">Rekap</span>
            </TabsTrigger>
            <TabsTrigger value="legger" className="gap-2">
              <Printer className="h-4 w-4" />
              Legger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rapor-siswa" className="mt-6">
            <RaporSiswaTab classes={classes} schoolId={user?.schoolId} />
          </TabsContent>

          <TabsContent value="rekap-kelas" className="mt-6">
            <RekapKelasTab classes={classes} />
          </TabsContent>

          <TabsContent value="legger" className="mt-6">
            <LeggerTab classes={classes} />
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  // Fallback: unknown role
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </CardContent>
    </Card>
  );
}
