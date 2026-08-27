'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Trophy,
  Users,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  CalendarDays,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface ExamSession {
  id: string;
  examPackageId: string;
  title: string;
  schoolId: string | null;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'scheduled' | 'active' | 'ended';
  examPackage: {
    id: string;
    title: string;
    _count: { examItems: number };
  };
  assignments: { class: { id: string; name: string } }[];
}

interface StudentAttempt {
  id: string;
  userId: string;
  examSessionId: string | null;
  examPackageId: string;
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  percentage: number;
  tkaPrediction: number | null;
  duration: number;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt: string | null;
  user: { id: string; name: string };
}

type SortDir = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(status: ExamSession['status']) {
  switch (status) {
    case 'scheduled':
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          Dijadwalkan
        </Badge>
      );
    case 'active':
      return (
        <Badge className="bg-green-500 text-white animate-pulse">
          Berlangsung
        </Badge>
      );
    case 'ended':
      return (
        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          Selesai
        </Badge>
      );
  }
}

function attemptStatusBadge(status: StudentAttempt['status']) {
  switch (status) {
    case 'submitted':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Selesai
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <Clock className="mr-1 h-3 w-3" />
          Dikerjakan
        </Badge>
      );
    case 'graded':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Dinilai
        </Badge>
      );
  }
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-green-600 dark:text-green-400';
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ═══════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, iconBg, subtitle, loading }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              iconBg
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function HasilTryoutView() {
  const user = useAppStore((s) => s.user);

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [allAttempts, setAllAttempts] = useState<StudentAttempt[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionAttempts, setSessionAttempts] = useState<StudentAttempt[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [loadingAllAttempts, setLoadingAllAttempts] = useState(true);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Fetch exam sessions ─────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/exams?type=session&schoolId=${user.schoolId}`
      );
      if (!res.ok) throw new Error('Gagal memuat data sesi tryout');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memuat sesi');
    } finally {
      setLoadingSessions(false);
    }
  }, [user?.schoolId]);

  // ── Fetch all attempts for summary stats ─────────────────────────────
  const fetchAllAttempts = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoadingAllAttempts(true);
    try {
      const res = await fetch(`/api/attempts?schoolId=${user.schoolId}`);
      if (!res.ok) throw new Error('Gagal memuat data seluruh attempt');
      const data = await res.json();
      setAllAttempts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAllAttempts(false);
    }
  }, [user?.schoolId]);

  // ── Fetch attempts for a specific session ────────────────────────────
  const fetchAttempts = useCallback(async (sessionId: string) => {
    if (!user?.schoolId) return;
    setLoadingAttempts(true);
    try {
      const res = await fetch(
        `/api/attempts?schoolId=${user.schoolId}&examSessionId=${sessionId}`
      );
      if (!res.ok) throw new Error('Gagal memuat data attempt');
      const data = await res.json();
      setSessionAttempts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memuat jawaban siswa');
    } finally {
      setLoadingAttempts(false);
    }
  }, [user?.schoolId]);

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.schoolId) {
      fetchSessions();
      fetchAllAttempts();
    }
  }, [user?.schoolId, fetchSessions, fetchAllAttempts]);

  useEffect(() => {
    if (selectedSession) {
      fetchAttempts(selectedSession);
    } else {
      setSessionAttempts([]);
    }
  }, [selectedSession, fetchAttempts]);

  // ── Computed summary stats ───────────────────────────────────────────
  const completedAttempts = useMemo(
    () => allAttempts.filter((a) => a.status !== 'in_progress'),
    [allAttempts]
  );

  const avgScore = useMemo(() => {
    if (completedAttempts.length === 0) return 0;
    const sum = completedAttempts.reduce((acc, a) => acc + (a.percentage ?? 0), 0);
    return (sum / completedAttempts.length).toFixed(1);
  }, [completedAttempts]);

  const avgTka = useMemo(() => {
    const withTka = completedAttempts.filter((a) => a.tkaPrediction != null);
    if (withTka.length === 0) return '-';
    const sum = withTka.reduce((acc, a) => acc + (a.tkaPrediction!), 0);
    return (sum / withTka.length).toFixed(1);
  }, [completedAttempts]);

  // ── Session-level computed values ────────────────────────────────────
  const selectedSessionData = useMemo(
    () => sessions.find((s) => s.id === selectedSession) ?? null,
    [sessions, selectedSession]
  );

  const sessionAvgScore = useMemo(() => {
    const submitted = sessionAttempts.filter((a) => a.status !== 'in_progress');
    if (submitted.length === 0) return 0;
    const sum = submitted.reduce((acc, a) => acc + (a.percentage ?? 0), 0);
    return (sum / submitted.length).toFixed(1);
  }, [sessionAttempts]);

  const sessionAvgDuration = useMemo(() => {
    if (sessionAttempts.length === 0) return '-';
    const sum = sessionAttempts.reduce((acc, a) => acc + (a.duration ?? 0), 0);
    return formatDuration(Math.round(sum / sessionAttempts.length));
  }, [sessionAttempts]);

  // ── Sorted attempts ──────────────────────────────────────────────────
  const sortedAttempts = useMemo(() => {
    return [...sessionAttempts].sort((a, b) => {
      const diff = (a.percentage ?? 0) - (b.percentage ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [sessionAttempts, sortDir]);

  // ── Toggle session expand ────────────────────────────────────────────
  const toggleSession = useCallback((id: string) => {
    setSelectedSession((prev) => (prev === id ? null : id));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Hasil Tryout
        </h1>
        <p className="text-muted-foreground mt-1">
          Pantau dan analisis hasil tryout siswa di sekolah Anda.
        </p>
      </div>

      {/* ── Summary Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tryout"
          value={sessions.length}
          icon={<Trophy className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-950"
          subtitle={`${sessions.filter((s) => s.status === 'active').length} berlangsung`}
          loading={loadingSessions}
        />
        <StatCard
          title="Siswa Menyelesaikan"
          value={completedAttempts.length}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-950"
          subtitle={`dari ${allAttempts.length} total attempt`}
          loading={loadingAllAttempts}
        />
        <StatCard
          title="Rata-rata Skor"
          value={`${avgScore}%`}
          icon={<Target className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          subtitle={
            completedAttempts.length > 0
              ? `dari ${completedAttempts.length} jawaban`
              : undefined
          }
          loading={loadingAllAttempts}
        />
        <StatCard
          title="Rata-rata TKA Prediksi"
          value={avgTka}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-950"
          loading={loadingAllAttempts}
        />
      </div>

      <Separator />

      {/* ── Session List ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Daftar Sesi Tryout
        </h2>

        {loadingSessions ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                Belum ada tryout yang dibuat di sekolah ini
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Buat sesi tryout baru untuk mulai memantau hasil siswa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isExpanded = selectedSession === session.id;
              const sessionAttemptCount = sessionAttempts
                ? sessionAttempts.filter(
                    (a) => a.examSessionId === session.id || isExpanded
                  ).length
                : 0;

              return (
                <Card
                  key={session.id}
                  className={cn(
                    'transition-all duration-200 overflow-hidden',
                    isExpanded
                      ? 'ring-2 ring-primary/20 shadow-md'
                      : 'hover:shadow-sm'
                  )}
                >
                  {/* Session header (clickable) */}
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => toggleSession(session.id)}
                  >
                    <CardHeader className="py-4 px-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold truncate">
                              {session.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {session.examPackage?.title} · {session.examPackage?._count?.examItems ?? '-'} soal
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 pl-8 sm:pl-0">
                          {statusBadge(session.status)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-8 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(session.startDate)} — {formatDate(session.endDate)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {session.duration} menit
                        </span>
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {session.assignments?.length > 0
                            ? session.assignments.map((a) => a.class?.name).join(', ')
                            : 'Semua kelas'}
                        </span>
                      </div>
                    </CardHeader>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <>
                      <Separator />
                      <CardContent className="p-5 pt-4 space-y-4">
                        {/* Mini stat row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Total Peserta
                              </p>
                              <p className="text-lg font-bold">
                                {sessionAttempts.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950">
                              <Target className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Rata-rata Skor
                              </p>
                              <p className="text-lg font-bold">
                                {sessionAvgScore}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950">
                              <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Rata-rata Durasi
                              </p>
                              <p className="text-lg font-bold">
                                {sessionAvgDuration}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Attempts table */}
                        {loadingAttempts ? (
                          <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : sessionAttempts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                              <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">
                              Belum ada siswa yang mengerjakan tryout ini
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="max-h-96 overflow-y-auto rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="w-12 text-center">No</TableHead>
                                  <TableHead>Nama Siswa</TableHead>
                                  <TableHead className="text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-green-600 dark:text-green-400">Benar</span>
                                      <Separator className="w-8" />
                                      <span className="text-red-600 dark:text-red-400">Salah</span>
                                      <Separator className="w-8" />
                                      <span className="text-muted-foreground">Kosong</span>
                                    </div>
                                  </TableHead>
                                  <TableHead className="text-center">Skor</TableHead>
                                  <TableHead
                                    className="text-center cursor-pointer select-none hover:bg-muted transition-colors"
                                    onClick={() =>
                                      setSortDir((d) =>
                                        d === 'desc' ? 'asc' : 'desc'
                                      )
                                    }
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      Persentase
                                      {sortDir === 'desc' ? (
                                        <TrendingDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <TrendingUp className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                  </TableHead>
                                  <TableHead className="text-center">
                                    Prediksi TKA
                                  </TableHead>
                                  <TableHead className="text-center">
                                    Durasi
                                  </TableHead>
                                  <TableHead className="text-center">
                                    Status
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedAttempts.map((attempt, idx) => (
                                  <TableRow key={attempt.id}>
                                    <TableCell className="text-center text-muted-foreground font-medium">
                                      {idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {attempt.user?.name ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col items-center gap-0.5 text-sm">
                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                          {attempt.totalCorrect}
                                        </span>
                                        <span className="text-red-600 dark:text-red-400">
                                          {attempt.totalWrong}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {attempt.totalUnanswered}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold">
                                      {attempt.score}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        'text-center font-bold',
                                        scoreColor(attempt.percentage ?? 0)
                                      )}
                                    >
                                      {attempt.percentage != null
                                        ? `${attempt.percentage.toFixed(1)}%`
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {attempt.tkaPrediction != null ? (
                                        <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                          {attempt.tkaPrediction.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground font-mono">
                                      {formatDuration(attempt.duration ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {attemptStatusBadge(attempt.status)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
