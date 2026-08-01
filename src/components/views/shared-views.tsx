'use client';

import React, { useState } from 'react';
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
  Circle,
  AlertCircle,
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

// ---------------------------------------------------------------------------
// 1. ProfileView
// ---------------------------------------------------------------------------

export function ProfileView() {
  const { user } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
  });

  const handleSave = () => {
    toast.success('Profil berhasil diperbarui');
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    toast.info('Fitur ubah password akan segera tersedia');
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'guru'
        ? 'Guru'
        : user?.role === 'siswa'
          ? 'Siswa'
          : user?.role ?? 'Pengguna';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F3864]">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
          <p className="text-sm text-muted-foreground">Kelola informasi akun Anda</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-[#1F3864] text-lg font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h2 className="text-xl font-semibold">{user?.name ?? 'Pengguna'}</h2>
                <Badge
                  className="bg-[#1F3864] hover:bg-[#1F3864]/90"
                >
                  {roleLabel}
                </Badge>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email ?? 'email@contoh.com'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <School className="h-4 w-4" />
                  <span>{user?.school ?? 'Sekolahcontoh'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Phone className="h-4 w-4" />
                  <span>{user?.phone ?? '08xxxxxxxxxx'}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
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
        <Card>
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
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
              <Button className="bg-[#1F3864] hover:bg-[#1F3864]/90" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Akun</CardTitle>
          <CardDescription>Detail akun yang terdaftar dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {user?.role === 'siswa' ? 'NISN' : user?.role === 'guru' ? 'NIP' : 'Username'}
              </p>
              <p className="text-sm font-medium">
                {user?.nip ?? user?.nisn ?? user?.username ?? '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Terdaftar sejak</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {user?.createdAt ?? '1 Januari 2024'}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Terakhir login</p>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {user?.lastLogin ?? 'Hari ini, 08:30'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ubah Password</p>
              <p className="text-sm text-muted-foreground">
                Perbarui kata sandi untuk menjaga keamanan akun
              </p>
            </div>
            <Button variant="destructive" onClick={handleChangePassword}>
              Ubah Password
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
      return <BookOpen className="h-5 w-5 text-blue-600" />;
    case 'nilai':
      return <BarChart3 className="h-5 w-5 text-green-600" />;
    case 'sistem':
      return <Settings className="h-5 w-5 text-amber-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
  }
}

function getNotificationIconBg(category: Notification['category']) {
  switch (category) {
    case 'tryout':
      return 'bg-blue-50';
    case 'nilai':
      return 'bg-green-50';
    case 'sistem':
      return 'bg-amber-50';
    default:
      return 'bg-gray-50';
  }
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NotificationTab>('semua');

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
    toast.success('Semua notifikasi telah ditandai sebagai dibaca');
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F3864]">
            <Bell className="h-5 w-5 text-white" />
          </div>
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
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Tandai Semua Dibaca
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Button
              key={tab.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={
                isActive
                  ? 'bg-[#1F3864] hover:bg-[#1F3864]/90'
                  : ''
              }
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Tidak ada notifikasi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTab === 'semua'
                ? 'Belum ada notifikasi untuk ditampilkan'
                : `Tidak ada notifikasi dengan kategori "${NOTIFICATION_TABS.find((t) => t.value === activeTab)?.label}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                !notif.read ? 'border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => handleMarkRead(notif.id)}
            >
              <CardContent className="flex items-start gap-4 py-4">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getNotificationIconBg(notif.category)}`}
                >
                  {getNotificationIcon(notif.category)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        !notif.read ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {notif.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {notif.timeAgo}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. BroadcastsView
// ---------------------------------------------------------------------------

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

function getCategoryBadgeVariant(category: Broadcast['category']) {
  switch (category) {
    case 'Penting':
      return 'destructive' as const;
    case 'Umum':
      return 'secondary' as const;
    case 'Info':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

export function BroadcastsView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(SAMPLE_BROADCASTS);

  const unreadCount = broadcasts.filter((b) => !b.read).length;

  const handleMarkRead = (id: string) => {
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, read: true } : b)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F3864]">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcast</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} pesan belum dibaca`
              : 'Semua pesan telah dibaca'}
          </p>
        </div>
      </div>

      {/* Broadcast List */}
      {broadcasts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">Tidak ada broadcast</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Belum ada pesan broadcast dari admin sekolah
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((bc) => (
            <Card
              key={bc.id}
              className={`cursor-pointer transition-colors hover:shadow-md ${
                !bc.read ? 'border-l-4 border-l-[#1F3864]' : ''
              }`}
              onClick={() => handleMarkRead(bc.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle
                        className={`text-base leading-snug ${
                          !bc.read ? 'font-semibold' : 'font-medium text-muted-foreground'
                        }`}
                      >
                        {bc.title}
                      </CardTitle>
                      {!bc.read && (
                        <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Dari {bc.from}
                    </CardDescription>
                  </div>
                  <Badge variant={getCategoryBadgeVariant(bc.category)}>
                    {bc.category}
                  </Badge>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {bc.content}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{bc.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
