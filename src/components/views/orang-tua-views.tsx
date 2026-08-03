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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Target,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ClipboardList,
  CalendarDays,
  FileText,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Award,
  CalendarCheck,
  Stethoscope,
  UserX,
  CircleDot,
  BookOpenCheck,
  Timer,
  Minus,
  Search,
  Eye,
  Loader2,
  ArrowRight,
  GraduationCap,
  FileBarChart,
} from 'lucide-react';

// ─── Shared Types ───────────────────────────────────────────────────

interface ChildOption {
  id: string;
  name: string;
  className: string;
}

interface SubjectScore {
  subject: string;
  avgScore: number;
  highestScore: number;
  totalExams: number;
  trend: 'up' | 'down' | 'stable';
}

interface ScoreEntry {
  id: string;
  examName: string;
  date: string;
  score: number;
  status: 'Lulus' | 'Belum Lulus';
}

interface MaterialItem {
  id: string;
  title: string;
  status: 'Selesai' | 'Sedang' | 'Belum';
  progress: number;
  read?: boolean;
}

interface SubjectMaterial {
  subject: string;
  icon: string;
  totalMateri: number;
  completedMateri: number;
  masteryLevel: string;
  materials: MaterialItem[];
}

interface AttendanceEntry {
  date: string;
  subject: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
  note: string;
}

interface AttemptEntry {
  id: string;
  title: string;
  date: string;
  score: number;
  duration: string;
  correct: number;
  wrong: number;
  total?: number;
  type: 'Tryout' | 'Diagnostic' | 'Latihan';
}

interface ReportEntry {
  id: string;
  fileName: string;
  type: string;
  downloadedAt: string;
}

// ─── Shared Helpers ─────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  if (score >= 55) return 'text-orange-600';
  return 'text-red-600';
}

function scoreBgColor(score: number) {
  if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (score >= 55) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function progressBarColor(score: number) {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-amber-500';
  if (score >= 55) return 'bg-orange-500';
  return 'bg-red-500';
}

function scoreGradeLabel(score: number) {
  if (score >= 85) return 'Sangat Baik';
  if (score >= 70) return 'Baik';
  if (score >= 55) return 'Cukup';
  return 'Perlu Ditingkatkan';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Shared: Gradient Icon Header ───────────────────────────────────

function PageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

// ─── Shared: Child Selector (pills with avatar initials) ────────────

function ChildSelector({
  childList,
  selected,
  onSelect,
}: {
  childList: ChildOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (childList.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground mr-1">Anak:</span>
      <div className="flex gap-1.5">
        {childList.map((child) => {
          const isActive = selected === child.id;
          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {getInitials(child.name)}
              </span>
              <span className="hidden sm:inline">{child.name}</span>
              <span className="hidden md:inline text-xs opacity-70">
                ({child.className})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared: Loading Skeleton ───────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-xl">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared: Empty State ────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
        <Icon className="h-9 w-9 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs mt-1 text-center max-w-xs">{subtitle}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. OrtuNilaiView — Nilai & Progres Anak
// ═══════════════════════════════════════════════════════════════════

export function OrtuNilaiView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [periodFilter, setPeriodFilter] = useState('Semua');
  const [selectedSubject, setSelectedSubject] = useState<SubjectScore | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [avgScore, setAvgScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [classRank, setClassRank] = useState(0);
  const [totalClassmates, setTotalClassmates] = useState(0);
  const [totalTryout, setTotalTryout] = useState(0);

  const [subjects, setSubjects] = useState<SubjectScore[]>([]);
  const [scoreTrend, setScoreTrend] = useState<{ label: string; value: number }[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreEntry[]>([]);

  const periods = ['Semua', 'Semester 1', 'Semester 2', 'Ganjil', 'Genap'];

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) fetchChildScores();
  }, [selectedChild]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?parentId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChildOption[] = Array.isArray(data)
          ? data.map((d: Record<string, string>) => ({
              id: d.id,
              name: d.name,
              className: d.className || '-',
            }))
          : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }
    } catch {
      const mockChildren: ChildOption[] = [
        { id: 'c1', name: 'Ahmad Rizky', className: 'XII IPA 1' },
        { id: 'c2', name: 'Siti Aisyah', className: 'XI IPA 2' },
      ];
      setChildren(mockChildren);
      setSelectedChild(mockChildren[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchChildScores() {
    try {
      const res = await fetch(`/api/scores?studentId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setAvgScore(data.avgScore ?? 0);
        setHighScore(data.highScore ?? 0);
        setClassRank(data.classRank ?? 0);
        setTotalClassmates(data.totalClassmates ?? 0);
        setTotalTryout(data.totalTryout ?? 0);
        setSubjects(data.subjects ?? []);
        setScoreTrend(data.scoreTrend ?? []);
        setRecentScores(data.recentScores ?? []);
        return;
      }
    } catch {
      // silent
    }
    setAvgScore(72.5);
    setHighScore(91.3);
    setClassRank(5);
    setTotalClassmates(32);
    setTotalTryout(8);
    setSubjects([
      { subject: 'Matematika', avgScore: 68, highestScore: 85, totalExams: 8, trend: 'up' },
      { subject: 'Fisika', avgScore: 74, highestScore: 91, totalExams: 8, trend: 'up' },
      { subject: 'Kimia', avgScore: 70, highestScore: 88, totalExams: 8, trend: 'down' },
      { subject: 'Biologi', avgScore: 78, highestScore: 92, totalExams: 8, trend: 'up' },
      { subject: 'Bahasa Indonesia', avgScore: 82, highestScore: 95, totalExams: 6, trend: 'stable' },
      { subject: 'Bahasa Inggris', avgScore: 65, highestScore: 80, totalExams: 6, trend: 'down' },
      { subject: 'Sejarah', avgScore: 75, highestScore: 89, totalExams: 4, trend: 'up' },
      { subject: 'Geografi', avgScore: 71, highestScore: 84, totalExams: 4, trend: 'stable' },
    ]);
    setScoreTrend([
      { label: 'Tryout 1', value: 55 },
      { label: 'Tryout 2', value: 60 },
      { label: 'Tryout 3', value: 63 },
      { label: 'Tryout 4', value: 68 },
      { label: 'Tryout 5', value: 65 },
      { label: 'Tryout 6', value: 72 },
      { label: 'Tryout 7', value: 76 },
      { label: 'Tryout 8', value: 78 },
    ]);
    setRecentScores([
      { id: '1', examName: 'Tryout 8 - TKA', date: '2025-01-15', score: 78, status: 'Lulus' },
      { id: '2', examName: 'Tryout 7 - TKA', date: '2025-01-08', score: 76, status: 'Lulus' },
      { id: '3', examName: 'Latihan Fisika 3', date: '2025-01-05', score: 82, status: 'Lulus' },
      { id: '4', examName: 'Tryout 6 - TKA', date: '2024-12-28', score: 72, status: 'Lulus' },
      { id: '5', examName: 'Tryout 5 - TKA', date: '2024-12-20', score: 65, status: 'Belum Lulus' },
      { id: '6', examName: 'Diagnostic Test', date: '2024-12-01', score: 55, status: 'Belum Lulus' },
    ]);
  }

  const maxTrendValue = Math.max(...scoreTrend.map((s) => s.value), 100);

  function handleSubjectClick(subject: SubjectScore) {
    setSelectedSubject(subject);
    setDialogOpen(true);
  }

  function statusBadge(status: string) {
    if (status === 'Lulus')
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Lulus
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-full text-xs">
        <XCircle className="mr-1 h-3 w-3" />
        Belum Lulus
      </Badge>
    );
  }

  function trendIcon(trend: string) {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    return <Minus className="h-3.5 w-3.5 text-amber-500" />;
  }

  function handlePrint() {
    toast.info('Menyiapkan laporan nilai untuk dicetak...');
    setTimeout(() => {
      window.print();
      toast.success('Laporan nilai berhasil dicetak!');
    }, 1000);
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          icon={BarChart3}
          title="Nilai & Progres Anak"
          description="Pantau perkembangan nilai dan performa akademik anak Anda."
        />
        <div className="flex items-center gap-3 flex-wrap">
          <ChildSelector childList={children} selected={selectedChild} onSelect={setSelectedChild} />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handlePrint}
        >
          <Printer className="mr-2 h-4 w-4" />
          Cetak
        </Button>
        </div>
      </div>

      {/* Period Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              periodFilter === p
                ? 'bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-[#1F3864]/[0.03] to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${scoreBgColor(avgScore)}`}>
                {scoreGradeLabel(avgScore)}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Rata-rata Skor</p>
            <p className={`text-3xl font-bold mt-1 ${scoreColor(avgScore)}`}>{avgScore}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-amber-50/80 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Skor Tertinggi</p>
            <p className="text-3xl font-bold mt-1 text-amber-600">{highScore}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-emerald-50/80 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white">
                <Award className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Top {Math.round((classRank / totalClassmates) * 100)}%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Peringkat di Kelas</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">
              {classRank > 0 ? (
                <>
                  <span className="text-xl">#</span>{classRank}
                  <span className="text-base font-normal text-muted-foreground ml-1">/ {totalClassmates}</span>
                </>
              ) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-sky-50/80 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-500 text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Total
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Tryout</p>
            <p className="text-3xl font-bold mt-1 text-sky-600">{totalTryout}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown + Score Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Breakdown */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nilai Per Mata Pelajaran</CardTitle>
            <CardDescription className="text-xs">
              Klik mata pelajaran untuk melihat detail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
            {subjects.map((s) => (
              <div
                key={s.subject}
                onClick={() => handleSubjectClick(s)}
                className="group p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium group-hover:text-[#1F3864] transition-colors">{s.subject}</span>
                    {trendIcon(s.trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${scoreColor(s.avgScore)}`}>{s.avgScore}</span>
                    <span className="text-xs text-muted-foreground">
                      / {s.highestScore}
                    </span>
                  </div>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${progressBarColor(s.avgScore)}`}
                    style={{ width: `${s.avgScore}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{s.totalExams} tryout dikerjakan</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Score Trend Bar Chart */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tren Skor</CardTitle>
            <CardDescription className="text-xs">
              Perkembangan skor dari waktu ke waktu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scoreTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-52">
                {scoreTrend.map((item, idx) => {
                  const heightPct = (item.value / maxTrendValue) * 100;
                  const isLast = idx === scoreTrend.length - 1;
                  const prev = idx > 0 ? scoreTrend[idx - 1].value : item.value;
                  const isImproved = item.value >= prev;
                  return (
                    <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${isLast ? scoreColor(item.value) : 'text-muted-foreground'}`}>
                        {item.value}
                      </span>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                          isLast
                            ? 'bg-gradient-to-t from-[#1F3864] to-[#2d5289]'
                            : isImproved
                              ? 'bg-[#1F3864]/40 hover:bg-[#1F3864]/60'
                              : 'bg-red-300/60 hover:bg-red-300'
                        }`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">
                        {item.label.replace('Tryout ', 'T')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="Belum ada data tren skor" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Scores Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Nilai Terbaru</CardTitle>
          <CardDescription className="text-xs">Riwayat nilai tryout dan latihan terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {recentScores.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Tryout</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScores.map((s) => (
                    <TableRow key={s.id} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{s.examName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-lg font-bold ${scoreColor(s.score)}`}>{s.score}</span>
                      </TableCell>
                      <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={FileText} title="Belum ada data nilai" />
          )}
        </CardContent>
      </Card>

      {/* Score Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200">
          {selectedSubject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedSubject.subject}
                  {trendIcon(selectedSubject.trend)}
                </DialogTitle>
                <DialogDescription>
                  Detail nilai {selectedSubject.subject}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Score Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Rata-rata</p>
                    <p className={`text-2xl font-bold ${scoreColor(selectedSubject.avgScore)}`}>{selectedSubject.avgScore}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Tertinggi</p>
                    <p className="text-2xl font-bold text-amber-600">{selectedSubject.highestScore}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Total Ujian</p>
                    <p className="text-2xl font-bold">{selectedSubject.totalExams}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Kategori</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${scoreBgColor(selectedSubject.avgScore)}`}>
                      {scoreGradeLabel(selectedSubject.avgScore)}
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${progressBarColor(selectedSubject.avgScore)}`}
                      style={{ width: `${selectedSubject.avgScore}%` }}
                    />
                  </div>
                </div>

                {/* Trend Info */}
                <div className="p-3 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-2">
                    {selectedSubject.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : selectedSubject.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      Tren: {selectedSubject.trend === 'up' ? 'Meningkat' : selectedSubject.trend === 'down' ? 'Menurun' : 'Stabil'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSubject.trend === 'up'
                      ? 'Nilai anak menunjukkan peningkatan positif.'
                      : selectedSubject.trend === 'down'
                        ? 'Nilai anak menunjukkan penurunan, perlu perhatian lebih.'
                        : 'Nilai anak cenderung stabil.'}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. OrtuMateriView — Materi Pelajaran
// ═══════════════════════════════════════════════════════════════════

export function OrtuMateriView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [subjects, setSubjects] = useState<SubjectMaterial[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('Semua');

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) fetchMaterials();
  }, [selectedChild]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?parentId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChildOption[] = Array.isArray(data)
          ? data.map((d: Record<string, string>) => ({
              id: d.id,
              name: d.name,
              className: d.className || '-',
            }))
          : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }
    } catch {
      const mockChildren: ChildOption[] = [
        { id: 'c1', name: 'Ahmad Rizky', className: 'XII IPA 1' },
        { id: 'c2', name: 'Siti Aisyah', className: 'XI IPA 2' },
      ];
      setChildren(mockChildren);
      setSelectedChild(mockChildren[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMaterials() {
    try {
      const res = await fetch(`/api/materials?studentId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects ?? []);
        return;
      }
    } catch {
      // silent
    }
    setSubjects([
      {
        subject: 'Matematika', icon: '📐', totalMateri: 12, completedMateri: 8, masteryLevel: 'Baik',
        materials: [
          { id: 'm1', title: 'Aljabar', status: 'Selesai', progress: 100, read: true },
          { id: 'm2', title: 'Geometri', status: 'Selesai', progress: 100, read: true },
          { id: 'm3', title: 'Trigonometri', status: 'Selesai', progress: 100, read: true },
          { id: 'm4', title: 'Kalkulus Diferensial', status: 'Selesai', progress: 100, read: true },
          { id: 'm5', title: 'Kalkulus Integral', status: 'Sedang', progress: 60, read: false },
          { id: 'm6', title: 'Statistika', status: 'Sedang', progress: 30, read: false },
          { id: 'm7', title: 'Peluang', status: 'Belum', progress: 0, read: false },
          { id: 'm8', title: 'Matriks', status: 'Belum', progress: 0, read: false },
          { id: 'm9', title: 'Vektor', status: 'Selesai', progress: 100, read: true },
          { id: 'm10', title: 'Barisan & Deret', status: 'Selesai', progress: 100, read: true },
          { id: 'm11', title: 'Logaritma', status: 'Selesai', progress: 100, read: true },
          { id: 'm12', title: 'Persamaan Kuadrat', status: 'Selesai', progress: 100, read: true },
        ],
      },
      {
        subject: 'Fisika', icon: '⚡', totalMateri: 10, completedMateri: 7, masteryLevel: 'Baik',
        materials: [
          { id: 'f1', title: 'Kinematika', status: 'Selesai', progress: 100, read: true },
          { id: 'f2', title: 'Dinamika', status: 'Selesai', progress: 100, read: true },
          { id: 'f3', title: 'Usaha & Energi', status: 'Selesai', progress: 100, read: true },
          { id: 'f4', title: 'Momentum & Impuls', status: 'Selesai', progress: 100, read: true },
          { id: 'f5', title: 'Gerak Harmonik', status: 'Selesai', progress: 100, read: true },
          { id: 'f6', title: 'Gelombang', status: 'Sedang', progress: 45, read: false },
          { id: 'f7', title: 'Optika', status: 'Sedang', progress: 20, read: false },
          { id: 'f8', title: 'Listrik Statis', status: 'Selesai', progress: 100, read: true },
          { id: 'f9', title: 'Listrik Dinamis', status: 'Selesai', progress: 100, read: true },
          { id: 'f10', title: 'Magnit', status: 'Belum', progress: 0, read: false },
        ],
      },
      {
        subject: 'Kimia', icon: '🧪', totalMateri: 9, completedMateri: 4, masteryLevel: 'Cukup',
        materials: [
          { id: 'k1', title: 'Atom & Molekul', status: 'Selesai', progress: 100, read: true },
          { id: 'k2', title: 'Ikatan Kimia', status: 'Selesai', progress: 100, read: true },
          { id: 'k3', title: 'Stoikiometri', status: 'Selesai', progress: 100, read: true },
          { id: 'k4', title: 'Termokimia', status: 'Selesai', progress: 100, read: true },
          { id: 'k5', title: 'Larutan', status: 'Sedang', progress: 50, read: false },
          { id: 'k6', title: 'Asam Basa', status: 'Belum', progress: 0, read: false },
          { id: 'k7', title: 'Redoks', status: 'Belum', progress: 0, read: false },
          { id: 'k8', title: 'Organik', status: 'Belum', progress: 0, read: false },
          { id: 'k9', title: 'Kinetika', status: 'Belum', progress: 0, read: false },
        ],
      },
      {
        subject: 'Biologi', icon: '🧬', totalMateri: 11, completedMateri: 9, masteryLevel: 'Sangat Baik',
        materials: [
          { id: 'b1', title: 'Sel', status: 'Selesai', progress: 100, read: true },
          { id: 'b2', title: 'Genetika', status: 'Selesai', progress: 100, read: true },
          { id: 'b3', title: 'Evolusi', status: 'Selesai', progress: 100, read: true },
          { id: 'b4', title: 'Ekologi', status: 'Selesai', progress: 100, read: true },
          { id: 'b5', title: 'Anatomi Tumbuhan', status: 'Selesai', progress: 100, read: true },
          { id: 'b6', title: 'Sistem Pencernaan', status: 'Selesai', progress: 100, read: true },
          { id: 'b7', title: 'Sistem Peredaran Darah', status: 'Selesai', progress: 100, read: true },
          { id: 'b8', title: 'Sistem Saraf', status: 'Sedang', progress: 70, read: false },
          { id: 'b9', title: 'Sistem Reproduksi', status: 'Sedang', progress: 40, read: false },
          { id: 'b10', title: 'Bioteknologi', status: 'Belum', progress: 0, read: false },
          { id: 'b11', title: 'Imunologi', status: 'Selesai', progress: 100, read: true },
        ],
      },
      {
        subject: 'Bahasa Indonesia', icon: '📝', totalMateri: 8, completedMateri: 6, masteryLevel: 'Baik',
        materials: [
          { id: 'bi1', title: 'Teks Narasi', status: 'Selesai', progress: 100, read: true },
          { id: 'bi2', title: 'Teks Argumentasi', status: 'Selesai', progress: 100, read: true },
          { id: 'bi3', title: 'Teks Eksposisi', status: 'Selesai', progress: 100, read: true },
          { id: 'bi4', title: 'Teks Persuasi', status: 'Selesai', progress: 100, read: true },
          { id: 'bi5', title: 'Puisi & Sastra', status: 'Sedang', progress: 55, read: false },
          { id: 'bi6', title: 'Tata Bahasa', status: 'Sedang', progress: 30, read: false },
          { id: 'bi7', title: 'Paragraf', status: 'Selesai', progress: 100, read: true },
          { id: 'bi8', title: 'Ringkasan', status: 'Belum', progress: 0, read: false },
        ],
      },
      {
        subject: 'Bahasa Inggris', icon: '🌍', totalMateri: 8, completedMateri: 3, masteryLevel: 'Perlu Ditingkatkan',
        materials: [
          { id: 'be1', title: 'Reading Comprehension', status: 'Selesai', progress: 100, read: true },
          { id: 'be2', title: 'Grammar - Tenses', status: 'Selesai', progress: 100, read: true },
          { id: 'be3', title: 'Vocabulary', status: 'Sedang', progress: 40, read: false },
          { id: 'be4', title: 'Writing', status: 'Belum', progress: 0, read: false },
          { id: 'be5', title: 'Listening', status: 'Belum', progress: 0, read: false },
          { id: 'be6', title: 'Grammar - Passive', status: 'Belum', progress: 0, read: false },
          { id: 'be7', title: 'Grammar - Conditionals', status: 'Selesai', progress: 100, read: true },
          { id: 'be8', title: 'Essay Structure', status: 'Belum', progress: 0, read: false },
        ],
      },
    ]);
  }

  const subjectNames = useMemo(() => ['Semua', ...subjects.map((s) => s.subject)], [subjects]);

  const filteredSubjects = useMemo(() => {
    let list = subjects;
    if (subjectFilter !== 'Semua') {
      list = list.filter((s) => s.subject === subjectFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.map((s) => ({
        ...s,
        materials: s.materials.filter((m) => m.title.toLowerCase().includes(q)),
      })).filter((s) => s.materials.length > 0);
    }
    return list;
  }, [subjects, subjectFilter, searchQuery]);

  function masteryBadge(level: string) {
    if (level === 'Sangat Baik')
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">{level}</Badge>;
    if (level === 'Baik')
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 rounded-full text-xs">{level}</Badge>;
    if (level === 'Cukup')
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-full text-xs">{level}</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-full text-xs">{level}</Badge>;
  }

  function materialStatusBadge(status: string) {
    if (status === 'Selesai')
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />Selesai
        </Badge>
      );
    if (status === 'Sedang')
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-full text-xs">
          <Clock className="mr-1 h-3 w-3" />Sedang
        </Badge>
      );
    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0 rounded-full text-xs">
        <CircleDot className="mr-1 h-3 w-3" />Belum
      </Badge>
    );
  }

  function readBadge(isRead?: boolean) {
    if (isRead)
      return <span className="h-2 w-2 rounded-full bg-sky-500" title="Sudah dilihat" />;
    return <span className="h-2 w-2 rounded-full bg-muted" title="Belum dilihat" />;
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          icon={BookOpen}
          title="Materi Pelajaran"
          description="Materi yang telah dan sedang dipelajari anak Anda."
        />
        <ChildSelector childList={children} selected={selectedChild} onSelect={setSelectedChild} />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari materi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg"
          />
        </div>
      </div>

      {/* Subject Filter Pills - horizontal scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {subjectNames.map((name) => (
          <button
            key={name}
            onClick={() => setSubjectFilter(name)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              subjectFilter === name
                ? 'bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Subject Grid */}
      {filteredSubjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((sub) => {
            const isExpanded = expandedSubject === sub.subject;
            const pct = sub.totalMateri > 0 ? Math.round((sub.completedMateri / sub.totalMateri) * 100) : 0;
            return (
              <Card
                key={sub.subject}
                className={`rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                  isExpanded ? 'sm:col-span-2 lg:col-span-3 ring-2 ring-[#1F3864]/20' : ''
                }`}
              >
                <CardHeader
                  className="cursor-pointer select-none p-4 pb-2"
                  onClick={() => setExpandedSubject(isExpanded ? null : sub.subject)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sub.icon}</span>
                      <div>
                        <CardTitle className="text-base">{sub.subject}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {sub.completedMateri} dari {sub.totalMateri} materi selesai
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {masteryBadge(sub.masteryLevel)}
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${isExpanded ? 'bg-[#1F3864]/10 text-[#1F3864] rotate-180' : 'bg-muted/60 text-muted-foreground'}`}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#1F3864] to-[#2d5289]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 text-right font-medium">{pct}%</p>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="border-t pt-3 mt-1">
                      <div className="space-y-1">
                        {sub.materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {readBadge(mat.read)}
                              <span className="text-sm font-medium truncate">{mat.title}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-20 hidden sm:block">
                                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                                      mat.progress === 100 ? 'bg-emerald-500' : mat.progress > 0 ? 'bg-amber-500' : 'bg-muted'
                                    }`}
                                    style={{ width: `${mat.progress}%` }}
                                  />
                                </div>
                              </div>
                              {materialStatusBadge(mat.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-xl shadow-sm">
          <EmptyState
            icon={BookOpen}
            title="Tidak ada materi ditemukan"
            subtitle="Materi akan muncul setelah guru menambahkan konten pembelajaran."
          />
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. OrtuKehadiranView — Kehadiran
// ═══════════════════════════════════════════════════════════════════

export function OrtuKehadiranView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [hadirCount, setHadirCount] = useState(0);
  const [izinCount, setIzinCount] = useState(0);
  const [sakitCount, setSakitCount] = useState(0);
  const [alphaCount, setAlphaCount] = useState(0);
  const [calendarDays, setCalendarDays] = useState<{ day: number; status: string }[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) fetchAttendance();
  }, [selectedChild]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?parentId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChildOption[] = Array.isArray(data)
          ? data.map((d: Record<string, string>) => ({
              id: d.id,
              name: d.name,
              className: d.className || '-',
            }))
          : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }
    } catch {
      const mockChildren: ChildOption[] = [
        { id: 'c1', name: 'Ahmad Rizky', className: 'XII IPA 1' },
        { id: 'c2', name: 'Siti Aisyah', className: 'XI IPA 2' },
      ];
      setChildren(mockChildren);
      setSelectedChild(mockChildren[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendance() {
    try {
      const res = await fetch(`/api/attendance?studentId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setHadirCount(data.hadirCount ?? 0);
        setIzinCount(data.izinCount ?? 0);
        setSakitCount(data.sakitCount ?? 0);
        setAlphaCount(data.alphaCount ?? 0);
        setCalendarDays(data.calendarDays ?? []);
        setAttendanceList(data.attendanceList ?? []);
        return;
      }
    } catch {
      // silent
    }
    setHadirCount(18);
    setIzinCount(1);
    setSakitCount(1);
    setAlphaCount(0);

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const mockCalendar: { day: number; status: string }[] = [];
    const statuses = ['H', 'H', 'H', 'H', 'H', 'I', 'S', 'H', 'H', 'H'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(today.getFullYear(), today.getMonth(), d).getDay();
      if (dow === 0 || dow === 6) {
        mockCalendar.push({ day: d, status: '-' });
      } else if (d > today.getDate()) {
        mockCalendar.push({ day: d, status: '' });
      } else {
        mockCalendar.push({ day: d, status: statuses[d % statuses.length] });
      }
    }
    setCalendarDays(mockCalendar);

    setAttendanceList([
      { date: '2025-01-20', subject: 'Matematika', status: 'Hadir', note: '' },
      { date: '2025-01-20', subject: 'Fisika', status: 'Hadir', note: '' },
      { date: '2025-01-19', subject: 'Kimia', status: 'Hadir', note: '' },
      { date: '2025-01-19', subject: 'Biologi', status: 'Hadir', note: '' },
      { date: '2025-01-18', subject: 'Bahasa Indonesia', status: 'Izin', note: 'Keperluan keluarga' },
      { date: '2025-01-17', subject: 'Matematika', status: 'Hadir', note: '' },
      { date: '2025-01-17', subject: 'Fisika', status: 'Hadir', note: '' },
      { date: '2025-01-16', subject: 'Kimia', status: 'Sakit', note: 'Demam, surat dokter' },
      { date: '2025-01-15', subject: 'Bahasa Inggris', status: 'Hadir', note: '' },
      { date: '2025-01-15', subject: 'Sejarah', status: 'Hadir', note: '' },
    ]);
  }

  const totalDays = hadirCount + izinCount + sakitCount + alphaCount;
  const hadirPct = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;
  const izinPct = totalDays > 0 ? Math.round((izinCount / totalDays) * 100) : 0;
  const sakitPct = totalDays > 0 ? Math.round((sakitCount / totalDays) * 100) : 0;
  const alphaPct = totalDays > 0 ? 100 - hadirPct - izinPct - sakitPct : 0;

  function attendanceColor(status: string) {
    switch (status) {
      case 'H': return 'bg-emerald-500 text-white';
      case 'I': return 'bg-sky-500 text-white';
      case 'S': return 'bg-amber-500 text-white';
      case 'A': return 'bg-red-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  }

  function attendanceBadge(status: string) {
    switch (status) {
      case 'Hadir':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3" />Hadir
          </Badge>
        );
      case 'Izin':
        return (
          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 rounded-full text-xs">
            <AlertCircle className="mr-1 h-3 w-3" />Izin
          </Badge>
        );
      case 'Sakit':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-full text-xs">
            <Stethoscope className="mr-1 h-3 w-3" />Sakit
          </Badge>
        );
      case 'Alpha':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-full text-xs">
            <UserX className="mr-1 h-3 w-3" />Alpha
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full text-xs">{status}</Badge>;
    }
  }

  function handleExport() {
    toast.info('Mengunduh laporan kehadiran...');
    setTimeout(() => {
      toast.success('Laporan kehadiran berhasil diunduh!');
    }, 1500);
  }

  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const today = new Date();
  const firstDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          icon={CalendarCheck}
          title="Kehadiran"
          description="Rekam kehadiran anak Anda di kelas."
        />
        <div className="flex items-center gap-3 flex-wrap">
          <ChildSelector childList={children} selected={selectedChild} onSelect={setSelectedChild} />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats + Donut */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Donut Chart */}
        <Card className="rounded-xl shadow-sm lg:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ringkasan Kehadiran</CardTitle>
            <CardDescription className="text-xs">Distribusi status kehadiran bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {/* CSS Donut Chart */}
            <div className="relative h-44 w-44">
              {/* Background circle */}
              <div className="absolute inset-0 rounded-full bg-muted/40" />
              {/* Hadir (largest) */}
              {hadirPct > 0 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 0deg ${hadirPct * 3.6}deg, transparent ${hadirPct * 3.6}deg)`,
                  }}
                />
              )}
              {/* Izin */}
              {izinPct > 0 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(transparent 0deg ${hadirPct * 3.6}deg, #0ea5e9 ${hadirPct * 3.6}deg ${(hadirPct + izinPct) * 3.6}deg, transparent ${(hadirPct + izinPct) * 3.6}deg)`,
                  }}
                />
              )}
              {/* Sakit */}
              {sakitPct > 0 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(transparent 0deg ${(hadirPct + izinPct) * 3.6}deg, #f59e0b ${(hadirPct + izinPct) * 3.6}deg ${(hadirPct + izinPct + sakitPct) * 3.6}deg, transparent ${(hadirPct + izinPct + sakitPct) * 3.6}deg)`,
                  }}
                />
              )}
              {/* Alpha */}
              {alphaPct > 0 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(transparent 0deg ${(hadirPct + izinPct + sakitPct) * 3.6}deg, #ef4444 ${(hadirPct + izinPct + sakitPct) * 3.6}deg 360deg, transparent 360deg)`,
                  }}
                />
              )}
              {/* Center circle (donut hole) */}
              <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-background flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-emerald-600">{hadirPct}%</p>
                <p className="text-[10px] text-muted-foreground font-medium">Kehadiran</p>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Hadir ({hadirCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-500" />
                <span className="text-xs text-muted-foreground">Izin ({izinCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">Sakit ({sakitCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Alpha ({alphaCount})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Large numbers */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-emerald-50/80 to-transparent">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-white">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hadir</p>
                <p className="text-3xl font-bold text-emerald-600">{hadirCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-sky-50/80 to-transparent">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-500 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Izin</p>
                <p className="text-3xl font-bold text-sky-600">{izinCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-amber-50/80 to-transparent">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sakit</p>
                <p className="text-3xl font-bold text-amber-600">{sakitCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-red-50/80 to-transparent">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-red-500 text-white">
                <UserX className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alpha</p>
                <p className="text-3xl font-bold text-red-600">{alphaCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Kalender Kehadiran</CardTitle>
          <CardDescription className="text-xs">
            {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {dayLabels.map((d) => (
              <div key={d} className="text-xs font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map((d) => (
              <div
                key={d.day}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 ${
                  d.status === ''
                    ? 'text-muted-foreground/20'
                    : d.status === '-'
                      ? 'text-muted-foreground/15'
                      : attendanceColor(d.status)
                }`}
                title={
                  d.status === 'H' ? 'Hadir'
                    : d.status === 'I' ? 'Izin'
                      : d.status === 'S' ? 'Sakit'
                        : d.status === 'A' ? 'Alpha'
                          : ''
                }
              >
                {d.day}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> Hadir</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-sky-500" /> Izin</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500" /> Sakit</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500" /> Alpha</span>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detail Kehadiran</CardTitle>
          <CardDescription className="text-xs">Riwayat kehadiran terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceList.map((a, idx) => (
                    <TableRow key={`${a.date}-${a.subject}-${idx}`} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                      <TableCell className="text-muted-foreground">
                        {new Date(a.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{a.subject}</TableCell>
                      <TableCell className="text-center">{attendanceBadge(a.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="Belum ada data kehadiran" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. OrtuKuisView — Riwayat Pengerjaan Anak
// ═══════════════════════════════════════════════════════════════════

export function OrtuKuisView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Tryout' | 'Diagnostic' | 'Latihan'>('Semua');
  const [subjectFilter, setSubjectFilter] = useState('Semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [totalAttempts, setTotalAttempts] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [avgDuration, setAvgDuration] = useState('');
  const [attempts, setAttempts] = useState<AttemptEntry[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) fetchAttempts();
  }, [selectedChild]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?parentId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChildOption[] = Array.isArray(data)
          ? data.map((d: Record<string, string>) => ({
              id: d.id,
              name: d.name,
              className: d.className || '-',
            }))
          : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }
    } catch {
      const mockChildren: ChildOption[] = [
        { id: 'c1', name: 'Ahmad Rizky', className: 'XII IPA 1' },
        { id: 'c2', name: 'Siti Aisyah', className: 'XI IPA 2' },
      ];
      setChildren(mockChildren);
      setSelectedChild(mockChildren[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttempts() {
    try {
      const res = await fetch(`/api/attempts?studentId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setTotalAttempts(data.totalAttempts ?? 0);
        setAvgScore(data.avgScore ?? 0);
        setAvgDuration(data.avgDuration ?? '');
        setAttempts(data.attempts ?? []);
        return;
      }
    } catch {
      // silent
    }
    setTotalAttempts(14);
    setAvgScore(71.8);
    setAvgDuration('48 menit');
    setAttempts([
      { id: 'a1', title: 'Tryout 8 - TKA Lengkap', date: '2025-01-15', score: 78, duration: '1 jam 12 menit', correct: 62, wrong: 18, total: 80, type: 'Tryout' },
      { id: 'a2', title: 'Tryout 7 - TKA Lengkap', date: '2025-01-08', score: 76, duration: '1 jam 8 menit', correct: 59, wrong: 21, total: 80, type: 'Tryout' },
      { id: 'a3', title: 'Latihan Fisika - Gelombang', date: '2025-01-05', score: 82, duration: '25 menit', correct: 14, wrong: 3, total: 17, type: 'Latihan' },
      { id: 'a4', title: 'Latihan Matematika - Integral', date: '2025-01-04', score: 65, duration: '30 menit', correct: 10, wrong: 6, total: 16, type: 'Latihan' },
      { id: 'a5', title: 'Tryout 6 - TKA Lengkap', date: '2024-12-28', score: 72, duration: '1 jam 5 menit', correct: 55, wrong: 25, total: 80, type: 'Tryout' },
      { id: 'a6', title: 'Latihan Kimia - Redoks', date: '2024-12-25', score: 70, duration: '20 menit', correct: 12, wrong: 5, total: 17, type: 'Latihan' },
      { id: 'a7', title: 'Diagnostic Test - Awal Masuk', date: '2024-12-01', score: 55, duration: '55 menit', correct: 44, wrong: 36, total: 80, type: 'Diagnostic' },
      { id: 'a8', title: 'Tryout 5 - TKA Lengkap', date: '2024-12-20', score: 65, duration: '1 jam', correct: 50, wrong: 30, total: 80, type: 'Tryout' },
      { id: 'a9', title: 'Latihan Biologi - Genetika', date: '2024-12-18', score: 88, duration: '18 menit', correct: 15, wrong: 2, total: 17, type: 'Latihan' },
    ]);
  }

  const subjectNames = useMemo(() => {
    const names = new Set(attempts.map((a) => {
      const parts = a.title.split(' - ');
      if (a.type === 'Latihan' && parts.length > 1) return parts[1]?.split(' - ')[0] || 'Lainnya';
      return 'Umum';
    }));
    return ['Semua', ...Array.from(names)];
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    let list = typeFilter === 'Semua' ? attempts : attempts.filter((a) => a.type === typeFilter);
    if (subjectFilter !== 'Semua') {
      list = list.filter((a) => {
        const parts = a.title.split(' - ');
        const subject = a.type === 'Latihan' && parts.length > 1 ? (parts[1]?.split(' - ')[0] || 'Lainnya') : 'Umum';
        return subject === subjectFilter;
      });
    }
    return list;
  }, [attempts, typeFilter, subjectFilter]);

  const filterOptions: ('Semua' | 'Tryout' | 'Diagnostic' | 'Latihan')[] = ['Semua', 'Tryout', 'Diagnostic', 'Latihan'];

  function typeBadge(type: string) {
    switch (type) {
      case 'Tryout':
        return (
          <Badge className="bg-[#1F3864]/10 text-[#1F3864] hover:bg-[#1F3864]/10 border-0 rounded-full text-xs">
            <ClipboardList className="mr-1 h-3 w-3" />Tryout
          </Badge>
        );
      case 'Diagnostic':
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 rounded-full text-xs">
            <GraduationCap className="mr-1 h-3 w-3" />Diagnostic
          </Badge>
        );
      case 'Latihan':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full text-xs">
            <BookOpenCheck className="mr-1 h-3 w-3" />Latihan
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full text-xs">{type}</Badge>;
    }
  }

  function typeDotColor(type: string) {
    switch (type) {
      case 'Tryout': return 'bg-[#1F3864]';
      case 'Diagnostic': return 'bg-purple-500';
      case 'Latihan': return 'bg-emerald-500';
      default: return 'bg-muted';
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          icon={ClipboardList}
          title="Riwayat Pengerjaan Anak"
          description="Daftar tryout, diagnostic, dan latihan yang dikerjakan."
        />
        <ChildSelector childList={children} selected={selectedChild} onSelect={setSelectedChild} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-[#1F3864]/[0.03] to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pengerjaan</p>
            <p className="text-3xl font-bold mt-1">{totalAttempts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-amber-50/80 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${scoreBgColor(avgScore)}`}>
                {scoreGradeLabel(avgScore)}
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rata-rata Skor</p>
            <p className={`text-3xl font-bold mt-1 ${scoreColor(avgScore)}`}>{avgScore}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-sky-50/80 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-500 text-white">
                <Timer className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Waktu Rata-rata</p>
            <p className="text-3xl font-bold mt-1 text-sky-600">{avgDuration}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Pills */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setTypeFilter(opt)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                typeFilter === opt
                  ? 'bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {subjectNames.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            {subjectNames.map((name) => (
              <button
                key={name}
                onClick={() => setSubjectFilter(name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  subjectFilter === name
                    ? 'bg-[#1F3864]/10 text-[#1F3864] border border-[#1F3864]/20'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Attempt List */}
      {filteredAttempts.length > 0 ? (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted hidden sm:block" />
          <div className="space-y-3">
            {filteredAttempts.map((a) => {
              const isExpanded = expandedId === a.id;
              const total = a.total || (a.correct + a.wrong);
              const correctPct = total > 0 ? Math.round((a.correct / total) * 100) : 0;
              const wrongPct = total > 0 ? Math.round((a.wrong / total) * 100) : 0;
              return (
                <div key={a.id} className="relative sm:pl-12">
                  {/* Timeline dot */}
                  <div className={`absolute left-3.5 sm:left-4 top-5 h-3 w-3 rounded-full ${typeDotColor(a.type)} ring-4 ring-background z-10 hidden sm:block`} />
                  <Card
                    className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Mobile dot */}
                        <div className={`h-2.5 w-2.5 rounded-full sm:hidden ${typeDotColor(a.type)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                            {typeBadge(a.type)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(a.date).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {a.duration}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${scoreColor(a.score)}`}>{a.score}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Skor</p>
                          </div>
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${isExpanded ? 'bg-[#1F3864]/10 text-[#1F3864] rotate-180' : 'bg-muted/60 text-muted-foreground'}`}>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-emerald-50 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">Benar</span>
                              </div>
                              <p className="text-xl font-bold text-emerald-600">{a.correct}</p>
                              <p className="text-[10px] text-emerald-600/70">{correctPct}%</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-medium text-red-700">Salah</span>
                              </div>
                              <p className="text-xl font-bold text-red-600">{a.wrong}</p>
                              <p className="text-[10px] text-red-600/70">{wrongPct}%</p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/50 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Total</span>
                              </div>
                              <p className="text-xl font-bold">{total}</p>
                              <p className="text-[10px] text-muted-foreground">soal</p>
                            </div>
                          </div>

                          {/* Visual Score Bar */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Distribusi Jawaban</p>
                            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                              <div
                                className="bg-emerald-500 transition-all duration-700 ease-out rounded-l-full"
                                style={{ width: `${correctPct}%` }}
                              />
                              <div
                                className="bg-red-400 transition-all duration-700 ease-out rounded-r-full"
                                style={{ width: `${wrongPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                              <span>Benar: {correctPct}%</span>
                              <span>Salah: {wrongPct}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="rounded-xl shadow-sm">
          <EmptyState
            icon={ClipboardList}
            title="Belum ada riwayat pengerjaan"
            subtitle={
              typeFilter !== 'Semua'
                ? `Tidak ada pengerjaan bertipe "${typeFilter}"`
                : 'Riwayat akan muncul setelah anak mulai mengerjakan tryout atau latihan.'
            }
          />
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. OrtuLaporanView — Laporan Cetak Anak
// ═══════════════════════════════════════════════════════════════════

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

export function OrtuLaporanView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [recentDownloads, setRecentDownloads] = useState<ReportEntry[]>([]);
  const [periodFilter, setPeriodFilter] = useState('Semua');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const periods = ['Semua', 'Januari 2025', 'Desember 2024', 'November 2024'];

  const reportTypes: ReportType[] = [
    {
      id: 'nilai-bulanan',
      title: 'Laporan Nilai Bulanan',
      description: 'Rekapitulasi nilai anak per bulan untuk semua mata pelajaran.',
      icon: <BarChart3 className="h-6 w-6" />,
      gradient: 'from-[#1F3864] to-[#2d5289]',
    },
    {
      id: 'per-mapel',
      title: 'Laporan Per Mata Pelajaran',
      description: 'Detail nilai dan analisis per mata pelajaran.',
      icon: <BookOpen className="h-6 w-6" />,
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      id: 'peringkat',
      title: 'Laporan Peringkat',
      description: 'Peringkat anak di kelas dan perkembangan posisi.',
      icon: <Trophy className="h-6 w-6" />,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'kehadiran',
      title: 'Laporan Kehadiran',
      description: 'Rekap kehadiran bulanan termasuk izin, sakit, dan alpha.',
      icon: <CalendarCheck className="h-6 w-6" />,
      gradient: 'from-sky-500 to-sky-600',
    },
    {
      id: 'perkembangan',
      title: 'Laporan Perkembangan',
      description: 'Grafik perkembangan skor dari waktu ke waktu.',
      icon: <TrendingUp className="h-6 w-6" />,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedChild) fetchRecentDownloads();
  }, [selectedChild]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?parentId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChildOption[] = Array.isArray(data)
          ? data.map((d: Record<string, string>) => ({
              id: d.id,
              name: d.name,
              className: d.className || '-',
            }))
          : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }
    } catch {
      const mockChildren: ChildOption[] = [
        { id: 'c1', name: 'Ahmad Rizky', className: 'XII IPA 1' },
        { id: 'c2', name: 'Siti Aisyah', className: 'XI IPA 2' },
      ];
      setChildren(mockChildren);
      setSelectedChild(mockChildren[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentDownloads() {
    try {
      const res = await fetch(`/api/reports/downloads?studentId=${selectedChild}`);
      if (res.ok) {
        const data = await res.json();
        setRecentDownloads(data.downloads ?? []);
        return;
      }
    } catch {
      // silent
    }
    setRecentDownloads([
      { id: 'd1', fileName: 'Laporan_Nilai_Bulanan_Januari_2025.pdf', type: 'Laporan Nilai Bulanan', downloadedAt: '2025-01-20 14:30' },
      { id: 'd2', fileName: 'Laporan_Peringkat_Desember_2024.pdf', type: 'Laporan Peringkat', downloadedAt: '2025-01-15 09:15' },
      { id: 'd3', fileName: 'Laporan_Kehadiran_Desember_2024.pdf', type: 'Laporan Kehadiran', downloadedAt: '2025-01-10 16:45' },
      { id: 'd4', fileName: 'Laporan_Per_Mapel_Fisika.pdf', type: 'Laporan Per Mata Pelajaran', downloadedAt: '2025-01-08 11:00' },
    ]);
  }

  function handleDownloadPDF(reportId: string, reportTitle: string) {
    setDownloadingId(reportId);
    toast.info(`Mengunduh ${reportTitle}...`);
    setTimeout(() => {
      setDownloadingId(null);
      toast.success(`${reportTitle} berhasil diunduh!`);
    }, 2000);
  }

  function handlePrint(reportId: string, reportTitle: string) {
    setPrintingId(reportId);
    toast.info(`Menyiapkan ${reportTitle} untuk cetak...`);
    setTimeout(() => {
      setPrintingId(null);
      toast.success(`${reportTitle} siap dicetak.`);
    }, 1500);
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          icon={FileBarChart}
          title="Laporan"
          description="Unduh atau cetak laporan akademik anak Anda."
        />
        <ChildSelector childList={children} selected={selectedChild} onSelect={setSelectedChild} />
      </div>

      {/* Period Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              periodFilter === p
                ? 'bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card
            key={report.id}
            className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${report.gradient} text-white shadow-sm`}>
                  {report.icon}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {report.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:from-[#152850] hover:to-[#1F3864] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                  disabled={downloadingId === report.id}
                  onClick={() => handleDownloadPDF(report.id, report.title)}
                >
                  {downloadingId === report.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Unduh PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                  disabled={printingId === report.id}
                  onClick={() => handlePrint(report.id, report.title)}
                >
                  {printingId === report.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  Cetak
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Downloads */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Unduhan Terbaru</CardTitle>
          <CardDescription className="text-xs">Riwayat laporan yang telah diunduh</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDownloads.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Nama File</TableHead>
                    <TableHead>Jenis Laporan</TableHead>
                    <TableHead>Waktu Unduh</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDownloads.map((d) => (
                    <TableRow key={d.id} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                            <FileText className="h-4 w-4 text-red-500" />
                          </div>
                          <span className="font-medium text-sm truncate max-w-[250px]">{d.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{d.type}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(d.downloadedAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full h-8 w-8 p-0 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                          onClick={() => toast.info('Mengunduh ulang ' + d.fileName + '...')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileBarChart}
              title="Belum ada riwayat unduhan"
              subtitle="Pilih jenis laporan di atas untuk mulai mengunduh."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
