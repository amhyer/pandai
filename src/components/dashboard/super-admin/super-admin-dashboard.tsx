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

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, description, trend, trendValue, isLoading }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {description && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics?type=global');
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
      const res = await fetch('/api/seed', { method: 'POST' });
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang, {user?.name ?? 'Super Admin'} 👋
          </h1>
          <p className="text-muted-foreground">
            Berikut ringkasan platform PANDAI hari ini.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Sekolah"
          value={loading ? '' : formatNumber(analytics?.activeSchools ?? 0)}
          icon={<School className="h-5 w-5" />}
          description="aktif"
          isLoading={loading}
        />
        <StatCard
          title="Total Siswa"
          value={loading ? '' : formatNumber(analytics?.totalStudents ?? 0)}
          icon={<GraduationCap className="h-5 w-5" />}
          description={analytics?.totalStudents ? 'terdaftar' : 'belum ada data'}
          isLoading={loading}
        />
        <StatCard
          title="Total Guru"
          value={loading ? '' : formatNumber(analytics?.totalTeachers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          isLoading={loading}
        />
        <StatCard
          title="MRR"
          value={loading ? '' : formatCurrency(analytics?.mrr ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          description="bulanan"
          isLoading={loading}
        />
        <StatCard
          title="Total Soal"
          value={loading ? '' : formatNumber(analytics?.totalQuestions ?? 0)}
          icon={<BookOpen className="h-5 w-5" />}
          isLoading={loading}
        />
        <StatCard
          title="Total Tryout"
          value={loading ? '' : formatNumber(analytics?.totalExams ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          isLoading={loading}
        />
      </div>

      {/* Growth Chart + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Growth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Pertumbuhan Platform</CardTitle>
            <CardDescription>Sekolah & siswa baru per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
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
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sekolah"
                    name="Sekolah"
                    stroke="#1F3864"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="siswa"
                    name="Siswa"
                    stroke="#D4A017"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Atur platform dengan cepat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-2 bg-[#1F3864] hover:bg-[#152850]"
              onClick={() => navigateTo('schools')}
            >
              <Plus className="h-4 w-4" />
              Tambah Sekolah
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleSeedData}
              disabled={seeding}
            >
              <Database className="h-4 w-4" />
              {seeding ? 'Menambahkan Data...' : 'Seed Data Demo'}
            </Button>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium">💡 Tips</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gunakan &quot;Seed Data Demo&quot; untuk mengisi data contoh sekolah, guru, siswa, dan soal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sekolah Terbaik</CardTitle>
          <CardDescription>Berdasarkan rata-rata skor siswa</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : analytics?.topSchools && analytics.topSchools.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Sekolah</TableHead>
                    <TableHead className="text-center">Siswa</TableHead>
                    <TableHead className="text-center">Rata-rata Skor</TableHead>
                    <TableHead className="text-center">Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topSchools.map((school, idx) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
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
                  className="mt-3"
                  onClick={() => navigateTo('schools')}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Sekolah
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Plan Badge ──────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 border-gray-200',
    STARTER: 'bg-blue-100 text-blue-700 border-blue-200',
    PRO: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <Badge variant="outline" className={variants[plan.toUpperCase()] ?? variants.FREE}>
      {plan}
    </Badge>
  );
}
