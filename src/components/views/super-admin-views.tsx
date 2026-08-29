'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
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

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Download,
  Eye,
  Trash2,
  Mail,
  School,
  GraduationCap,
  UserCog,
  Baby,
  BookOpen,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  ClipboardCheck,
  UserCheck,
  Wallet,
  FileBarChart,
  Activity,
  Globe,
  Settings as SettingsIcon,
  Database,
  Shield,
  Bell,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  Loader2,
  ArrowUpDown,
  Save,
  TriangleAlert,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
//  Shared Helpers & Types
// ═══════════════════════════════════════════════════════════════════════

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  school: string;
  status: string;
}

function PageHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
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
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-9 w-9 text-muted-foreground/40" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground/70">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  gradient,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${gradient}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/80">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
          {trendValue && (
            <p className="flex items-center gap-1 text-xs text-white/90">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-200" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-200" />
              )}
              <span>{trendValue}</span>
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function getRoleBadge(role: string) {
  const map: Record<string, { label: string; cls: string }> = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      cls: 'bg-purple-100 text-purple-700 rounded-full border-0',
    },
    ADMIN_SCHOOL: {
      label: 'Admin',
      cls: 'bg-sky-100 text-sky-700 rounded-full border-0',
    },
    GURU: {
      label: 'Guru',
      cls: 'bg-amber-100 text-amber-700 rounded-full border-0',
    },
    SISWA: {
      label: 'Siswa',
      cls: 'bg-emerald-100 text-emerald-700 rounded-full border-0',
    },
    ORANG_TUA: {
      label: 'Orang Tua',
      cls: 'bg-rose-100 text-rose-700 rounded-full border-0',
    },
  };
  const r = map[role] ?? {
    label: role,
    cls: 'bg-gray-100 text-gray-700 rounded-full border-0',
  };
  return <Badge className={r.cls}>{r.label}</Badge>;
}

function getStatusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === 'active' || s === 'aktif') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 rounded-full border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Aktif
      </Badge>
    );
  }
  if (s === 'inactive' || s === 'nonaktif' || s === 'tidak aktif') {
    return (
      <Badge className="bg-gray-100 text-gray-500 rounded-full border-0">
        <XCircle className="mr-1 h-3 w-3" />
        Nonaktif
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-50 text-amber-600 rounded-full border-0">
      <AlertCircle className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ═══════════════════════════════════════════════════════════════════════
//  1. UsersGlobalView
// ═══════════════════════════════════════════════════════════════════════

const FALLBACK_USERS: User[] = [
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

const ITEMS_PER_PAGE = 8;

export function UsersGlobalView() {
  const [rawSearch, setRawSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(rawSearch, 300);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const res = await fetch('/api/users');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            setUsers(
              json.data.map((u: Record<string, string>) => ({
                id: String(u.id ?? ''),
                name: u.name ?? u.fullName ?? '',
                email: u.email ?? u.username ?? '',
                role: u.role ?? '',
                school: u.schoolName ?? u.school ?? '',
                status: u.status ?? 'active',
              }))
            );
          } else {
            setUsers(FALLBACK_USERS);
          }
        } else {
          setUsers(FALLBACK_USERS);
        }
      } catch {
        setUsers(FALLBACK_USERS);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.school.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, debouncedSearch, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter]);

  const stats = useMemo(() => {
    const all = users;
    return {
      total: all.length,
      guru: all.filter((u) => u.role === 'GURU').length,
      siswa: all.filter((u) => u.role === 'SISWA').length,
      admin: all.filter((u) => u.role === 'ADMIN_SCHOOL').length,
      ortu: all.filter((u) => u.role === 'ORANG_TUA').length,
    };
  }, [users]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        toast.success(`Pengguna "${deleteTarget.name}" berhasil dihapus.`);
      } else {
        toast.error('Gagal menghapus pengguna.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus pengguna.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna Global"
        description="Kelola semua pengguna dari seluruh sekolah di platform PANDAI."
        icon={Users}
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-[#1F3864] hover:bg-[#152850] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                disabled
              >
                <Download className="mr-2 h-4 w-4" />
                Ekspor Data
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fitur segera tersedia</TooltipContent>
          </Tooltip>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          title="Total Pengguna"
          value={stats.total}
          icon={<Users className="h-5 w-5 text-white" />}
          trend="up"
          trendValue="+12% bulan ini"
          gradient="bg-gradient-to-br from-[#1F3864] to-[#2d5289]"
        />
        <StatCard
          title="Guru"
          value={stats.guru}
          icon={<UserCog className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          title="Siswa"
          value={stats.siswa}
          icon={<GraduationCap className="h-5 w-5 text-white" />}
          trend="up"
          trendValue="+24 bulan ini"
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Admin Sekolah"
          value={stats.admin}
          icon={<School className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-sky-500 to-sky-600"
        />
        <StatCard
          title="Orang Tua"
          value={stats.ortu}
          icon={<Baby className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-rose-400 to-rose-500"
        />
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl shadow-sm bg-card border">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, atau sekolah..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                className="pl-9 rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
              />
              {rawSearch !== debouncedSearch && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'GURU', 'SISWA', 'ADMIN_SCHOOL', 'ORANG_TUA'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    roleFilter === role
                      ? 'bg-[#1F3864] text-white shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {role === 'all' ? 'Semua' : role === 'GURU' ? 'Guru' : role === 'SISWA' ? 'Siswa' : role === 'ADMIN_SCHOOL' ? 'Admin' : 'Ortu'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl shadow-sm bg-card border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[50px] rounded-tl-none">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Email / Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Sekolah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right rounded-tr-none">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
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
                paginated.map((user, idx) => (
                  <TableRow
                    key={user.id}
                    className="even:bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3864]/10 to-[#2d5289]/10 text-[#1F3864] text-xs font-semibold">
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
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                              disabled
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Segera tersedia</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:shadow-sm active:scale-[0.98]"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Hapus Pengguna</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
            <span>
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} pengguna
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 text-xs transition-all duration-200 ${currentPage === i + 1 ? 'bg-[#1F3864] hover:bg-[#152850]' : 'hover:shadow-sm active:scale-[0.98]'}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <TriangleAlert className="h-5 w-5" />
              </div>
              Hapus Pengguna
            </AlertDialogTitle>
            <AlertDialogDescription className="pl-12">
              Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              Tindakan ini tidak dapat dibatalkan. Semua data terkait pengguna ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              disabled={deleting}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus Permanen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  2. ReportsGlobalView
// ═══════════════════════════════════════════════════════════════════════

const REPORT_TYPES = [
  {
    id: 'school',
    title: 'Laporan Sekolah',
    description: 'Ringkasan data sekolah termasuk jumlah siswa, guru, dan aktivitas.',
    icon: Building2,
    color: 'from-sky-400 to-sky-500',
    count: 3,
  },
  {
    id: 'tryout',
    title: 'Laporan Hasil Tryout',
    description: 'Analisis hasil tryout per sekolah, mata pelajaran, dan kompetensi.',
    icon: ClipboardCheck,
    color: 'from-emerald-400 to-emerald-500',
    count: 12,
  },
  {
    id: 'attendance',
    title: 'Laporan Kehadiran',
    description: 'Data kehadiran siswa dan guru dalam mengikuti tryout dan aktivitas.',
    icon: UserCheck,
    color: 'from-amber-400 to-amber-500',
    count: 8,
  },
  {
    id: 'financial',
    title: 'Laporan Keuangan',
    description: 'Ringkasan pendapatan, langganan, dan status pembayaran sekolah.',
    icon: Wallet,
    color: 'from-purple-400 to-purple-500',
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

const SCHOOL_COMPARISON = [
  { name: 'SMA KN 1 Bandung', students: 342, avgScore: 78.5, completionRate: 92, tryoutCount: 156 },
  { name: 'SMAN 1 Surabaya', students: 287, avgScore: 75.2, completionRate: 88, tryoutCount: 132 },
  { name: 'SMA Muhammadiyah 2 Jakarta', students: 198, avgScore: 72.8, completionRate: 85, tryoutCount: 98 },
  { name: 'SMAN 3 Semarang', students: 156, avgScore: 70.1, completionRate: 79, tryoutCount: 67 },
  { name: 'SMA IT Al-Azhar', students: 124, avgScore: 68.4, completionRate: 74, tryoutCount: 45 },
];

function getReportTypeBadge(type: string) {
  const map: Record<string, { label: string; cls: string }> = {
    school: { label: 'Sekolah', cls: 'bg-sky-100 text-sky-700 rounded-full border-0' },
    tryout: { label: 'Tryout', cls: 'bg-emerald-100 text-emerald-700 rounded-full border-0' },
    attendance: { label: 'Kehadiran', cls: 'bg-amber-100 text-amber-700 rounded-full border-0' },
    financial: { label: 'Keuangan', cls: 'bg-purple-100 text-purple-700 rounded-full border-0' },
  };
  const m = map[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600 rounded-full border-0' };
  return <Badge className={m.cls}>{m.label}</Badge>;
}

type SortKey = 'name' | 'students' | 'avgScore' | 'completionRate' | 'tryoutCount';

export function ReportsGlobalView() {
  const [sortKey, setSortKey] = useState<SortKey>('avgScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');

  function handleGenerate(_type: string) {
    toast.info('Fitur generate laporan global segera tersedia.');
  }

  function handleExport() {
    toast.info('Fitur ekspor data global segera tersedia.');
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedSchools = useMemo(() => {
    return [...SCHOOL_COMPARISON].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [sortKey, sortDir]);

  const filteredReports = useMemo(() => {
    if (reportTypeFilter === 'all') return RECENT_REPORTS;
    return RECENT_REPORTS.filter((r) => r.type === reportTypeFilter);
  }, [reportTypeFilter]);

  const summaryStats = useMemo(() => {
    return {
      totalSchools: SCHOOL_COMPARISON.length,
      totalStudents: SCHOOL_COMPARISON.reduce((s, c) => s + c.students, 0),
      avgScoreOverall: (SCHOOL_COMPARISON.reduce((s, c) => s + c.avgScore, 0) / SCHOOL_COMPARISON.length).toFixed(1),
      totalTryouts: SCHOOL_COMPARISON.reduce((s, c) => s + c.tryoutCount, 0),
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Global"
        description="Buat dan kelola laporan lintas sekolah di platform PANDAI."
        icon={FileBarChart}
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-[#1F3864] hover:bg-[#152850] transition-all duration-200 hover:shadow-sm active:scale-[0.98] opacity-50"
                disabled
              >
                <Download className="mr-2 h-4 w-4" />
                Ekspor Semua
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fitur segera tersedia</TooltipContent>
          </Tooltip>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl shadow-sm bg-card border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium text-muted-foreground">Total Sekolah</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{summaryStats.totalSchools}</p>
        </div>
        <div className="rounded-xl shadow-sm bg-card border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium text-muted-foreground">Total Siswa</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{summaryStats.totalStudents.toLocaleString()}</p>
        </div>
        <div className="rounded-xl shadow-sm bg-card border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium text-muted-foreground">Rata-rata Skor</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[#1F3864]">{summaryStats.avgScoreOverall}</p>
        </div>
        <div className="rounded-xl shadow-sm bg-card border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium text-muted-foreground">Total Tryout</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{summaryStats.totalTryouts}</p>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          return (
            <div
              key={rt.id}
              className="rounded-xl shadow-sm bg-card border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
              onClick={() => handleGenerate(rt.id)}
            >
              <div className={`h-1.5 bg-gradient-to-r ${rt.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${rt.color} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs rounded-full">
                    {rt.count} laporan
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold mb-1">{rt.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{rt.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs rounded-lg opacity-50"
                  disabled
                >
                  <FileBarChart className="mr-1.5 h-3 w-3" />
                  Generate Laporan
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* School Comparison Table */}
      <div className="rounded-xl shadow-sm bg-card border overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Perbandingan Sekolah</h2>
              <p className="text-xs text-muted-foreground">Klik header kolom untuk mengurutkan.</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead
                  className="cursor-pointer select-none rounded-tl-none"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Sekolah
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer select-none"
                  onClick={() => toggleSort('students')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Siswa
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer select-none"
                  onClick={() => toggleSort('avgScore')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Rata-rata Skor
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="hidden sm:table-cell text-center cursor-pointer select-none"
                  onClick={() => toggleSort('completionRate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Penyelesaian
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="hidden md:table-cell text-center cursor-pointer select-none rounded-tr-none"
                  onClick={() => toggleSort('tryoutCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Tryout
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSchools.map((school) => (
                <TableRow
                  key={school.name}
                  className="even:bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864]/10 to-[#2d5289]/10">
                        <School className="h-4 w-4 text-[#1F3864]" />
                      </div>
                      <span className="font-medium text-sm">{school.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm font-medium">{school.students}</TableCell>
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
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] transition-all duration-500"
                          style={{ width: `${school.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{school.completionRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-sm font-medium">{school.tryoutCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="rounded-xl shadow-sm bg-card border overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Laporan Terbaru</h2>
              <p className="text-xs text-muted-foreground">Daftar laporan yang sudah pernah di-generate.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'school', 'tryout', 'attendance', 'financial'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReportTypeFilter(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    reportTypeFilter === type
                      ? 'bg-[#1F3864] text-white shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {type === 'all' ? 'Semua' : type === 'school' ? 'Sekolah' : type === 'tryout' ? 'Tryout' : type === 'attendance' ? 'Kehadiran' : 'Keuangan'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[70px]">ID</TableHead>
                <TableHead>Nama Laporan</TableHead>
                <TableHead className="hidden sm:table-cell">Tipe</TableHead>
                <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                <TableHead className="hidden lg:table-cell">Ukuran</TableHead>
                <TableHead className="w-[80px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={FileSpreadsheet}
                      title="Tidak ada laporan ditemukan"
                      description="Tidak ada laporan dengan tipe ini."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((r) => (
                  <TableRow
                    key={r.id}
                    className="even:bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getReportTypeBadge(r.type)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.generatedAt}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.size}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 transition-all duration-200"
                            disabled
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Segera tersedia</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  3. AnalyticsGlobalView
// ═══════════════════════════════════════════════════════════════════════

const ANALYTICS_PERIODS = [
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: '90d', label: '90 Hari' },
  { value: '1y', label: '1 Tahun' },
];

const USER_GROWTH_DATA: Record<string, number[]> = {
  '7d': [12, 18, 15, 22, 28, 19, 25],
  '30d': [45, 52, 38, 67, 73, 61, 55, 80, 72, 90, 85, 78, 95, 88, 102, 97, 110, 105, 115, 120, 108, 125, 130, 118, 135, 128, 140, 132, 145, 150],
  '90d': [120, 135, 142, 158, 165, 170, 178, 185, 192, 200, 210, 218, 225, 232, 240, 248, 255, 260, 268, 275, 282, 290, 298, 305, 310, 318, 325, 332, 340, 348, 355, 362, 370, 378, 385, 392, 400, 408, 415, 420, 428, 435, 442, 450, 458, 465, 470, 478, 485, 492, 500, 508, 515, 522, 530, 538, 545, 552, 560, 568, 575, 582, 590, 598, 605, 612, 620, 628, 635, 642, 650, 658, 665, 672, 680, 688, 695, 702, 710, 718, 725, 732, 740, 748, 755, 762, 770, 778, 785, 792, 800, 808, 815, 822, 830, 838, 845, 852, 860, 868, 875, 882, 890, 898, 905, 912, 920, 928, 935],
  '1y': [200, 250, 310, 380, 420, 460, 510, 560, 600, 640, 680, 720, 760, 800, 840, 880, 920, 960, 1000, 1040, 1070, 1100],
};

const SCORE_DISTRIBUTION = [
  { range: '0-40', count: 45, color: 'from-red-400 to-red-500' },
  { range: '41-60', count: 120, color: 'from-amber-400 to-amber-500' },
  { range: '61-80', count: 280, color: 'from-sky-400 to-sky-500' },
  { range: '81-100', count: 165, color: 'from-emerald-400 to-emerald-500' },
];

const TOP_SCHOOLS = [
  { rank: 1, name: 'SMA KN 1 Bandung', students: 342, avgScore: 78.5, completionRate: 92, plan: 'PRO' },
  { rank: 2, name: 'SMAN 1 Surabaya', students: 287, avgScore: 75.2, completionRate: 88, plan: 'PRO' },
  { rank: 3, name: 'SMA Muhammadiyah 2 Jakarta', students: 198, avgScore: 72.8, completionRate: 85, plan: 'STARTER' },
  { rank: 4, name: 'SMAN 3 Semarang', students: 156, avgScore: 70.1, completionRate: 79, plan: 'STARTER' },
  { rank: 5, name: 'SMA IT Al-Azhar', students: 124, avgScore: 68.4, completionRate: 74, plan: 'FREE' },
];

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-amber-100 text-amber-800 border-0 rounded-full">🥇 #1</Badge>;
  if (rank === 2) return <Badge className="bg-gray-100 text-gray-700 border-0 rounded-full">🥈 #2</Badge>;
  if (rank === 3) return <Badge className="bg-orange-100 text-orange-700 border-0 rounded-full">🥉 #3</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 rounded-full">#{rank}</Badge>;
}

function getPlanBadge(plan: string) {
  const map: Record<string, { cls: string }> = {
    FREE: { cls: 'bg-gray-100 text-gray-600 rounded-full border-0' },
    STARTER: { cls: 'bg-sky-100 text-sky-700 rounded-full border-0' },
    PRO: { cls: 'bg-amber-100 text-amber-700 rounded-full border-0' },
  };
  const m = map[plan] ?? map.FREE;
  return <Badge className={m.cls}>{plan}</Badge>;
}

function AnimatedNumber({ value, duration = 800 }: { value: number | string; duration?: number }) {
  const [display, setDisplay] = useState('0');
  const targetNum = typeof value === 'number' ? value : parseFloat(value.replace(/,/g, ''));
  const isFormatted = typeof value === 'string' && value.includes(',');
  const decimalPlaces = typeof value === 'string' && value.includes('.') ? value.split('.')[1]?.length ?? 0 : 0;

  useEffect(() => {
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;
      if (decimalPlaces > 0) {
        setDisplay(current.toFixed(decimalPlaces));
      } else if (isFormatted) {
        setDisplay(Math.round(current).toLocaleString());
      } else {
        setDisplay(Math.round(current).toString());
      }
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [targetNum, duration, decimalPlaces, isFormatted]);

  return <span>{display}</span>;
}

function CSSBarChart({
  data,
  maxValue,
 height = 200,
}: {
  data: { label: string; value: number; color: string }[];
  maxValue: number;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground">{d.value}</span>
          <div
            className={`w-full rounded-t-lg bg-gradient-to-t ${d.color} transition-all duration-700 ease-out`}
            style={{
              height: mounted ? `${(d.value / maxValue) * (height - 40)}px` : '0px',
              minHeight: '4px',
            }}
          />\n          <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-full truncate">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({
  data,
  maxValue,
}: {
  data: { label: string; value: number; color: string }[];
  maxValue: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs font-medium truncate max-w-[140px]">{d.label}</span>
            <span className="text-xs font-bold">{d.value}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${d.color} transition-all duration-700 ease-out`}
              style={{
                width: mounted ? `${(d.value / maxValue) * 100}%` : '0%',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsGlobalView() {
  const [period, setPeriod] = useState('30d');
  const growthData = USER_GROWTH_DATA[period] ?? USER_GROWTH_DATA['30d'];
  const maxGrowth = Math.max(...growthData);

  const barChartData = growthData.slice(-12).map((val, i) => ({
    label: `${i + 1}`,
    value: val,
    color: 'from-[#1F3864] to-[#2d5289]',
  }));

  const maxDist = Math.max(...SCORE_DISTRIBUTION.map((d) => d.count));
  const distChartData = SCORE_DISTRIBUTION.map((d) => ({
    label: d.range,
    value: d.count,
    color: d.color,
  }));

  const schoolBarData = TOP_SCHOOLS.map((s) => ({
    label: s.name.replace('SMA ', ''),
    value: s.avgScore,
    color: s.rank === 1 ? 'from-amber-400 to-amber-500' : 'from-[#1F3864] to-[#2d5289]',
  }));
  const maxSchoolScore = 100;

  const periodStats: Record<string, { users: string; tryouts: string; avgScore: string; usersTrend: string; tryoutsTrend: string; scoreTrend: 'up' | 'down'; scoreTrendVal: string }> = {
    '7d': { users: '1,107', tryouts: '3,842', avgScore: '73.0', usersTrend: '+15% vs minggu lalu', tryoutsTrend: '+28% vs minggu lalu', scoreTrend: 'down', scoreTrendVal: '-2.1% vs minggu lalu' },
    '30d': { users: '1,107', tryouts: '3,842', avgScore: '73.0', usersTrend: '+15% vs periode lalu', tryoutsTrend: '+28% vs periode lalu', scoreTrend: 'down', scoreTrendVal: '-2.1% vs periode lalu' },
    '90d': { users: '2,450', tryouts: '12,560', avgScore: '74.2', usersTrend: '+42% vs periode lalu', tryoutsTrend: '+65% vs periode lalu', scoreTrend: 'up', scoreTrendVal: '+3.8% vs periode lalu' },
    '1y': { users: '5,230', tryouts: '48,900', avgScore: '76.5', usersTrend: '+180% YoY', tryoutsTrend: '+250% YoY', scoreTrend: 'up', scoreTrendVal: '+8.2% YoY' },
  };

  const ps = periodStats[period] ?? periodStats['30d'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitik Platform"
        description="Pantau performa dan pertumbuhan platform PANDAI secara keseluruhan."
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2">
            {ANALYTICS_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
                  period === p.value
                    ? 'bg-[#1F3864] text-white shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Animated Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Sekolah"
          value={<AnimatedNumber value={5} />}
          icon={<Building2 className="h-5 w-5 text-white" />}
          trend="up"
          trendValue="+2 bulan ini"
          gradient="bg-gradient-to-br from-[#1F3864] to-[#2d5289]"
        />
        <StatCard
          title="Total Pengguna"
          value={<AnimatedNumber value={ps.users} />}
          icon={<Users className="h-5 w-5 text-white" />}
          trend="up"
          trendValue={ps.usersTrend}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Tryout Dikerjakan"
          value={<AnimatedNumber value={ps.tryouts} />}
          icon={<ClipboardCheck className="h-5 w-5 text-white" />}
          trend="up"
          trendValue={ps.tryoutsTrend}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          title="Rata-rata Skor"
          value={<AnimatedNumber value={ps.avgScore} />}
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          trend={ps.scoreTrend}
          trendValue={ps.scoreTrendVal}
          gradient={ps.scoreTrend === 'up' ? 'bg-gradient-to-br from-sky-500 to-sky-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'}
        />
      </div>

      {/* CSS Bar Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth Chart */}
        <div className="rounded-xl shadow-sm bg-card border transition-all duration-200 hover:shadow-md">
          <div className="p-4 sm:p-6 border-b">
            <CardTitle className="text-base">Pertumbuhan Pengguna</CardTitle>
            <CardDescription className="text-xs">Jumlah pengguna baru per periode</CardDescription>
          </div>
          <div className="p-4 sm:p-6">
            <CSSBarChart
              data={barChartData}
              maxValue={maxGrowth}
              height={220}
            />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 font-medium">+15%</span>
              <span>dibandingkan periode sebelumnya</span>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="rounded-xl shadow-sm bg-card border transition-all duration-200 hover:shadow-md">
          <div className="p-4 sm:p-6 border-b">
            <CardTitle className="text-base">Distribusi Skor Tryout</CardTitle>
            <CardDescription className="text-xs">Sebaran skor siswa di seluruh platform</CardDescription>
          </div>
          <div className="p-4 sm:p-6">
            <CSSBarChart
              data={distChartData}
              maxValue={maxDist}
              height={220}
            />
            <div className="mt-3 flex items-center gap-4 justify-center flex-wrap">
              {SCORE_DISTRIBUTION.map((d) => (
                <div key={d.range} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={`h-2.5 w-2.5 rounded-sm bg-gradient-to-r ${d.color}`} />
                  <span>{d.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* School Comparison with Horizontal Bars */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl shadow-sm bg-card border transition-all duration-200 hover:shadow-md">
          <div className="p-4 sm:p-6 border-b">
            <CardTitle className="text-base">Perbandingan Skor Sekolah</CardTitle>
            <CardDescription className="text-xs">Rata-rata skor tryout per sekolah</CardDescription>
          </div>
          <div className="p-4 sm:p-6">
            <HorizontalBarChart
              data={schoolBarData}
              maxValue={maxSchoolScore}
            />
          </div>
        </div>

        {/* Quick Summary */}
        <div className="rounded-xl shadow-sm bg-card border transition-all duration-200 hover:shadow-md">
          <div className="p-4 sm:p-6 border-b">
            <CardTitle className="text-base">Ringkasan Cepat</CardTitle>
            <CardDescription className="text-xs">Statistik penting hari ini</CardDescription>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-600/70 font-medium">Skor Tertinggi Hari Ini</p>
                  <p className="text-sm font-bold text-emerald-700">95.5</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">SMA KN 1</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-sky-50 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100">
                  <Users className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-[10px] text-sky-600/70 font-medium">Pengguna Aktif Hari Ini</p>
                  <p className="text-sm font-bold text-sky-700">247</p>
                </div>
              </div>
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                <ArrowUpRight className="h-3 w-3" />
                +12%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-600/70 font-medium">Tryout Selesai Hari Ini</p>
                  <p className="text-sm font-bold text-amber-700">83</p>
                </div>
              </div>
              <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                <ArrowDownRight className="h-3 w-3" />
                -5%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-purple-50 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                  <Globe className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] text-purple-600/70 font-medium">Uptime Platform</p>
                  <p className="text-sm font-bold text-purple-700">99.97%</p>
                </div>
              </div>
              <span className="text-[10px] text-purple-600 font-medium">30 hari</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Schools Table */}
      <div className="rounded-xl shadow-sm bg-card border overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Sekolah dengan Performa Terbaik</h2>
              <p className="text-xs text-muted-foreground">Berdasarkan rata-rata skor dan tingkat penyelesaian tryout.</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg transition-all duration-200 hidden sm:flex"
                  disabled
                >
                  <FileBarChart className="mr-1.5 h-3 w-3" />
                  Laporan Detail
                </Button>
              </TooltipTrigger>
              <TooltipContent>Segera tersedia</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[70px]">Peringkat</TableHead>
                <TableHead>Nama Sekolah</TableHead>
                <TableHead className="text-center">Siswa</TableHead>
                <TableHead className="text-center">Rata-rata Skor</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Penyelesaian</TableHead>
                <TableHead className="text-center">Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TOP_SCHOOLS.map((school) => (
                <TableRow
                  key={school.rank}
                  className="even:bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <TableCell>{getRankBadge(school.rank)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864]/10 to-[#2d5289]/10">
                        <School className="h-4 w-4 text-[#1F3864]" />
                      </div>
                      <span className="font-medium text-sm">{school.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{school.students}</TableCell>
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
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] transition-all duration-500"
                          style={{ width: `${school.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{school.completionRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{getPlanBadge(school.plan)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  4. SettingsView
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_FEATURE_FLAGS = [
  { key: 'enable_nalar_ai', label: 'NALAR AI Asisten', description: 'Aktifkan fitur bantuan AI untuk menjelaskan pembahasan soal.', enabled: true, category: 'fitur' as const },
  { key: 'enable_diagnostic_test', label: 'Tes Diagnostik', description: 'Izinkan siswa mengerjakan tes awal untuk mengukur kemampuan dasar.', enabled: true, category: 'fitur' as const },
  { key: 'enable_adaptive_practice', label: 'Latihan Adaptif', description: 'Aktifkan sistem latihan yang menyesuaikan tingkat kesulitan otomatis.', enabled: false, category: 'fitur' as const },
  { key: 'enable_leaderboard', label: 'Peringkat Siswa', description: 'Tampilkan papan peringkat di antar siswa dalam satu sekolah.', enabled: true, category: 'fitur' as const },
  { key: 'enable_parent_access', label: 'Akses Orang Tua', description: 'Izinkan orang tua melihat nilai dan progres anak mereka.', enabled: true, category: 'fitur' as const },
  { key: 'enable_bulk_import', label: 'Import Massal', description: 'Izinkan admin sekolah mengimpor data siswa/guru via CSV/Excel.', enabled: true, category: 'sistem' as const },
  { key: 'maintenance_mode', label: 'Mode Maintenance', description: 'Aktifkan mode pemeliharaan. Semua pengguna akan dialihkan ke halaman maintenance.', enabled: false, category: 'sistem' as const },
];

const SYSTEM_INFO = [
  { label: 'Versi Aplikasi', value: '2.1.0' },
  { label: 'Framework', value: 'Next.js 16' },
  { label: 'Database', value: 'PostgreSQL 16' },
  { label: 'Runtime', value: 'Node.js 22 LTS' },
  { label: 'Cache', value: 'Redis 7' },
  { label: 'Storage', value: 'Cloudflare R2' },
  { label: 'Terakhir Deploy', value: '15 Jan 2025, 09:00' },
];

const SERVICES = [
  { name: 'API Server', status: 'operational' as const },
  { name: 'Database', status: 'operational' as const },
  { name: 'Redis Cache', status: 'operational' as const },
  { name: 'File Storage', status: 'operational' as const },
  { name: 'Email Service', status: 'degraded' as const },
];

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl shadow-sm bg-card border overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-5 sm:p-6 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864]/10 to-[#2d5289]/10 text-[#1F3864]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const [appName, setAppName] = useState('PANDAI');
  const [appUrl, setAppUrl] = useState('https://pandai.id');
  const [senderEmail, setSenderEmail] = useState('noreply@pandai.id');
  const [smtpHost, setSmtpHost] = useState('smtp.pandai.id');
  const [smtpPort, setSmtpPort] = useState('587');
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const featureFlagsFitur = featureFlags.filter((f) => f.category === 'fitur');
  const featureFlagsSistem = featureFlags.filter((f) => f.category === 'sistem');

  function toggleFeature(key: string) {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }

  function handleSave() {
    toast.info('Pengaturan platform segera tersedia.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Konfigurasi pengaturan global platform PANDAI."
        icon={SettingsIcon}
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-[#1F3864] hover:bg-[#152850] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                onClick={handleSave}
                disabled
              >
                <Save className="mr-2 h-4 w-4" />
                Simpan Pengaturan
              </Button>
            </TooltipTrigger>
            <TooltipContent>Segera tersedia</TooltipContent>
          </Tooltip>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <SettingsSection
            icon={Globe}
            title="Pengaturan Umum"
            description="Nama aplikasi dan URL dasar platform."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Aplikasi</label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="PANDAI"
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                  readOnly
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
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  URL dasar yang digunakan untuk link di email dan API.
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Email Settings */}
          <SettingsSection
            icon={Mail}
            title="Pengaturan Email"
            description="Konfigurasi SMTP untuk pengiriman email notifikasi."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Pengirim</label>
                <Input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="noreply@pandai.id"
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Host</label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.pandai.id"
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Port</label>
                <Input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Password</label>
                <Input
                  type="password"
                  value="••••••••••"
                  readOnly
                  placeholder="••••••••••"
                  className="rounded-lg focus:ring-2 focus:ring-[#1F3864]/20"
                />
                <p className="text-xs text-muted-foreground">
                  Password tersimpan dengan aman. Hubungi developer untuk mengubah.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg transition-all duration-200"
                    disabled
                  >
                    <Mail className="mr-2 h-3.5 w-3.5" />
                    Kirim Email Test
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Segera tersedia</TooltipContent>
              </Tooltip>
            </div>
          </SettingsSection>

          {/* Feature Flags - Fitur */}
          <SettingsSection
            icon={Shield}
            title="Feature Flags — Fitur Pembelajaran"
            description="Aktifkan atau nonaktifkan fitur pembelajaran secara global."
          >
            <div className="space-y-1">
              {featureFlagsFitur.map((flag, idx) => (
                <div key={flag.key}>
                  <div className="flex flex-col gap-1 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{flag.label}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => toggleFeature(flag.key)}
                      disabled
                    />
                  </div>
                  {idx < featureFlagsFitur.length - 1 && <Separator className="mx-4" />}
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Feature Flags - Sistem */}
          <SettingsSection
            icon={Server}
            title="Feature Flags — Sistem"
            description="Pengaturan sistem dan infrastruktur platform."
          >
            <div className="space-y-1">
              {featureFlagsSistem.map((flag, idx) => (
                <div key={flag.key}>
                  <div className="flex flex-col gap-1 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{flag.label}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => toggleFeature(flag.key)}
                      disabled
                    />
                  </div>
                  {idx < featureFlagsSistem.length - 1 && <Separator className="mx-4" />}
                </div>
              ))}
            </div>
          </SettingsSection>
        </div>

        {/* Right Column - System Info */}
        <div className="space-y-6">
          {/* System Information */}
          <SettingsSection
            icon={Server}
            title="Informasi Sistem"
            description="Detail teknis platform."
          >
            <div className="space-y-2">
              {SYSTEM_INFO.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Status Indicator */}
          <SettingsSection
            icon={Activity}
            title="Status Layanan"
            description="Kesehatan layanan platform secara real-time."
          >
            <div className="space-y-1">
              {SERVICES.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <span className="text-xs text-muted-foreground">{svc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${svc.status === 'operational' ? 'bg-emerald-500' : svc.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-medium ${svc.status === 'operational' ? 'text-emerald-600' : svc.status === 'degraded' ? 'text-amber-600' : 'text-red-600'}`}>
                      {svc.status === 'operational' ? 'Operasional' : svc.status === 'degraded' ? 'Degrasi' : 'Gangguan'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Quick Actions */}
          <SettingsSection
            icon={SettingsIcon}
            title="Aksi Admin"
            description="Tindakan khusus super admin."
          >
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 text-sm rounded-lg transition-all duration-200"
                    disabled
                  >
                    <RefreshCw className="h-4 w-4" />
                    Bersihkan Cache
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Segera tersedia</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 text-sm rounded-lg transition-all duration-200"
                    disabled
                  >
                    <Bell className="h-4 w-4" />
                    Broadcast Notifikasi
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Segera tersedia</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 text-sm rounded-lg transition-all duration-200"
                    disabled
                  >
                    <Database className="h-4 w-4" />
                    Backup Database
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Segera tersedia</TooltipContent>
              </Tooltip>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <div className="rounded-xl shadow-sm border-2 border-red-200 bg-red-50/50 overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="p-5 sm:p-6 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-700">Zona Berbahaya</h3>
                  <p className="text-xs text-red-500/70">Tindakan yang tidak dapat dibatalkan.</p>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <Button
                variant="destructive"
                className="w-full justify-start gap-2.5 text-sm rounded-lg transition-all duration-200"
                onClick={() =>
                  toast.error(
                    'Fitur ini dinonaktifkan untuk keamanan. Hubungi developer jika diperlukan.'
                  )}
                disabled
              >
                <TriangleAlert className="h-4 w-4" />
                Reset Platform
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestionsGlobalView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bank Soal Global (NALAR)</h2>
        <p className="text-muted-foreground">Kelola bank soal lintas sekolah untuk platform NALAR.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-lg border border-dashed border-muted-foreground/25">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F3864]/10 text-[#1F3864]">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Halaman ini sedang dalam pengembangan. Fitur akan segera tersedia.
        </p>
      </div>
    </div>
  );
}
