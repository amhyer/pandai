'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/use-store';
import AppLayout from '@/components/layout/app-layout';

// ─── Loading Skeleton ──────────────────────────────────────────────

function ViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-96 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-lg bg-muted" />
      <div className="h-60 rounded-lg bg-muted" />
    </div>
  );
}

// ─── Placeholder view for pages not yet built ─────────────────────

function PlaceholderView({ title }: { title: string }) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F3864]/10 text-[#1F3864]">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        Halaman ini sedang dalam pengembangan. Fitur akan segera tersedia.
      </p>
      <button
        onClick={() => navigateTo('dashboard')}
        className="mt-2 px-4 py-2 text-sm font-medium text-[#1F3864] bg-[#1F3864]/10 rounded-lg hover:bg-[#1F3864]/20 transition-colors"
      >
        ← Kembali ke Beranda
      </button>
    </div>
  );
}

// ─── Dynamic view components (lazy loaded per view) ─────────────────
// Each view is loaded only when navigated to, reducing initial bundle size

const views: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  // Dashboards
  'dashboard-super': React.lazy(() => import('@/components/dashboard/super-admin/super-admin-dashboard').then(m => ({ default: m.SuperAdminDashboard }))),
  'dashboard-admin': React.lazy(() => import('@/components/dashboard/admin-sekolah/admin-sekolah-dashboard').then(m => ({ default: m.AdminSekolahDashboard }))),
  'dashboard-guru': React.lazy(() => import('@/components/dashboard/guru/guru-dashboard').then(m => ({ default: m.GuruDashboard }))),
  'dashboard-siswa': React.lazy(() => import('@/components/dashboard/siswa/siswa-dashboard').then(m => ({ default: m.SiswaDashboard }))),
  'dashboard-ortu': React.lazy(() => import('@/components/dashboard/orang-tua/orang-tua-dashboard').then(m => ({ default: m.OrangTuaDashboard }))),
  'dashboard-kepsek': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),

  // SUPER_ADMIN
  'schools': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'school-detail': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'users-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.UsersGlobalView }))),
  'questions-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.QuestionsGlobalView }))),
  'reports-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.ReportsGlobalView }))),
  'analytics-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.AnalyticsGlobalView }))),
  'settings': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.SettingsView }))),

  // ADMIN_SCHOOL — existing components
  'classes': React.lazy(() => import('@/components/dashboard/admin-sekolah/class-manager').then(m => ({ default: m.ClassManager }))),
  'users': React.lazy(() => import('@/components/dashboard/admin-sekolah/user-manager').then(m => ({ default: m.UserManager }))),

  // ADMIN_SCHOOL — new views
  'subjects': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.SubjectsView }))),
  'teacher-assignments': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.TeacherAssignmentsView }))),
  'backup-restore': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.BackupRestoreView }))),
  'activity-log': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.ActivityLogView }))),
  'timetable': React.lazy(() => import('@/components/views/admin-school-timetable').then(m => ({ default: m.TimetableView }))),
  'wali-kelas': React.lazy(() => import('@/components/views/admin-school-timetable').then(m => ({ default: m.WaliKelasView }))),
  'import-csv': React.lazy(() => import('@/components/views/admin-school-import').then(m => ({ default: m.ImportCsvView }))),
  'dapodik-sync': React.lazy(() => import('@/components/views/admin-school-dapodik').then(m => ({ default: m.DapodikSyncView }))),

  // GURU — existing components
  'guru-materi': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruMateriView }))),
  'guru-nilai': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruNilaiView }))),
  'guru-analisis': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruAnalisisView }))),
  'guru-laporan': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruLaporanView }))),

  // GURU — new interactive views
  'guru-tugas': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruTugasView }))),
  'guru-kehadiran': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruKehadiranView }))),
  'guru-rekap-kehadiran': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruRekapKehadiranView }))),
  'guru-karakter': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruKarakterView }))),
  'guru-rekap-karakter': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruRekapKarakterView }))),
  'guru-jurnal': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruJurnalView }))),
  'guru-pandai-ai': React.lazy(() => import('@/components/views/guru-ai-views').then(m => ({ default: m.GuruPandaiAiView }))),

  // SISWA — new views
  'siswa-materi': React.lazy(() => import('@/components/views/siswa-new-views').then(m => ({ default: m.SiswaMateriView }))),
  'siswa-tugas': React.lazy(() => import('@/components/views/siswa-new-views').then(m => ({ default: m.SiswaTugasView }))),
  'siswa-riwayat': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaRiwayatView }))),
  'siswa-nilai': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaNilaiView }))),
  'siswa-kehadiran': React.lazy(() => import('@/components/views/siswa-new-views').then(m => ({ default: m.SiswaKehadiranView }))),
  'siswa-pandai-ai': React.lazy(() => import('@/components/views/siswa-ai-views').then(m => ({ default: m.SiswaPandaiAiView }))),

  // ORANG_TUA — existing components
  'ortu-nilai': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuNilaiView }))),
  'ortu-materi': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuMateriView }))),
  'ortu-kehadiran': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKehadiranView }))),
  'ortu-kuis': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKuisView }))),
  'ortu-laporan': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuLaporanView }))),

  // ORANG_TUA — new views
  'ortu-karakter': React.lazy(() => import('@/components/views/ortu-new-views').then(m => ({ default: m.OrtuKarakterView }))),
  'ortu-rekap-karakter': React.lazy(() => import('@/components/views/ortu-new-views').then(m => ({ default: m.OrtuRekapKarakterView }))),

  // KEPALA_SEKOLAH
  'kepsek-rekap-kelas': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),
  'kepsek-rekap-guru': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),
  'kepsek-rekap-karakter': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),

  // Shared
  'profile': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.ProfileView }))),
  'notifications': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.NotificationsView }))),
  'broadcasts': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.BroadcastsView }))),
};

// ─── View Router ─────────────────────────────────────────────────────

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);

  // Dashboard maps to role-specific component
  if (currentView === 'dashboard') {
    const roleDashboards: Record<string, string> = {
      'SUPER_ADMIN': 'dashboard-super',
      'ADMIN_SCHOOL': 'dashboard-admin',
      'GURU': 'dashboard-guru',
      'SISWA': 'dashboard-siswa',
      'ORANG_TUA': 'dashboard-ortu',
      'KEPALA_SEKOLAH': 'dashboard-kepsek',
    };
    const viewKey = roleDashboards[user?.role ?? 'SISWA'] ?? 'dashboard-siswa';
    const Component = views[viewKey];
    return Component ? (
      <Suspense fallback={<ViewSkeleton />}>
        <Component />
      </Suspense>
    ) : <ViewSkeleton />;
  }

  const Component = views[currentView];
  if (Component) {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <Component />
      </Suspense>
    );
  }

  return <ViewSkeleton />;
}

// ─── Export ─────────────────────────────────────────────────────────

export default function AuthenticatedApp() {
  return (
    <AppLayout>
      <ViewRouter />
    </AppLayout>
  );
}
