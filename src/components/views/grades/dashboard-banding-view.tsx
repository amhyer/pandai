'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Layers,
  BarChart3,
  Trophy,
  Download,
  Loader2,
  Users,
  Gauge,
} from 'lucide-react';
import { CharacterRecapView } from '@/components/views/character/character-recap-view';
import { gradeLetter } from '@/lib/grading-utils';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ClassBanding {
  id: string;
  name: string;
  studentCount: number;
  avgScore: number;
  topStudents: { id: string; name: string; nisn: string | null; avg: number }[];
  perSubject: { subjectId: string; avgScore: number; mastery: 'kuat' | 'cukup' | 'lemah'; attemptCount: number }[];
  distribution: {
    '>=85': number;
    '70-84': number;
    '60-69': number;
    '<60': number;
  };
}

const MASTERY_BADGE: Record<string, string> = {
  kuat: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  cukup: 'bg-amber-50 text-amber-600 border-amber-200',
  lemah: 'bg-red-50 text-red-600 border-red-200',
};

function barColor(avg: number): string {
  if (avg >= 80) return 'bg-emerald-500';
  if (avg >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * DashboardBandingView — banding nilai & rekap akademik per kelas
 * (Admin Sekolah): distribusi skor, rata-rata per mapel, top 5 siswa,
 * rekap 7 kebiasaan, dan tombol ekspor CSV.
 */
export function DashboardBandingView() {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('all');
  const [data, setData] = useState<ClassBanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      if (res.ok) {
        const json = await res.json();
        setClasses(Array.isArray(json) ? json : json.data ?? json.classes ?? []);
      }
    } catch {
      /* silent */
    }
  }, [schoolId]);

  const fetchData = useCallback(async () => {
    if (!classId || classId === 'all') {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/tka-dashboard?classId=${classId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json?.class ?? null);
      }
    } catch {
      toast.error('Gagal memuat data banding');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (type: string, label: string) => {
    setExporting(type);
    try {
      const params = new URLSearchParams({ type });
      if (classId !== 'all') params.set('classId', classId);
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal ekspor');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ekspor-${label}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Ekspor berhasil diunduh');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal ekspor');
    } finally {
      setExporting(null);
    }
  };

  const dist = data?.distribution;
  const distTotal = dist
    ? Math.max(dist['>=85'] + dist['70-84'] + dist['60-69'] + dist['<60'], 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Banding Nilai
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Distribusi nilai & rekap akademik per kelas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('scores', 'nilai')}
            disabled={exporting !== null}
          >
            {exporting === 'scores' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Ekspor Nilai
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('character', 'kebiasaan')}
            disabled={exporting !== null}
          >
            {exporting === 'character' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Ekspor Kebiasaan
          </Button>
        </div>
      </div>

      {/* Filter kelas */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Kelas</span>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Pilih Kelas (wajib)</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!classId || classId === 'all' ? (
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Gauge className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">
              Pilih kelas untuk melihat banding nilai & rekap akademik.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Distribusi skor ── */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#1F3864]" />
                Distribusi Skor — {data.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {data.studentCount} siswa · rata-rata {data.avgScore}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: '≥ 85 (A)', value: dist?.['>=85'] ?? 0, color: 'bg-emerald-500' },
                { label: '70 – 84 (B-C)', value: dist?.['70-84'] ?? 0, color: 'bg-sky-500' },
                { label: '60 – 69 (C-D)', value: dist?.['60-69'] ?? 0, color: 'bg-amber-500' },
                { label: '< 60 (E)', value: dist?.['<60'] ?? 0, color: 'bg-red-500' },
              ].map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-slate-600">{d.label}</span>
                  <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.color} transition-all`}
                      style={{ width: `${(d.value / distTotal) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-[#1F3864]">{d.value}</span>
                  <span className="w-10 text-right text-[10px] text-muted-foreground">
                    {Math.round((d.value / distTotal) * 100)}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Rata-rata per mapel ── */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[#1F3864]" />
                Rata-rata per Mapel
              </CardTitle>
              <CardDescription className="text-xs">Level penguasaan kelas</CardDescription>
            </CardHeader>
            <CardContent>
              {data.perSubject.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Belum ada data tryout untuk kelas ini
                </p>
              ) : (
                <div className="space-y-2">
                  {data.perSubject.map((s) => (
                    <div key={s.subjectId} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-slate-700 truncate">
                        {s.subjectId === 'tka' ? 'TKA Umum' : s.subjectId}
                      </span>
                      <div className="w-32 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor(s.avgScore)}`}
                          style={{ width: `${s.avgScore}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-bold text-[#1F3864]">
                        {s.avgScore}
                      </span>
                      <Badge variant="outline" className={`text-[10px] w-16 justify-center ${MASTERY_BADGE[s.mastery]}`}>
                        {s.mastery === 'kuat' ? 'Kuat' : s.mastery === 'cukup' ? 'Cukup' : 'Lemah'}
                      </Badge>
                      <span className="w-5 text-xs font-semibold text-slate-500">{gradeLetter(s.avgScore)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Top 5 siswa ── */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#1F3864]" />
                Top 5 Siswa
              </CardTitle>
              <CardDescription className="text-xs">Berdasarkan rata-rata skor tryout</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Belum ada data</p>
              ) : (
                <div className="space-y-1.5">
                  {data.topStudents.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0
                            ? 'bg-amber-100 text-amber-700'
                            : i === 1
                              ? 'bg-slate-200 text-slate-600'
                              : i === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        {s.nisn && <p className="text-[11px] text-muted-foreground font-mono">{s.nisn}</p>}
                      </div>
                      <span className="text-base font-bold text-[#1F3864]">{s.avg}</span>
                      <Badge variant="outline" className="text-[10px]">{gradeLetter(s.avg)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Rekap 7 kebiasaan ── */}
          <div className="lg:col-span-2">
            <CharacterRecapView title={`Rekap 7 Kebiasaan — ${data.name}`} showTopStudents />
          </div>
        </div>
      ) : (
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">Data tidak ditemukan</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DashboardBandingView;
