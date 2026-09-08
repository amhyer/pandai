'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { TkaTrendChart, TkaSubjectChart } from '@/components/views/competency/tka-dashboard-chart';
import { CompetencyRadarChart } from '@/components/views/competency/competency-radar-chart';
import {
  TrendingUp,
  BarChart3,
  Radar,
  Target,
  Trophy,
  BrainCircuit,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface TkaStudentData {
  id: string;
  name: string;
  class: { id: string; name: string } | null;
  overall: {
    avgScore: number;
    bestSubject: { name: string; avgScore: number } | null;
    attemptCount: number;
    strongest: string[];
    weakest: string[];
  };
  subjects: {
    subjectId: string;
    subjectName: string;
    avgScore: number;
    attemptCount: number;
    mastery: 'kuat' | 'cukup' | 'lemah';
    lastScore: number;
    tkaPrediction: number | null;
  }[];
  trend: { date: string; score: number; subjectName: string }[];
  classRank: { rank: number; total: number; percentile: number } | null;
  diagnostic: {
    id: string;
    subjectName: string;
    topicName: string | null;
    score: number;
    level: string;
    date: string;
  }[];
  competency: {
    term: string;
    dimensions: { dimension: string; label: string; avgRating: number }[];
  } | null;
}

const MASTERY_BADGE: Record<string, { label: string; className: string }> = {
  kuat: { label: 'Kuat', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cukup: { label: 'Cukup', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  lemah: { label: 'Lemah', className: 'bg-red-50 text-red-600 border-red-200' },
};

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  kuat: { label: 'Kuat', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cukup: { label: 'Cukup', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  lemah: { label: 'Perlu Latihan', className: 'bg-red-50 text-red-600 border-red-200' },
};

// ═══════════════════════════════════════════════════════════════════
// VIEW
// ═══════════════════════════════════════════════════════════════════

export function TkaDashboardView() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [data, setData] = useState<TkaStudentData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/tka-dashboard');
      if (!res.ok) throw new Error('Gagal memuat');
      const json = await res.json();
      if (json.mode === 'student' && json.student) setData(json.student);
    } catch {
      toast.error('Gagal memuat Dashboard TKA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Data tidak ditemukan. Silakan kerjakan Tryout TKA terlebih dahulu.
        </CardContent>
      </Card>
    );
  }

  const { overall } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
          <BrainCircuit className="h-6 w-6" />
          Dashboard TKA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Peta kesiapan Tes Kemampuan Akademik Anda — {data.class?.name ?? '-'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Rata-rata Skor
            </div>
            <p className="text-2xl font-bold text-[#1F3864]">{overall.avgScore}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> Mapel Terbaik
            </div>
            <p className="text-sm font-bold text-[#1F3864] leading-tight">
              {overall.bestSubject?.name ?? '-'}
              {overall.bestSubject && (
                <span className="block text-xs font-normal text-emerald-600">
                  {overall.bestSubject.avgScore}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Total Tryout
            </div>
            <p className="text-2xl font-bold text-[#1F3864]">{overall.attemptCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Ranking Kelas
            </div>
            {data.classRank ? (
              <p className="text-2xl font-bold text-[#1F3864]">
                #{data.classRank.rank}
                <span className="text-xs font-normal text-muted-foreground"> / {data.classRank.total}</span>
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts: tren + per mapel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1F3864]" /> Tren Skor
            </CardTitle>
            <CardDescription className="text-xs">15 tryout terakhir dengan garis KKM</CardDescription>
          </CardHeader>
          <CardContent>
            <TkaTrendChart data={data.trend} />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1F3864]" /> Penguasaan per Mapel
            </CardTitle>
            <CardDescription className="text-xs">
              Hijau = kuat, kuning = cukup, merah = perlu latihan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TkaSubjectChart
              data={data.subjects.map((s) => ({
                subjectName: s.subjectName,
                avgScore: s.avgScore,
                mastery: s.mastery,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabel mapel + radar kompetensi */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm bg-white lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rincian per Mapel</CardTitle>
            <CardDescription className="text-xs">Rata-rata, penguasaan, dan prediksi TKA</CardDescription>
          </CardHeader>
          <CardContent>
            {data.subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada data</p>
            ) : (
              <div className="space-y-2">
                {data.subjects.map((s) => (
                  <div
                    key={s.subjectId}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.subjectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.attemptCount} tryout · terakhir {s.lastScore}
                        {s.tkaPrediction != null && ` · prediksi ${s.tkaPrediction}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={MASTERY_BADGE[s.mastery]?.className}>
                      {MASTERY_BADGE[s.mastery]?.label ?? s.mastery}
                    </Badge>
                    <span className="text-lg font-bold text-[#1F3864] w-12 text-right">
                      {s.avgScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Radar className="h-4 w-4 text-[#1F3864]" /> Radar 8 Dimensi
            </CardTitle>
            <CardDescription className="text-xs">
              {data.competency?.term ? `Periode ${data.competency.term}` : 'Profil Lulusan (PMB)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.competency ? (
              <CompetencyRadarChart data={data.competency.dimensions} />
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">
                Belum ada asesmen guru untuk Anda
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hasil Diagnostik */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2 flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[#1F3864]" /> Hasil Diagnostik Terbaru
            </CardTitle>
            <CardDescription className="text-xs">
              Titik fokus latihan berdasarkan diagnostic test
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateTo('diagnostic')}>
            Kerjakan Diagnostik
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.diagnostic.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Belum ada hasil diagnostik. Kerjakan Diagnostic Test untuk mengetahui topik prioritas.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.diagnostic.map((d) => (
                <div key={d.id} className="rounded-lg border border-slate-100 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.subjectName}</p>
                    <Badge variant="outline" className={LEVEL_BADGE[d.level]?.className}>
                      {LEVEL_BADGE[d.level]?.label ?? d.level}
                    </Badge>
                  </div>
                  {d.topicName && <p className="text-xs text-muted-foreground truncate">{d.topicName}</p>}
                  <p className="text-xs text-slate-500">
                    Skor <span className="font-semibold text-[#1F3864]">{d.score}</span> · {d.date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TkaDashboardView;
