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
  Crown,
  MessageSquare,
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

type SchoolType = 'SD' | 'SMP' | 'SMA' | 'SMK';
type RoleNav = Record<UserRole, NavSection[]>;

/**
 * Bangun konfigurasi navigasi berdasarkan role + schoolType.
 * Menu sidebar berbeda per jenjang pendidikan (SD/SMP/SMA/SMK).
 * Tryout TKA tersedia di SEMUA jenjang.
 */
function buildNavConfig(role: UserRole, schoolType?: string | null): NavSection[] {
  const st = (schoolType || 'SMA') as SchoolType;

  // ──────────────────────────────────────────────────────────────
  // SUPER ADMIN — Tidak terikat sekolah, menu tetap
  // ──────────────────────────────────────────────────────────────
  if (role === 'SUPER_ADMIN') {
    return [
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
          { label: 'Bank Soal Global (NALAR)', view: 'questions-global', icon: BookMarked },
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
    ];
  }

  // ──────────────────────────────────────────────────────────────
  // ADMIN SEKOLAH — Beda per jenjang
  // ──────────────────────────────────────────────────────────────
  if (role === 'ADMIN_SCHOOL') {
    const dataInduk: NavItem[] = [
      { label: 'Kelas', view: 'classes', icon: GraduationCap },
      { label: 'Mata Pelajaran', view: 'subjects', icon: BookMarked },
      { label: 'Data Siswa', view: 'users', icon: Users },
      { label: 'Jadwal Pelajaran', view: 'timetable', icon: CalendarDays },
    ];

    // SMA: tambah Penjurusan (IPA/IPS/Bahasa)
    if (st === 'SMA') {
      dataInduk.push({ label: 'Penjurusan', view: 'users' as ViewType, icon: Award });
    }
    // SMK: tambah Program Keahlian
    if (st === 'SMK') {
      dataInduk.push({ label: 'Program Keahlian', view: 'users' as ViewType, icon: FolderOpen });
    }

    const sections: NavSection[] = [
      {
        section: 'Utama',
        items: [
          { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
        ],
      },
      {
        section: 'Data Induk',
        items: dataInduk,
      },
      {
        section: 'Penugasan',
        items: [
          { label: 'Penugasan Guru', view: 'teacher-assignments', icon: ClipboardCheck },
          { label: 'Wali Kelas', view: 'wali-kelas', icon: UserCheck },
        ],
      },
      {
        section: 'Integrasi',
        items: [
          { label: 'Import Data', view: 'import-csv', icon: FilePlus },
          { label: 'Tarik Data Dapodik', view: 'dapodik-sync', icon: Database },
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
    ];
    return sections;
  }

  // ──────────────────────────────────────────────────────────────
  // GURU — Beda per jenjang (Tryout TKA di semua jenjang)
  // ──────────────────────────────────────────────────────────────
  if (role === 'GURU') {
    const pembelajaran: NavItem[] = [
      { label: 'Materi Pelajaran', view: 'guru-materi', icon: FileText },
      { label: 'Bank Soal', view: 'guru-bank-soal' as ViewType, icon: Database },
      { label: 'Tugas Terstruktur', view: 'guru-tugas', icon: ClipboardList },
      { label: 'Tryout TKA', view: 'guru-nilai', icon: PenLine }, // Tryout di semua jenjang
    ];

    // SMA: tambah Penjurusan
    // SMK: tambah Keahlian & PKL

    const sections: NavSection[] = [
      {
        section: 'Utama',
        items: [
          { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
        ],
      },
      {
        section: 'Pembelajaran',
        items: pembelajaran,
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
          { label: 'Rekap Laporan 7 Kebiasaan', view: 'guru-karakter', icon: Star },
          { label: 'Analisis Kebiasaan Kelas', view: 'guru-rekap-karakter', icon: Award },
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
      {
        section: 'AI',
        items: [
          { label: 'PANDAI AI', view: 'guru-pandai-ai', icon: BrainCircuit },
        ],
      },
      {
        section: 'Komunikasi',
        items: [
          { label: 'Kotak Masukan', view: 'guru-kotak-masukan' as ViewType, icon: MessageSquare },
        ],
      },
    ];

    // SMA: tambah seksi Penjurusan
    if (st === 'SMA') {
      sections.splice(5, 0, {
        section: 'Penjurusan',
        items: [
          { label: 'Manajemen Penjurusan', view: 'guru-analisis' as ViewType, icon: Award },
          { label: 'Rekap Per Jurusan', view: 'guru-laporan' as ViewType, icon: BarChart3 },
        ],
      });
    }

    // SMK: tambah seksi Kompetensi Keahlian
    if (st === 'SMK') {
      sections.splice(5, 0, {
        section: 'Kompetensi Keahlian',
        items: [
          { label: 'Program Keahlian', view: 'guru-analisis' as ViewType, icon: FolderOpen },
          { label: 'PKL / Praktik Kerja', view: 'guru-laporan' as ViewType, icon: ClipboardCheck },
        ],
      });
    }

    return sections;
  }

  // ──────────────────────────────────────────────────────────────
  // SISWA — Beda sedikit per jenjang
  // ──────────────────────────────────────────────────────────────
  if (role === 'SISWA') {
    const belajar: NavItem[] = [
      { label: 'Materi Pelajaran', view: 'siswa-materi', icon: BookOpen },
      { label: 'Tugas Terstruktur', view: 'siswa-tugas', icon: ClipboardList },
      { label: 'Tryout TKA', view: 'siswa-riwayat', icon: PenLine },
      { label: 'Riwayat Pengerjaan', view: 'siswa-riwayat', icon: History },
    ];

    const sections: NavSection[] = [
      {
        section: 'Utama',
        items: [
          { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
        ],
      },
      {
        section: 'Belajar',
        items: belajar,
      },
      {
        section: 'Hasil',
        items: [
          { label: 'Nilai Saya', view: 'siswa-nilai', icon: Trophy },
          { label: 'Kehadiran Saya', view: 'siswa-kehadiran', icon: CalendarDays },
        ],
      },
      {
        section: 'AI',
        items: [
          { label: 'PANDAI AI', view: 'siswa-pandai-ai', icon: BrainCircuit },
        ],
      },
    ];

    // SMA: tambah Penjurusan Saya
    if (st === 'SMA') {
      sections.splice(3, 0, {
        section: 'Penjurusan',
        items: [
          { label: 'Jurusan Saya', view: 'siswa-nilai' as ViewType, icon: Award },
          { label: 'Rekomendasi Jurusan', view: 'siswa-pandai-ai' as ViewType, icon: Target },
        ],
      });
    }

    // SMK: tambah Keahlian
    if (st === 'SMK') {
      sections.splice(3, 0, {
        section: 'Kompetensi Keahlian',
        items: [
          { label: 'Program Keahlian', view: 'siswa-nilai' as ViewType, icon: FolderOpen },
          { label: 'Log PKL Saya', view: 'siswa-kehadiran' as ViewType, icon: ClipboardCheck },
        ],
      });
    }

    return sections;
  }

  // ──────────────────────────────────────────────────────────────
  // ORANG TUA — Menu pantau, sama semua jenjang
  // ──────────────────────────────────────────────────────────────
  if (role === 'ORANG_TUA') {
    return [
      {
        section: 'Utama',
        items: [
          { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
        ],
      },
      {
        section: '7 Kebiasaan Anak Indonesia Hebat',
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
      {
        section: 'Komunikasi',
        items: [
          { label: 'Kotak Masukan', view: 'ortu-kotak-masukan' as ViewType, icon: MessageSquare },
        ],
      },
    ];
  }

  // ──────────────────────────────────────────────────────────────
  // KEPALA SEKOLAH — Sama semua jenjang (rekap agregat)
  // ──────────────────────────────────────────────────────────────
  if (role === 'KEPALA_SEKOLAH') {
    return [
      {
        section: 'Utama',
        items: [
          { label: 'Beranda', view: 'dashboard', icon: LayoutDashboard },
        ],
      },
      {
        section: 'Rekap Sekolah',
        items: [
          { label: 'Rekap Per Kelas', view: 'kepsek-rekap-kelas', icon: GraduationCap },
          { label: 'Rekap Per Guru', view: 'kepsek-rekap-guru', icon: Users },
          { label: 'Rekap 7 Kebiasaan', view: 'kepsek-rekap-karakter', icon: Star },
        ],
      },
      {
        section: 'Komunikasi',
        items: [
          { label: 'Kotak Masukan', view: 'kepsek-kotak-masukan' as ViewType, icon: MessageSquare },
        ],
      },
    ];
  }

  // Fallback
  return [];
}

// Shorthand for backward compat during migration
const NAV_CONFIG: RoleNav = {
  SUPER_ADMIN: [],
  ADMIN_SCHOOL: [],
  GURU: [],
  SISWA: [],
  ORANG_TUA: [],
  KEPALA_SEKOLAH: [],
};

// ─── Role badge labels ──────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_SCHOOL: 'Admin Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  ORANG_TUA: 'Orang Tua',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
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
  'questions-global': 'Bank Soal Global (NALAR)',
  'reports-global': 'Laporan Global',
  'analytics-global': 'Analitik Platform',
  settings: 'Pengaturan',

  // ADMIN_SCHOOL
  classes: 'Kelas',
  subjects: 'Mata Pelajaran',
  users: 'Data Siswa',
  'teacher-assignments': 'Penugasan Guru',
  timetable: 'Jadwal Pelajaran',
  'wali-kelas': 'Wali Kelas',
  'import-csv': 'Import Data',
  'dapodik-sync': 'Tarik Data Dapodik',
  'backup-restore': 'Cadangkan & Pulihkan',
  'activity-log': 'Log Aktivitas',

  // GURU
  'guru-materi': 'Materi Pelajaran',
  'guru-bank-soal': 'Bank Soal',
  'guru-tugas': 'Tugas Terstruktur',
  'guru-kehadiran': 'Kehadiran Siswa',
  'guru-rekap-kehadiran': 'Rekap Kehadiran',
  'guru-karakter': 'Rekap Laporan 7 Kebiasaan',
  'guru-rekap-karakter': 'Analisis Kebiasaan Kelas',
  'guru-jurnal': 'Jurnal Mengajar',
  'guru-nilai': 'Input Nilai',
  'guru-analisis': 'Analisis Hasil Belajar',
  'guru-laporan': 'Laporan Siswa',
  'guru-pandai-ai': 'PANDAI AI',
  'guru-kotak-masukan': 'Kotak Masukan',

  // SISWA
  'siswa-materi': 'Materi Pelajaran',
  'siswa-tugas': 'Tugas Terstruktur',
  'siswa-riwayat': 'Riwayat Pengerjaan',
  'siswa-nilai': 'Nilai Saya',
  'siswa-kehadiran': 'Kehadiran Saya',
  'siswa-pandai-ai': 'PANDAI AI',

  // ORANG_TUA
  'ortu-karakter': 'Isi Laporan Harian',
  'ortu-rekap-karakter': 'Rekap & Analisis',
  'ortu-nilai': 'Nilai & Progres',
  'ortu-materi': 'Materi Pelajaran',
  'ortu-kehadiran': 'Kehadiran',
  'ortu-kuis': 'Riwayat Pengerjaan',
  'ortu-laporan': 'Laporan Cetak',
  'ortu-kotak-masukan': 'Kotak Masukan',

  // KEPALA_SEKOLAH
  'dashboard-kepsek': 'Dashboard Kepala Sekolah',
  'kepsek-rekap-kelas': 'Rekap Per Kelas',
  'kepsek-rekap-guru': 'Rekap Per Guru',
  'kepsek-rekap-karakter': 'Rekap 7 Kebiasaan',
  'kepsek-kotak-masukan': 'Kotak Masukan',

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
    timetable: [{ label: VIEW_LABELS.timetable }],
    'wali-kelas': [{ label: VIEW_LABELS['wali-kelas'] }],
    'import-csv': [{ label: VIEW_LABELS['import-csv'] }],
    'dapodik-sync': [{ label: VIEW_LABELS['dapodik-sync'] }],
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
    'guru-pandai-ai': [{ label: VIEW_LABELS['guru-pandai-ai'] }],
    'guru-kotak-masukan': [{ label: VIEW_LABELS['guru-kotak-masukan'] }],
    'siswa-materi': [{ label: VIEW_LABELS['siswa-materi'] }],
    'siswa-tugas': [{ label: VIEW_LABELS['siswa-tugas'] }],
    'siswa-riwayat': [{ label: VIEW_LABELS['siswa-riwayat'] }],
    'siswa-nilai': [{ label: VIEW_LABELS['siswa-nilai'] }],
    'siswa-kehadiran': [{ label: VIEW_LABELS['siswa-kehadiran'] }],
    'siswa-pandai-ai': [{ label: VIEW_LABELS['siswa-pandai-ai'] }],
    'ortu-karakter': [{ label: VIEW_LABELS['ortu-karakter'] }],
    'ortu-rekap-karakter': [{ label: VIEW_LABELS['ortu-rekap-karakter'] }],
    'ortu-nilai': [{ label: VIEW_LABELS['ortu-nilai'] }],
    'ortu-materi': [{ label: VIEW_LABELS['ortu-materi'] }],
    'ortu-kehadiran': [{ label: VIEW_LABELS['ortu-kehadiran'] }],
    'ortu-kuis': [{ label: VIEW_LABELS['ortu-kuis'] }],
    'ortu-laporan': [{ label: VIEW_LABELS['ortu-laporan'] }],
    'ortu-kotak-masukan': [{ label: VIEW_LABELS['ortu-kotak-masukan'] }],
    'dashboard-kepsek': [{ label: VIEW_LABELS['dashboard-kepsek'] }],
    'kepsek-rekap-kelas': [{ label: VIEW_LABELS['kepsek-rekap-kelas'] }],
    'kepsek-rekap-guru': [{ label: VIEW_LABELS['kepsek-rekap-guru'] }],
    'kepsek-rekap-karakter': [{ label: VIEW_LABELS['kepsek-rekap-karakter'] }],
    'kepsek-kotak-masukan': [{ label: VIEW_LABELS['kepsek-kotak-masukan'] }],
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
  const navSections = buildNavConfig(role, user?.schoolType);
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
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-muted transition-colors duration-200"
              aria-label="Notifikasi"
              onClick={() => navigateTo('notifications')}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
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
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
