'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, type ViewType } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotebookPen, BrainCircuit, ChevronRight } from 'lucide-react';
import { DiagnosticResults } from '@/components/views/siswa/diagnostic-results';
import { QuizCard } from '@/components/quiz/quiz-card';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface TkaMiniSummary {
  avgScore: number;
  bestSubject: { name: string; avgScore: number } | null;
  attemptCount: number;
  classRank: { rank: number; total: number } | null;
}

interface GuruCatatanMini {
  id: string;
  date: string;
  category: string;
  content: string;
  teacher: { name: string };
}

const CAT_BADGE: Record<string, string> = {
  umum: 'bg-slate-100 text-slate-600',
  apresiasi: 'bg-emerald-50 text-emerald-600',
  perbaikan: 'bg-amber-50 text-amber-700',
  perhatian: 'bg-red-50 text-red-600',
};

const CAT_LABEL: Record<string, string> = {
  umum: 'Umum',
  apresiasi: 'Apresiasi',
  perbaikan: 'Perbaikan',
  perhatian: 'Perhatian',
};

/**
 * SiswaDashboardEnhancement — panel tambahan di dashboard siswa:
 * mini-ringkasan TKA, hasil diagnostik, catatan terbaru dari guru,
 * dan kuis mandiri. Setiap bagian toleran terhadap kegagalan fetch
 * (widget tidak boleh menjatuhkan dashboard utama).
 */
export function SiswaDashboardEnhancement() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [tka, setTka] = useState<TkaMiniSummary | null>(null);
  const [catatan, setCatatan] = useState<GuruCatatanMini[]>([]);

  const fetchTka = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/tka-dashboard');
      if (!res.ok) return;
      const json = await res.json();
      const s = json?.student;
      if (s?.overall) {
        setTka({
          avgScore: s.overall.avgScore,
          bestSubject: s.overall.bestSubject,
          attemptCount: s.overall.attemptCount,
          classRank: s.classRank,
        });
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchCatatan = useCallback(async () => {
    try {
      const res = await fetch('/api/guru-catatan');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setCatatan(
          data.slice(0, 3).map((c: Record<string, unknown>) => ({
            id: String(c.id),
            date: String(c.date),
            category: String(c.category),
            content: String(c.content),
            teacher: { name: (c.teacher as { name?: string })?.name ?? 'Guru' },
          }))
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchTka();
    fetchCatatan();
  }, [fetchTka, fetchCatatan]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Mini ringkasan TKA + diagnostik ── */}
      <div className="space-y-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-[#1F3864]" />
                  Kesiapan TKA
                </CardTitle>
                <CardDescription className="text-xs">Ringkasan performa akademik Anda</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('siswa-tka-dashboard' as ViewType)}
              >
                Dashboard TKA
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tka ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-[#1F3864]">{tka.avgScore}</p>
                  <p className="text-[11px] text-muted-foreground">Rata-rata</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-[#1F3864]">
                    {tka.classRank ? `#${tka.classRank.rank}` : '-'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Ranking Kelas</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-[#1F3864]">{tka.attemptCount}</p>
                  <p className="text-[11px] text-muted-foreground">Tryout</p>
                </div>
                {tka.bestSubject && (
                  <p className="col-span-3 text-xs text-muted-foreground text-center">
                    Mapel terbaik: <span className="font-semibold text-emerald-600">{tka.bestSubject.name}</span> ({tka.bestSubject.avgScore})
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3 text-center">
                Kerjakan tryout pertama Anda untuk melihat kesiapan TKA.
              </p>
            )}
          </CardContent>
        </Card>

        <DiagnosticResults compact limit={4} />
      </div>

      {/* ── Catatan guru + kuis mandiri ── */}
      <div className="space-y-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[#1F3864]" />
              Catatan Terbaru dari Guru
            </CardTitle>
            <CardDescription className="text-xs">Pendampingan & pembinaan untuk Anda</CardDescription>
          </CardHeader>
          <CardContent>
            {catatan.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada catatan dari guru.
              </p>
            ) : (
              <div className="space-y-2">
                {catatan.map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge className={`text-[10px] ${CAT_BADGE[c.category] ?? CAT_BADGE.umum}`}>
                        {CAT_LABEL[c.category] ?? c.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {c.date} · {c.teacher.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <QuizCard questionCount={5} />
      </div>
    </div>
  );
}

export default SiswaDashboardEnhancement;
