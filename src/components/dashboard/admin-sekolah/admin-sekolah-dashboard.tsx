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
  GraduationCap,
  Users,
  School,
  BookOpen,
  BarChart3,
  Target,
  ClipboardList,
  UserCog,
  TrendingUp,
  Clock,
  Calendar,
  FileText,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────

interface SchoolAnalytics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalQuestions: number;
  avgScore: number;
  predictedScore: number;
  recentAttempts: { name: string; score: number; date: string }[];
}

interface UpcomingExam {
  id: string;
  name: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'grading';
  participants: number;
  subject: string;
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
      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group ${onClick ? '' : ''}`}
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
                <p className="text-2xl font-bold tracking-tight">{value}</p>
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

// ─── Exam Status Badge ──────────────────────────────────────────────

function ExamStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Dijadwalkan', className: 'bg-sky-100 text-sky-700' },
    in_progress: { label: 'Berlangsung', className: 'bg-emerald-100 text-emerald-700' },
    grading: { label: 'Dinilai', className: 'bg-amber-100 text-amber-700' },
  };
  const c = config[status] ?? config.scheduled;
  return (
    <Badge className={`rounded-full border-0 text-[10px] px-2.5 py-0.5 font-semibold ${c.className}`}>
      {c.label}
    </Badge>
  );
}

// ─── Countdown Helper ──────────────────────────────────────────────

function getCountdown(dateStr: string): string {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 'Sudah dimulai';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} hari ${hours} jam lagi`;
  return `${hours} jam lagi`;
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

export function AdminSekolahDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Current date helper
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch upcoming exams from database
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchUpcomingExams();
  }, []);

  async function fetchUpcomingExams() {
    if (!user?.schoolId) return;
    try {
      const res = await apiClient(`/api/exams?schoolId=${user.schoolId}`);
      if (res.ok) {
        const exams = await res.json();
        const mapped = (Array.isArray(exams) ? exams : []).map((e: any) => ({
          id: e.id,
          name: e.title || e.name || 'Tryout',
          date: e.startDate || e.createdAt,
          status: e.status === 'published' ? 'in_progress' as const : 'scheduled' as const,
          participants: e._count?.examSessions || 0,
          subject: e.subject || 'Tryout',
        }));
        setUpcomingExams(mapped.slice(0, 5));
      }
    } catch { /* silent */ }
  }

  async function fetchAnalytics() {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient(`/api/analytics?type=dashboard&schoolId=${user.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      toast.error('Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3864]">
              Selamat Datang, {user?.name ?? 'Admin'} ✨
            </h1>
            <Badge className="rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white border-0 shadow-sm text-xs px-3 py-0.5">
              <School className="mr-1 h-3 w-3" />
              Admin Sekolah
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <p className="text-sm text-muted-foreground">
            Dashboard sekolah {user?.schoolName ?? 'Anda'}. Kelola dan pantau performa sekolah dengan mudah.
          </p>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Siswa"
          value={loading ? '' : (analytics?.totalStudents ?? 0)}
          icon={<GraduationCap className="h-5 w-5" />}
          subtext="terdaftar"
          isLoading={loading}
          onClick={() => navigateTo('accounts')}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-600"
        />
        <StatCard
          title="Total Guru"
          value={loading ? '' : (analytics?.totalTeachers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          subtext="pengajar aktif"
          isLoading={loading}
          onClick={() => navigateTo('accounts')}
          gradientFrom="from-amber-400"
          gradientTo="to-amber-500"
        />
        <StatCard
          title="Total Kelas"
          value={loading ? '' : (analytics?.totalClasses ?? 0)}
          icon={<School className="h-5 w-5" />}
          subtext="rombongan belajar"
          isLoading={loading}
          onClick={() => navigateTo('classes' as ViewType)}
          gradientFrom="from-[#1F3864]"
          gradientTo="to-[#2d5289]"
        />
        <StatCard
          title="Total Soal"
          value={loading ? '' : (analytics?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          subtext="di bank soal"
          isLoading={loading}
          onClick={() => navigateTo('subjects' as ViewType)}
          gradientFrom="from-red-500"
          gradientTo="to-red-600"
        />
        <StatCard
          title="Rata-rata Skor"
          value={loading ? '' : `${analytics?.avgScore ?? 0}`}
          icon={<BarChart3 className="h-5 w-5" />}
          subtext="dari semua tryout"
          isLoading={loading}
          onClick={() => navigateTo('accounts')}
          gradientFrom="from-purple-500"
          gradientTo="to-purple-600"
        />
        <StatCard
          title="Prediksi TKA"
          value={loading ? '' : `${analytics?.predictedScore ?? 0}`}
          icon={<Target className="h-5 w-5" />}
          subtext="estimasi"
          isLoading={loading}
          onClick={() => navigateTo('activity-log' as ViewType)}
          gradientFrom="from-sky-500"
          gradientTo="to-sky-600"
        />
      </div>

      {/* ── Chart + Quick Actions ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1F3864]" />
                  Skor Tryout Terkini
                </CardTitle>
                <CardDescription className="mt-1">Skor siswa pada tryout terakhir</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigateTo('teacher-assignments' as ViewType)}
              >
                Detail
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : analytics?.recentAttempts && analytics.recentAttempts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.recentAttempts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      padding: '12px',
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Skor"
                    fill="#1F3864"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Belum ada data tryout</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Kelola sekolah Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={<UserCog className="h-5 w-5" />}
                label="Guru & Siswa"
                description="Kelola pengguna"
                onClick={() => navigateTo('accounts')}
                color="from-[#1F3864] to-[#2d5289]"
              />
              <QuickActionCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Penugasan"
                description="Tugas guru"
                onClick={() => navigateTo('teacher-assignments' as ViewType)}
                color="from-amber-400 to-amber-500"
              />
              <QuickActionCard
                icon={<School className="h-5 w-5" />}
                label="Kelas"
                description="Rombongan belajar"
                onClick={() => navigateTo('classes' as ViewType)}
                color="from-emerald-500 to-emerald-600"
              />
              <QuickActionCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Backup"
                description="Cadangkan data"
                onClick={() => navigateTo('backup-restore' as ViewType)}
                color="from-purple-500 to-purple-600"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Exams ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#1F3864]" />
                Ujian & Tryout Mendatang
              </CardTitle>
              <CardDescription className="mt-1">Jadwal ujian yang akan datang</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigateTo('teacher-assignments' as ViewType)}
            >
              Lihat Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm">Belum ada tryout terjadwal</p>
              <p className="text-xs mt-1">Tryout yang dibuat guru akan tampil di sini</p>
            </div>
          ) : (
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-white p-4 cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-200 group"
                onClick={() => navigateTo('teacher-assignments' as ViewType)}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  exam.status === 'in_progress' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm' :
                  exam.status === 'grading' ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm' :
                  'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm'
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{exam.name}</p>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getCountdown(exam.date)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {exam.participants} peserta
                    </span>
                    <Badge className="rounded-full bg-muted text-muted-foreground text-[10px] px-2 py-0 border-0">
                      {exam.subject}
                    </Badge>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
