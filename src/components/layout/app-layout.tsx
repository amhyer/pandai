'use client';

import React from 'react';
import { useAppStore, ViewType, UserRole } from '@/store/use-store';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  School,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
  ClipboardList,
  FilePlus,
  Trophy,
  LogOut,
  Bell,
  Menu,
  ChevronRight,
  FileText,
  UserCheck,
  ListChecks,
  Target,
  TrendingUp,
  Printer,
  Database,
  Activity,
  FolderOpen,
  BookMarked,
  ClipboardCheck,
  History,
  Star,
  CalendarDays,
  Shield,
  HardDrive,
  ScrollText,
  Heart,
  Award,
  PenLine,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Navigation Config — Terinspirasi SIMANTAP, diadaptasi ke domain TKA
// ═══════════════════════════════════════════════════════════════════════

interface NavItem {
  label: string;
  view: ViewType;
  icon: LucideIcon;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

type RoleNav = Record<UserRole, NavSection[]>;

const NAV_CONFIG: RoleNav = {
  // ────────────────────────────────────────────────────────────────
  // SUPER ADMIN — Mengelola platform lintas sekolah
  // ────────────────────────────────────────────────────────────────
  SUPER_ADMIN: [
    {
      section: 'Utama',
      items: [
        { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
      ],
    },
    {
      section: 'Manajemen',
      items: [
        { label: 'Kelola Sekolah', view: 'schools', icon: School },
        { label: 'Semua Pengguna', view: 'users-global', icon: Users },
      ],
    },
    {
      section: 'Laporan',
      items: [
        { label: 'Analitik Platform', view: 'analytics-global', icon: BarChart3 },
        { label: 'Laporan Global', view: 'reports-global', icon: Printer },
      ],
    },
    {
      section: 'Sistem',
      items: [
        { label: 'Pengaturan', view: 'settings', icon: Settings },
      ],
    },
  ],

  // ────────────────────────────────────────────────────────────────
  // ADMIN SEKOLAH — 8 Menu dalam 4 Seksi
  // ────────────────────────────────────────────────────────────────
  ADMIN_SCHOOL: [
    {
      section: 'Utama',
      items: [
        { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
      ],
    },
    {
      section: 'Data Induk',
      items: [
        { label: 'Kelas', view: 'classes', icon: GraduationCap },
        { label: 'Mata Pelajaran', view: 'subjects', icon: BookMarked },
        { label: 'Data Siswa', view: 'users', icon: Users },
      ],
    },
    {
      section: 'Penugasan',
      items: [
        { label: 'Penugasan Guru', view: 'teacher-assignments', icon: ClipboardCheck },
      ],
    },
    {
      section: 'Sistem',
      items: [
        { label: 'Pengaturan Aplikasi', view: 'settings', icon: Settings },
        { label: 'Cadangkan & Pulihkan', view: 'backup-restore', icon: HardDrive },
        { label: 'Log Aktivitas', view: 'activity-log', icon: Activity },
      ],
    },
  ],

  // ────────────────────────────────────────────────────────────────
  // GURU — 11 Menu dalam 6 Seksi
  // ────────────────────────────────────────────────────────────────
  GURU: [
    {
      section: 'Utama',
      items: [
        { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
      ],
    },
    {
      section: 'Pembelajaran',
      items: [
        { label: 'Materi Pelajaran', view: 'guru-materi', icon: FileText },
        { label: 'Tugas, Kuis & Ujian', view: 'guru-tugas', icon: ClipboardList },
      ],
    },
    {
      section: 'Kehadiran',
      items: [
        { label: 'Kehadiran Siswa', view: 'guru-kehadiran', icon: CalendarDays },
        { label: 'Rekap Kehadiran', view: 'guru-rekap-kehadiran', icon: History },
      ],
    },
    {
      section: 'Karakter',
      items: [
        { label: 'Isi Laporan 7 Kebiasaan', view: 'guru-karakter', icon: Star },
        { label: 'Rekap 7 Kebiasaan', view: 'guru-rekap-karakter', icon: Award },
      ],
    },
    {
      section: 'Administrasi',
      items: [
        { label: 'Jurnal Mengajar', view: 'guru-jurnal', icon: ScrollText },
      ],
    },
    {
      section: 'Penilaian',
      items: [
        { label: 'Input Nilai', view: 'guru-nilai', icon: ListChecks },
        { label: 'Analisis Hasil Belajar', view: 'guru-analisis', icon: TrendingUp },
        { label: 'Laporan Siswa', view: 'guru-laporan', icon: Printer },
      ],
    },
  ],

  // ────────────────────────────────────────────────────────────────
  // SISWA — 6 Menu dalam 3 Seksi
  // ────────────────────────────────────────────────────────────────
  SISWA: [
    {
      section: 'Utama',
      items: [
        { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
      ],
    },
    {
      section: 'Belajar',
      items: [
        { label: 'Materi Pelajaran', view: 'siswa-materi', icon: BookOpen },
        { label: 'Tugas & Ujian', view: 'siswa-tugas', icon: ClipboardList },
        { label: 'Riwayat Pengerjaan', view: 'siswa-riwayat', icon: History },
      ],
    },
    {
      section: 'Hasil',
      items: [
        { label: 'Nilai Saya', view: 'siswa-nilai', icon: Trophy },
        { label: 'Kehadiran Saya', view: 'siswa-kehadiran', icon: CalendarDays },
      ],
    },
  ],

  // ────────────────────────────────────────────────────────────────
  // ORANG TUA — 8 Menu dalam 3 Seksi
  // ────────────────────────────────────────────────────────────────
  ORANG_TUA: [
    {
      section: 'Utama',
      items: [
        { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
      ],
    },
    {
      section: '7 Kebiasaan Anak Hebat',
      items: [
        { label: 'Isi Laporan Harian', view: 'ortu-karakter', icon: Heart },
        { label: 'Rekap & Analisis', view: 'ortu-rekap-karakter', icon: BarChart3 },
      ],
    },
    {
      section: 'Pantau Anak',
      items: [
        { label: 'Nilai & Progres', view: 'ortu-nilai', icon: Target },
        { label: 'Materi Pelajaran', view: 'ortu-materi', icon: BookOpen },
        { label: 'Kehadiran', view: 'ortu-kehadiran', icon: UserCheck },
        { label: 'Riwayat Pengerjaan', view: 'ortu-kuis', icon: History },
        { label: 'Laporan Cetak', view: 'ortu-laporan', icon: Printer },
      ],
    },
  ],
};

// ─── Role badge labels ──────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_SCHOOL: 'Admin Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  ORANG_TUA: 'Orang Tua',
};

// ─── View → breadcrumb label map ─────────────────────────────────────

const VIEW_LABELS: Record<ViewType, string> = {
  // Public
  landing: 'Beranda',
  login: 'Masuk',
  register: 'Daftar',

  // Dashboard
  dashboard: 'Beranda',

  // SUPER_ADMIN
  schools: 'Kelola Sekolah',
  'school-detail': 'Detail Sekolah',
  'users-global': 'Semua Pengguna',
  'reports-global': 'Laporan Global',
  'analytics-global': 'Analitik Platform',
  settings: 'Pengaturan',

  // ADMIN_SCHOOL
  classes: 'Kelas',
  subjects: 'Mata Pelajaran',
  users: 'Data Siswa',
  'teacher-assignments': 'Penugasan Guru',
  'backup-restore': 'Cadangkan & Pulihkan',
  'activity-log': 'Log Aktivitas',

  // GURU
  'guru-materi': 'Materi Pelajaran',
  'guru-tugas': 'Tugas, Kuis & Ujian',
  'guru-kehadiran': 'Kehadiran Siswa',
  'guru-rekap-kehadiran': 'Rekap Kehadiran',
  'guru-karakter': 'Isi Laporan 7 Kebiasaan',
  'guru-rekap-karakter': 'Rekap 7 Kebiasaan',
  'guru-jurnal': 'Jurnal Mengajar',
  'guru-nilai': 'Input Nilai',
  'guru-analisis': 'Analisis Hasil Belajar',
  'guru-laporan': 'Laporan Siswa',

  // SISWA
  'siswa-materi': 'Materi Pelajaran',
  'siswa-tugas': 'Tugas & Ujian',
  'siswa-riwayat': 'Riwayat Pengerjaan',
  'siswa-nilai': 'Nilai Saya',
  'siswa-kehadiran': 'Kehadiran Saya',

  // ORANG_TUA
  'ortu-karakter': 'Isi Laporan Harian',
  'ortu-rekap-karakter': 'Rekap & Analisis',
  'ortu-nilai': 'Nilai & Progres',
  'ortu-materi': 'Materi Pelajaran',
  'ortu-kehadiran': 'Kehadiran',
  'ortu-kuis': 'Riwayat Pengerjaan',
  'ortu-laporan': 'Laporan Cetak',

  // Shared
  profile: 'Profil',
  notifications: 'Notifikasi',
  broadcasts: 'Broadcast',
};

// ─── Breadcrumb builder ─────────────────────────────────────────────

function buildBreadcrumbs(view: ViewType): { label: string; view?: ViewType }[] {
  const roleBased: Partial<Record<ViewType, { label: string; view?: ViewType }[]>> = {
    dashboard: [{ label: VIEW_LABELS.dashboard }],
    schools: [{ label: VIEW_LABELS.schools }],
    'school-detail': [
      { label: VIEW_LABELS.schools, view: 'schools' },
      { label: VIEW_LABELS['school-detail'] },
    ],
    'users-global': [{ label: VIEW_LABELS['users-global'] }],
    'reports-global': [{ label: VIEW_LABELS['reports-global'] }],
    'analytics-global': [{ label: VIEW_LABELS['analytics-global'] }],
    settings: [{ label: VIEW_LABELS.settings }],
    classes: [{ label: VIEW_LABELS.classes }],
    subjects: [{ label: VIEW_LABELS.subjects }],
    users: [{ label: VIEW_LABELS.users }],
    'teacher-assignments': [{ label: VIEW_LABELS['teacher-assignments'] }],
    'backup-restore': [{ label: VIEW_LABELS['backup-restore'] }],
    'activity-log': [{ label: VIEW_LABELS['activity-log'] }],
    'guru-materi': [{ label: VIEW_LABELS['guru-materi'] }],
    'guru-tugas': [{ label: VIEW_LABELS['guru-tugas'] }],
    'guru-kehadiran': [{ label: VIEW_LABELS['guru-kehadiran'] }],
    'guru-rekap-kehadiran': [{ label: VIEW_LABELS['guru-rekap-kehadiran'] }],
    'guru-karakter': [{ label: VIEW_LABELS['guru-karakter'] }],
    'guru-rekap-karakter': [{ label: VIEW_LABELS['guru-rekap-karakter'] }],
    'guru-jurnal': [{ label: VIEW_LABELS['guru-jurnal'] }],
    'guru-nilai': [{ label: VIEW_LABELS['guru-nilai'] }],
    'guru-analisis': [{ label: VIEW_LABELS['guru-analisis'] }],
    'guru-laporan': [{ label: VIEW_LABELS['guru-laporan'] }],
    'siswa-materi': [{ label: VIEW_LABELS['siswa-materi'] }],
    'siswa-tugas': [{ label: VIEW_LABELS['siswa-tugas'] }],
    'siswa-riwayat': [{ label: VIEW_LABELS['siswa-riwayat'] }],
    'siswa-nilai': [{ label: VIEW_LABELS['siswa-nilai'] }],
    'siswa-kehadiran': [{ label: VIEW_LABELS['siswa-kehadiran'] }],
    'ortu-karakter': [{ label: VIEW_LABELS['ortu-karakter'] }],
    'ortu-rekap-karakter': [{ label: VIEW_LABELS['ortu-rekap-karakter'] }],
    'ortu-nilai': [{ label: VIEW_LABELS['ortu-nilai'] }],
    'ortu-materi': [{ label: VIEW_LABELS['ortu-materi'] }],
    'ortu-kehadiran': [{ label: VIEW_LABELS['ortu-kehadiran'] }],
    'ortu-kuis': [{ label: VIEW_LABELS['ortu-kuis'] }],
    'ortu-laporan': [{ label: VIEW_LABELS['ortu-laporan'] }],
    profile: [{ label: VIEW_LABELS.profile }],
    notifications: [{ label: VIEW_LABELS.notifications }],
    broadcasts: [{ label: VIEW_LABELS.broadcasts }],
    landing: [{ label: VIEW_LABELS.landing }],
    login: [{ label: VIEW_LABELS.login }],
    register: [{ label: VIEW_LABELS.register }],
  };
  return roleBased[view] ?? [{ label: VIEW_LABELS[view] ?? view }];
}

// ═══════════════════════════════════════════════════════════════════════
// Sidebar Navigation — grouped by section (SIMANTAP pattern)
// ═══════════════════════════════════════════════════════════════════════

interface SidebarNavProps {
  sections: NavSection[];
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
}

function SidebarNav({ sections, currentView, onNavigate, onLogout }: SidebarNavProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Scrollable nav area */}
      <ScrollArea className="flex-1 px-3 py-2 min-h-0">
        <nav className="flex flex-col gap-1 pb-2" role="navigation" aria-label="Main navigation">
          {sections.map((group) => (
            <React.Fragment key={group.section}>
              {/* Section label — clickable to collapse */}
              <button
                onClick={() => toggleSection(group.section)}
                className="mt-4 mb-1 flex w-full items-center justify-between px-3 first:mt-0 group/section"
                aria-expanded={!collapsed[group.section]}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {group.section}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3 w-3 text-white/30 transition-transform duration-200',
                    !collapsed[group.section] && 'rotate-90'
                  )}
                />
              </button>

              {/* Items — animated collapse */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  collapsed[group.section] ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                )}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => onNavigate(item.view)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                        'hover:scale-[1.02] active:scale-[0.98]',
                        isActive
                          ? 'bg-white/10 text-amber-400 shadow-sm shadow-amber-400/10 border-l-[3px] border-amber-400'
                          : 'text-white/70 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </nav>
      </ScrollArea>

      {/* Logout at bottom — always visible */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 text-left hover:scale-[1.02] active:scale-[0.98]"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main AppLayout
// ═══════════════════════════════════════════════════════════════════════

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const logout = useAppStore((s) => s.logout);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const role = user?.role ?? 'SISWA';
  const navSections = NAV_CONFIG[role];
  const breadcrumbs = buildBreadcrumbs(currentView);
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'U';

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  // ── Sidebar content (shared between desktop & mobile) ──

  const sidebarBranding = (
    <div className="flex items-center gap-3 px-4 pt-6 pb-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
        <GraduationCap className="h-5 w-5 text-[#1F3864]" />
      </div>
      <span className="text-xl font-bold tracking-tight text-white">PANDAI</span>
    </div>
  );

  const sidebarUser = user && (
    <div className="px-4 py-3">
      <p className="truncate text-sm font-semibold text-white">{user.name}</p>
      <span className="mt-1 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        {ROLE_LABELS[role]}
      </span>
      {user.schoolName && (
        <p className="mt-1.5 truncate text-xs text-white/50">{user.schoolName}</p>
      )}
    </div>
  );

  const sidebarNav = (
    <SidebarNav
      sections={navSections}
      currentView={currentView}
      onNavigate={navigateTo}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:w-64 bg-[#1F3864] shrink-0 transition-all duration-300 overflow-hidden',
          !sidebarOpen && 'lg:w-0'
        )}
      >
        {/* Branding + User info — fixed at top */}
        <div className="shrink-0">
          {sidebarBranding}
          {sidebarUser && (
            <>
              <div className="mx-4">
                <Separator className="bg-white/10" />
              </div>
              {sidebarUser}
            </>
          )}
        </div>
        {/* Nav takes remaining space with scroll */}
        <div className="flex-1 min-h-0">
          {sidebarNav}
        </div>
      </aside>

      {/* ── Mobile Sidebar (Sheet) ── */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-3 z-40 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-[#1F3864] border-r-white/10 flex flex-col">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          {/* Branding + User info — fixed at top on mobile */}
          <div className="shrink-0">
            {sidebarBranding}
            {sidebarUser && (
              <>
                <div className="mx-4">
                  <Separator className="bg-white/10" />
                </div>
                {sidebarUser}
              </>
            )}
          </div>
          {/* Nav takes remaining space with scroll on mobile */}
          <div className="flex-1 min-h-0">
            {sidebarNav}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Right column: Header + Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Header ── */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-white px-4 shadow-sm sm:px-6">
          {/* Spacer for mobile menu button */}
          <div className="w-10 lg:hidden" />

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          className="cursor-pointer"
                          onClick={() => crumb.view && navigateTo(crumb.view)}
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile breadcrumb - just show current page */}
          <span className="sm:hidden text-sm font-medium text-foreground">
            {breadcrumbs[breadcrumbs.length - 1]?.label}
          </span>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell */}
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[#1F3864] text-xs font-semibold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end" forceMount>
                {user && (
                  <>
                    <div className="flex flex-col gap-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigateTo('profile')}>
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('settings')}>
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
