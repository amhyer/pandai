'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { apiClient } from '@/lib/api-client';
import type { ViewType } from '@/store/use-store';
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
  BookOpen,
  ClipboardList,
  BarChart3,
  FilePlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Trophy,
  ArrowRight,
  Star,
  Zap,
  FlaskConical,
  Calculator,
  Languages,
  Atom,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface RecentActivity {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: 'create' | 'exam' | 'result';
}

interface TopStudent {
  name: string;
  score: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
}

interface GuruDashboardData {
  totalQuestions: number;
  totalExams: number;
  avgStudentScore: number;
  recentActivities: RecentActivity[];
  topStudents: TopStudent[];
}

export interface GuruDashboardServerData extends GuruDashboardData {
  recentActivities: Array<{
    id: string;
    action: string;
    detail: string;
    time: string;
    type: 'create' | 'exam' | 'result';
  }>;
  topStudents: Array<{
    name: string;
    score: number;
    progress: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface GuruDashboardProps {
  serverData?: GuruDashboardServerData;
}

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, gradientFrom, gradientTo }: StatCardProps) {
  return (
    <Card
      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            {isLoading ? (
              <>
                <Skeleton className="h-3.5 w-24 mb-2 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
              </>
            )}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${gradientFrom && gradientTo ? `${gradientFrom} ${gradientTo}` : 'from-[#1F3864] to-[#2d5289]'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─── Timeline Activity Item ──────────────────────────────────────────

function TimelineActivity({ activity, isLast }: { activity: RecentActivity; isLast: boolean }) {
  const dotColor = activity.type === 'create' ? 'bg-emerald-500' : activity.type === 'exam' ? 'bg-[#1F3864]' : 'bg-amber-500';
  const IconEl = activity.type === 'create' ? <FilePlus className="h-4 w-4 text-white" /> : activity.type === 'exam' ? <ClipboardList className="h-4 w-4 text-white" /> : <BarChart3 className="h-4 w-4 text-white" />;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${dotColor} z-10`}>
          {IconEl}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-muted-foreground/20 to-transparent mt-1" />}
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{activity.action}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.detail}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Action Card ──────────────────────────────────────────────

function QuickActionCard({ icon, label, description, onClick, color }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] group text-center"
      onClick={onClick}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function GuruDashboard({ serverData }: GuruDashboardProps = {}) {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [dashData, setDashData] = useState<GuruDashboardData | null>(serverData ?? null);
  const [loading, setLoading] = useState(!serverData);
  const [quickSubject, setQuickSubject] = useState('');
  const [creating, setCreating] = useState(false);

  // Current date helper
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const subjects = [
    { value: 'matematika', label: 'Matematika', icon: Calculator },
    { value: 'fisika', label: 'Fisika', icon: Atom },
    { value: 'kimia', label: 'Kimia', icon: FlaskConical },
    { value: 'biologi', label: 'Biologi', icon: FlaskConical },
    { value: 'b_indonesia', label: 'B. Indonesia', icon: Languages },
    { value: 'b_inggris', label: 'B. Inggris', icon: Languages },
  ];

  useEffect(() => {
    if (serverData) {
      setDashData(serverData);
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [serverData]);

  async function fetchDashboardData() {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const [qRes, eRes] = await Promise.all([
        apiClient(`/api/questions?schoolId=${user.schoolId}`),
        apiClient(`/api/analytics?type=guru-dashboard&schoolId=${user.schoolId}`),
      ]);

      let totalQuestions = 0;
      if (qRes.ok) {
        const data = await qRes.json();
        totalQuestions = Array.isArray(data) ? data.length : data.questions?.length ?? 0;
      }

      let analytics: any = {};
      if (eRes.ok) {
        analytics = await eRes.json();
      }

      setDashData({
        totalQuestions,
        totalExams: analytics.totalExams ?? 0,
        avgStudentScore: analytics.avgStudentScore ?? 0,
        recentActivities: analytics.recentActivities ?? [],
        topStudents: analytics.topStudents ?? [],
      });
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickCreate() {
    if (!quickSubject) {
      toast.error('Pilih mata pelajaran terlebih dahulu');
      return;
    }
    navigateTo('guru-materi' as ViewType);
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3864]">
              Selamat Datang, {user?.name ?? 'Guru'} ✨
            </h1>
            <Badge className="rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white border-0 shadow-sm text-xs px-3 py-0.5">
              <BookOpen className="mr-1 h-3 w-3" />
              Guru
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <p className="text-sm text-muted-foreground">
            {user?.schoolName ? `Sekolah ${user.schoolName}` : 'Dashboard guru'} — Kelola soal dan pantau kemajuan siswa dengan mudah.
          </p>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Soal Dibuat"
          value={loading ? '' : (dashData?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          subtext="soal di bank soal"
          isLoading={loading}
          onClick={() => navigateTo('guru-materi' as ViewType)}
          gradientFrom="from-[#1F3864]"
          gradientTo="to-[#2d5289]"
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : (dashData?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          subtext="tryout aktif"
          isLoading={loading}
          onClick={() => navigateTo('guru-tugas' as ViewType)}
          gradientFrom="from-amber-400"
          gradientTo="to-amber-500"
        />
        <StatCard
          title="Rata-rata Skor Siswa"
          value={loading ? '' : (dashData?.avgStudentScore ?? 0)}
          icon={<BarChart3 className="h-5 w-5" />}
          subtext="dari semua tryout"
          isLoading={loading}
          onClick={() => navigateTo('guru-analisis' as ViewType)}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-600"
        />
      </div>

      {/* ── Quick Create + Student Performance ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Create */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg">Buat Soal Cepat</CardTitle>
                <CardDescription className="text-xs">Pilih mapel dan langsung buat</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {subjects.map((subject) => {
                const Icon = subject.icon;
                return (
                  <button
                    key={subject.value}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                      quickSubject === subject.value
                        ? 'border-[#1F3864] bg-[#1F3864]/10 text-[#1F3864] shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setQuickSubject(subject.value === quickSubject ? '' : subject.value)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{subject.label}</span>
                  </button>
                );
              })}
            </div>
            <Button
              className="w-full justify-center gap-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] bg-[#1F3864] hover:bg-[#152850]"
              disabled={!quickSubject || creating}
              onClick={handleQuickCreate}
            >
              <FilePlus className="h-4 w-4" />
              {creating ? 'Membuat...' : quickSubject ? `Buat Soal ${subjects.find(s => s.value === quickSubject)?.label}` : 'Pilih Mapel Dulu'}
            </Button>
          </CardContent>
        </Card>

        {/* Student Performance Summary */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Performa Siswa Terbaik
                </CardTitle>
                <CardDescription className="mt-1">Top 3 siswa berdasarkan skor terkini</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigateTo('guru-analisis' as ViewType)}
              >
                Lihat Semua
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dashData?.topStudents && dashData.topStudents.length > 0) ? dashData.topStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-white p-4 cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-200"
                  onClick={() => navigateTo('guru-nilai' as ViewType)}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                    idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                    idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                  }`}>
                    {idx === 0 ? <Star className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold truncate">{student.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1F3864]">{student.score}</span>
                        {student.trend === 'up' && <ArrowRight className="h-3 w-3 text-emerald-500 -rotate-45" />}
                        {student.trend === 'down' && <ArrowRight className="h-3 w-3 text-red-500 rotate-45" />}
                        {student.trend === 'stable' && <Clock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <ProgressBar
                      value={student.progress}
                      color={idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : 'bg-gradient-to-r from-orange-400 to-orange-500'}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{student.progress}% progres target</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Belum ada data performa siswa</p>
                  <p className="text-xs mt-1">Data akan muncul setelah siswa mengerjakan tryout</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions + Activity Timeline ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions Grid */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Langkah berikutnya?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={<FilePlus className="h-5 w-5" />}
                label="Buat Soal"
                description="Soal baru"
                onClick={() => navigateTo('guru-materi' as ViewType)}
                color="from-[#1F3864] to-[#2d5289]"
              />
              <QuickActionCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Buat Tryout"
                description="Ujian baru"
                onClick={() => navigateTo('guru-tugas' as ViewType)}
                color="from-amber-400 to-amber-500"
              />
              <QuickActionCard
                icon={<BookOpen className="h-5 w-5" />}
                label="Bank Soal"
                description="Lihat koleksi"
                onClick={() => navigateTo('guru-materi' as ViewType)}
                color="from-emerald-500 to-emerald-600"
              />
              <QuickActionCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Analisis"
                description="Nilai & laporan"
                onClick={() => navigateTo('guru-analisis' as ViewType)}
                color="from-purple-500 to-purple-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#1F3864]" />
                  Aktivitas Terkini
                </CardTitle>
                <CardDescription className="mt-1">Riwayat aktivitas Anda</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="pl-1">
              {(dashData?.recentActivities && dashData.recentActivities.length > 0) ? dashData.recentActivities.map((activity, idx) => (
                <TimelineActivity
                  key={activity.id}
                  activity={activity}
                  isLast={idx === dashData.recentActivities.length - 1}
                />
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Belum ada aktivitas</p>
                  <p className="text-xs mt-1">Aktivitas Anda akan tampil di sini</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Motivational Tip ── */}
      <div className="rounded-xl bg-gradient-to-r from-[#1F3864]/5 to-amber-50/50 border border-[#1F3864]/10 p-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
          <Lightbulb className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1F3864]">Tips Mengajar Hari Ini</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Coba buat 5-10 soal latihan baru untuk topik yang siswa Anda rata-rata skor di bawah 60%. Konsistensi soal baru membantu meningkatkan performa.
          </p>
        </div>
      </div>
    </div>
  );
}
