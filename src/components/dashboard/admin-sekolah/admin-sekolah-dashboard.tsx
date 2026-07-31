'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, subtext, isLoading }: StatCardProps) {
  return (
    <Card>
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
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
              </>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminSekolahDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

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
        />
        <StatCard
          title="Total Guru"
          value={loading ? '' : (analytics?.totalTeachers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          isLoading={loading}
        />
        <StatCard
          title="Total Kelas"
          value={loading ? '' : (analytics?.totalClasses ?? 0)}
          icon={<School className="h-5 w-5" />}
          isLoading={loading}
        />
        <StatCard
          title="Total Soal"
          value={loading ? '' : (analytics?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          isLoading={loading}
        />
        <StatCard
          title="Rata-rata Skor"
          value={loading ? '' : `${analytics?.avgScore ?? 0}`}
          icon={<BarChart3 className="h-5 w-5" />}
          subtext="dari semua tryout"
          isLoading={loading}
        />
        <StatCard
          title="Prediksi TKA"
          value={loading ? '' : `${analytics?.predictedScore ?? 0}`}
          icon={<Target className="h-5 w-5" />}
          subtext="estimasi"
          isLoading={loading}
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
            <Button
              className="w-full justify-start gap-2 bg-[#1F3864] hover:bg-[#152850]"
              onClick={() => navigateTo('users')}
            >
              <UserCog className="h-4 w-4" />
              Kelola Guru & Siswa
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('exams')}
            >
              <ClipboardList className="h-4 w-4" />
              Buat Tryout
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('classes')}
            >
              <School className="h-4 w-4" />
              Manajemen Kelas
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigateTo('reports')}
            >
              <TrendingUp className="h-4 w-4" />
              Lihat Laporan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
