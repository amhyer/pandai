'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/use-store';
import { viewFromPathname } from '@/lib/route-map';

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

const views: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'dashboard-super': React.lazy(() => import('@/components/dashboard/super-admin/super-admin-dashboard').then(m => ({ default: m.SuperAdminDashboard }))),
  'dashboard-admin': React.lazy(() => import('@/components/dashboard/admin-sekolah/admin-sekolah-dashboard').then(m => ({ default: m.AdminSekolahDashboard }))),
  'dashboard-guru': React.lazy(() => import('@/components/dashboard/guru/guru-dashboard').then(m => ({ default: m.GuruDashboard }))),
  'dashboard-siswa': React.lazy(() => import('@/components/dashboard/siswa/siswa-dashboard').then(m => ({ default: m.SiswaDashboard }))),
  'dashboard-ortu': React.lazy(() => import('@/components/dashboard/orang-tua/orang-tua-dashboard').then(m => ({ default: m.OrangTuaDashboard }))),
  'dashboard-kepsek': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),

  'schools': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'school-detail': React.lazy(() => import('@/components/dashboard/super-admin/school-manager').then(m => ({ default: m.SchoolManager }))),
  'users-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.UsersGlobalView }))),
  'questions-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.QuestionsGlobalView }))),
  'reports-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.ReportsGlobalView }))),
  'analytics-global': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.AnalyticsGlobalView }))),
  'settings': React.lazy(() => import('@/components/views/super-admin-views').then(m => ({ default: m.SettingsView }))),

  'classes': React.lazy(() => import('@/components/dashboard/admin-sekolah/class-manager').then(m => ({ default: m.ClassManager }))),
  'accounts': React.lazy(() => import('@/components/dashboard/admin-sekolah/account-manager').then(m => ({ default: m.AccountManager }))),

  'subjects': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.SubjectsView }))),
  'teacher-assignments': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.TeacherAssignmentsView }))),
  'backup-restore': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.BackupRestoreView }))),
  'activity-log': React.lazy(() => import('@/components/views/admin-school-new-views').then(m => ({ default: m.ActivityLogView }))),
  'timetable': React.lazy(() => import('@/components/views/admin-school-timetable').then(m => ({ default: m.TimetableView }))),
  'wali-kelas': React.lazy(() => import('@/components/views/admin-school-timetable').then(m => ({ default: m.WaliKelasView }))),
  'import-csv': React.lazy(() => import('@/components/views/admin-school-import').then(m => ({ default: m.ImportCsvView }))),
  'dapodik-sync': React.lazy(() => import('@/components/views/admin-school-dapodik').then(m => ({ default: m.DapodikSyncView }))),

  'guru-materi': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruMateriView }))),
  'guru-nilai': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruNilaiView }))),
  'guru-analisis': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruAnalisisView }))),
  'guru-laporan': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruLaporanView }))),

  'guru-bank-soal': React.lazy(() => import('@/components/views/bank-soal/guru-bank-soal-view').then(m => ({ default: m.GuruBankSoalView }))),
  'guru-tugas': React.lazy(() => import('@/components/views/assignment/guru-assignment-view').then(m => ({ default: m.GuruAssignmentView }))),
  'guru-kehadiran': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruKehadiranView }))),
  'guru-rekap-kehadiran': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruRekapKehadiranView }))),
  'guru-karakter': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruKarakterView }))),
  'guru-rekap-karakter': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruRekapKarakterView }))),
  'guru-jurnal': React.lazy(() => import('@/components/views/guru-new-views').then(m => ({ default: m.GuruJurnalView }))),
  'guru-tryout': React.lazy(() => import('@/components/views/guru-views').then(m => ({ default: m.GuruTryoutView }))),
  'guru-pandai-ai': React.lazy(() => import('@/components/views/guru-ai-views').then(m => ({ default: m.GuruPandaiAiView }))),
  'guru-kotak-masukan': React.lazy(() => import('@/components/views/feedback/kotak-masukan-view').then(m => ({ default: m.KotakMasukanView }))),
  'guru-profil-lulusan': React.lazy(() => import('@/components/views/competency/profil-lulusan-view').then(m => ({ default: m.ProfilLulusanView }))),
  'guru-komponen-nilai': React.lazy(() => import('@/components/views/grades/komponen-nilai-view').then(m => ({ default: m.KomponenNilaiView }))),
  'guru-rapor': React.lazy(() => import('@/components/views/reports/rapor-view').then(m => ({ default: m.RaporView }))),

  'siswa-materi': React.lazy(() => import('@/components/views/siswa-new-views').then(m => ({ default: m.SiswaMateriView }))),
  'siswa-tugas': React.lazy(() => import('@/components/views/assignment/siswa-assignment-view').then(m => ({ default: m.SiswaAssignmentView }))),
  'siswa-tryout': React.lazy(() => import('@/components/views/exam/siswa-exam-views').then(m => ({ default: m.SiswaTryoutView }))),
  'siswa-riwayat': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaRiwayatView }))),
  'siswa-nilai': React.lazy(() => import('@/components/views/siswa-views').then(m => ({ default: m.SiswaNilaiView }))),
  'siswa-kehadiran': React.lazy(() => import('@/components/views/siswa-new-views').then(m => ({ default: m.SiswaKehadiranView }))),
  'siswa-pandai-ai': React.lazy(() => import('@/components/views/siswa-ai-views').then(m => ({ default: m.SiswaPandaiAiView }))),
  'siswa-nilai-akhir': React.lazy(() => import('@/components/views/grades/komponen-nilai-view').then(m => ({ default: m.KomponenNilaiView }))),
  'siswa-rapor': React.lazy(() => import('@/components/views/reports/rapor-view').then(m => ({ default: m.RaporView }))),

  'ortu-nilai': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuNilaiView }))),
  'ortu-materi': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuMateriView }))),
  'ortu-kehadiran': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKehadiranView }))),
  'ortu-kuis': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuKuisView }))),
  'ortu-laporan': React.lazy(() => import('@/components/views/orang-tua-views').then(m => ({ default: m.OrtuLaporanView }))),

  'ortu-karakter': React.lazy(() => import('@/components/views/ortu-new-views').then(m => ({ default: m.OrtuKarakterView }))),
  'ortu-rekap-karakter': React.lazy(() => import('@/components/views/ortu-new-views').then(m => ({ default: m.OrtuRekapKarakterView }))),
  'ortu-kotak-masukan': React.lazy(() => import('@/components/views/feedback/kotak-masukan-view').then(m => ({ default: m.KotakMasukanView }))),
  'ortu-profil-lulusan': React.lazy(() => import('@/components/views/competency/profil-lulusan-view').then(m => ({ default: m.ProfilLulusanView }))),
  'ortu-nilai-akhir': React.lazy(() => import('@/components/views/grades/komponen-nilai-view').then(m => ({ default: m.KomponenNilaiView }))),
  'ortu-rapor': React.lazy(() => import('@/components/views/reports/rapor-view').then(m => ({ default: m.RaporView }))),

  // KEPALA_SEKOLAH
  'kepsek-peta-kelas': React.lazy(() => import('@/components/views/kepsek/kepsek-peta-kelas-view').then(m => ({ default: m.KepsekPetaKelasView }))),
  'kepsek-rekap-kelas': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),
  'kepsek-rekap-guru': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),
  'kepsek-rekap-karakter': React.lazy(() => import('@/components/dashboard/kepala-sekolah/kepala-sekolah-dashboard').then(m => ({ default: m.KepalaSekolahDashboard }))),
  'kepsek-kotak-masukan': React.lazy(() => import('@/components/views/feedback/kotak-masukan-view').then(m => ({ default: m.KotakMasukanView }))),
  'kepsek-profil-lulusan': React.lazy(() => import('@/components/views/competency/profil-lulusan-view').then(m => ({ default: m.ProfilLulusanView }))),
  'kepsek-rapor': React.lazy(() => import('@/components/views/reports/rapor-view').then(m => ({ default: m.RaporView }))),

  'profile': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.ProfileView }))),
  'notifications': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.NotificationsView }))),
  'broadcasts': React.lazy(() => import('@/components/views/shared-views').then(m => ({ default: m.BroadcastsView }))),
};

/**
 * Renders the current SPA view without its own AppLayout wrapper.
 * Extracted from authenticated-app.tsx so app router feature routes can
 * reuse the same view switching during the incremental refactor.
 */
export function ViewRouter() {
  const pathname = usePathname();
  const storeView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);

  // URL-first: migrated route pages derive the view from the pathname.
  // Legacy "/" transitions still use the store's currentView.
  const currentView = viewFromPathname(pathname) ?? storeView;

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
