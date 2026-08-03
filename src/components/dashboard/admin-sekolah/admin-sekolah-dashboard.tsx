'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
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
  CheckCircle2,
  AlertCircle,
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
  iconBg?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, iconBg, iconColor }: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group ${onClick ? '' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
              </>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg ?? 'bg-[#1F3864]/10 text-[#1F3864]'} ${iconColor ?? ''}`}>
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
    scheduled: { label: 'Dijadwalkan', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    in_progress: { label: 'Berlangsung', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    grading: { label: 'Dinilai', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const c = config[status] ?? config.scheduled;
  return (
    <Badge variant="outline" className={c.className}>
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

// ─── Main Component ─────────────────────────────────────────────────

export function AdminSekolahDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock upcoming exams
  const upcomingExams: UpcomingExam[] = [
    { id: 'e1', name: 'TKA Prediksi Akhir Tahun', date: '2025-06-15T08:00:00', status: 'scheduled', participants: 120, subject: 'TKA Umum' },
    { id: 'e2', name: 'Tryout Matematika', date: '2025-06-10T09:00:00', status: 'scheduled', participants: 85, subject: 'Matematika' },
    { id: 'e3', name: 'Tryout Fisika & Kimia', date: '2025-06-08T10:00:00', status: 'in_progress', participants: 72, subject: 'IPA' },
    { id: 'e4', name: 'UTS Genap 2025', date: '2025-06-05T07:30:00', status: 'grading', participants: 200, subject: 'Semua Mapel' },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?type=dashboard&schoolId=${user.schoolId}`);
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {user?.name ?? 'Admin'} 👋
        </h1>
        <p className="text-muted-foreground">
          Dashboard sekolah {user?.schoolName ?? 'Anda'}.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Siswa"
          value={loading ? '' : (analytics?.totalStudents ?? 0)}
          icon={<GraduationCap className="h-5 w-5" />}
          subtext="terdaftar"
          isLoading={loading}
          onClick={() => navigateTo('users' as ViewType)}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Total Guru"
          value={loading ? '' : (analytics?.totalTeachers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          isLoading={loading}
          onClick={() => navigateTo('users' as ViewType)}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Total Kelas"
          value={loading ? '' : (analytics?.totalClasses ?? 0)}
          icon={<School className="h-5 w-5" />}
          isLoading={loading}
          onClick={() => navigateTo('classes' as ViewType)}
          iconBg="bg-[#1F3864]/10"
          iconColor="text-[#1F3864]"
        />
        <StatCard
          title="Total Soal"
          value={loading ? '' : (analytics?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          isLoading={loading}
          onClick={() => navigateTo('subjects' as ViewType)}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Rata-rata Skor"
          value={loading ? '' : `${analytics?.avgScore ?? 0}`}
          icon={<BarChart3 className="h-5 w-5" />}
          subtext="dari semua tryout"
          isLoading={loading}
          onClick={() => navigateTo('users' as ViewType)}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Prediksi TKA"
          value={loading ? '' : `${analytics?.predictedScore ?? 0}`}
          icon={<Target className="h-5 w-5" />}
          subtext="estimasi"
          isLoading={loading}
          onClick={() => navigateTo('activity-log' as ViewType)}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Skor Tryout Terkini</CardTitle>
            <CardDescription>Skor siswa pada tryout terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
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
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Skor"
                    fill="#1F3864"
                    radius={[4, 4, 0, 0]}
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Kelola sekolah Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-lg border-2 border-[#1F3864]/20 bg-[#1F3864]/5 p-3 cursor-pointer hover:bg-[#1F3864]/10 transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigateTo('users' as ViewType)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864] text-white">
                <UserCog className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1F3864]">Kelola Guru & Siswa</p>
                <p className="text-xs text-muted-foreground">Tambah, edit, nonaktifkan</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1F3864]/40" />
            </div>
            <div
              className="flex items-center gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-3 cursor-pointer hover:bg-amber-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigateTo('teacher-assignments' as ViewType)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Penugasan Guru</p>
                <p className="text-xs text-muted-foreground">Kelola tugas guru</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </div>
            <div
              className="flex items-center gap-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 cursor-pointer hover:bg-emerald-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigateTo('classes' as ViewType)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <School className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Manajemen Kelas</p>
                <p className="text-xs text-muted-foreground">Rombongan belajar</p>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-400" />
            </div>
            <div
              className="flex items-center gap-3 rounded-lg border-2 border-purple-200 bg-purple-50 p-3 cursor-pointer hover:bg-purple-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigateTo('backup-restore' as ViewType)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-purple-800">Backup & Restore</p>
                <p className="text-xs text-muted-foreground">Cadangkan & pulihkan data</p>
              </div>
              <ArrowRight className="h-4 w-4 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Exams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ujian & Tryout Mendatang</CardTitle>
              <CardDescription>Jadwal ujian yang akan datang</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigateTo('teacher-assignments' as ViewType)}>
              <Calendar className="h-3.5 w-3.5" />
              Lihat Penugasan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => navigateTo('teacher-assignments' as ViewType)}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  exam.status === 'in_progress' ? 'bg-emerald-50 text-emerald-600' :
                  exam.status === 'grading' ? 'bg-amber-50 text-amber-600' :
                  'bg-sky-50 text-sky-600'
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{exam.name}</p>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getCountdown(exam.date)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {exam.participants} peserta
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {exam.subject}
                    </Badge>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
