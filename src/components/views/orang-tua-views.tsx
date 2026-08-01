'use client';

import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  GraduationCap,
  Users,
  Award,
  PieChart,
  Activity,
  FileBarChart,
  CalendarCheck,
  Stethoscope,
  UserX,
  HelpCircle,
  CircleDot,
  BookOpenCheck,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  type: 'Tryout' | 'Diagnostic' | 'Latihan';
}

interface ReportEntry {
  id: string;
  fileName: string;
  type: string;
  downloadedAt: string;
}

// ─── Shared: Child Selector ─────────────────────────────────────────

function ChildSelector({
  children,
  selected,
  onSelect,
}: {
  children: ChildOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (children.length <= 1) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">Anak:</span>
      <div className="flex gap-2">
        {children.map((child) => (
          <Button
            key={child.id}
            variant={selected === child.id ? 'default' : 'outline'}
            size="sm"
            className={
              selected === child.id
                ? 'bg-[#1F3864] hover:bg-[#152850]'
                : ''
            }
            onClick={() => onSelect(child.id)}
          >
            {child.name}
            <span className="ml-1.5 text-xs opacity-70">
              ({child.className})
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared: Loading Skeleton ───────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
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

  // Stats
  const [avgScore, setAvgScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [classRank, setClassRank] = useState(0);
  const [totalClassmates, setTotalClassmates] = useState(0);
  const [totalTryout, setTotalTryout] = useState(0);

  // Subject breakdown
  const [subjects, setSubjects] = useState<SubjectScore[]>([]);

  // Score trend
  const [scoreTrend, setScoreTrend] = useState<{ label: string; value: number }[]>([]);

  // Recent scores
  const [recentScores, setRecentScores] = useState<ScoreEntry[]>([]);

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
      // Mock fallback
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
    // Mock data fallback
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

  function statusBadge(status: string) {
    if (status === 'Lulus')
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Lulus
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
        <XCircle className="mr-1 h-3 w-3" />
        Belum Lulus
      </Badge>
    );
  }

  function trendIcon(trend: string) {
    if (trend === 'up')
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend === 'down')
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nilai & Progres Anak</h1>
          <p className="text-muted-foreground">
            Pantau perkembangan nilai dan performa akademik anak Anda.
          </p>
        </div>
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Rata-rata Skor</p>
              <p className="text-2xl font-bold">{avgScore}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Skor Tertinggi</p>
              <p className="text-2xl font-bold">{highScore}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Peringkat di Kelas</p>
              <p className="text-2xl font-bold">
                {classRank > 0 ? `${classRank}/${totalClassmates}` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Tryout</p>
              <p className="text-2xl font-bold">{totalTryout}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown + Score Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nilai Per Mata Pelajaran</CardTitle>
            <CardDescription>
              Rata-rata skor anak di setiap mata pelajaran
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.map((s) => (
              <div key={s.subject} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.subject}</span>
                    {trendIcon(s.trend)}
                  </div>
                  <span className="text-muted-foreground">
                    {s.avgScore} <span className="text-xs">/ {s.highestScore} tertinggi</span>
                  </span>
                </div>
                <Progress
                  value={s.avgScore}
                  className="h-2.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Score Trend Bar Chart (CSS-based) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tren Skor</CardTitle>
            <CardDescription>
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
                    <div
                      key={item.label}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">
                        {item.value}
                      </span>
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          isLast
                            ? 'bg-[#1F3864]'
                            : isImproved
                              ? 'bg-[#1F3864]/60'
                              : 'bg-red-300'
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
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <p className="text-sm">Belum ada data tren skor</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nilai Terbaru</CardTitle>
          <CardDescription>Riwayat nilai tryout dan latihan terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {recentScores.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tryout</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.examName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-bold ${
                            s.score >= 70 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {s.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada data nilai</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
    // Mock data
    setSubjects([
      {
        subject: 'Matematika',
        icon: '📐',
        totalMateri: 12,
        completedMateri: 8,
        masteryLevel: 'Baik',
        materials: [
          { id: 'm1', title: 'Aljabar', status: 'Selesai', progress: 100 },
          { id: 'm2', title: 'Geometri', status: 'Selesai', progress: 100 },
          { id: 'm3', title: 'Trigonometri', status: 'Selesai', progress: 100 },
          { id: 'm4', title: 'Kalkulus Diferensial', status: 'Selesai', progress: 100 },
          { id: 'm5', title: 'Kalkulus Integral', status: 'Sedang', progress: 60 },
          { id: 'm6', title: 'Statistika', status: 'Sedang', progress: 30 },
          { id: 'm7', title: 'Peluang', status: 'Belum', progress: 0 },
          { id: 'm8', title: 'Matriks', status: 'Belum', progress: 0 },
          { id: 'm9', title: 'Vektor', status: 'Selesai', progress: 100 },
          { id: 'm10', title: 'Barisan & Deret', status: 'Selesai', progress: 100 },
          { id: 'm11', title: 'Logaritma', status: 'Selesai', progress: 100 },
          { id: 'm12', title: 'Persamaan Kuadrat', status: 'Selesai', progress: 100 },
        ],
      },
      {
        subject: 'Fisika',
        icon: '⚡',
        totalMateri: 10,
        completedMateri: 7,
        masteryLevel: 'Baik',
        materials: [
          { id: 'f1', title: 'Kinematika', status: 'Selesai', progress: 100 },
          { id: 'f2', title: 'Dinamika', status: 'Selesai', progress: 100 },
          { id: 'f3', title: 'Usaha & Energi', status: 'Selesai', progress: 100 },
          { id: 'f4', title: 'Momentum & Impuls', status: 'Selesai', progress: 100 },
          { id: 'f5', title: 'Gerak Harmonik', status: 'Selesai', progress: 100 },
          { id: 'f6', title: 'Gelombang', status: 'Sedang', progress: 45 },
          { id: 'f7', title: 'Optika', status: 'Sedang', progress: 20 },
          { id: 'f8', title: 'Listrik Statis', status: 'Selesai', progress: 100 },
          { id: 'f9', title: 'Listrik Dinamis', status: 'Selesai', progress: 100 },
          { id: 'f10', title: 'Magnit', status: 'Belum', progress: 0 },
        ],
      },
      {
        subject: 'Kimia',
        icon: '🧪',
        totalMateri: 9,
        completedMateri: 4,
        masteryLevel: 'Cukup',
        materials: [
          { id: 'k1', title: 'Atom & Molekul', status: 'Selesai', progress: 100 },
          { id: 'k2', title: 'Ikatan Kimia', status: 'Selesai', progress: 100 },
          { id: 'k3', title: 'Stoikiometri', status: 'Selesai', progress: 100 },
          { id: 'k4', title: 'Termokimia', status: 'Selesai', progress: 100 },
          { id: 'k5', title: 'Larutan', status: 'Sedang', progress: 50 },
          { id: 'k6', title: 'Asam Basa', status: 'Belum', progress: 0 },
          { id: 'k7', title: 'Redoks', status: 'Belum', progress: 0 },
          { id: 'k8', title: 'Organik', status: 'Belum', progress: 0 },
          { id: 'k9', title: 'Kinetika', status: 'Belum', progress: 0 },
        ],
      },
      {
        subject: 'Biologi',
        icon: '🧬',
        totalMateri: 11,
        completedMateri: 9,
        masteryLevel: 'Sangat Baik',
        materials: [
          { id: 'b1', title: 'Sel', status: 'Selesai', progress: 100 },
          { id: 'b2', title: 'Genetika', status: 'Selesai', progress: 100 },
          { id: 'b3', title: 'Evolusi', status: 'Selesai', progress: 100 },
          { id: 'b4', title: 'Ekologi', status: 'Selesai', progress: 100 },
          { id: 'b5', title: 'Anatomi Tumbuhan', status: 'Selesai', progress: 100 },
          { id: 'b6', title: 'Sistem Pencernaan', status: 'Selesai', progress: 100 },
          { id: 'b7', title: 'Sistem Peredaran Darah', status: 'Selesai', progress: 100 },
          { id: 'b8', title: 'Sistem Saraf', status: 'Sedang', progress: 70 },
          { id: 'b9', title: 'Sistem Reproduksi', status: 'Sedang', progress: 40 },
          { id: 'b10', title: 'Bioteknologi', status: 'Belum', progress: 0 },
          { id: 'b11', title: 'Imunologi', status: 'Selesai', progress: 100 },
        ],
      },
      {
        subject: 'Bahasa Indonesia',
        icon: '📝',
        totalMateri: 8,
        completedMateri: 6,
        masteryLevel: 'Baik',
        materials: [
          { id: 'bi1', title: 'Teks Narasi', status: 'Selesai', progress: 100 },
          { id: 'bi2', title: 'Teks Argumentasi', status: 'Selesai', progress: 100 },
          { id: 'bi3', title: 'Teks Eksposisi', status: 'Selesai', progress: 100 },
          { id: 'bi4', title: 'Teks Persuasi', status: 'Selesai', progress: 100 },
          { id: 'bi5', title: 'Puisi & Sastra', status: 'Sedang', progress: 55 },
          { id: 'bi6', title: 'Tata Bahasa', status: 'Sedang', progress: 30 },
          { id: 'bi7', title: 'Paragraf', status: 'Selesai', progress: 100 },
          { id: 'bi8', title: 'Ringkasan', status: 'Belum', progress: 0 },
        ],
      },
      {
        subject: 'Bahasa Inggris',
        icon: '🌍',
        totalMateri: 8,
        completedMateri: 3,
        masteryLevel: 'Perlu Ditingkatkan',
        materials: [
          { id: 'be1', title: 'Reading Comprehension', status: 'Selesai', progress: 100 },
          { id: 'be2', title: 'Grammar - Tenses', status: 'Selesai', progress: 100 },
          { id: 'be3', title: 'Vocabulary', status: 'Sedang', progress: 40 },
          { id: 'be4', title: 'Writing', status: 'Belum', progress: 0 },
          { id: 'be5', title: 'Listening', status: 'Belum', progress: 0 },
          { id: 'be6', title: 'Grammar - Passive', status: 'Belum', progress: 0 },
          { id: 'be7', title: 'Grammar - Conditionals', status: 'Selesai', progress: 100 },
          { id: 'be8', title: 'Essay Structure', status: 'Belum', progress: 0 },
        ],
      },
    ]);
  }

  function masteryBadge(level: string) {
    if (level === 'Sangat Baik')
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">{level}</Badge>;
    if (level === 'Baik')
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">{level}</Badge>;
    if (level === 'Cukup')
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">{level}</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">{level}</Badge>;
  }

  function materialStatusBadge(status: string) {
    if (status === 'Selesai')
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Selesai
        </Badge>
      );
    if (status === 'Sedang')
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Sedang
        </Badge>
      );
    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0 text-xs">
        <CircleDot className="mr-1 h-3 w-3" />
        Belum
      </Badge>
    );
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materi Pelajaran</h1>
          <p className="text-muted-foreground">
            Materi yang telah dan sedang dipelajari anak Anda.
          </p>
        </div>
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* Subject Grid */}
      {subjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => {
            const isExpanded = expandedSubject === sub.subject;
            const pct = sub.totalMateri > 0
              ? Math.round((sub.completedMateri / sub.totalMateri) * 100)
              : 0;
            return (
              <Card
                key={sub.subject}
                className={`transition-all hover:shadow-md ${isExpanded ? 'ring-2 ring-[#1F3864]/30 sm:col-span-2 lg:col-span-3' : ''}`}
              >
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() =>
                    setExpandedSubject(isExpanded ? null : sub.subject)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sub.icon}</span>
                      <div>
                        <CardTitle className="text-base">{sub.subject}</CardTitle>
                        <CardDescription>
                          {sub.completedMateri} dari {sub.totalMateri} materi selesai
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {masteryBadge(sub.masteryLevel)}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {pct}%
                    </p>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="space-y-3">
                        {sub.materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between gap-4 py-1.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm font-medium truncate">
                                {mat.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-24 hidden sm:block">
                                <Progress value={mat.progress} className="h-1.5" />
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
        <Card>
          <CardContent className="flex h-60 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">Belum ada materi</p>
              <p className="text-xs mt-1">
                Materi akan muncul setelah guru menambahkan konten pembelajaran.
              </p>
            </div>
          </CardContent>
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

  // Stats
  const [hadirCount, setHadirCount] = useState(0);
  const [izinCount, setIzinCount] = useState(0);
  const [sakitCount, setSakitCount] = useState(0);
  const [alphaCount, setAlphaCount] = useState(0);

  // Calendar data
  const [calendarDays, setCalendarDays] = useState<
    { day: number; status: string }[]
  >([]);

  // Attendance table
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
    // Mock data
    setHadirCount(18);
    setIzinCount(1);
    setSakitCount(1);
    setAlphaCount(0);

    // Generate mock calendar for current month
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
        mockCalendar.push({
          day: d,
          status: statuses[d % statuses.length],
        });
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
      { date: '2025-01-16', subject: 'Sakit', status: 'Sakit', note: 'Demam, surat dokter' },
      { date: '2025-01-15', subject: 'Bahasa Inggris', status: 'Hadir', note: '' },
      { date: '2025-01-15', subject: 'Sejarah', status: 'Hadir', note: '' },
    ]);
  }

  function attendanceColor(status: string) {
    switch (status) {
      case 'H':
        return 'bg-emerald-500 text-white';
      case 'I':
        return 'bg-amber-400 text-white';
      case 'S':
        return 'bg-red-500 text-white';
      case 'A':
        return 'bg-red-700 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  function attendanceBadge(status: string) {
    switch (status) {
      case 'Hadir':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
            <CheckCircle2 className="mr-1 h-3 w-3" />Hadir
          </Badge>
        );
      case 'Izin':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
            <AlertCircle className="mr-1 h-3 w-3" />Izin
          </Badge>
        );
      case 'Sakit':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
            <Stethoscope className="mr-1 h-3 w-3" />Sakit
          </Badge>
        );
      case 'Alpha':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0">
            <UserX className="mr-1 h-3 w-3" />Alpha
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function handleExport() {
    toast.info('Mengunduh laporan kehadiran...');
    // Simulated export
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kehadiran</h1>
          <p className="text-muted-foreground">
            Rekam kehadiran anak Anda di kelas.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ChildSelector
            children={children}
            selected={selectedChild}
            onSelect={setSelectedChild}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Kehadiran
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Kehadiran Bulan Ini
              </p>
              <p className="text-2xl font-bold text-emerald-600">{hadirCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Izin</p>
              <p className="text-2xl font-bold text-amber-600">{izinCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sakit</p>
              <p className="text-2xl font-bold text-red-600">{sakitCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <UserX className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Tanpa Keterangan
              </p>
              <p className="text-2xl font-bold text-gray-600">{alphaCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kalender Kehadiran</CardTitle>
          <CardDescription>
            {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayLabels.map((d) => (
              <div
                key={d}
                className="text-xs font-semibold text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {calendarDays.map((d) => (
              <div
                key={d.day}
                className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  d.status === ''
                    ? 'text-muted-foreground/30'
                    : d.status === '-'
                      ? 'text-muted-foreground/20'
                      : attendanceColor(d.status)
                }`}
                title={
                  d.status === 'H'
                    ? 'Hadir'
                    : d.status === 'I'
                      ? 'Izin'
                      : d.status === 'S'
                        ? 'Sakit'
                        : d.status === 'A'
                          ? 'Alpha'
                          : ''
                }
              >
                {d.day}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" /> Hadir
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-400" /> Izin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-500" /> Sakit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-700" /> Alpha
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detail Kehadiran</CardTitle>
          <CardDescription>Riwayat kehadiran terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceList.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceList.map((a, idx) => (
                    <TableRow key={`${a.date}-${a.subject}-${idx}`}>
                      <TableCell className="text-muted-foreground">
                        {new Date(a.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{a.subject}</TableCell>
                      <TableCell className="text-center">
                        {attendanceBadge(a.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada data kehadiran</p>
              </div>
            </div>
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
  const [typeFilter, setTypeFilter] = useState<
    'Semua' | 'Tryout' | 'Diagnostic' | 'Latihan'
  >('Semua');

  // Stats
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [avgDuration, setAvgDuration] = useState('');

  // Attempt list
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
    // Mock data
    setTotalAttempts(14);
    setAvgScore(71.8);
    setAvgDuration('48 menit');
    setAttempts([
      {
        id: 'a1',
        title: 'Tryout 8 - TKA Lengkap',
        date: '2025-01-15',
        score: 78,
        duration: '1 jam 12 menit',
        correct: 62,
        wrong: 18,
        type: 'Tryout',
      },
      {
        id: 'a2',
        title: 'Tryout 7 - TKA Lengkap',
        date: '2025-01-08',
        score: 76,
        duration: '1 jam 8 menit',
        correct: 59,
        wrong: 21,
        type: 'Tryout',
      },
      {
        id: 'a3',
        title: 'Latihan Fisika - Gelombang',
        date: '2025-01-05',
        score: 82,
        duration: '25 menit',
        correct: 14,
        wrong: 3,
        type: 'Latihan',
      },
      {
        id: 'a4',
        title: 'Latihan Matematika - Integral',
        date: '2025-01-04',
        score: 65,
        duration: '30 menit',
        correct: 10,
        wrong: 6,
        type: 'Latihan',
      },
      {
        id: 'a5',
        title: 'Tryout 6 - TKA Lengkap',
        date: '2024-12-28',
        score: 72,
        duration: '1 jam 5 menit',
        correct: 55,
        wrong: 25,
        type: 'Tryout',
      },
      {
        id: 'a6',
        title: 'Latihan Kimia - Redoks',
        date: '2024-12-25',
        score: 70,
        duration: '20 menit',
        correct: 12,
        wrong: 5,
        type: 'Latihan',
      },
      {
        id: 'a7',
        title: 'Diagnostic Test - Awal Masuk',
        date: '2024-12-01',
        score: 55,
        duration: '55 menit',
        correct: 44,
        wrong: 36,
        type: 'Diagnostic',
      },
      {
        id: 'a8',
        title: 'Tryout 5 - TKA Lengkap',
        date: '2024-12-20',
        score: 65,
        duration: '1 jam',
        correct: 50,
        wrong: 30,
        type: 'Tryout',
      },
      {
        id: 'a9',
        title: 'Latihan Biologi - Genetika',
        date: '2024-12-18',
        score: 88,
        duration: '18 menit',
        correct: 15,
        wrong: 2,
        type: 'Latihan',
      },
    ]);
  }

  const filteredAttempts =
    typeFilter === 'Semua'
      ? attempts
      : attempts.filter((a) => a.type === typeFilter);

  const filterOptions: ('Semua' | 'Tryout' | 'Diagnostic' | 'Latihan')[] = [
    'Semua',
    'Tryout',
    'Diagnostic',
    'Latihan',
  ];

  function typeBadge(type: string) {
    switch (type) {
      case 'Tryout':
        return (
          <Badge className="bg-[#1F3864]/10 text-[#1F3864] hover:bg-[#1F3864]/10 border-0">
            <ClipboardList className="mr-1 h-3 w-3" />
            Tryout
          </Badge>
        );
      case 'Diagnostic':
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
            <Activity className="mr-1 h-3 w-3" />
            Diagnostic
          </Badge>
        );
      case 'Latihan':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
            <BookOpenCheck className="mr-1 h-3 w-3" />
            Latihan
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Riwayat Pengerjaan Anak
          </h1>
          <p className="text-muted-foreground">
            Daftar tryout, diagnostic, dan latihan yang dikerjakan.
          </p>
        </div>
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
              <Target className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Total Pengerjaan
              </p>
              <p className="text-2xl font-bold">{totalAttempts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Rata-rata Skor
              </p>
              <p className="text-2xl font-bold">{avgScore}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Timer className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Waktu Rata-rata
              </p>
              <p className="text-2xl font-bold">{avgDuration}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <Button
            key={opt}
            variant={typeFilter === opt ? 'default' : 'outline'}
            size="sm"
            className={
              typeFilter === opt ? 'bg-[#1F3864] hover:bg-[#152850]' : ''
            }
            onClick={() => setTypeFilter(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>

      {/* Attempt List */}
      {filteredAttempts.length > 0 ? (
        <div className="space-y-3">
          {filteredAttempts.map((a) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Title & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {a.title}
                      </h3>
                      {typeBadge(a.type)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(a.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {a.duration}
                      </span>
                    </div>
                  </div>

                  {/* Right: Score & correct/wrong */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${
                          a.score >= 70 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {a.score}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Skor
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <div className="text-center">
                        <p className="flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {a.correct}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Benar</p>
                      </div>
                      <div className="text-center">
                        <p className="flex items-center gap-1 font-semibold text-red-500">
                          <XCircle className="h-3.5 w-3.5" />
                          {a.wrong}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Salah</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-60 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">Belum ada riwayat pengerjaan</p>
              <p className="text-xs mt-1">
                {typeFilter !== 'Semua'
                  ? `Tidak ada pengerjaan bertipe "${typeFilter}"`
                  : 'Riwayat akan muncul setelah anak mulai mengerjakan tryout atau latihan.'}
              </p>
            </div>
          </CardContent>
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
}

export function OrtuLaporanView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [recentDownloads, setRecentDownloads] = useState<ReportEntry[]>([]);

  const reportTypes: ReportType[] = [
    {
      id: 'nilai-bulanan',
      title: 'Laporan Nilai Bulanan',
      description:
        'Rekapitulasi nilai anak per bulan untuk semua mata pelajaran.',
      icon: <BarChart3 className="h-6 w-6" />,
    },
    {
      id: 'per-mapel',
      title: 'Laporan Per Mata Pelajaran',
      description:
        'Detail nilai dan analisis per mata pelajaran.',
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      id: 'peringkat',
      title: 'Laporan Peringkat',
      description:
        'Peringkat anak di kelas dan perkembangan posisi.',
      icon: <Trophy className="h-6 w-6" />,
    },
    {
      id: 'kehadiran',
      title: 'Laporan Kehadiran',
      description:
        'Rekap kehadiran bulanan termasuk izin, sakit, dan alpha.',
      icon: <CalendarCheck className="h-6 w-6" />,
    },
    {
      id: 'perkembangan',
      title: 'Laporan Perkembangan',
      description:
        'Grafik perkembangan skor dari waktu ke waktu.',
      icon: <TrendingUp className="h-6 w-6" />,
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
      const res = await fetch(
        `/api/reports/downloads?studentId=${selectedChild}`
      );
      if (res.ok) {
        const data = await res.json();
        setRecentDownloads(data.downloads ?? []);
        return;
      }
    } catch {
      // silent
    }
    // Mock data
    setRecentDownloads([
      {
        id: 'd1',
        fileName: 'Laporan_Nilai_Bulanan_Januari_2025.pdf',
        type: 'Laporan Nilai Bulanan',
        downloadedAt: '2025-01-20 14:30',
      },
      {
        id: 'd2',
        fileName: 'Laporan_Peringkat_Desember_2024.pdf',
        type: 'Laporan Peringkat',
        downloadedAt: '2025-01-15 09:15',
      },
      {
        id: 'd3',
        fileName: 'Laporan_Kehadiran_Desember_2024.pdf',
        type: 'Laporan Kehadiran',
        downloadedAt: '2025-01-10 16:45',
      },
      {
        id: 'd4',
        fileName: 'Laporan_Per_Mapel_Fisika.pdf',
        type: 'Laporan Per Mata Pelajaran',
        downloadedAt: '2025-01-08 11:00',
      },
    ]);
  }

  function handleDownloadPDF(reportId: string, reportTitle: string) {
    toast.info(`Mengunduh ${reportTitle}...`);
    setTimeout(() => {
      toast.success(`${reportTitle} berhasil diunduh!`);
    }, 2000);
  }

  function handlePrint(reportId: string, reportTitle: string) {
    toast.info(`Menyiapkan ${reportTitle} untuk cetak...`);
    setTimeout(() => {
      toast.success(`${reportTitle} siap dicetak.`);
    }, 1500);
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground">
            Unduh atau cetak laporan akademik anak Anda.
          </p>
        </div>
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card
            key={report.id}
            className="hover:shadow-md transition-shadow flex flex-col"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  {report.icon}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {report.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-[#1F3864] hover:bg-[#152850]"
                  onClick={() =>
                    handleDownloadPDF(report.id, report.title)
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Unduh PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePrint(report.id, report.title)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Downloads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unduhan Terbaru</CardTitle>
          <CardDescription>
            Riwayat laporan yang telah diunduh
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentDownloads.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama File</TableHead>
                    <TableHead>Jenis Laporan</TableHead>
                    <TableHead>Waktu Unduh</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDownloads.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="font-medium text-sm truncate max-w-[250px]">
                            {d.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.type}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(d.downloadedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toast.info('Mengunduh ulang ' + d.fileName + '...')
                          }
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
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileBarChart className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada riwayat unduhan</p>
                <p className="text-xs mt-1">
                  Pilih jenis laporan di atas untuk mulai mengunduh.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
