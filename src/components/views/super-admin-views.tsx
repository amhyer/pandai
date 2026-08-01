'use client';

import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Mail,
  School,
  GraduationCap,
  UserCog,
  Baby,
  BookOpen,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  ClipboardCheck,
  UserCheck,
  Wallet,
  FileBarChart,
  PieChart,
  Activity,
  Globe,
  Settings as SettingsIcon,
  Database,
  Shield,
  Bell,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Upload,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
//  Shared Helpers
// ═══════════════════════════════════════════════════════════════════════

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-48 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Icon className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground/80 max-w-sm">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

function MiniStatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">{value}</p>
            {trendValue && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                )}
                {trend === 'down' && (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    trend === 'up'
                      ? 'text-emerald-600'
                      : trend === 'down'
                        ? 'text-red-600'
                        : ''
                  }
                >
                  {trendValue}
                </span>
              </p>
            )}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getRoleBadge(role: string) {
  const map: Record<string, { label: string; cls: string }> = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      cls: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    ADMIN_SCHOOL: {
      label: 'Admin',
      cls: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    GURU: {
      label: 'Guru',
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    SISWA: {
      label: 'Siswa',
      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    ORANG_TUA: {
      label: 'Orang Tua',
      cls: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    },
  };
  const r = map[role] ?? { label: role, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={r.cls}>{r.label}</Badge>;
}

function getStatusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === 'active' || s === 'aktif') {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Aktif
      </Badge>
    );
  }
  if (s === 'inactive' || s === 'nonaktif' || s === 'tidak aktif') {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
        <XCircle className="mr-1 h-3 w-3" />
        Nonaktif
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
      <AlertCircle className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  1. UsersGlobalView
// ═══════════════════════════════════════════════════════════════════════

const PLACEHOLDER_USERS = [
  { id: '1', name: 'Dr. Surya Dharma, M.Pd.', email: 'surya@smakn1.sch.id', role: 'ADMIN_SCHOOL', school: 'SMA KN 1 Bandung', status: 'active' },
  { id: '2', name: 'Rina Wulandari, S.Pd.', email: 'rina.w@smakn1.sch.id', role: 'GURU', school: 'SMA KN 1 Bandung', status: 'active' },
  { id: '3', name: 'Ahmad Fauzan', email: 'ahmad.fauzan@siswa.sch.id', role: 'SISWA', school: 'SMA KN 1 Bandung', status: 'active' },
  { id: '4', name: 'Budi Santoso', email: 'budi.s@ortu.sch.id', role: 'ORANG_TUA', school: 'SMA KN 1 Bandung', status: 'active' },
  { id: '5', name: 'Ir. Hendra Wijaya, M.T.', email: 'hendra@smansa.sch.id', role: 'ADMIN_SCHOOL', school: 'SMAN 1 Surabaya', status: 'active' },
  { id: '6', name: 'Dewi Kartika, S.Pd.', email: 'dewi.k@smansa.sch.id', role: 'GURU', school: 'SMAN 1 Surabaya', status: 'active' },
  { id: '7', name: 'Rizky Pratama', email: 'rizky.p@siswa.sch.id', role: 'SISWA', school: 'SMAN 1 Surabaya', status: 'inactive' },
  { id: '8', name: 'Siti Aminah, M.Pd.', email: 'siti@smam2.sch.id', role: 'ADMIN_SCHOOL', school: 'SMA Muhammadiyah 2 Jakarta', status: 'active' },
  { id: '9', name: 'Agus Supriyadi', email: 'agus.s@smam2.sch.id', role: 'GURU', school: 'SMA Muhammadiyah 2 Jakarta', status: 'active' },
  { id: '10', name: 'Putri Amelia', email: 'putri.a@siswa.sch.id', role: 'SISWA', school: 'SMA Muhammadiyah 2 Jakarta', status: 'active' },
  { id: '11', name: 'Fajar Nugroho', email: 'fajar.n@siswa.sch.id', role: 'SISWA', school: 'SMA KN 1 Bandung', status: 'active' },
  { id: '12', name: 'Lina Marlina, S.Pd.', email: 'lina@smansa.sch.id', role: 'GURU', school: 'SMAN 1 Surabaya', status: 'inactive' },
];

export function UsersGlobalView() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = PLACEHOLDER_USERS;
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.school.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, roleFilter]);

  const stats = useMemo(() => {
    const all = PLACEHOLDER_USERS;
    return {
      total: all.length,
      guru: all.filter((u) => u.role === 'GURU').length,
      siswa: all.filter((u) => u.role === 'SISWA').length,
      admin: all.filter((u) => u.role === 'ADMIN_SCHOOL').length,
      ortu: all.filter((u) => u.role === 'ORANG_TUA').length,
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna Global"
        description="Kelola semua pengguna dari seluruh sekolah di platform PANDAI."
        action={
          <Button
            className="bg-[#1F3864] hover:bg-[#152850]"
            onClick={() => toast.info('Fitur unduh data pengguna akan segera hadir.')}
          >
            <Download className="mr-2 h-4 w-4" />
            Ekspor Data
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <MiniStatCard title="Total Pengguna" value={stats.total} icon={<Users className="h-4 w-4" />} trend="up" trendValue="+12% bulan ini" />
        <MiniStatCard title="Guru" value={stats.guru} icon={<UserCog className="h-4 w-4" />} />
        <MiniStatCard title="Siswa" value={stats.siswa} icon={<GraduationCap className="h-4 w-4" />} trend="up" trendValue="+24 bulan ini" />
        <MiniStatCard title="Admin Sekolah" value={stats.admin} icon={<School className="h-4 w-4" />} />
        <MiniStatCard title="Orang Tua" value={stats.ortu} icon={<Baby className="h-4 w-4" />} />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, atau sekolah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={roleFilter} onValueChange={setRoleFilter}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="GURU">Guru</TabsTrigger>
                <TabsTrigger value="SISWA">Siswa</TabsTrigger>
                <TabsTrigger value="ADMIN_SCHOOL">Admin</TabsTrigger>
                <TabsTrigger value="ORANG_TUA">Ortu</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden md:table-cell">Email / Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Sekolah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={Users}
                        title="Tidak ada pengguna ditemukan"
                        description="Coba ubah filter atau kata kunci pencarian Anda."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user, idx) => (
                    <TableRow key={user.id} className="group">
                      <TableCell className="text-muted-foreground text-sm">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F3864]/10 text-[#1F3864] text-xs font-semibold">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-sm">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {user.school}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toast.info(`Detail pengguna: ${user.name}`)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
              <span>Menampilkan {filtered.length} dari {PLACEHOLDER_USERS.length} pengguna</span>
              <Button variant="ghost" size="sm" className="text-xs">
                <ChevronRight className="mr-1 h-3 w-3" />
                Selanjutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  2. QuestionsGlobalView
// ═══════════════════════════════════════════════════════════════════════

const PLACEHOLDER_QUESTIONS = [
  { id: 'Q001', subject: 'Matematika', topic: 'Aljabar', type: 'Pilihan Ganda', difficulty: 'Sedang', status: 'published', author: 'Rina Wulandari, S.Pd.', school: 'SMA KN 1 Bandung', usageCount: 142 },
  { id: 'Q002', subject: 'Fisika', topic: 'Kinematika', type: 'Pilihan Ganda', difficulty: 'Sulit', status: 'published', author: 'Dewi Kartika, S.Pd.', school: 'SMA Muhammadiyah 2 Jakarta', usageCount: 98 },
  { id: 'Q003', subject: 'Bahasa Indonesia', topic: 'Teks Narasi', type: 'Esai', difficulty: 'Mudah', status: 'published', author: 'Agus Supriyadi', school: 'SMA Muhammadiyah 2 Jakarta', usageCount: 67 },
  { id: 'Q004', subject: 'Biologi', topic: 'Sel dan Jaringan', type: 'Pilihan Ganda', difficulty: 'Sedang', status: 'draft', author: 'Lina Marlina, S.Pd.', school: 'SMAN 1 Surabaya', usageCount: 0 },
  { id: 'Q005', subject: 'Kimia', topic: 'Stoikiometri', type: 'Pilihan Ganda', difficulty: 'Sulit', status: 'published', author: 'Rina Wulandari, S.Pd.', school: 'SMA KN 1 Bandung', usageCount: 210 },
  { id: 'Q006', subject: 'Matematika', topic: 'Geometri', type: 'Pilihan Ganda', difficulty: 'Mudah', status: 'archived', author: 'Dewi Kartika, S.Pd.', school: 'SMA Muhammadiyah 2 Jakarta', usageCount: 45 },
  { id: 'Q007', subject: 'Bahasa Inggris', topic: 'Reading Comprehension', type: 'Pilihan Ganda', difficulty: 'Sedang', status: 'published', author: 'Agus Supriyadi', school: 'SMA Muhammadiyah 2 Jakarta', usageCount: 189 },
  { id: 'Q008', subject: 'Fisika', topic: 'Dinamika', type: 'Pilihan Ganda', difficulty: 'Sulit', status: 'draft', author: 'Rina Wulandari, S.Pd.', school: 'SMA KN 1 Bandung', usageCount: 0 },
  { id: 'Q009', subject: 'Sejarah', topic: 'Kemerdekaan Indonesia', type: 'Esai', difficulty: 'Mudah', status: 'published', author: 'Lina Marlina, S.Pd.', school: 'SMAN 1 Surabaya', usageCount: 34 },
  { id: 'Q010', subject: 'Matematika', topic: 'Statistika', type: 'Pilihan Ganda', difficulty: 'Sedang', status: 'published', author: 'Dewi Kartika, S.Pd.', school: 'SMA Muhammadiyah 2 Jakarta', usageCount: 156 },
];

const SUBJECTS = ['Semua', 'Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris', 'Sejarah'];

function getDifficultyBadge(d: string) {
  const map: Record<string, { cls: string }> = {
    Mudah: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Sedang: { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    Sulit: { cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const m = map[d] ?? { cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={m.cls}>{d}</Badge>;
}

function getQuestionStatusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    archived: { label: 'Archived', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const m = map[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

export function QuestionsGlobalView() {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = PLACEHOLDER_QUESTIONS;
    if (subjectFilter !== 'Semua') {
      list = list.filter((q) => q.subject === subjectFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((q) => q.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.topic.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, subjectFilter, statusFilter]);

  const stats = useMemo(() => {
    const all = PLACEHOLDER_QUESTIONS;
    return {
      total: all.length,
      published: all.filter((q) => q.status === 'published').length,
      draft: all.filter((q) => q.status === 'draft').length,
      archived: all.filter((q) => q.status === 'archived').length,
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal Global"
        description="Kelola seluruh bank soal dari semua sekolah. Soal yang dipublish dapat digunakan di NALAR tryout."
        action={
          <Button
            className="bg-[#1F3864] hover:bg-[#152850]"
            onClick={() => toast.info('Fitur import soal akan segera hadir.')}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Soal
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStatCard title="Total Soal" value={stats.total} icon={<BookOpen className="h-4 w-4" />} trend="up" trendValue="+18 bulan ini" />
        <MiniStatCard title="Published" value={stats.published} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MiniStatCard title="Draft" value={stats.draft} icon={<FileText className="h-4 w-4" />} />
        <MiniStatCard title="Archived" value={stats.archived} icon={<Archive className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari topik, mata pelajaran, atau penulis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">Semua</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {/* Subject pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <Button
                key={s}
                variant={subjectFilter === s ? 'default' : 'outline'}
                size="sm"
                className={
                  subjectFilter === s
                    ? 'bg-[#1F3864] hover:bg-[#152850] text-xs'
                    : 'text-xs'
                }
                onClick={() => setSubjectFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Topik</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipe</TableHead>
                  <TableHead className="hidden md:table-cell">Kesulitan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Penggunaan</TableHead>
                  <TableHead className="hidden lg:table-cell">Pembuat</TableHead>
                  <TableHead className="w-[50px]"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState
                        icon={BookOpen}
                        title="Tidak ada soal ditemukan"
                        description="Coba ubah filter atau kata kunci pencarian Anda."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((q) => (
                    <TableRow key={q.id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {q.id}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{q.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.topic}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {q.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{getDifficultyBadge(q.difficulty)}</TableCell>
                      <TableCell>{getQuestionStatusBadge(q.status)}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {q.usageCount > 0 ? (
                          <span className="text-sm font-medium">{q.usageCount}x</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {q.author}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toast.info(`Detail soal: ${q.id} - ${q.topic}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
              <span>Menampilkan {filtered.length} dari {PLACEHOLDER_QUESTIONS.length} soal</span>
              <Button variant="ghost" size="sm" className="text-xs">
                <ChevronRight className="mr-1 h-3 w-3" />
                Selanjutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper icon for archived stat card (to avoid extra import)
function Archive({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  3. ReportsGlobalView
// ═══════════════════════════════════════════════════════════════════════

const REPORT_TYPES = [
  {
    id: 'school',
    title: 'Laporan Sekolah',
    description: 'Ringkasan data sekolah termasuk jumlah siswa, guru, dan aktivitas.',
    icon: Building2,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    count: 3,
  },
  {
    id: 'tryout',
    title: 'Laporan Hasil Tryout',
    description: 'Analisis hasil tryout per sekolah, mata pelajaran, dan kompetensi.',
    icon: ClipboardCheck,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    count: 12,
  },
  {
    id: 'attendance',
    title: 'Laporan Kehadiran',
    description: 'Data kehadiran siswa dan guru dalam mengikuti tryout dan aktivitas.',
    icon: UserCheck,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    count: 8,
  },
  {
    id: 'financial',
    title: 'Laporan Keuangan',
    description: 'Ringkasan pendapatan, langganan, dan status pembayaran sekolah.',
    icon: Wallet,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    count: 2,
  },
];

const RECENT_REPORTS = [
  { id: 'R001', name: 'Laporan Hasil Tryout TKA - Gelombang 1', type: 'tryout', generatedAt: '2025-01-15 09:30', generatedBy: 'Super Admin', size: '2.4 MB' },
  { id: 'R002', name: 'Ringkasan Data Sekolah - Januari 2025', type: 'school', generatedAt: '2025-01-14 14:15', generatedBy: 'Super Admin', size: '1.1 MB' },
  { id: 'R003', name: 'Laporan Kehadiran Tryout Semester 1', type: 'attendance', generatedAt: '2025-01-10 11:00', generatedBy: 'Super Admin', size: '3.8 MB' },
  { id: 'R004', name: 'Laporan Keuangan Q4 2024', type: 'financial', generatedAt: '2025-01-05 08:45', generatedBy: 'Super Admin', size: '890 KB' },
  { id: 'R005', name: 'Laporan Analisis Butir Soal - Matematika', type: 'tryout', generatedAt: '2024-12-28 16:20', generatedBy: 'Super Admin', size: '5.2 MB' },
];

function getReportTypeBadge(type: string) {
  const map: Record<string, { label: string; cls: string }> = {
    school: { label: 'Sekolah', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    tryout: { label: 'Tryout', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    attendance: { label: 'Kehadiran', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    financial: { label: 'Keuangan', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  };
  const m = map[type] ?? { label: type, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

export function ReportsGlobalView() {
  const [generating, setGenerating] = useState<string | null>(null);

  function handleGenerate(type: string) {
    setGenerating(type);
    setTimeout(() => {
      setGenerating(null);
      toast.success(`Laporan berhasil digenerate!`);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Global"
        description="Buat dan kelola laporan lintas sekolah di platform PANDAI."
        action={
          <Button
            className="bg-[#1F3864] hover:bg-[#152850]"
            onClick={() => toast.info('Fitur jadwalkan laporan akan segera hadir.')}
          >
            <Clock className="mr-2 h-4 w-4" />
            Jadwalkan Laporan
          </Button>
        }
      />

      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isGenerating = generating === rt.id;
          return (
            <Card
              key={rt.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-[#1F3864]/20"
              onClick={() => handleGenerate(rt.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${rt.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {rt.count} laporan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-sm font-semibold mb-1">{rt.title}</CardTitle>
                <CardDescription className="text-xs mb-3">
                  {rt.description}
                </CardDescription>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileBarChart className="mr-1.5 h-3 w-3" />
                      Generate Laporan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Laporan Terbaru</CardTitle>
              <CardDescription>Daftar laporan yang sudah pernah di-generate.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => toast.info('Menampilkan semua riwayat laporan.')}
            >
              Lihat Semua
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Nama Laporan</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipe</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal Dibuat</TableHead>
                  <TableHead className="hidden lg:table-cell">Oleh</TableHead>
                  <TableHead className="hidden md:table-cell">Ukuran</TableHead>
                  <TableHead className="w-[80px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_REPORTS.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getReportTypeBadge(r.type)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.generatedAt}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {r.generatedBy}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.size}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toast.info(`Mengunduh: ${r.name}`)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toast.info('Menghapus laporan...')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
            <span>Menampilkan {RECENT_REPORTS.length} laporan terbaru</span>
            <Button variant="ghost" size="sm" className="text-xs">
              <ChevronRight className="mr-1 h-3 w-3" />
              Selanjutnya
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  4. AnalyticsGlobalView
// ═══════════════════════════════════════════════════════════════════════

const TOP_SCHOOLS = [
  { rank: 1, name: 'SMA KN 1 Bandung', students: 342, avgScore: 78.5, completionRate: 92, plan: 'PRO' },
  { rank: 2, name: 'SMAN 1 Surabaya', students: 287, avgScore: 75.2, completionRate: 88, plan: 'PRO' },
  { rank: 3, name: 'SMA Muhammadiyah 2 Jakarta', students: 198, avgScore: 72.8, completionRate: 85, plan: 'STARTER' },
  { rank: 4, name: 'SMAN 3 Semarang', students: 156, avgScore: 70.1, completionRate: 79, plan: 'STARTER' },
  { rank: 5, name: 'SMA IT Al-Azhar', students: 124, avgScore: 68.4, completionRate: 74, plan: 'FREE' },
];

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">🥇 #1</Badge>;
  if (rank === 2) return <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100">🥈 #2</Badge>;
  if (rank === 3) return <Badge className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-50">🥉 #3</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">#{rank}</Badge>;
}

function getPlanBadge(plan: string) {
  const map: Record<string, { cls: string }> = {
    FREE: { cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    STARTER: { cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    PRO: { cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  };
  const m = map[plan] ?? map.FREE;
  return <Badge variant="outline" className={m.cls}>{plan}</Badge>;
}

export function AnalyticsGlobalView() {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitik Platform"
        description="Pantau performa dan pertumbuhan platform PANDAI secara keseluruhan."
        action={
          <div className="flex items-center gap-2">
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="7d">7 Hari</TabsTrigger>
                <TabsTrigger value="30d">30 Hari</TabsTrigger>
                <TabsTrigger value="90d">90 Hari</TabsTrigger>
                <TabsTrigger value="1y">1 Tahun</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStatCard
          title="Total Sekolah"
          value="5"
          icon={<Building2 className="h-4 w-4" />}
          trend="up"
          trendValue="+2 bulan ini"
        />
        <MiniStatCard
          title="Total Pengguna"
          value="1,107"
          icon={<Users className="h-4 w-4" />}
          trend="up"
          trendValue="+15% vs periode lalu"
        />
        <MiniStatCard
          title="Tryout Dikerjakan"
          value="3,842"
          icon={<ClipboardCheck className="h-4 w-4" />}
          trend="up"
          trendValue="+28% vs periode lalu"
        />
        <MiniStatCard
          title="Rata-rata Skor"
          value="73.0"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="down"
          trendValue="-2.1% vs periode lalu"
        />
      </div>

      {/* Charts Area */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pertumbuhan Pengguna</CardTitle>
            <CardDescription>Jumlah pengguna baru per periode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <BarChart3 className="h-12 w-12 text-[#1F3864]/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Grafik Pertumbuhan Pengguna
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Data akan otomatis tampil saat terhubung ke API analytics.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Skor Tryout</CardTitle>
            <CardDescription>Sebaran skor siswa di seluruh platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <PieChart className="h-12 w-12 text-[#1F3864]/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Grafik Distribusi Skor
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Data akan otomatis tampil saat terhubung ke API analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement & Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Aktivitas Harian</CardTitle>
            <CardDescription>Jumlah tryout dikerjakan per hari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <Activity className="h-12 w-12 text-[#1F3864]/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Grafik Aktivitas Harian
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Data akan otomatis tampil saat terhubung ke API analytics.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Cepat</CardTitle>
            <CardDescription>Statistik penting hari ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skor Tertinggi Hari Ini</p>
                  <p className="text-sm font-bold text-emerald-700">95.5</p>
                </div>
              </div>
              <span className="text-xs text-emerald-600 font-medium">SMA KN 1 Bandung</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengguna Aktif Hari Ini</p>
                  <p className="text-sm font-bold text-blue-700">247</p>
                </div>
              </div>
              <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                +12%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tryout Selesai Hari Ini</p>
                  <p className="text-sm font-bold text-amber-700">83</p>
                </div>
              </div>
              <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                <ArrowDownRight className="h-3 w-3" />
                -5%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <Globe className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime Platform</p>
                  <p className="text-sm font-bold text-purple-700">99.97%</p>
                </div>
              </div>
              <span className="text-xs text-purple-600 font-medium">30 hari</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Schools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Sekolah dengan Performa Terbaik</CardTitle>
              <CardDescription>Berdasarkan rata-rata skor dan tingkat penyelesaian tryout.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => toast.info('Menampilkan laporan lengkap performa sekolah.')}
            >
              <FileBarChart className="mr-1.5 h-3 w-3" />
              Laporan Detail
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px]">Peringkat</TableHead>
                  <TableHead>Nama Sekolah</TableHead>
                  <TableHead className="text-center">Jumlah Siswa</TableHead>
                  <TableHead className="text-center">Rata-rata Skor</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Penyelesaian</TableHead>
                  <TableHead className="text-center">Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TOP_SCHOOLS.map((school) => (
                  <TableRow key={school.rank}>
                    <TableCell>{getRankBadge(school.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                          <School className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{school.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {school.students}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-bold text-sm ${
                          school.avgScore >= 75
                            ? 'text-emerald-600'
                            : school.avgScore >= 70
                              ? 'text-amber-600'
                              : 'text-orange-600'
                        }`}
                      >
                        {school.avgScore}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#1F3864] transition-all"
                            style={{ width: `${school.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {school.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getPlanBadge(school.plan)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  5. SettingsView
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_FEATURE_FLAGS = [
  { key: 'enable_nalar_ai', label: 'NALAR AI Asisten', description: 'Aktifkan fitur bantuan AI untuk menjelaskan pembahasan soal.', enabled: true },
  { key: 'enable_diagnostic_test', label: 'Tes Diagnostik', description: 'Izinkan siswa mengerjakan tes awal untuk mengukur kemampuan dasar.', enabled: true },
  { key: 'enable_adaptive_practice', label: 'Latihan Adaptif', description: 'Aktifkan sistem latihan yang menyesuaikan tingkat kesulitan otomatis.', enabled: false },
  { key: 'enable_leaderboard', label: 'Peringkat Siswa', description: 'Tampilkan papan peringkat di antar siswa dalam satu sekolah.', enabled: true },
  { key: 'enable_parent_access', label: 'Akses Orang Tua', description: 'Izinkan orang tua melihat nilai dan progres anak mereka.', enabled: true },
  { key: 'enable_bulk_import', label: 'Import Massal', description: 'Izinkan admin sekolah mengimpor data siswa/guru via CSV/Excel.', enabled: true },
  { key: 'maintenance_mode', label: 'Mode Maintenance', description: 'Aktifkan mode pemeliharaan. Semua pengguna akan dialihkan ke halaman maintenance.', enabled: false },
];

export function SettingsView() {
  const [appName, setAppName] = useState('PANDAI');
  const [appUrl, setAppUrl] = useState('https://pandai.id');
  const [senderEmail, setSenderEmail] = useState('noreply@pandai.id');
  const [smtpHost, setSmtpHost] = useState('smtp.pandai.id');
  const [smtpPort, setSmtpPort] = useState('587');
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [saving, setSaving] = useState(false);

  function toggleFeature(key: string) {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Pengaturan berhasil disimpan!');
    }, 1500);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Konfigurasi pengaturan global platform PANDAI."
        action={
          <Button
            className="bg-[#1F3864] hover:bg-[#152850]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Pengaturan Umum</CardTitle>
                  <CardDescription>Nama aplikasi dan URL dasar platform.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Aplikasi</label>
                  <Input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="PANDAI"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nama yang ditampilkan di browser tab dan email.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL Aplikasi</label>
                  <Input
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://pandai.id"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL dasar yang digunakan untuk link di email dan API.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Pengaturan Email</CardTitle>
                  <CardDescription>Konfigurasi SMTP untuk pengiriman email notifikasi.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Pengirim</label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="noreply@pandai.id"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Host</label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.pandai.id"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Port</label>
                  <Input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Password</label>
                  <Input
                    type="password"
                    value="••••••••••"
                    readOnly
                    placeholder="••••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Password tersimpan dengan aman. Hubungi developer untuk mengubah.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success('Email test berhasil dikirim ke inbox Anda!')}
                >
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  Kirim Email Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Feature Flags</CardTitle>
                  <CardDescription>
                    Aktifkan atau nonaktifkan fitur platform secara global.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{flag.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {flag.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.enabled}
                      onClick={() => toggleFeature(flag.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3864] focus-visible:ring-offset-2 ${
                        flag.enabled ? 'bg-[#1F3864]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                          flag.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - System Info */}
        <div className="space-y-6">
          {/* System Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Informasi Sistem</CardTitle>
                  <CardDescription>Detail teknis platform.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Versi Aplikasi', value: '2.1.0' },
                  { label: 'Framework', value: 'Next.js 16' },
                  { label: 'Database', value: 'PostgreSQL 16' },
                  { label: 'Runtime', value: 'Node.js 22 LTS' },
                  { label: 'Cache', value: 'Redis 7' },
                  { label: 'Storage', value: 'Cloudflare R2' },
                  { label: 'Terakhir Deploy', value: '15 Jan 2025, 09:00' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Aksi Admin</CardTitle>
                  <CardDescription>Tindakan khusus super admin.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => toast.info('Cache berhasil dibersihkan!')}
              >
                <RefreshCw className="h-4 w-4" />
                Bersihkan Cache
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => toast.info('Mengirim notifikasi ke semua admin sekolah...')}
              >
                <Bell className="h-4 w-4" />
                Broadcast Notifikasi
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => toast.info('Memulai backup database...')}
              >
                <Database className="h-4 w-4" />
                Backup Database
              </Button>
              <div className="pt-2 border-t">
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() =>
                    toast.error(
                      'Fitur ini dinonaktifkan untuk keamanan. Hubungi developer jika diperlukan.'
                    )
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  Reset Platform (Danger)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Indicator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status Layanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'API Server', status: 'operational' },
                { name: 'Database', status: 'operational' },
                { name: 'Redis Cache', status: 'operational' },
                { name: 'File Storage', status: 'operational' },
                { name: 'Email Service', status: 'degraded' },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between rounded-md px-3 py-1.5"
                >
                  <span className="text-xs text-muted-foreground">{svc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        svc.status === 'operational'
                          ? 'bg-emerald-500'
                          : svc.status === 'degraded'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                    />\n                    <span
                      className={`text-xs font-medium ${
                        svc.status === 'operational'
                          ? 'text-emerald-600'
                          : svc.status === 'degraded'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {svc.status === 'operational'
                        ? 'Operasional'
                        : svc.status === 'degraded'
                          ? 'Degrasi'
                          : 'Gangguan'}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
