'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Award, Target } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface HabitStat {
  habit: string;
  label: string;
  average: number;
  count: number;
}

interface CharacterRecap {
  range: { from: string; to: string };
  summary: {
    totalReports: number;
    activeStudents: number;
    overallAverage: number;
    topHabit: { habit: string; label: string; average: number } | null;
    focusHabit: { habit: string; label: string; average: number } | null;
  };
  habits: HabitStat[];
  perStudent: {
    studentId: string;
    name: string;
    className: string;
    average: number;
    reportCount: number;
  }[];
}

const RATING_BAR_COLORS: [number, string][] = [
  [3.5, 'bg-emerald-500'],
  [2.5, 'bg-amber-500'],
  [1.5, 'bg-orange-500'],
  [0, 'bg-red-500'],
];

function barColor(avg: number): string {
  return RATING_BAR_COLORS.find(([min]) => avg >= min)?.[1] ?? 'bg-slate-300';
}

// ═══════════════════════════════════════════════════════════════════
// VIEW — widget rekap 7 kebiasaan (dipakai di dashboard banding sekolah)
// ═══════════════════════════════════════════════════════════════════

export function CharacterRecapView({
  title = 'Rekap 7 Kebiasaan',
  days = 30,
  showTopStudents = true,
}: {
  title?: string;
  days?: number;
  showTopStudents?: boolean;
}) {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';

  const [data, setData] = useState<CharacterRecap | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('all');
  const [loading, setLoading] = useState(true);

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

  const fetchRecap = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({ from, to });
      if (classId !== 'all') params.set('classId', classId);
      const res = await fetch(`/api/analytics/character-recap?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [classId, days]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  const maxCount = Math.max(...(data?.habits.map((h) => h.count) ?? [1]), 1);

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-[#1F3864]" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs">
              {data ? `${data.summary.totalReports} laporan · ${data.range.from} s.d. ${data.range.to}` : 'Muat data...'}
            </CardDescription>
          </div>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Bar per kebiasaan */}
            <div className="space-y-2">
              {data.habits.map((h) => (
                <div key={h.habit} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-slate-600 truncate">{h.label}</span>
                  <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(h.average)} transition-all`}
                      style={{ width: `${(h.average / 4) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-[#1F3864]">
                    {h.average || '-'}
                  </span>
                  <span className="w-14 text-right text-[10px] text-muted-foreground">
                    {h.count}/{maxCount}
                  </span>
                </div>
              ))}
            </div>

            {/* Highlight */}
            <div className="grid grid-cols-2 gap-3">
              {data.summary.topHabit && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <Award className="h-3 w-3" /> Kebiasaan Terkuat
                  </p>
                  <p className="text-sm font-semibold text-emerald-800 mt-0.5">
                    {data.summary.topHabit.label}
                  </p>
                  <p className="text-[11px] text-emerald-600">rata-rata {data.summary.topHabit.average}/4</p>
                </div>
              )}
              {data.summary.focusHabit && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="text-[11px] text-amber-700 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Perlu Penguatan
                  </p>
                  <p className="text-sm font-semibold text-amber-800 mt-0.5">
                    {data.summary.focusHabit.label}
                  </p>
                  <p className="text-[11px] text-amber-600">rata-rata {data.summary.focusHabit.average}/4</p>
                </div>
              )}
            </div>

            {/* Top siswa */}
            {showTopStudents && data.perStudent.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Siswa Paling Konsisten</p>
                <div className="space-y-1.5">
                  {data.perStudent.slice(0, 5).map((s, i) => (
                    <div key={s.studentId} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
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
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.className && <Badge variant="outline" className="text-[10px]">{s.className}</Badge>}
                      <span className="font-semibold text-[#1F3864]">{s.average}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data kebiasaan</p>
        )}
      </CardContent>
    </Card>
  );
}

export default CharacterRecapView;
