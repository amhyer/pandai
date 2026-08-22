'use client';

/**
 * Peta Kelas — Kepala Sekolah (skeleton P1-2)
 * Fetches GET /api/kepsek/class-map; falls back to embedded mock (2 rombel).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  GraduationCap,
  Users,
  UserCheck,
  Target,
  Loader2,
  Download,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClassMapRow = {
  key: string;
  classId: string | null;
  className: string;
  grade?: number;
  academicYear: string;
  teacherId: string | null;
  teacherName: string;
  teacherActive: boolean;
  teacherMissing: boolean;
  subjectLabel: string;
  studentCount: number;
  parentAccountCount: number;
  parentAccountPct: number;
  studentAccountCount: number;
  studentAccountPct: number;
  avgScore: number | null;
  masteryPct: number | null;
  attendancePct: number | null;
  kaihFamilyCount: number | null;
  kaihFamilyPct?: number | null;
  updatedAt: string | null;
  hasData: boolean;
};

type ClassMapResponse = {
  summary: {
    rombel: number;
    students: number;
    parentCoveragePct: number;
    studentCoveragePct: number;
    avgMasteryPct: number | null;
    avgAttendancePct?: number | null;
    academicYear?: string;
  };
  rows: ClassMapRow[];
};

/** Mock 2 rombel realistis — sama dengan docs/examples/class-map-sample.json */
const MOCK: ClassMapResponse = {
  summary: {
    rombel: 2,
    students: 58,
    parentCoveragePct: 51.7,
    studentCoveragePct: 51.7,
    avgMasteryPct: 78,
    avgAttendancePct: 91,
    academicYear: '2025/2026',
  },
  rows: [
    {
      key: 'cls_5a_guru_siti',
      classId: 'c_5a_sdn01',
      className: '5A',
      grade: 5,
      academicYear: '2025/2026',
      teacherId: 'u_guru_siti',
      teacherName: 'Siti Aminah, S.Pd.',
      teacherActive: true,
      teacherMissing: false,
      subjectLabel: 'Matematika',
      studentCount: 28,
      parentAccountCount: 22,
      parentAccountPct: 78.6,
      studentAccountCount: 18,
      studentAccountPct: 64.3,
      avgScore: 81.2,
      masteryPct: 86,
      attendancePct: 94,
      kaihFamilyCount: 19,
      kaihFamilyPct: 67.9,
      updatedAt: '2026-08-22T06:15:00.000Z',
      hasData: true,
    },
    {
      key: 'cls_5b_guru_budi',
      classId: 'c_5b_sdn01',
      className: '5B',
      grade: 5,
      academicYear: '2025/2026',
      teacherId: 'u_guru_budi',
      teacherName: 'Budi Santoso, S.Pd.',
      teacherActive: true,
      teacherMissing: false,
      subjectLabel: 'Bahasa Indonesia',
      studentCount: 30,
      parentAccountCount: 8,
      parentAccountPct: 26.7,
      studentAccountCount: 12,
      studentAccountPct: 40,
      avgScore: 74,
      masteryPct: 70,
      attendancePct: 88,
      kaihFamilyCount: 8,
      kaihFamilyPct: 26.7,
      updatedAt: '2026-08-21T09:40:00.000Z',
      hasData: true,
    },
  ],
};

function pctClass(p: number | null | undefined) {
  if (p == null) return 'text-muted-foreground';
  if (p < 50) return 'text-red-600 font-semibold';
  if (p < 75) return 'text-amber-600';
  return 'text-emerald-600 font-semibold';
}

function formatRelative(iso: string | null) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'baru saja';
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin';
  return `${d} hari lalu`;
}

function downloadCsv(rows: ClassMapRow[]) {
  const header = [
    'Kelas',
    'Guru',
    'Mapel',
    'Siswa',
    'AkunOrtu',
    'PctOrtu',
    'AkunSiswa',
    'PctSiswa',
    'RataNilai',
    'Ketuntasan',
    'Kehadiran',
    'KAIHKeluarga',
    'Pembaruan',
  ];
  const lines = rows.map((r) =>
    [
      r.className,
      r.teacherName,
      r.subjectLabel,
      r.studentCount,
      r.parentAccountCount,
      r.parentAccountPct,
      r.studentAccountCount,
      r.studentAccountPct,
      r.avgScore ?? '',
      r.masteryPct ?? '',
      r.attendancePct ?? '',
      r.kaihFamilyCount ?? '',
      r.updatedAt ?? '',
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peta-kelas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function KepsekPetaKelasView() {
  const user = useAppStore((s) => s.user);
  const [data, setData] = useState<ClassMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyLowParent, setOnlyLowParent] = useState(false);
  const [onlyNoData, setOnlyNoData] = useState(false);
  const [detail, setDetail] = useState<ClassMapRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kepsek/class-map');
      if (!res.ok) throw new Error('API belum siap');
      const json = (await res.json()) as ClassMapResponse;
      setData(json);
      setUsingMock(false);
    } catch {
      setData(MOCK);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, user?.schoolId]);

  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (onlyLowParent) list = list.filter((r) => r.parentAccountPct < 50);
    if (onlyNoData) list = list.filter((r) => !r.hasData);
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (r) =>
          r.className.toLowerCase().includes(s) ||
          r.teacherName.toLowerCase().includes(s) ||
          r.subjectLabel.toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) => a.className.localeCompare(b.className, 'id'));
  }, [data, q, onlyLowParent, onlyNoData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
        <span className="ml-3 text-sm text-muted-foreground">Memuat peta kelas…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {error || 'Data tidak tersedia'}
      </div>
    );
  }

  const { summary } = data;

  const kpis = [
    { label: 'Rombongan', value: summary.rombel, icon: GraduationCap },
    { label: 'Siswa aktif', value: summary.students, icon: Users },
    {
      label: 'Cakupan akun ortu',
      value: `${summary.parentCoveragePct}%`,
      icon: UserCheck,
      warn: summary.parentCoveragePct < 50,
    },
    {
      label: 'Rata ketuntasan',
      value: summary.avgMasteryPct != null ? `${summary.avgMasteryPct}%` : '—',
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Peta Kelas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rombongan, guru, cakupan akun, dan indikator ringkas
            {summary.academicYear ? ` · ${summary.academicYear}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {usingMock && (
            <Badge variant="secondary" className="text-[11px]">
              Data contoh (API belum live)
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(rows)}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#1F3864]/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-[#1F3864]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  <p
                    className={cn(
                      'text-xl font-bold mt-0.5',
                      k.warn ? 'text-red-600' : 'text-slate-800',
                    )}
                  >
                    {k.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Cari kelas / guru / mapel…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyLowParent}
            onChange={(e) => setOnlyLowParent(e.target.checked)}
            className="rounded border-slate-300"
          />
          Akun ortu &lt; 50%
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNoData}
            onChange={(e) => setOnlyNoData(e.target.checked)}
            className="rounded border-slate-300"
          />
          Belum berdata
        </label>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {rows.length} rombongan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold sticky left-0 bg-slate-50 z-10">Kelas</TableHead>
                <TableHead className="text-xs font-semibold">Guru</TableHead>
                <TableHead className="text-xs font-semibold">Mapel</TableHead>
                <TableHead className="text-xs font-semibold text-center">Siswa</TableHead>
                <TableHead className="text-xs font-semibold text-center">Akun ortu</TableHead>
                <TableHead className="text-xs font-semibold text-center">Akun siswa</TableHead>
                <TableHead className="text-xs font-semibold text-center">Rata</TableHead>
                <TableHead className="text-xs font-semibold text-center">Tuntas</TableHead>
                <TableHead className="text-xs font-semibold text-center">Hadir</TableHead>
                <TableHead className="text-xs font-semibold text-center">KAIH</TableHead>
                <TableHead className="text-xs font-semibold">Pembaruan</TableHead>
                <TableHead className="text-xs font-semibold" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-10">
                    Tidak ada rombongan yang cocok filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="font-semibold text-sm sticky left-0 bg-white z-10">
                      {r.className}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={r.teacherMissing ? 'text-muted-foreground italic' : ''}>
                        {r.teacherMissing ? '(akun guru terhapus)' : r.teacherName}
                      </span>
                      {!r.teacherActive && !r.teacherMissing && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.subjectLabel || '—'}</TableCell>
                    <TableCell className="text-center text-sm">{r.studentCount}</TableCell>
                    <TableCell className={cn('text-center text-sm', pctClass(r.parentAccountPct))}>
                      <span className="inline-flex items-center gap-1 justify-center">
                        {r.parentAccountCount}/{r.studentCount}{' '}
                        <span className="text-xs">({r.parentAccountPct}%)</span>
                        {r.parentAccountPct < 50 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell className={cn('text-center text-sm', pctClass(r.studentAccountPct))}>
                      {r.studentAccountCount}/{r.studentCount}{' '}
                      <span className="text-xs">({r.studentAccountPct}%)</span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.avgScore != null ? r.avgScore : '—'}
                    </TableCell>
                    <TableCell className={cn('text-center text-sm', pctClass(r.masteryPct))}>
                      {r.masteryPct != null ? `${r.masteryPct}%` : '—'}
                    </TableCell>
                    <TableCell className={cn('text-center text-sm', pctClass(r.attendancePct))}>
                      {r.attendancePct != null ? `${r.attendancePct}%` : '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.kaihFamilyCount != null
                        ? `${r.kaihFamilyCount}/${r.studentCount}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelative(r.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDetail(r)}>
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Kelas {detail.className}
                  {detail.subjectLabel ? ` · ${detail.subjectLabel}` : ''}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Guru</p>
                  <p className="font-medium">{detail.teacherName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Siswa</p>
                    <p className="text-lg font-bold">{detail.studentCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Ketuntasan</p>
                    <p className={cn('text-lg font-bold', pctClass(detail.masteryPct))}>
                      {detail.masteryPct != null ? `${detail.masteryPct}%` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Akun ortu</p>
                    <p className={cn('text-lg font-bold', pctClass(detail.parentAccountPct))}>
                      {detail.parentAccountPct}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Kehadiran</p>
                    <p className={cn('text-lg font-bold', pctClass(detail.attendancePct))}>
                      {detail.attendancePct != null ? `${detail.attendancePct}%` : '—'}
                    </p>
                  </div>
                </div>
                {detail.parentAccountPct < 50 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs leading-relaxed">
                    Cakupan akun orang tua masih rendah. Prioritaskan aktivasi login ortu
                    agar laporan 7 Kebiasaan dan pantauan nilai lebih merata.
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Pembaruan data: {detail.updatedAt ? new Date(detail.updatedAt).toLocaleString('id-ID') : '—'}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Mode baca saja — ubah nilai/hadir dilakukan oleh guru terkait.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
