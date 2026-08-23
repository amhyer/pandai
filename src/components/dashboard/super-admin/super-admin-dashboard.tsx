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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  School,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Plus,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  FilePlus,
  UserPlus,
  BarChart3,
  Settings,
  Clock,
  Shield,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────

interface GlobalAnalytics {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalQuestions: number;
  totalExams: number;
  mrr: number;
  monthlyGrowth: { month: string; sekolah: number; siswa: number }[];
  topSchools: {
    id: string;
    name: string;
    code: string;
    plan: string;
    status: string;
    _count?: { users: number };
  }[];
}

interface RecentActivity {
  id: string;
  action: string;
  detail: string;
  time: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  isLoading?: boolean;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}

function StatCard({ title, value, icon, description, trend, trendValue, isLoading, onClick, gradientFrom, gradientTo }: StatCardProps) {
  return (
    <Card
      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${onClick ? 'group' : ''}`}
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
                <Skeleton className="h-3 w-32 rounded" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {description && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                    {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                    <span className={trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : ''}>
                      {description}
                    </span>
                  </p>
                )}
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

// ─── Timeline Activity Item ──────────────────────────────────────────

function TimelineItem({ activity, isLast }: { activity: RecentActivity; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${activity.color} z-10`}>
          {activity.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-muted-foreground/20 to-transparent mt-1" />}
      </div>
      {/* Content */}
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

export function SuperAdminDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedSchoolId = useAppStore((s) => s.setSelectedSchoolId);
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Current date helper
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Mock recent activity
  const recentActivities: RecentActivity[] = [
    { id: '1', action: 'Sekolah baru terdaftar', detail: 'SMA Negeri 3 Bandung bergabung', time: '15 menit lalu', icon: <UserPlus className="h-4 w-4 text-white" />, color: 'bg-emerald-500' },
    { id: '2', action: 'Tryout baru dibuat', detail: 'TKA Prediksi Akhir Tahun oleh Guru Matematika', time: '1 jam lalu', icon: <FilePlus className="h-4 w-4 text-white" />, color: 'bg-[#1F3864]' },
    { id: '3', action: '500 soal baru ditambahkan', detail: 'Bank soal NALAR diperbarui otomatis', time: '3 jam lalu', icon: <BookOpen className="h-4 w-4 text-white" />, color: 'bg-amber-500' },
    { id: '4', action: 'Laporan bulanan dikirim', detail: 'Report Mei 2025 tersedia untuk unduh', time: '6 jam lalu', icon: <BarChart3 className="h-4 w-4 text-white" />, color: 'bg-purple-500' },
    { id: '5', action: 'Pengaturan diperbarui', detail: 'Konfigurasi limit tryout diubah', time: '1 hari lalu', icon: <Settings className="h-4 w-4 text-white" />, color: 'bg-red-500' },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await apiClient('/api/analytics?type=global');
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

  async function handleSeedData() {
    try {
      setSeeding(true);
      const res = await apiClient('/api/seed', { method: 'POST' });
      if (res.ok) {
        toast.success('Data demo berhasil ditambahkan!');
        fetchAnalytics();
      } else {
        toast.error('Gagal menambahkan data demo');
      }
    } catch {
      toast.error('Gagal menambahkan data demo');
    } finally {
      setSeeding(false);
    }
  }

  function handleSchoolClick(schoolId: string) {
    setSelectedSchoolId(schoolId);
    navigateTo('school-detail');
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3864]">
              Selamat Datang, {user?.name ?? 'Super Admin'} ✨
            </h1>
            <Badge className="rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white border-0 shadow-sm text-xs px-3 py-0.5">
              <Shield className="mr-1 h-3 w-3" />
              Super Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <p className="text-sm text-muted-foreground">
            Platform PANDAI berjalan lancar. Berikut ringkasan performa hari ini.
          </p>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Sekolah"
          value={loading ? '' : formatNumber(analytics?.activeSchools ?? 0)}
          icon={<School className="h-5 w-5" />}
          description="aktif berlangganan"
          isLoading={loading}
          onClick={() => navigateTo('schools' as ViewType)}
          gradientFrom="from-[#1F3864]"
          gradientTo="to-[#2d5289]"
        />
        <StatCard
          title="Total Siswa"
          value={loading ? '' : formatNumber(analytics?.totalStudents ?? 0)}
          icon={<GraduationCap className="h-5 w-5" />}
          description={analytics?.totalStudents ? 'terdaftar' : 'belum ada data'}
          isLoading={loading}
          onClick={() => navigateTo('users-global' as ViewType)}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-600"
        />
        <StatCard
          title="Total Guru"
          value={loading ? '' : formatNumber(analytics?.totalTeachers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          description="pengajar aktif"
          isLoading={loading}
          onClick={() => navigateTo('users-global' as ViewType)}
          gradientFrom="from-amber-400"
          gradientTo="to-amber-500"
        />
        <StatCard
          title="MRR"
          value={loading ? '' : formatCurrency(analytics?.mrr ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          description="bulanan"
          isLoading={loading}
          onClick={() => navigateTo('analytics-global' as ViewType)}
          gradientFrom="from-purple-500"
          gradientTo="to-purple-600"
        />
        <StatCard
          title="Total Soal"
          value={loading ? '' : formatNumber(analytics?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          description="di bank soal"
          isLoading={loading}
          onClick={() => navigateTo('questions-global' as ViewType)}
          gradientFrom="from-red-500"
          gradientTo="to-red-600"
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : formatNumber(analytics?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          description="dibuat"
          isLoading={loading}
          onClick={() => navigateTo('reports-global' as ViewType)}
          gradientFrom="from-sky-500"
          gradientTo="to-sky-600"
        />
      </div>

      {/* ── Growth Chart + Quick Actions ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Growth Chart */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#1F3864]" />
                  Pertumbuhan Platform
                </CardTitle>
                <CardDescription className="mt-1">Sekolah & siswa baru per bulan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : analytics?.monthlyGrowth && analytics.monthlyGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      padding: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sekolah"
                    name="Sekolah"
                    stroke="#1F3864"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1F3864' }}
                    activeDot={{ r: 6, fill: '#1F3864' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="siswa"
                    name="Siswa"
                    stroke="#D4A017"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#D4A017' }}
                    activeDot={{ r: 6, fill: '#D4A017' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm">Belum ada data pertumbuhan</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <Card className="rounded-xl shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Atur platform dengan cepat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={<Plus className="h-5 w-5" />}
                label="Tambah Sekolah"
                description="Daftarkan sekolah baru"
                onClick={() => navigateTo('schools' as ViewType)}
                color="from-[#1F3864] to-[#2d5289]"
              />
              <QuickActionCard
                icon={<Users className="h-5 w-5" />}
                label="Kelola User"
                description="Manajemen akun global"
                onClick={() => navigateTo('users-global' as ViewType)}
                color="from-emerald-500 to-emerald-600"
              />
              <QuickActionCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Laporan"
                description="Laporan platform"
                onClick={() => navigateTo('reports-global' as ViewType)}
                color="from-amber-400 to-amber-500"
              />
              <button
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] group text-center"
                onClick={handleSeedData}
                disabled={seeding}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{seeding ? 'Menambahkan...' : 'Seed Demo'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Isi data contoh</p>
                </div>
              </button>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-[#1F3864]/5 to-amber-50/50 border border-[#1F3864]/10 p-3 mt-3">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-base">💡</span>
                <span>Gunakan &quot;Seed Data Demo&quot; untuk mengisi data contoh sekolah, guru, siswa, dan soal.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Schools Table ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <School className="h-5 w-5 text-[#1F3864]" />
                Sekolah Terbaik
              </CardTitle>
              <CardDescription className="mt-1">Berdasarkan rata-rata skor siswa</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigateTo('schools' as ViewType)}
            >
              Lihat Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : analytics?.topSchools && analytics.topSchools.length > 0 ? (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/50">
                    <TableHead className="w-12 rounded-tl-xl">No</TableHead>
                    <TableHead>Nama Sekolah</TableHead>
                    <TableHead className="text-center">Siswa</TableHead>
                    <TableHead className="text-center">Rata-rata Skor</TableHead>
                    <TableHead className="text-center rounded-tr-xl">Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topSchools.map((school, idx) => (
                    <TableRow
                      key={school.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors even:bg-muted/30"
                      onClick={() => handleSchoolClick(school.id)}
                    >
                      <TableCell className="font-medium">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F3864]/10 text-xs font-bold text-[#1F3864]">
                          {idx + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="text-center">{formatNumber(school._count?.users || 0)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-[#1F3864]">-</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <PlanBadge plan={school.plan} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <School className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada data sekolah</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                  onClick={() => navigateTo('schools' as ViewType)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Sekolah
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity Timeline ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#1F3864]" />
                Aktivitas Terkini
              </CardTitle>
              <CardDescription className="mt-1">Event terbaru di platform PANDAI</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigateTo('activity-log' as ViewType)}
            >
              Lihat Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="pl-1">
            {recentActivities.map((activity, idx) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                isLast={idx === recentActivities.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Plan Badge ──────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    STARTER: 'bg-sky-100 text-sky-700',
    PRO: 'bg-amber-100 text-amber-700',
  };
  return (
    <Badge className={`rounded-full border-0 text-[10px] px-2.5 py-0.5 font-semibold ${variants[plan.toUpperCase()] ?? variants.FREE}`}>
      {plan}
    </Badge>
  );
}
