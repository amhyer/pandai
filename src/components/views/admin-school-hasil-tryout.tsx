'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { authFetch } from '@/lib/auth-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Search,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  GraduationCap,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  CalendarClock,
  Target,
  Eye,
  Download,
  Minus,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  academicYear: string;
  _count: { users: number };
}

interface ExamSession {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  examPackage: { id: string; title: string; totalQuestions: number } | null;
  assignments: { id: string; classId: string; class: { id: string; name: string } | null }[];
}

interface AttemptRow {
  id: string;
  userId: string;
  examSessionId: string;
  examPackageId: string;
  classId: string | null;
  score: number;
  percentage: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  tkaPrediction: number | null;
  status: string;
  submittedAt: string | null;
  user: { id: string; name: string; classId: string | null };
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SESSION_STATUS_BADGE: Record<string, { className: string; icon: React.ElementType }> = {
  Aktif: { className: 'bg-emerald-100 text-emerald-700', icon: CircleDot },
  Terjadwal: { className: 'bg-blue-100 text-blue-700', icon: CalendarClock },
  Selesai: { className: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

const SESSION_STATUS_MAP: Record<string, string> = {
  scheduled: 'Terjadwal',
  active: 'Aktif',
  ended: 'Selesai',
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatTanggal(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatTanggalShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN VIEW
// ═══════════════════════════════════════════════════════════════════

export function HasilTryoutView() {
  const { user } = useAppStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<ExamSession | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);

      const [cRes, sRes, aRes] = await Promise.all([
        authFetch(`/api/classes?${params.toString()}`),
        authFetch(`/api/exams?${params.toString()}&type=session`),
        authFetch(`/api/attempts?${params.toString()}`),
      ]);

      if (cRes.ok) { const d = await cRes.json(); setClasses(Array.isArray(d) ? d : []); }
      if (sRes.ok) { const d = await sRes.json(); setSessions(Array.isArray(d) ? d : []); }
      if (aRes.ok) { const d = await aRes.json(); setAttempts(Array.isArray(d) ? d : []); }
    } catch {
      setClasses([]);
      setSessions([]);
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered attempts based on class and session selection
  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (selectedClassId !== 'all' && a.classId !== selectedClassId) return false;
      if (selectedSessionId !== 'all' && a.examSessionId !== selectedSessionId) return false;
      if (search && !a.user?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [attempts, selectedClassId, selectedSessionId, search]);

  // Stats
  const endedSessions = sessions.filter((s) => s.status === 'ended');
  const totalParticipants = new Set(attempts.filter((a) => a.status === 'submitted').map((a) => a.userId)).size;
  const avgScore = filteredAttempts.length > 0
    ? Math.round(filteredAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / filteredAttempts.length * 10) / 10
    : 0;
  const highestScore = filteredAttempts.length > 0
    ? Math.round(Math.max(...filteredAttempts.map((a) => a.percentage || 0)) * 10) / 10
    : 0;
  const passCount = filteredAttempts.filter((a) => (a.percentage || 0) >= 70).length;

  // Get class summary for selected session
  const classSummary = useMemo(() => {
    if (selectedSessionId === 'all') return [];
    const sessionAttempts = attempts.filter((a) => a.examSessionId === selectedSessionId && a.status === 'submitted');
    const summaryMap = new Map<string, { className: string; count: number; avgScore: number; highest: number; lowest: number }>();

    for (const a of sessionAttempts) {
      const cls = classes.find((c) => c.id === a.classId);
      const clsName = cls?.name ?? 'Tanpa Kelas';
      const existing = summaryMap.get(a.classId ?? 'unknown') ?? { className: clsName, count: 0, avgScore: 0, highest: 0, lowest: 100 };
      existing.count += 1;
      existing.avgScore += a.percentage || 0;
      if ((a.percentage || 0) > existing.highest) existing.highest = a.percentage || 0;
      if ((a.percentage || 0) < existing.lowest) existing.lowest = a.percentage || 0;
      summaryMap.set(a.classId ?? 'unknown', existing);
    }

    return Array.from(summaryMap.values()).map((s) => ({
      ...s,
      avgScore: s.count > 0 ? Math.round(s.avgScore / s.count * 10) / 10 : 0,
      highest: Math.round(s.highest * 10) / 10,
      lowest: Math.round(s.lowest * 10) / 10,
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [selectedSessionId, attempts, classes]);

  const getSessionTitle = (sessionId: string) => {
    const s = sessions.find((s) => s.id === sessionId);
    return s?.title ?? 'Tryout';
  };

  const getSessionStatusBadge = (status: string) => {
    const label = SESSION_STATUS_MAP[status] ?? status;
    const conf = SESSION_STATUS_BADGE[label];
    if (!conf) return <Badge className="rounded-full text-xs bg-muted">{label}</Badge>;
    const Icon = conf.icon;
    return <Badge className={cn('rounded-full text-xs', conf.className)}><Icon className="mr-1 h-3 w-3" />{label}</Badge>;
  };

  const handleViewDetail = (session: ExamSession) => {
    setDetailSession(session);
    setSelectedSessionId(session.id);
    setDetailOpen(true);
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Tryout', 'Skor (%)', 'Benar', 'Salah', 'TKA Prediksi', 'Status'];
    const rows = filteredAttempts.map((a, i) => [
      i + 1,
      a.user?.name ?? '-',
      classes.find((c) => c.id === a.classId)?.name ?? '-',
      getSessionTitle(a.examSessionId),
      Math.round(a.percentage),
      a.totalCorrect,
      a.totalWrong,
      a.tkaPrediction ?? '-',
      a.status === 'submitted' ? 'Selesai' : 'Proses',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hasil-tryout.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data berhasil diekspor ke CSV');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hasil Tryout</h1>
            <p className="text-muted-foreground">Pantau dan analisis hasil tryout siswa di seluruh kelas.</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          onClick={handleExport}
          disabled={loading || filteredAttempts.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Ekspor CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tryout Selesai</p>
              <p className="text-3xl font-bold tracking-tight">{loading ? '...' : endedSessions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Peserta Unik</p>
              <p className="text-3xl font-bold tracking-tight">{loading ? '...' : totalParticipants}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', avgScore >= 70 ? 'bg-emerald-50 text-emerald-600' : avgScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}>
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Rata-rata Skor</p>
              <p className="text-3xl font-bold tracking-tight">{loading ? '...' : avgScore}<span className="text-lg text-muted-foreground">%</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Skor Tertinggi</p>
              <p className="text-3xl font-bold tracking-tight">{loading ? '...' : highestScore}<span className="text-lg text-muted-foreground">%</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama siswa..."
              className="rounded-lg pl-9 focus-visible:ring-[#1F3864]/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-full rounded-lg sm:w-[250px]">
              <SelectValue placeholder="Pilih Tryout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tryout</SelectItem>
              {endedSessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full rounded-lg sm:w-[180px]">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabs: Tryout List | Score Summary | Student Detail */}
      <Tabs defaultValue="students">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="students" className="transition-all duration-200">
            <Users className="mr-1.5 h-4 w-4" />Detail Siswa
          </TabsTrigger>
          <TabsTrigger value="classes" className="transition-all duration-200">
            <GraduationCap className="mr-1.5 h-4 w-4" />Rekap Per Kelas
          </TabsTrigger>
          <TabsTrigger value="tryouts" className="transition-all duration-200">
            <ClipboardList className="mr-1.5 h-4 w-4" />Daftar Tryout
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-6">
          {loading ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-8 space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Tryout</TableHead>
                        <TableHead className="text-center">Skor</TableHead>
                        <TableHead className="text-center">Benar</TableHead>
                        <TableHead className="text-center">Salah</TableHead>
                        <TableHead className="text-center">Prediksi TKA</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttempts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                                <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
                              </div>
                              <h3 className="mt-4 text-lg font-semibold">Belum ada data hasil</h3>
                              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                {selectedSessionId !== 'all' ? 'Belum ada siswa yang mengerjakan tryout ini.' : 'Pilih tryout dan kelas untuk melihat hasil.'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAttempts.map((a, idx) => {
                          const cls = classes.find((c) => c.id === a.classId);
                          const pct = a.percentage || 0;
                          const isPass = pct >= 70;
                          return (
                            <TableRow key={a.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                              <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{a.user?.name ?? '-'}</TableCell>
                              <TableCell><Badge variant="outline" className="rounded-full text-xs">{cls?.name ?? '-'}</Badge></TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate">{getSessionTitle(a.examSessionId)}</TableCell>
                              <TableCell className="text-center">
                                <span className={cn('font-bold', isPass ? 'text-emerald-600' : 'text-red-600')}>{Math.round(pct)}%</span>
                              </TableCell>
                              <TableCell className="text-center text-emerald-600 font-medium">{a.totalCorrect}</TableCell>
                              <TableCell className="text-center text-red-600 font-medium">{a.totalWrong}</TableCell>
                              <TableCell className="text-center font-medium">{a.tkaPrediction ?? '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn('rounded-full text-xs', a.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                                  {a.status === 'submitted' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Minus className="mr-1 h-3 w-3" />}
                                  {a.status === 'submitted' ? 'Selesai' : 'Proses'}
                                </Badge>
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
          )}
        </TabsContent>

        {/* Class Summary Tab */}
        <TabsContent value="classes" className="mt-6">
          {selectedSessionId === 'all' ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Pilih Tryout Terlebih Dahulu</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Pilih salah satu tryout dari filter di atas untuk melihat rekap per kelas.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : classSummary.length === 0 ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Belum ada data kelas</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Belum ada data hasil tryout untuk kelas mana pun.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classSummary.map((cs, idx) => (
                <Card key={idx} className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cs.className}</CardTitle>
                      <Badge className={cn(
                        'rounded-full text-xs',
                        cs.avgScore >= 75 ? 'bg-emerald-100 text-emerald-700' : cs.avgScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      )}>
                        {cs.avgScore >= 75 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                        {cs.avgScore}%
                      </Badge>
                    </div>
                    <CardDescription>{cs.count} peserta mengerjakan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Tertinggi</p>
                        <p className="text-lg font-bold text-emerald-600">{cs.highest}%</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Terendah</p>
                        <p className="text-lg font-bold text-red-600">{cs.lowest}%</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Rata-rata</p>
                        <p className="text-lg font-bold">{cs.avgScore}%</p>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{cs.avgScore}%</span>
                      </div>
                      <div className="w-full overflow-hidden rounded-full bg-muted h-2.5">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500',
                            cs.avgScore >= 75 ? 'bg-emerald-500' : cs.avgScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: Math.min(cs.avgScore, 100) + '%' }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tryout List Tab */}
        <TabsContent value="tryouts" className="mt-6">
          {loading ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-8 space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Belum ada tryout</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Tryout akan muncul setelah guru membuat dan menjadwalkan.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Judul Tryout</TableHead>
                        <TableHead className="text-center">Jumlah Soal</TableHead>
                        <TableHead className="text-center">Kelas</TableHead>
                        <TableHead className="text-center">Peserta</TableHead>
                        <TableHead className="text-center">Rata-rata</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-20 text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => {
                        const pCount = attempts.filter((a) => a.examSessionId === session.id && a.status === 'submitted').length;
                        const sessionAttempts = attempts.filter((a) => a.examSessionId === session.id && a.status === 'submitted');
                        const avg = sessionAttempts.length > 0
                          ? Math.round(sessionAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / sessionAttempts.length * 10) / 10
                          : 0;
                        const classList = [...new Set(session.assignments?.map((a) => a.class?.name).filter(Boolean) ?? [])];
                        return (
                          <TableRow key={session.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <p className="font-medium">{session.title}</p>
                                {session.examPackage && <p className="text-xs text-muted-foreground mt-0.5">{session.examPackage.title}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{session.examPackage?.totalQuestions ?? 0}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {classList.length > 0 ? classList.map((c) => <Badge key={c} variant="outline" className="rounded-full text-xs">{c}</Badge>) : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{pCount}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn('font-bold', avg >= 70 ? 'text-emerald-600' : avg > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                                {avg > 0 ? `${avg}%` : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{getSessionStatusBadge(session.status)}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleViewDetail(session)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Hasil Tryout</DialogTitle>
            <DialogDescription>Rekap lengkap hasil tryout per siswa</DialogDescription>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div><Label className="text-muted-foreground">Judul</Label><p className="font-medium mt-1 text-sm">{detailSession.title}</p></div>
                <div><Label className="text-muted-foreground">Paket</Label><p className="font-medium mt-1 text-sm">{detailSession.examPackage?.title ?? '-'}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1">{getSessionStatusBadge(detailSession.status)}</div></div>
                <div><Label className="text-muted-foreground">Jumlah Soal</Label><p className="font-medium mt-1 text-sm">{detailSession.examPackage?.totalQuestions ?? 0} soal</p></div>
              </div>

              {/* Class summary cards */}
              {classSummary.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Rekap Per Kelas</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {classSummary.map((cs, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{cs.className}</span>
                          <Badge className={cn('rounded-full text-xs', cs.avgScore >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            {cs.avgScore}%
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{cs.count} peserta</span>
                          <span>Tertinggi: {cs.highest}%</span>
                          <span>Terendah: {cs.lowest}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student detail table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Detail Per Siswa</h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead className="text-center">Skor</TableHead>
                        <TableHead className="text-center">Benar</TableHead>
                        <TableHead className="text-center">Salah</TableHead>
                        <TableHead className="text-center">Prediksi TKA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.filter((a) => a.examSessionId === detailSession.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Belum ada siswa mengerjakan tryout ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        attempts.filter((a) => a.examSessionId === detailSession.id).map((a, idx) => {
                          const cls = classes.find((c) => c.id === a.classId);
                          const pct = a.percentage || 0;
                          return (
                            <TableRow key={a.id} className="even:bg-muted/30">
                              <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{a.user?.name ?? '-'}</TableCell>
                              <TableCell><Badge variant="outline" className="rounded-full text-xs">{cls?.name ?? '-'}</Badge></TableCell>
                              <TableCell className="text-center font-bold">{Math.round(pct)}%</TableCell>
                              <TableCell className="text-center text-emerald-600">{a.totalCorrect}</TableCell>
                              <TableCell className="text-center text-red-600">{a.totalWrong}</TableCell>
                              <TableCell className="text-center font-medium">{a.tkaPrediction ?? '-'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
