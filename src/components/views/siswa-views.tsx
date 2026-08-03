'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ClipboardList,
  Award,
  History,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  Timer,
  BookOpen,
  Target,
  CalendarDays,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  GraduationCap,
} from 'lucide-react';

// ─── API Types ────────────────────────────────────────────────────

interface AttemptAnswer {
  id: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  timeSpent: number;
  question?: {
    id: string;
    subjectId: string;
    subject?: {
      id: string;
      name: string;
      code: string;
      type: string;
    };
  };
}

interface Attempt {
  id: string;
  userId: string;
  examSessionId: string | null;
  examPackageId: string;
  schoolId: string;
  classId: string | null;
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  percentage: number;
  tkaPrediction: number | null;
  duration: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  answers: AttemptAnswer[];
}

interface ExamPackage {
  id: string;
  title: string;
  description: string | null;
  schoolId: string | null;
  duration: number;
  totalQuestions: number;
  status: string;
  createdBy: string | null;
  _count: {
    examItems: number;
    examSessions: number;
  };
}

interface SubjectScore {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  attempts: Attempt[];
  avgPercentage: number;
  bestPercentage: number;
  latestPercentage: number;
  trend: 'up' | 'down' | 'stable' | 'new';
  totalAttempts: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getScoreColorClass(percentage: number): {
  bg: string;
  text: string;
  bar: string;
  border: string;
  label: string;
} {
  if (percentage >= 85) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      border: 'border-emerald-200',
      label: 'Sangat Baik',
    };
  }
  if (percentage >= 70) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      bar: 'bg-gradient-to-r from-amber-400 to-amber-500',
      border: 'border-amber-200',
      label: 'Baik',
    };
  }
  if (percentage >= 55) {
    return {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      bar: 'bg-gradient-to-r from-orange-400 to-orange-500',
      border: 'border-orange-200',
      label: 'Cukup',
    };
  }
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    bar: 'bg-gradient-to-r from-red-400 to-red-500',
    border: 'border-red-200',
    label: 'Perlu Perbaikan',
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Selesai</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Berlangsung</Badge>;
    case 'graded':
      return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200">Dinilai</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' | 'new' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'stable':
      return <Minus className="h-4 w-4 text-amber-500" />;
    case 'new':
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
  }
}

// ─── Shared Card Styles ───────────────────────────────────────────

const cardBase = 'rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200';

// ═══════════════════════════════════════════════════════════════════
//  SISWA NILAI VIEW
// ═══════════════════════════════════════════════════════════════════

export function SiswaNilaiView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [attemptsRes, examsRes] = await Promise.all([
        fetch(`/api/attempts?userId=${user.id}`),
        fetch(`/api/exams${user.schoolId ? `?schoolId=${user.schoolId}` : ''}`),
      ]);
      if (!attemptsRes.ok || !examsRes.ok) throw new Error('Gagal mengambil data');
      const attemptsData: Attempt[] = await attemptsRes.json();
      const examsData: ExamPackage[] = await examsRes.json();
      setAttempts(attemptsData);
      setExams(examsData);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data nilai. Coba refresh halaman.');
      toast.error('Gagal memuat data nilai');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a map of examPackageId → title
  const examTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    exams.forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  // Only consider submitted attempts for grading
  const completedAttempts = useMemo(
    () => attempts.filter((a) => a.status === 'submitted' || a.status === 'graded'),
    [attempts]
  );

  // Group by subject from answers
  const subjectScores = useMemo((): SubjectScore[] => {
    const subjectMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      attempts: Attempt[];
    }>();

    completedAttempts.forEach((attempt) => {
      if (!attempt.answers || attempt.answers.length === 0) return;
      // Use the first answer's subject as representative
      const firstSubject = attempt.answers[0]?.question?.subject;
      if (!firstSubject) return;
      const sid = firstSubject.id;
      if (!subjectMap.has(sid)) {
        subjectMap.set(sid, {
          subjectId: sid,
          subjectName: firstSubject.name,
          subjectCode: firstSubject.code,
          attempts: [],
        });
      }
      subjectMap.get(sid)!.attempts.push(attempt);
    });

    return Array.from(subjectMap.values()).map((group) => {
      const pcts = group.attempts.map((a) => a.percentage).sort((a, b) => b - a);
      const avg = pcts.reduce((s, v) => s + v, 0) / pcts.length;
      const latest = group.attempts.sort(
        (a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime()
      )[0];
      const prev = group.attempts.length > 1
        ? group.attempts.sort(
            (a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime()
          )[1]
        : null;

      let trend: 'up' | 'down' | 'stable' | 'new' = 'new';
      if (prev) {
        const diff = latest.percentage - prev.percentage;
        if (diff > 2) trend = 'up';
        else if (diff < -2) trend = 'down';
        else trend = 'stable';
      }

      return {
        subjectId: group.subjectId,
        subjectName: group.subjectName,
        subjectCode: group.subjectCode,
        attempts: group.attempts,
        avgPercentage: Math.round(avg * 10) / 10,
        bestPercentage: pcts[0],
        latestPercentage: latest.percentage,
        trend,
        totalAttempts: group.attempts.length,
      };
    }).sort((a, b) => b.avgPercentage - a.avgPercentage);
  }, [completedAttempts]);

  // Filter by search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjectScores;
    const q = searchQuery.toLowerCase();
    return subjectScores.filter(
      (s) =>
        s.subjectName.toLowerCase().includes(q) ||
        s.subjectCode.toLowerCase().includes(q)
    );
  }, [subjectScores, searchQuery]);

  // Overall stats
  const overallStats = useMemo(() => {
    const allPcts = completedAttempts.map((a) => a.percentage);
    const avg = allPcts.length > 0 ? Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length) : 0;
    const highest = allPcts.length > 0 ? Math.round(Math.max(...allPcts)) : 0;
    const lowest = allPcts.length > 0 ? Math.round(Math.min(...allPcts)) : 0;
    return { avg, highest, lowest, total: completedAttempts.length };
  }, [completedAttempts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d4a7a] flex items-center justify-center shadow-sm">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nilai Saya</h1>
            <p className="text-sm text-muted-foreground">
              Pantau perkembangan skor dan lihat kemajuanmu
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          onClick={() => {
            fetchData();
            toast.success('Data berhasil diperbarui');
          }}
        >
          <Target className="mr-1.5 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className={`${cardBase} border-red-200 bg-red-50`}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              onClick={fetchData}
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cardBase}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Rata-rata</p>
                </div>
                <p className="text-3xl font-bold text-[#1F3864]">{overallStats.avg}</p>
                <p className="text-xs text-muted-foreground mt-0.5">dari 100</p>
              </CardContent>
            </Card>
            <Card className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Tertinggi</p>
                </div>
                <p className="text-3xl font-bold text-amber-600">{overallStats.highest}</p>
                <p className="text-xs text-muted-foreground mt-0.5">skor terbaik</p>
              </CardContent>
            </Card>
            <Card className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Terendah</p>
                </div>
                <p className="text-3xl font-bold text-red-500">{overallStats.lowest}</p>
                <p className="text-xs text-muted-foreground mt-0.5">perlu ditingkatkan</p>
              </CardContent>
            </Card>
            <Card className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-[#1F3864]/10 flex items-center justify-center">
                    <ClipboardList className="h-3.5 w-3.5 text-[#1F3864]" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Total Ujian</p>
                </div>
                <p className="text-3xl font-bold">{overallStats.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">diselesaikan</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Subject Cards */}
      <Card className={cardBase}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Nilai Per Mata Pelajaran</CardTitle>
              <CardDescription className="text-sm mt-1">
                Klik kartu untuk melihat detail riwayat ujian
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari mata pelajaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-lg focus:ring-2 focus:ring-[#1F3864]/20 focus:border-[#1F3864]/40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredSubjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubjects.map((subject) => {
                const colors = getScoreColorClass(subject.avgPercentage);
                return (
                  <React.Fragment key={subject.subjectId}>
                    <Card
                      className={`${cardBase} cursor-pointer border ${
                        expandedSubject === subject.subjectId ? 'ring-2 ring-[#1F3864]/20' : ''
                      }`}
                      onClick={() =>
                        setExpandedSubject(expandedSubject === subject.subjectId ? null : subject.subjectId)
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-9 w-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                              <BookOpen className={`h-4.5 w-4.5 ${colors.text}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">{subject.subjectName}</h3>
                              <p className="text-xs text-muted-foreground">{subject.subjectCode}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendIcon trend={subject.trend} />
                            <span className={`text-2xl font-bold ${colors.text}`}>
                              {Math.round(subject.avgPercentage)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
                              style={{ width: `${Math.max(subject.avgPercentage, 2)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span>{subject.totalAttempts}x dikerjakan</span>
                            <span className={`${colors.text} font-medium`}>{colors.label}</span>
                          </div>
                          <span className="font-medium">
                            Terbaik: <span className={colors.text}>{Math.round(subject.bestPercentage)}</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Expanded detail for this subject */}
                    {expandedSubject === subject.subjectId && (
                      <Card className={`${cardBase} border-0 shadow-none -mt-2 -mb-2`}>
                        <CardContent className="p-0">
                          <div className="rounded-xl border bg-muted/20 overflow-hidden">
                            <div className="px-4 py-2.5 bg-[#1F3864]/5 border-b flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-[#1F3864]" />
                              <span className="text-sm font-medium text-[#1F3864]">
                                Riwayat {subject.subjectName}
                              </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {subject.attempts
                                .sort(
                                  (a, b) =>
                                    new Date(b.submittedAt || b.startedAt).getTime() -
                                    new Date(a.submittedAt || a.startedAt).getTime()
                                )
                                .map((attempt) => {
                                  const aColors = getScoreColorClass(attempt.percentage);
                                  const examTitle = examTitleMap.get(attempt.examPackageId) || 'Ujian';
                                  return (
                                    <div
                                      key={attempt.id}
                                      className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium truncate">{examTitle}</p>
                                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                              <CalendarDays className="h-3 w-3" />
                                              {formatDate(attempt.submittedAt || attempt.startedAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Timer className="h-3 w-3" />
                                              {formatDuration(attempt.duration)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <div className="text-right">
                                            <p className={`text-lg font-bold ${aColors.text}`}>
                                              {Math.round(attempt.percentage)}%
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {attempt.totalCorrect} benar / {attempt.totalWrong} salah
                                            </p>
                                          </div>
                                          <div className={`h-8 w-8 rounded-lg ${aColors.bg} flex items-center justify-center`}>
                                            <span className={`text-xs font-bold ${aColors.text}`}>
                                              {Math.round(attempt.percentage)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Belum ada data nilai</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery
                  ? 'Tidak ditemukan mata pelajaran yang cocok'
                  : 'Mulai mengerjakan ujian untuk melihat nilai di sini'}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                  onClick={() => useAppStore.getState().navigateTo('siswa-tugas')}
                >
                  <ClipboardList className="mr-1.5 h-4 w-4" />
                  Mulai Ujian
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score History Table */}
      <Card className={cardBase}>
        <CardHeader>
          <CardTitle className="text-lg">Detail Semua Nilai</CardTitle>
          <CardDescription>
            Riwayat lengkap semua ujian yang telah dikerjakan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : completedAttempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ujian</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Mapel</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tanggal</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Skor</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center hidden md:table-cell">Benar/Salah</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center hidden lg:table-cell">Durasi</th>
                    <th className="pb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAttempts.map((attempt, idx) => {
                    const colors = getScoreColorClass(attempt.percentage);
                    const examTitle = examTitleMap.get(attempt.examPackageId) || 'Ujian';
                    const subjectName = attempt.answers[0]?.question?.subject?.name || '-';
                    return (
                      <tr
                        key={attempt.id}
                        className={`border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium max-w-[200px] truncate">{examTitle}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                          {subjectName}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(attempt.submittedAt || attempt.startedAt)}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${colors.bg} ${colors.text}`}>
                            {Math.round(attempt.percentage)}%
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center hidden md:table-cell">
                          <span className="text-emerald-600 font-medium">{attempt.totalCorrect}</span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-red-500 font-medium">{attempt.totalWrong}</span>
                        </td>
                        <td className="py-3 pr-4 text-center text-muted-foreground hidden lg:table-cell">
                          {formatDuration(attempt.duration)}
                        </td>
                        <td className="py-3 text-center">{getStatusBadge(attempt.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 font-medium">Belum ada nilai</p>
              <p className="text-sm mt-1">Kerjakan ujian pertamamu!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SISWA RIWAYAT VIEW
// ═══════════════════════════════════════════════════════════════════

export function SiswaRiwayatView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [attemptsRes, examsRes] = await Promise.all([
        fetch(`/api/attempts?userId=${user.id}`),
        fetch(`/api/exams${user.schoolId ? `?schoolId=${user.schoolId}` : ''}`),
      ]);
      if (!attemptsRes.ok || !examsRes.ok) throw new Error('Gagal mengambil data');
      const attemptsData: Attempt[] = await attemptsRes.json();
      const examsData: ExamPackage[] = await examsRes.json();
      setAttempts(attemptsData);
      setExams(examsData);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat riwayat. Coba refresh halaman.');
      toast.error('Gagal memuat riwayat');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build exam title map
  const examTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    exams.forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  // Filter attempts
  const filteredAttempts = useMemo(() => {
    let result = [...attempts];

    if (statusFilter !== 'semua') {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => {
        const title = examTitleMap.get(a.examPackageId) || '';
        const subject = a.answers[0]?.question?.subject?.name || '';
        return title.toLowerCase().includes(q) || subject.toLowerCase().includes(q);
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [attempts, statusFilter, searchQuery, examTitleMap]);

  // Stats
  const stats = useMemo(() => {
    const completed = attempts.filter((a) => a.status === 'submitted' || a.status === 'graded');
    const avgPct =
      completed.length > 0
        ? Math.round(completed.reduce((s, a) => s + a.percentage, 0) / completed.length)
        : 0;
    const totalDuration = attempts.reduce((s, a) => s + a.duration, 0);
    return {
      total: attempts.length,
      completed: completed.length,
      avgPct,
      totalDuration,
    };
  }, [attempts]);

  const filterTabs = [
    { key: 'semua', label: 'Semua' },
    { key: 'submitted', label: 'Selesai' },
    { key: 'in_progress', label: 'Berlangsung' },
    { key: 'graded', label: 'Dinilai' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d4a7a] flex items-center justify-center shadow-sm">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Riwayat Pengerjaan</h1>
            <p className="text-sm text-muted-foreground">
              Lihat semua aktivitas pengerjaan ujianmu
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          onClick={() => {
            fetchData();
            toast.success('Data berhasil diperbarui');
          }}
        >
          <Target className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className={`${cardBase} border-red-200 bg-red-50`}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              onClick={fetchData}
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={cardBase}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-[#1F3864]/10 flex items-center justify-center">
                  <ClipboardList className="h-3.5 w-3.5 text-[#1F3864]" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total</p>
              </div>
              <p className="text-3xl font-bold text-[#1F3864]">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">pengerjaan</p>
            </CardContent>
          </Card>
          <Card className={cardBase}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Selesai</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">diselesaikan</p>
            </CardContent>
          </Card>
          <Card className={cardBase}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Rata-rata</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.avgPct}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">skor rata-rata</p>
            </CardContent>
          </Card>
          <Card className={cardBase}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Timer className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Waktu Total</p>
              </div>
              <p className="text-3xl font-bold text-violet-600">{formatDuration(stats.totalDuration)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">waktu pengerjaan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ujian atau mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg focus:ring-2 focus:ring-[#1F3864]/20 focus:border-[#1F3864]/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map((tab) => {
            const count =
              tab.key === 'semua'
                ? attempts.length
                : attempts.filter((a) => a.status === tab.key).length;
            return (
              <Button
                key={tab.key}
                variant={statusFilter === tab.key ? 'default' : 'outline'}
                size="sm"
                className={`transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${
                  statusFilter === tab.key
                    ? 'bg-[#1F3864] hover:bg-[#152850]'
                    : ''
                }`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
                <Badge
                  variant="secondary"
                  className={`ml-1.5 h-5 px-1.5 text-[10px] ${
                    statusFilter === tab.key
                      ? 'bg-white/20 text-white hover:bg-white/20'
                      : ''
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className={cardBase}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredAttempts.length > 0 ? (
          filteredAttempts.map((attempt, idx) => {
            const colors = getScoreColorClass(attempt.percentage);
            const examTitle = examTitleMap.get(attempt.examPackageId) || 'Ujian';
            const subjectName = attempt.answers[0]?.question?.subject?.name;
            const isExpanded = expandedId === attempt.id;
            const isLast = idx === filteredAttempts.length - 1;

            return (
              <Card
                key={attempt.id}
                className={`${cardBase} ${isExpanded ? 'ring-2 ring-[#1F3864]/20' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center pt-1.5">
                      <div
                        className={`h-3 w-3 rounded-full border-2 ${
                          attempt.status === 'submitted' || attempt.status === 'graded'
                            ? 'bg-emerald-500 border-emerald-300'
                            : 'bg-blue-500 border-blue-300'
                        }`}
                      />
                      {!isLast && (
                        <div className="w-0.5 flex-1 bg-border mt-1 min-h-[24px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{examTitle}</h3>
                            {getStatusBadge(attempt.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateTime(attempt.startedAt)}
                            </span>
                            {attempt.duration > 0 && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {formatDuration(attempt.duration)}
                              </span>
                            )}
                            {subjectName && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {subjectName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                            <div className="text-right">
                              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                                <span className="text-lg font-bold">
                                  {Math.round(attempt.percentage)}%
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                {colors.label}
                              </p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                            onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Detail
                            {isExpanded ? (
                              <ChevronUp className="ml-1 h-3 w-3" />
                            ) : (
                              <ChevronDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Skor
                              </p>
                              <p className={`text-sm font-semibold mt-0.5 ${colors.text}`}>
                                {Math.round(attempt.percentage)}%
                                {attempt.tkaPrediction && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    (Prediksi TKA: {attempt.tkaPrediction})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Jawaban Benar
                              </p>
                              <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                                {attempt.totalCorrect} soal
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Jawaban Salah
                              </p>
                              <p className="text-sm font-semibold text-red-500 mt-0.5">
                                {attempt.totalWrong} soal
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Tidak Dijawab
                              </p>
                              <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                                {attempt.totalUnanswered} soal
                              </p>
                            </div>
                          </div>

                          {/* Score bar visualization */}
                          <div className="mt-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                              Distribusi Jawaban
                            </p>
                            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
                              {attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered > 0 && (
                                <>
                                  <div
                                    className="h-full bg-emerald-400 transition-all duration-500"
                                    style={{
                                      width: `${(attempt.totalCorrect / (attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered)) * 100}%`,
                                    }}
                                  />
                                  <div
                                    className="h-full bg-red-400 transition-all duration-500"
                                    style={{
                                      width: `${(attempt.totalWrong / (attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered)) * 100}%`,
                                    }}
                                  />
                                  <div
                                    className="h-full bg-gray-300 transition-all duration-500"
                                    style={{
                              width: `${(attempt.totalUnanswered / (attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered)) * 100}%`,
                            }}
                                  />
                                </>
                              )}
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Benar ({attempt.totalCorrect})
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-red-400" />
                                Salah ({attempt.totalWrong})
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-gray-300" />
                                Kosong ({attempt.totalUnanswered})
                              </span>
                            </div>
                          </div>

                          {attempt.submittedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Diserahkan pada {formatDateTime(attempt.submittedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className={cardBase}>
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Belum ada riwayat</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {statusFilter !== 'semua'
                  ? `Tidak ada riwayat dengan status "${statusFilter}"`
                  : searchQuery
                  ? 'Tidak ditemukan riwayat yang cocok'
                  : 'Mulai mengerjakan ujian untuk melihat riwayat di sini'}
              </p>
              {statusFilter === 'semua' && !searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                  onClick={() => useAppStore.getState().navigateTo('siswa-tugas')}
                >
                  <ClipboardList className="mr-1.5 h-4 w-4" />
                  Mulai Ujian
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
