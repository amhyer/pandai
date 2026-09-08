'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, NotebookPen, UserRound } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ChildTka {
  id: string;
  name: string;
  avgScore: number;
  attemptCount: number;
  classRank: { rank: number; total: number } | null;
  bestSubject: { name: string; avgScore: number } | null;
}

interface ChildCatatan {
  id: string;
  date: string;
  category: string;
  content: string;
  teacher: { name: string };
}

const CAT_LABEL: Record<string, string> = {
  umum: 'Umum',
  apresiasi: 'Apresiasi',
  perbaikan: 'Perbaikan',
  perhatian: 'Perhatian',
};

/**
 * OrtuDashboardEnhancement — panel untuk orang tua: ringkasan kesiapan TKA
 * per anak + catatan terbaru dari guru. Semua fetch toleran error.
 */
export function OrtuDashboardEnhancement() {
  const user = useAppStore((s) => s.user);

  const [children, setChildren] = useState<ChildTka[]>([]);
  const [catatan, setCatatan] = useState<ChildCatatan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`/api/users?parentId=${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const kids: { id: string; name: string }[] = Array.isArray(data) ? data : data.data ?? [];
      if (!kids.length) {
        setLoading(false);
        return;
      }

      // Ambil ringkasan TKA per anak (maks 3 anak)
      const enriched = await Promise.all(
        kids.slice(0, 3).map(async (k) => {
          try {
            const tkaRes = await fetch(`/api/analytics/tka-dashboard?studentId=${k.id}`);
            const tkaData = tkaRes.ok ? await tkaRes.json() : null;
            const s = tkaData?.student;
            return {
              id: k.id,
              name: k.name,
              avgScore: s?.overall?.avgScore ?? 0,
              attemptCount: s?.overall?.attemptCount ?? 0,
              classRank: s?.classRank ?? null,
              bestSubject: s?.overall?.bestSubject ?? null,
            } as ChildTka;
          } catch {
            return {
              id: k.id,
              name: k.name,
              avgScore: 0,
              attemptCount: 0,
              classRank: null,
              bestSubject: null,
            } as ChildTka;
          }
        })
      );
      setChildren(enriched);

      // Catatan terbaru untuk anak pertama (atau gabungan semua anak)
      const catatanItems: ChildCatatan[] = [];
      for (const k of enriched) {
        try {
          const cRes = await fetch(`/api/guru-catatan?studentId=${k.id}`);
          if (!cRes.ok) continue;
          const cData = await cRes.json();
          if (Array.isArray(cData)) {
            for (const c of cData.slice(0, 3)) {
              catatanItems.push({
                id: `${k.id}-${c.id}`,
                date: String(c.date),
                category: String(c.category),
                content: String(c.content),
                teacher: { name: c.teacher?.name ?? 'Guru' },
              });
            }
          }
        } catch {
          /* lanjut ke anak berikutnya */
        }
      }
      catatanItems.sort((a, b) => (a.date < b.date ? 1 : -1));
      setCatatan(catatanItems.slice(0, 5));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Kesiapan TKA anak ── */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[#1F3864]" />
            Kesiapan TKA Anak
          </CardTitle>
          <CardDescription className="text-xs">Ringkasan performa akademik</CardDescription>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Belum ada data anak.
            </p>
          ) : (
            <div className="space-y-3">
              {children.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserRound className="h-4 w-4 text-[#1F3864] shrink-0" />
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    </div>
                    {c.classRank ? (
                      <Badge variant="outline" className="text-[10px]">
                        Rank #{c.classRank.rank}/{c.classRank.total}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center rounded bg-slate-50 py-1.5">
                      <p className="text-base font-bold text-[#1F3864]">{c.avgScore || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">Rata-rata</p>
                    </div>
                    <div className="text-center rounded bg-slate-50 py-1.5">
                      <p className="text-base font-bold text-[#1F3864]">{c.attemptCount || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">Tryout</p>
                    </div>
                  </div>
                  {c.bestSubject && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Terkuat: <span className="font-medium text-emerald-600">{c.bestSubject.name}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Catatan guru untuk anak ── */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-[#1F3864]" />
            Catatan Guru untuk Anak
          </CardTitle>
          <CardDescription className="text-xs">Pesan pembinaan dari sekolah</CardDescription>
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
                    <Badge variant="outline" className="text-[10px]">
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
    </div>
  );
}

export default OrtuDashboardEnhancement;
