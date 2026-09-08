'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Stethoscope, ChevronRight, Target } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface DiagnosticRow {
  id: string;
  subjectName: string;
  topicName: string | null;
  score: number;
  level: 'kuat' | 'cukup' | 'lemah';
  date: string;
}

const LEVEL_META: Record<string, { label: string; badge: string; bar: string }> = {
  kuat: { label: 'Kuat', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-500' },
  cukup: { label: 'Cukup', badge: 'bg-amber-50 text-amber-600 border-amber-200', bar: 'bg-amber-500' },
  lemah: { label: 'Perlu Latihan', badge: 'bg-red-50 text-red-600 border-red-200', bar: 'bg-red-500' },
};

/**
 * DiagnosticResults — hasil diagnostic test siswa (topik prioritas).
 *
 * Catatan arsitektur: data dimuat lewat fungsi async yang dipanggil dari
 * useEffect (bukan setState langsung di badan effect) agar aman dengan
 * aturan react-hooks/set-state-in-effect (React 19).
 */
export function DiagnosticResults({
  compact = false,
  limit = 6,
}: {
  /** true = tampil lebih ringkas (untuk embed di dashboard) */
  compact?: boolean;
  limit?: number;
}) {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [rows, setRows] = useState<DiagnosticRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostic = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/tka-dashboard`);
      if (!res.ok) return;
      const json = await res.json();
      const diag = json?.student?.diagnostic;
      if (Array.isArray(diag)) setRows(diag);
    } catch {
      /* silent — widget tidak boleh menjatuhkan dashboard */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostic();
  }, [fetchDiagnostic]);

  const visible = rows.slice(0, limit);
  const weakCount = rows.filter((r) => r.level === 'lemah').length;

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-2 flex items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-[#1F3864]" />
            Hasil Diagnostik
          </CardTitle>
          <CardDescription className="text-xs">
            {weakCount > 0
              ? `${weakCount} topik perlu latihan prioritas`
              : 'Pantau kekuatan & kelemahan per topik'}
          </CardDescription>
        </div>
        {!compact && (
          <Button variant="outline" size="sm" onClick={() => navigateTo('diagnostic')}>
            Kerjakan
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-6 text-center">
            <Target className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">
              Belum ada hasil diagnostik.
            </p>
            {!compact && (
              <Button
                size="sm"
                className="mt-3 bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                onClick={() => navigateTo('diagnostic')}
              >
                Kerjakan Diagnostic Test
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((r) => {
              const meta = LEVEL_META[r.level] ?? LEVEL_META.cukup;
              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-100 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.subjectName}</p>
                      {r.topicName && (
                        <p className="text-xs text-muted-foreground truncate">{r.topicName}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.bar}`}
                        style={{ width: `${Math.min(r.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#1F3864]">{r.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiagnosticResults;
