'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  FileBarChart2,
  Users,
  GraduationCap,
  Trophy,
  TrendingUp,
  Download,
  RefreshCw,
  CalendarDays,
  Medal,
  BarChart3,
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
    subject: {
      id: string;
      name: string;
      code: string;
    };
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
    class?: { id: string; name: string } | null;
  };
  answers: AttemptAnswer[];
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalQuestions: number;
  avgScore: number;
  avgTka: number;
  recentAttempts: { percentage: number; tkaPrediction: number | null; createdAt: string }[];
}

// ─── Chart configs ───────────────────────────────────────────────────

const classComparisonConfig: ChartConfig = {
  rataRata: {
    label: 'Rata-rata Skor (%)',
    color: '#1F3864',
  },
};

const subjectByClassConfig: ChartConfig = {
 'XII IPA 1': { label: 'XII IPA 1', color: '#1F3864' },
 'XII IPA 2': { label: 'XII IPA 2', color: '#D4A017' },
 'XII IPS 1': { label: 'XII IPS 1', color: '#16a34a' },
 'XI IPA 1': { label: 'XI IPA 1', color: '#dc2626' },
};

// ─── Main Component ──────────────────────────────────────────────────

export function ReportsView() {
  const user = useAppStore((s) => s.user);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Fetch data
  const fetchData = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const [attemptsRes, dashRes] = await Promise.all([
        fetch(`/api/attempts?schoolId=${user.schoolId}`),
        fetch(`/api/analytics?type=dashboard&schoolId=${user.schoolId}`),
      ]);
      if (attemptsRes.ok) {
        const data = await attemptsRes.json();
        setAttempts(Array.isArray(data) ? data : []);
      }
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboardStats(data);
      }
    } catch {
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.schoolId]);

  // ─── Computed data ──────────────────────────────────────────────

  const filteredAttempts = useMemo(() => {
    let filtered = attempts;
    if (classFilter !== 'all') {
      filtered = filtered.filter((a) => a.classId === classFilter);
    }
    if (dateRange === '7d') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      filtered = filtered.filter((a) => new Date(a.submittedAt || a.startedAt) >= cutoff);
    } else if (dateRange === '30d') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      filtered = filtered.filter((a) => new Date(a.submittedAt || a.startedAt) >= cutoff);
    }
    return filtered;
  }, [attempts, classFilter, dateRange]);

  // Unique classes
  const uniqueClasses = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of attempts) {
      if (a.classId) map[a.classId] = a.classId;
    }
    return Object.keys(map);
  }, [attempts]);

  // Student ranking
  const studentRanking = useMemo(() => {
    const studentMap: Record<
      string,
      {
        name: string;
        classId: string | null;
        className: string;
        totalScore: number;
        totalAttempts: number;
        totalTka: number;
      }
    > = {};

    for (const a of filteredAttempts) {
      const uid = a.userId;
      if (!studentMap[uid]) {
        studentMap[uid] = {
          name: a.user?.name || 'Unknown',
          classId: a.classId,
          className: a.classId || '-',
          totalScore: 0,
          totalAttempts: 0,
          totalTka: 0,
        };
      }
      studentMap[uid].totalScore += a.percentage;
      studentMap[uid].totalAttempts++;
      if (a.tkaPrediction) studentMap[uid].totalTka += a.tkaPrediction;
    }

    return Object.entries(studentMap)
      .map(([, s]) => ({
        ...s,
        avgScore: Math.round((s.totalScore / s.totalAttempts) * 10) / 10,
        avgTka: Math.round(s.totalTka / s.totalAttempts),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredAttempts]);

  // Class comparison
  const classComparison = useMemo(() => {
    const classMap: Record<string, { total: number; count: number; name: string }> = {};
    for (const a of filteredAttempts) {
      const cid = a.classId || 'Tidak ada kelas';
      if (!classMap[cid]) {
        classMap[cid] = { total: 0, count: 0, name: cid };
      }
      classMap[cid].total += a.percentage;
      classMap[cid].count++;
    }
    return Object.values(classMap)
      .map((c) => ({
        kelas: c.name,
        rataRata:
          c.count > 0 ? Math.round((c.total / c.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.rataRata - a.rataRata);
  }, [filteredAttempts]);

  // Subject performance by class
  const subjectByClass = useMemo(() => {
    const map: Record<string, Record<string, { correct: number; total: number }>> = {};
    for (const a of filteredAttempts) {
      const cls = a.classId || 'Lainnya';
      if (!map[cls]) map[cls] = {};
      for (const ans of a.answers) {
        const subj = ans.question?.subject?.name || 'Lainnya';
        if (!map[cls][subj]) map[cls][subj] = { correct: 0, total: 0 };
        map[cls][subj].total++;
        if (ans.isCorrect) map[cls][subj].correct++;
      }
    }

    const classNames = Object.keys(map);
    const subjectNames = new Set<string>();
    for (const cls of Object.values(map)) {
      for (const subj of Object.keys(cls)) {
        subjectNames.add(subj);
      }
    }

    return {
      classNames,
      subjects: Array.from(subjectNames),
      data: Array.from(subjectNames).map((subj) => {
        const row: Record<string, string | number> = { subject: subj };
        for (const cls of classNames) {
          const d = map[cls]?.[subj];
          row[cls] = d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        }
        return row;
      }),
    };
  }, [filteredAttempts]);

  // ─── Empty state ────────────────────────────────────────────────

  const isEmpty = !loading && filteredAttempts.length === 0;

  // ─── Export handler (mock) ──────────────────────────────────────

  const handleExport = () => {
    toast.info('Fitur export akan segera hadir');
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7 text-[#D4A017]" />
            Laporan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan performa akademik sekolah
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Waktu</SelectItem>
              <SelectItem value="30d">30 Hari Terakhir</SelectItem>
              <SelectItem value="7d">7 Hari Terakhir</SelectItem>
            </SelectContent>
          </Select>
          {uniqueClasses.length > 0 && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {uniqueClasses.map((cid) => (
                  <SelectItem key={cid} value={cid}>
                    {cid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F3864]/10">
                  <Users className="h-5 w-5 text-[#1F3864]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardStats?.totalStudents ?? filteredAttempts.length > 0
                      ? new Set(filteredAttempts.map((a) => a.userId)).size
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Siswa Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4A017]/10">
                  <GraduationCap className="h-5 w-5 text-[#D4A017]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardStats?.totalClasses ??
                    (uniqueClasses.length > 0 ? uniqueClasses.length : 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Jumlah Kelas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardStats?.avgScore ??
                    (filteredAttempts.length > 0
                      ? Math.round(
                          filteredAttempts.reduce((s, a) => s + a.percentage, 0) /
                            filteredAttempts.length,
                        )
                      : 0)}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <Trophy className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardStats?.avgTka ??
                    (filteredAttempts.length > 0
                      ? Math.round(
                          filteredAttempts.reduce(
                            (s, a) => s + (a.tkaPrediction || 0),
                            0,
                          ) / filteredAttempts.length,
                        )
                      : 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Prediksi TKA Rata-rata</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <>
          <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
          </Card>
        </>
      ) : isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileBarChart2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Belum Ada Data Laporan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Laporan akan tersedia setelah siswa mulai mengerjakan tryout di sekolah ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="ranking" className="gap-1.5">
              <Medal className="h-4 w-4" />
              Peringkat Siswa
            </TabsTrigger>
            <TabsTrigger value="class-compare" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Perbandingan Kelas
            </TabsTrigger>
            <TabsTrigger value="subject-class" className="gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Mata Uji per Kelas
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Student Ranking ── */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Peringkat Siswa
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="max-h-[480px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 w-16 text-center">Rank</TableHead>
                        <TableHead className="px-4">Nama</TableHead>
                        <TableHead className="px-4">Kelas</TableHead>
                        <TableHead className="px-4 text-center">Rata-rata Skor</TableHead>
                        <TableHead className="px-4 text-center">Prediksi TKA</TableHead>
                        <TableHead className="px-4 text-center">Total Percobaan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentRanking.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Tidak ada data
                          </TableCell>
                        </TableRow>
                      ) : (
                        studentRanking.map((s, idx) => (
                          <TableRow key={s.name}>
                            <TableCell className="px-4 text-center">
                              {idx === 0 ? (
                                <Badge className="bg-amber-400 text-[#1F3864] hover:bg-amber-400 border-0 font-bold">
                                  1
                                </Badge>
                              ) : idx === 1 ? (
                                <Badge className="bg-gray-300 text-gray-700 hover:bg-gray-300 border-0 font-bold">
                                  2
                                </Badge>
                              ) : idx === 2 ? (
                                <Badge className="bg-amber-700 text-white hover:bg-amber-700 border-0 font-bold">
                                  3
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground font-medium">
                                  {idx + 1}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 font-medium">{s.name}</TableCell>
                            <TableCell className="px-4">
                              <Badge variant="outline">{s.className}</Badge>
                            </TableCell>
                            <TableCell className="px-4 text-center">
                              <span
                                className={`font-semibold ${
                                  s.avgScore >= 70
                                    ? 'text-green-700'
                                    : s.avgScore >= 50
                                      ? 'text-amber-700'
                                      : 'text-red-600'
                                }`}
                              >
                                {s.avgScore}%
                              </span>
                            </TableCell>
                            <TableCell className="px-4 text-center font-mono text-sm">
                              {s.avgTka}
                            </TableCell>
                            <TableCell className="px-4 text-center text-muted-foreground">
                              {s.totalAttempts}x
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Class Comparison ── */}
          <TabsContent value="class-compare">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Perbandingan Rata-rata Skor per Kelas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={classComparisonConfig}
                  className="h-[350px] w-full"
                >
                  <BarChart
                    data={classComparison}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="kelas" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="rataRata"
                      fill="var(--color-rataRata)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Subject by Class ── */}
          <TabsContent value="subject-class">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Performa Mata Uji per Kelas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {subjectByClass.subjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada data
                  </div>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-4">Mata Uji</TableHead>
                          {subjectByClass.classNames.map((cls) => (
                            <TableHead key={cls} className="px-4 text-center">
                              {cls}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectByClass.data.map((row) => (
                          <TableRow key={row.subject as string}>
                            <TableCell className="px-4 font-medium">
                              {row.subject as string}
                            </TableCell>
                            {subjectByClass.classNames.map((cls) => {
                              const val = row[cls] as number;
                              return (
                                <TableCell key={cls} className="px-4 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      val >= 70
                                        ? 'bg-green-100 text-green-700'
                                        : val >= 50
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {val}%
                                  </span>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
