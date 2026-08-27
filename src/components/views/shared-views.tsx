'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Megaphone,
  Pencil,
  Save,
  Eye,
  EyeOff,
  ShieldAlert,
  Mail,
  Phone,
  School,
  Calendar,
  Clock,
  CheckCheck,
  BookOpen,
  BarChart3,
  Settings,
  AlertCircle,
  Loader2,
  Inbox,
  Volume2,
  Lock,
  Users,
  GraduationCap,
  UserCog,
  Baby,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  category: 'tryout' | 'nilai' | 'sistem' | 'general';
}

interface Broadcast {
  id: string;
  title: string;
  content: string;
  from: string;
  date: string;
  category: 'Penting' | 'Umum' | 'Info';
  read: boolean;
}

interface ActivityLogItem {
  id: string;
  userId: string | null;
  action: string;
  detail: string | null;
  module: string | null;
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
}

// ---------------------------------------------------------------------------
// Role label helper — maps system role constants to display labels
// ---------------------------------------------------------------------------

function getRoleLabel(role: string | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN_SCHOOL':
      return 'Admin Sekolah';
    case 'GURU':
      return 'Guru';
    case 'SISWA':
      return 'Siswa';
    case 'ORANG_TUA':
      return 'Orang Tua';
    default:
      return 'Pengguna';
  }
}

function getRoleIcon(role: string | undefined) {
  switch (role) {
    case 'SUPER_ADMIN':
      return <UserCog className="h-4 w-4" />;
    case 'ADMIN_SCHOOL':
      return <UserCog className="h-4 w-4" />;
    case 'GURU':
      return <GraduationCap className="h-4 w-4" />;
    case 'SISWA':
      return <GraduationCap className="h-4 w-4" />;
    case 'ORANG_TUA':
      return <Baby className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Gradient icon container — used for page headers
// ---------------------------------------------------------------------------

function GradientIcon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1F3864 0%, #2D4A7A 100%)',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state component — soft, friendly illustration
// ---------------------------------------------------------------------------

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-xl border-dashed shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          {/* Outer decorative ring */}
          <div className="absolute -inset-3 rounded-full bg-amber-100/40" />
          {/* Middle ring */}
          <div className="absolute -inset-1.5 rounded-full bg-amber-50/60" />
          {/* Icon circle */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
            <div className="text-amber-500">{icon}</div>
          </div>
        </div>
        <p className="mt-6 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mock fallback data
// ---------------------------------------------------------------------------

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Tryout Matematika telah ditugaskan',
    description:
      'Anda telah ditugaskan untuk mengerjakan Tryout Matematika. Batas waktu pengerjaan 3 hari.',
    timeAgo: '2 jam lalu',
    read: false,
    category: 'tryout',
  },
  {
    id: 'notif-2',
    title: 'Nilai tryout Fisika sudah keluar: 78',
    description:
      'Hasil tryout Fisika telah dipublikasikan. Skor Anda: 78 dari 100.',
    timeAgo: '1 hari lalu',
    read: false,
    category: 'nilai',
  },
  {
    id: 'notif-3',
    title: 'Materi baru: Aljabar Linear telah ditambahkan',
    description:
      'Materi pembelajaran Aljabar Linear telah tersedia di perpustakaan materi.',
    timeAgo: '2 hari lalu',
    read: true,
    category: 'sistem',
  },
];

const SAMPLE_BROADCASTS: Broadcast[] = [
  {
    id: 'bc-1',
    title: 'Jadwal Tryout Akhir Semester',
    content:
      'Diberitahukan kepada seluruh siswa bahwa Tryout Akhir Semester akan dilaksanakan pada tanggal 15-17 Desember 2024. Harap mempersiapkan diri dengan baik. Materi yang diujikan mencakup Matematika, Fisika, Kimia, Biologi, Bahasa Indonesia, dan Bahasa Inggris.',
    from: 'Admin Sekolah',
    date: '10 Desember 2024',
    category: 'Penting',
    read: false,
  },
  {
    id: 'bc-2',
    title: 'Libur Nasional 17 Agustus',
    content:
      'Dalam rangka memperingati Hari Kemerdekaan Republik Indonesia ke-79, seluruh kegiatan belajar mengajar diliburkan pada tanggal 17 Agustus 2024. Kegiatan belajar mengajar kembali normal pada tanggal 18 Agustus 2024.',
    from: 'Admin Sekolah',
    date: '15 Agustus 2024',
    category: 'Umum',
    read: true,
  },
];

// ---------------------------------------------------------------------------
// 1. ProfileView
// ---------------------------------------------------------------------------

export function ProfileView() {
  const { user, setUser } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
  });

  // Sync form when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        password: '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui profil');
      }
      const updatedUser = await res.json();
      // Update store with fresh data
      if (setUser) {
        setUser({
          ...user,
          name: updatedUser.name ?? user.name,
          email: updatedUser.email ?? user.email,
          phone: updatedUser.phone ?? user.phone,
        });
      }
      toast.success('Profil berhasil diperbarui');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat memperbarui profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    // Not yet implemented — button is disabled in the UI
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = getRoleLabel(user?.role);

  // Determine which identifier field to show
  const getIdLabel = () => {
    switch (user?.role) {
      case 'SISWA':
        return 'NISN';
      case 'GURU':
        return user?.nip ? 'NIP' : 'NIK';
      case 'ORANG_TUA':
        return 'NIK';
      default:
        return 'Username';
    }
  };

  const getIdValue = () => {
    switch (user?.role) {
      case 'SISWA':
        return user?.nisn ?? '-';
      case 'GURU':
        return user?.nip ?? user?.nik ?? user?.username ?? '-';
      case 'ORANG_TUA':
        return user?.nik ?? user?.username ?? '-';
      default:
        return user?.username ?? '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GradientIcon>
          <User className="h-5 w-5 text-white" />
        </GradientIcon>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
          <p className="text-sm text-muted-foreground">Kelola informasi akun Anda</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shadow-sm">
              <AvatarFallback
                className="text-lg font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #1F3864 0%, #2D4A7A 100%)',
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h2 className="text-xl font-semibold">{user?.name ?? 'Pengguna'}</h2>
                <Badge
                  className="cursor-default rounded-full px-3 py-0.5 text-xs font-medium shadow-none"
                  style={{
                    background: 'linear-gradient(135deg, #1F3864 0%, #2D4A7A 100%)',
                    color: 'white',
                  }}
                >
                  {roleLabel}
                </Badge>
              </div>
              <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{user?.email ?? 'Belum diatur'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <School className="h-3.5 w-3.5" />
                  <span>{user?.schoolName ?? 'Belum diatur'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{user?.phone ?? 'Belum diatur'}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {isEditing ? 'Batal' : 'Edit Profil'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {isEditing && (
        <Card className="rounded-xl border-amber-200/60 bg-amber-50/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Edit Profil</CardTitle>
            <CardDescription>Perbarui informasi profil Anda di bawah ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nama Lengkap</Label>
                <Input
                  id="profile-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Masukkan nama lengkap"
                  className="rounded-xl transition-all duration-200 focus:shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contoh@email.com"
                  className="rounded-xl transition-all duration-200 focus:shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telepon</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                className="rounded-xl transition-all duration-200 focus:shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  className="rounded-xl pr-10 transition-all duration-200 focus:shadow-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full cursor-pointer rounded-xl px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                className="cursor-pointer rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #1F3864 0%, #2D4A7A 100%)',
                }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Information — stat cards with subtle gradient */}
      <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="text-lg">Informasi Akun</CardTitle>
          <CardDescription>Detail akun yang terdaftar dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* ID Card */}
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/80 to-white p-4 shadow-none transition-all duration-200">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {getIdLabel()}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {getIdValue()}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {getRoleIcon(user?.role)}
                <span>{roleLabel}</span>
              </div>
            </div>

            {/* Class / School Info */}
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-none transition-all duration-200">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {user?.role === 'SISWA' ? 'Kelas' : 'Sekolah'}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {user?.role === 'SISWA'
                  ? user?.className ?? 'Belum ditetapkan'
                  : user?.schoolName ?? 'Belum ditetapkan'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <School className="h-3 w-3" />
                <span>{user?.schoolName ?? '-'}</span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/80 to-white p-4 shadow-none transition-all duration-200">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {user?.role === 'SISWA' ? 'Orang Tua' : user?.role === 'GURU' ? 'Jenis Kelamin' : 'Status'}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {user?.role === 'SISWA'
                  ? user?.namaOrtu ?? 'Belum diatur'
                  : user?.role === 'GURU'
                    ? user?.jk === 'L' ? 'Laki-laki' : user?.jk === 'P' ? 'Perempuan' : 'Belum diatur'
                    : user?.isActive ? 'Aktif' : 'Nonaktif'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Akun {user?.isActive ? 'aktif' : 'nonaktif'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-xl border-red-200/70 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Zona Keamanan
          </CardTitle>
          <CardDescription>
            Tindakan sensitif terkait keamanan akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Lock className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Ubah Password</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Perbarui kata sandi untuk menjaga keamanan akun
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="rounded-xl transition-all duration-200 sm:shrink-0"
              disabled
            >
              <Lock className="mr-2 h-4 w-4" />
              Segera Hadir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. NotificationsView
// ---------------------------------------------------------------------------

type NotificationTab = 'semua' | 'belum-dibaca' | 'tryout' | 'nilai' | 'sistem';

const NOTIFICATION_TABS: { value: NotificationTab; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'belum-dibaca', label: 'Belum Dibaca' },
  { value: 'tryout', label: 'Tryout' },
  { value: 'nilai', label: 'Nilai' },
  { value: 'sistem', label: 'Sistem' },
];

function getNotificationIcon(category: Notification['category']) {
  switch (category) {
    case 'tryout':
      return <BookOpen className="h-4 w-4 text-blue-600" />;
    case 'nilai':
      return <BarChart3 className="h-4 w-4 text-emerald-600" />;
    case 'sistem':
      return <Settings className="h-4 w-4 text-amber-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
}

function getNotificationIconBg(category: Notification['category']): string {
  switch (category) {
    case 'tryout':
      return 'bg-blue-50 ring-1 ring-blue-100';
    case 'nilai':
      return 'bg-emerald-50 ring-1 ring-emerald-100';
    case 'sistem':
      return 'bg-amber-50 ring-1 ring-amber-100';
    default:
      return 'bg-gray-50 ring-1 ring-gray-100';
  }
}

function getNotificationAccentColor(category: Notification['category']): string {
  switch (category) {
    case 'tryout':
      return 'bg-blue-500';
    case 'nilai':
      return 'bg-emerald-500';
    case 'sistem':
      return 'bg-amber-400';
    default:
      return 'bg-gray-400';
  }
}

// Map API activity logs to notification items
function mapActivityLogsToNotifications(logs: ActivityLogItem[]): Notification[] {
  return logs.map((log, i) => {
    const action = log.action || 'Aktivitas baru';
    const detail = log.detail || 'Tidak ada detail.';
    let category: Notification['category'] = 'general';
    if (log.module === 'exams' || log.module === 'tryout') category = 'tryout';
    else if (log.module === 'nilai' || log.module === 'grades') category = 'nilai';
    else if (log.module === 'sistem' || log.module === 'settings') category = 'sistem';
    else category = 'sistem';

    return {
      id: log.id,
      title: action,
      description: detail,
      timeAgo: log.createdAt ? timeAgo(log.createdAt) : 'Baru saja',
      read: false,
      category,
    };
  });
}

export function NotificationsView() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('semua');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from API on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('category', 'notification');
        params.set('limit', '50');
        if (user?.schoolId) params.set('schoolId', user.schoolId);
        if (user?.id) params.set('userId', user.id);

        const res = await fetch(`/api/activity-logs?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const apiNotifications = mapActivityLogsToNotifications(json.data || []);
          // If API returned data, use it; otherwise fall back to mock
          if (apiNotifications.length > 0) {
            setNotifications(apiNotifications);
          } else {
            setNotifications(SAMPLE_NOTIFICATIONS);
          }
        } else {
          // API failed — fall back to mock data
          setNotifications(SAMPLE_NOTIFICATIONS);
        }
      } catch {
        // Network error — fall back to mock data
        setNotifications(SAMPLE_NOTIFICATIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.schoolId, user?.id]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'semua') return true;
    if (activeTab === 'belum-dibaca') return !n.read;
    if (activeTab === 'tryout') return n.category === 'tryout';
    if (activeTab === 'nilai') return n.category === 'nilai';
    if (activeTab === 'sistem') return n.category === 'sistem';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <Bell className="h-5 w-5 text-white" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} notifikasi belum dibaca`
                : 'Semua notifikasi telah dibaca'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="cursor-pointer rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Tandai Semua Dibaca
        </Button>
      </div>

      {/* Filter Tabs — rounded-full pills */}
      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'shadow-sm text-white'
                  : 'bg-white text-muted-foreground ring-1 ring-gray-200 hover:bg-gray-50 hover:text-foreground hover:shadow-sm'
              }`}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #1F3864 0%, #2D4A7A 100%)',
                    }
                  : undefined
              }
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardContent className="flex items-start gap-4 py-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title={
            activeTab === 'semua'
              ? 'Tidak ada notifikasi'
              : `Tidak ada notifikasi ${NOTIFICATION_TABS.find((t) => t.value === activeTab)?.label?.toLowerCase()}`
          }
          description={
            activeTab === 'semua'
              ? 'Semua pemberitahuan akan muncul di sini'
              : `Tidak ada notifikasi dengan kategori "${NOTIFICATION_TABS.find((t) => t.value === activeTab)?.label}" untuk saat ini`
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif, index) => (
            <Card
              key={notif.id}
              className={`group cursor-pointer rounded-xl border-l-0 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                !notif.read ? 'border-l-0' : ''
              }`}
              onClick={() => handleMarkRead(notif.id)}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'slideInLeft 0.3s ease-out forwards',
                opacity: 0,
              }}
            >
              <CardContent className="relative flex items-start gap-4 py-4">
                {/* Left accent border (animated via wrapper) */}
                {!notif.read && (
                  <div
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${getNotificationAccentColor(notif.category)}`}
                    style={{
                      animation: 'growWidth 0.3s ease-out forwards',
                      transformOrigin: 'left',
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${getNotificationIconBg(notif.category)}`}
                >
                  {getNotificationIcon(notif.category)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug transition-colors duration-200 ${
                        !notif.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                      }`}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-sm" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {notif.description}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{notif.timeAgo}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes growWidth {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. BroadcastsView
// ---------------------------------------------------------------------------

function getCategoryBadgeVariant(
  category: Broadcast['category'],
): 'destructive' | 'secondary' | 'outline' {
  switch (category) {
    case 'Penting':
      return 'destructive';
    case 'Umum':
      return 'secondary';
    case 'Info':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getCategoryBadgeClass(category: Broadcast['category']): string {
  switch (category) {
    case 'Penting':
      return 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100';
    case 'Umum':
      return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    case 'Info':
      return 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100';
    default:
      return '';
  }
}

function getBroadcastIcon(category: Broadcast['category']) {
  switch (category) {
    case 'Penting':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'Info':
      return <Volume2 className="h-4 w-4 text-blue-500" />;
    default:
      return <Megaphone className="h-4 w-4 text-gray-500" />;
  }
}

// Map API activity logs to broadcast items
function mapActivityLogsToBroadcasts(logs: ActivityLogItem[]): Broadcast[] {
  return logs.map((log) => {
    const action = log.action || 'Pengumuman';
    const detail = log.detail || 'Tidak ada detail.';
    let category: Broadcast['category'] = 'Umum';
    if (action.toLowerCase().includes('penting') || action.toLowerCase().includes('urgent')) {
      category = 'Penting';
    } else if (action.toLowerCase().includes('info')) {
      category = 'Info';
    }

    return {
      id: log.id,
      title: action,
      content: detail,
      from: log.user?.name || 'Sistem',
      date: log.createdAt
        ? new Date(log.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-',
      category,
      read: false,
    };
  });
}

export function BroadcastsView() {
  const { user } = useAppStore();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch broadcasts from API on mount
  useEffect(() => {
    const fetchBroadcasts = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('category', 'broadcast');
        params.set('limit', '50');
        if (user?.schoolId) params.set('schoolId', user.schoolId);

        const res = await fetch(`/api/activity-logs?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const apiBroadcasts = mapActivityLogsToBroadcasts(json.data || []);
          if (apiBroadcasts.length > 0) {
            setBroadcasts(apiBroadcasts);
          } else {
            setBroadcasts(SAMPLE_BROADCASTS);
          }
        } else {
          setBroadcasts(SAMPLE_BROADCASTS);
        }
      } catch {
        setBroadcasts(SAMPLE_BROADCASTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBroadcasts();
  }, [user?.schoolId]);

  const unreadCount = broadcasts.filter((b) => !b.read).length;

  const handleMarkRead = useCallback((id: string) => {
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, read: true } : b)),
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <Megaphone className="h-5 w-5 text-white" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Broadcast</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} pesan belum dibaca`
                : 'Semua pesan telah dibaca'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge
            variant="secondary"
            className="cursor-default rounded-full px-3 py-1 shadow-none"
          >
            <span className="mr-1.5 flex h-2 w-2 rounded-full bg-amber-400" />
            {unreadCount} baru
          </Badge>
        )}
      </div>

      {/* Broadcast List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          icon={<Volume2 className="h-10 w-10" />}
          title="Tidak ada broadcast"
          description="Belum ada pesan broadcast dari admin sekolah. Semua pengumuman penting akan muncul di sini."
        />
      ) : (
        <div className="space-y-4">
          {broadcasts.map((bc, index) => (
            <Card
              key={bc.id}
              className={`group cursor-pointer rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                !bc.read ? 'border-l-0' : ''
              }`}
              onClick={() => handleMarkRead(bc.id)}
              style={{
                animationDelay: `${index * 80}ms`,
                animation: 'slideUp 0.35s ease-out forwards',
                opacity: 0,
              }}
            >
              <CardContent className="relative py-0">
                {/* Left accent border for unread */}
                {!bc.read && (
                  <div
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                    style={{
                      background: 'linear-gradient(to bottom, #1F3864, #2D4A7A)',
                      animation: 'growWidth 0.3s ease-out forwards',
                      transformOrigin: 'left',
                    }}
                  />
                )}

                {/* Card inner content */}
                <div className="px-5 py-5">
                  {/* Top row: title + badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-100">
                          {getBroadcastIcon(bc.category)}
                        </div>
                        <h3
                          className={`text-base leading-snug transition-colors duration-200 ${
                            !bc.read
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-muted-foreground'
                          }`}
                        >
                          {bc.title}
                        </h3>
                        {!bc.read && (
                          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-sm" />
                        )}
                      </div>
                      <p className="mt-1.5 pl-[2.75rem] text-xs text-muted-foreground">
                        Dari {bc.from}
                      </p>
                    </div>
                    <Badge
                      variant={getCategoryBadgeVariant(bc.category)}
                      className={`cursor-default rounded-full px-2.5 py-0.5 text-xs font-medium shadow-none ${getCategoryBadgeClass(bc.category)}`}
                    >
                      {bc.category}
                    </Badge>
                  </div>

                  {/* Separator */}
                  <Separator className="my-3 bg-gray-100" />

                  {/* Content */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {bc.content}
                  </p>

                  {/* Footer */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{bc.date}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes growWidth {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
