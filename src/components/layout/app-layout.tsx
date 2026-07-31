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
  Medal,
  Stethoscope,
  Dumbbell,
  LogOut,
  Bell,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ─── Navigation config ──────────────────────────────────────────────

interface NavItem {
  label: string;
  view: ViewType;
  icon: LucideIcon;
}

const NAV_CONFIG: Record<UserRole, NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { label: 'Kelola Sekolah', view: 'schools', icon: School },
    { label: 'Bank Soal Global', view: 'questions', icon: BookOpen },
    { label: 'Pengguna', view: 'users', icon: Users },
    { label: 'Laporan', view: 'reports', icon: BarChart3 },
    { label: 'Pengaturan', view: 'settings', icon: Settings },
  ],
  ADMIN_SCHOOL: [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { label: 'Guru & Siswa', view: 'users', icon: Users },
    { label: 'Kelas', view: 'classes', icon: GraduationCap },
    { label: 'Bank Soal', view: 'questions', icon: BookOpen },
    { label: 'Tryout', view: 'exams', icon: ClipboardList },
    { label: 'Laporan', view: 'reports', icon: BarChart3 },
  ],
  GURU: [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { label: 'Bank Soal', view: 'questions', icon: BookOpen },
    { label: 'Buat Soal', view: 'question-editor', icon: FilePlus },
    { label: 'Tryout', view: 'exams', icon: ClipboardList },
    { label: 'Nilai & Analisis', view: 'analytics', icon: BarChart3 },
  ],
  SISWA: [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { label: 'Diagnostic Test', view: 'diagnostic', icon: Stethoscope },
    { label: 'Latihan', view: 'practice', icon: Dumbbell },
    { label: 'Tryout', view: 'exams', icon: ClipboardList },
    { label: 'Hasil Saya', view: 'results', icon: Trophy },
    { label: 'Leaderboard', view: 'leaderboard', icon: Medal },
  ],
};

// ─── Role badge labels ──────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_SCHOOL: 'Admin Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
};

// ─── View → breadcrumb label map ─────────────────────────────────────

const VIEW_LABELS: Record<ViewType, string> = {
  landing: 'Beranda',
  login: 'Masuk',
  register: 'Daftar',
  dashboard: 'Dashboard',
  schools: 'Kelola Sekolah',
  'school-detail': 'Detail Sekolah',
  users: 'Pengguna',
  classes: 'Kelas',
  questions: 'Bank Soal',
  'question-editor': 'Buat Soal',
  exams: 'Tryout',
  'exam-editor': 'Editor Tryout',
  'exam-runner': 'Kerjakan Tryout',
  results: 'Hasil',
  'result-detail': 'Detail Hasil',
  analytics: 'Nilai & Analisis',
  leaderboard: 'Leaderboard',
  diagnostic: 'Diagnostic Test',
  practice: 'Latihan',
  profile: 'Profil',
  reports: 'Laporan',
  settings: 'Pengaturan',
  broadcasts: 'Broadcast',
};

// ─── Breadcrumb builder ─────────────────────────────────────────────

function buildBreadcrumbs(view: ViewType): { label: string; view?: ViewType }[] {
  const roleBased: Record<ViewType, { label: string; view?: ViewType }[]> = {
    dashboard: [{ label: VIEW_LABELS.dashboard }],
    schools: [{ label: VIEW_LABELS.schools }],
    'school-detail': [
      { label: VIEW_LABELS.schools, view: 'schools' },
      { label: VIEW_LABELS['school-detail'] },
    ],
    users: [{ label: VIEW_LABELS.users }],
    classes: [{ label: VIEW_LABELS.classes }],
    questions: [{ label: VIEW_LABELS.questions }],
    'question-editor': [
      { label: VIEW_LABELS.questions, view: 'questions' },
      { label: VIEW_LABELS['question-editor'] },
    ],
    exams: [{ label: VIEW_LABELS.exams }],
    'exam-editor': [
      { label: VIEW_LABELS.exams, view: 'exams' },
      { label: VIEW_LABELS['exam-editor'] },
    ],
    'exam-runner': [
      { label: VIEW_LABELS.exams, view: 'exams' },
      { label: VIEW_LABELS['exam-runner'] },
    ],
    results: [{ label: VIEW_LABELS.results }],
    'result-detail': [
      { label: VIEW_LABELS.results, view: 'results' },
      { label: VIEW_LABELS['result-detail'] },
    ],
    analytics: [{ label: VIEW_LABELS.analytics }],
    leaderboard: [{ label: VIEW_LABELS.leaderboard }],
    diagnostic: [{ label: VIEW_LABELS.diagnostic }],
    practice: [{ label: VIEW_LABELS.practice }],
    profile: [{ label: VIEW_LABELS.profile }],
    reports: [{ label: VIEW_LABELS.reports }],
    settings: [{ label: VIEW_LABELS.settings }],
    broadcasts: [{ label: VIEW_LABELS.broadcasts }],
    landing: [{ label: VIEW_LABELS.landing }],
    login: [{ label: VIEW_LABELS.login }],
    register: [{ label: VIEW_LABELS.register }],
  };
  return roleBased[view] ?? [{ label: VIEW_LABELS[view] }];
}

// ─── Sidebar nav list (shared between desktop & mobile) ─────────────

interface SidebarNavProps {
  items: NavItem[];
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
}

function SidebarNav({ items, currentView, onNavigate, onLogout }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                  isActive
                    ? 'bg-white/10 text-amber-400 border-l-[3px] border-amber-400'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 text-left"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main AppLayout ──────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const logout = useAppStore((s) => s.logout);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const role = user?.role ?? 'SISWA';
  const navItems = NAV_CONFIG[role];
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

  // ── Sidebar content (shared) ──

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
      items={navItems}
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
          'hidden lg:flex lg:flex-col lg:w-64 bg-[#1F3864] shrink-0 transition-all duration-300',
          !sidebarOpen && 'lg:w-0 lg:overflow-hidden'
        )}
      >
        {sidebarBranding}
        {sidebarUser && (
          <>
            <div className="mx-4">
              <Separator className="bg-white/10" />
            </div>
            {sidebarUser}
          </>
        )}
        {sidebarNav}
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
        <SheetContent side="left" className="w-72 p-0 bg-[#1F3864] border-r-white/10">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          {sidebarBranding}
          {sidebarUser && (
            <>
              <div className="mx-4">
                <Separator className="bg-white/10" />
              </div>
              {sidebarUser}
            </>
          )}
          {sidebarNav}
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