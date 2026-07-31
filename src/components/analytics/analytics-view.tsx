'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart3,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

interface AttemptAnswer {
  id: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  question: {
    id: string;
    content: string;
    type: string;
    answer: string | null;
    options: string | null;
    difficulty: string;
    cognitiveLevel: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
    topic: {
      id: string;
      name: string;
    } | null;
  };
}

interface Attempt {
  id: string;
  userId: string;
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
  user: {
    id: string;
    name: string;
  };
  answers: AttemptAnswer[];
}

// ─── Chart configs ───────────────────────────────────────────────────

const distributionConfig: ChartConfig = {
  jumlah: {
    label: 'Jumlah Siswa',
    color: '#1F3864',
  },
};

const subjectConfig: ChartConfig = {
  rataRata: {
    label: 'Rata-rata (%)',
    color: '#D4A017',
  },
};

// ─── Helper: Difficulty Badge ────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    mudah: { label: 'Mudah', variant: 'secondary' },
    sedang: { label: 'Sedang', variant: 'default' },
    sulit: { label: 'Sulit', variant: 'destructive' },
  };
  const d = map[difficulty] || { label: difficulty, variant: 'outline' as const };
  return <Badge variant={d.variant}>{d.label}</Badge>;
}

// ─── Main Component ──────────────────────────────────────────────────

export function AnalyticsView() {
  const user = useAppStore((s) => s.user);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string>('all');

  // Fetch attempts
  const fetchData = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attempts?schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setAttempts(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Gagal memuat data analisis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.schoolId]);

  // ─── Computed data ──────────────────────────────────────────────

  const filteredAttempts = useMemo(() => {
    if (classFilter === 'all') return attempts;
    return attempts.filter((a) => a.classId === classFilter);
  }, [attempts, classFilter]);

  const uniqueClassIds = useMemo(
    () => [...new Set(attempts.map((a) => a.classId).filter(Boolean))],
    [attempts],
  );

  // Score distribution buckets
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0–20', min: 0, max: 20, jumlah: 0 },
      { range: '20–40', min: 20, max: 40, jumlah: 0 },
      { range: '40–60', min: 40, max: 60, jumlah: 0 },
      { range: '60–80', min: 60, max: 80, jumlah: 0 },
      { range: '80–100', min: 80, max: 100, jumlah: 0 },
    ];
    for (const a of filteredAttempts) {
      for (const b of buckets) {
        if (a.percentage >= b.min && a.percentage < b.max) {
          b.jumlah++;
          break;
        }
        if (a.percentage === 100 && b.max === 100) {
          b.jumlah++;
          break;
        }
      }
    }
    return buckets;
  }, [filteredAttempts]);

  // Subject performance
  const subjectPerformance = useMemo(() => {
    const subjectMap: Record<string, { correct: number; total: number; name: string }> = {};
    for (const a of filteredAttempts) {
      for (const ans of a.answers) {
        const subjName = ans.question?.subject?.name || 'Lainnya';
        if (!subjectMap[subjName]) {
          subjectMap[subjName] = { correct: 0, total: 0, name: subjName };
        }
        subjectMap[subjName].total++;
        if (ans.isCorrect) subjectMap[subjName].correct++;
      }
    }
    return Object.values(subjectMap)
      .map((s) => ({
        subject: s.name,
        rataRata: s.total > 0 ? Math.round((s.correct / s.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.rataRata - b.rataRata);
  }, [filteredAttempts]);

  // Item analysis: question-level stats (top 10 problematic)
  const itemAnalysis = useMemo(() => {
    const qMap: Record<string, {
      questionId: string;
      content: string;
      subject: string;
      topic: string;
      difficulty: string;
      answers: Record<string, number>; // option -> count
      correct: number;
      total: number;
    }> = {};

    for (const a of filteredAttempts) {
      for (const ans of a.answers) {
        const qId = ans.questionId;
        if (!qId) continue;
        if (!qMap[qId]) {
          qMap[qId] = {
            questionId: qId,
            content: ans.question?.content || '',
            subject: ans.question?.subject?.name || '-',
            topic: ans.question?.topic?.name || '-',
            difficulty: ans.question?.difficulty || 'sedang',
            answers: {},
            correct: 0,
            total: 0,
          };
        }
        qMap[qId].total++;
        if (ans.isCorrect) qMap[qId].correct++;

        const opt = ans.answer || '-';
        qMap[qId].answers[opt] = (qMap[qId].answers[opt] || 0) + 1;
      }
    }

    return Object.values(qMap)
      .map((q) => {
        const p = q.total > 0 ? q.correct / q.total : 0;
        // Daya beda simplified: compare top 27% vs bottom 27%
        // Since we don't have per-user scores here, we approximate
        const distEntries = Object.entries(q.answers).sort(([, a], [, b]) => b - a);
        const totalOpts = distEntries.reduce((s, [, c]) => s + c, 0) || 1;
        const distractorPct = distEntries.slice(0, 2).reduce((s, [, c]) => s + c, 0) / totalOpts;

        return {
          ...q,
          tingkatKesukaran: Math.round(p * 100),
          dayaBeda: Math.round(distractorPct * 100),
          distribution: Object.fromEntries(
            ['A', 'B', 'C', 'D', 'E'].map((opt) => {
              const count = q.answers[opt] || 0;
              return [opt, totalOpts > 0 ? Math.round((count / totalOpts) * 100) : 0];
            }),
          ),
        };
      })
      .sort((a, b) => a.tingkatKesukaran - b.tingkatKesukaran)
      .slice(0, 10);
  }, [filteredAttempts]);

  // Weakest topics
  const weakTopics = useMemo(() => {
    const topicMap: Record<string, { correct: number; total: number; name: string; subject: string }> = {};
    for (const a of filteredAttempts) {
      for (const ans of a.answers) {
        const tName = ans.question?.topic?.name;
        const sName = ans.question?.subject?.name || '';
        if (!tName) continue;
        if (!topicMap[tName]) {
          topicMap[tName] = { correct: 0, total: 0, name: tName, subject: sName };
        }
        topicMap[tName].total++;
        if (ans.isCorrect) topicMap[tName].correct++;
      }
    }
    return Object.values(topicMap)
      .map((t) => ({
        ...t,
        percentage: t.total > 0 ? Math.round((t.correct / t.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [filteredAttempts]);

  // ─── Empty state ────────────────────────────────────────────────

  const isEmpty = !loading && filteredAttempts.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-[#D4A017]" />
            Nilai &amp; Analisis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analisis mendalam performa siswa berdasarkan hasil tryout
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uniqueClassIds.length > 0 && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {uniqueClassIds.map((cid) => (
                  <SelectItem key={cid} value={cid!}>
                    {cid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!isEmpty && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F3864]/10">
                  <BookOpen className="h-5 w-5 text-[#1F3864]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredAttempts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Percobaan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4A017]/10">
                  <Target className="h-5 w-5 text-[#D4A017]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredAttempts.length > 0
                        ? Math.round(
                            filteredAttempts.reduce((s, a) => s + a.percentage, 0) /
                              filteredAttempts.length,
                          )
                        : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Rata-rata Skor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <TrendingDown className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredAttempts.length > 0
                        ? Math.round(
                            filteredAttempts.reduce(
                              (s, a) => s + (a.tkaPrediction || 0),
                              0,
                            ) / filteredAttempts.length,
                          )
                        : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Prediksi TKA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {itemAnalysis.filter((q) => q.tingkatKesukaran < 40).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Soal Bermasalah</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Belum Ada Data Analisis
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Data akan muncul setelah siswa mengerjakan tryout. Pastikan tryout telah dijadwalkan dan dikerjakan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Distribusi Skor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={distributionConfig} className="h-[300px] w-full">
                  <BarChart data={scoreDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="jumlah"
                      fill="var(--color-jumlah)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Subject Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Performa per Mata Uji
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={subjectConfig} className="h-[300px] w-full">
                  <BarChart
                    data={subjectPerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                      width={75}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="rataRata"
                      fill="var(--color-rataRata)"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Item Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Analisis Butir Soal — 10 Soal Paling Bermasalah
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4">Soal #</TableHead>
                      <TableHead className="px-4">Mata Uji</TableHead>
                      <TableHead className="px-4">Topik</TableHead>
                      <TableHead className="px-4">Tingkat Kesukaran</TableHead>
                      <TableHead className="px-4">Daya Beda</TableHead>
                      <TableHead className="px-4 text-center">A</TableHead>
                      <TableHead className="px-4 text-center">B</TableHead>
                      <TableHead className="px-4 text-center">C</TableHead>
                      <TableHead className="px-4 text-center">D</TableHead>
                      <TableHead className="px-4 text-center">E</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemAnalysis.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Tidak ada data analisis
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemAnalysis.map((item, idx) => {
                        const dist = item.distribution as Record<string, number>;
                        return (
                          <TableRow key={item.questionId}>
                            <TableCell className="px-4 font-mono text-xs">
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="px-4 font-medium">
                              {item.subject}
                            </TableCell>
                            <TableCell className="px-4 text-muted-foreground">
                              {item.topic}
                            </TableCell>
                            <TableCell className="px-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  item.tingkatKesukaran < 30
                                    ? 'bg-red-100 text-red-700'
                                    : item.tingkatKesukaran < 60
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {item.tingkatKesukaran}%
                              </span>
                            </TableCell>
                            <TableCell className="px-4">
                              <DifficultyBadge difficulty={item.difficulty} />
                            </TableCell>
                            <TableCell className="px-4 text-center text-xs">
                              {dist?.A ?? 0}%
                            </TableCell>
                            <TableCell className="px-4 text-center text-xs">
                              {dist?.B ?? 0}%
                            </TableCell>
                            <TableCell className="px-4 text-center text-xs">
                              {dist?.C ?? 0}%
                            </TableCell>
                            <TableCell className="px-4 text-center text-xs">
                              {dist?.D ?? 0}%
                            </TableCell>
                            <TableCell className="px-4 text-center text-xs">
                              {dist?.E ?? 0}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Weakest Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Topik Paling Lemah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada data topik
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {weakTopics.slice(0, 6).map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.subject}
                        </p>
                      </div>
                      <div className="ml-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            t.percentage < 30
                              ? 'bg-red-100 text-red-700'
                              : t.percentage < 50
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {t.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
