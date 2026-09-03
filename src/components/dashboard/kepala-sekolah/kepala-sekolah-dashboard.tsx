'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, GraduationCap, School, Clock, Loader2, ShieldAlert, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabKey = 'rekap-kelas' | 'rekap-guru' | 'rekap-karakter' | 'rekap-karakter-kelas';

interface SchoolInfo {
  schoolName: string;
  totalSiswa: number;
  totalGuru: number;
  totalKelas: number;
  overallAvgKehadiran: number | null;
}

interface RekapKelas {
  className: string;
  classId: string;
  studentCount: number;
  avgKehadiran: number | null;
  avgNilai: number | null;
  avgKebiasaan: number | null;
}

interface RekapGuru {
  teacherName: string;
  teacherId: string;
  nip: string | null;
  kehadiranMengajar: number;
  jumlahMateri: number;
  jumlahKuis: number;
  jumlahTugas: number;
}

interface RekapKebiasaan {
  habitId: string;
  habitName: string;
  avgRating: number | null;
  reportCount: number;
}

interface RekapKebiasaanPerKelas {
  className: string;
  classId: string;
  totalReports: number;
  avgOverall: number | null;
  habits: RekapKebiasaan[];
}

interface DashboardData {
  schoolInfo: SchoolInfo;
  rekapKelas: RekapKelas[];
  rekapGuru: RekapGuru[];
  rekapKebiasaan: RekapKebiasaan[];
  rekapKebiasaanPerKelas: RekapKebiasaanPerKelas[];
}

export interface KepalaSekolahDashboardServerData extends DashboardData {}

interface KepalaSekolahDashboardProps {
  serverData?: KepalaSekolahDashboardServerData;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'rekap-kelas', label: 'Rekap Per Kelas' },
  { key: 'rekap-guru', label: 'Rekap Per Guru' },
  { key: 'rekap-karakter', label: 'Rekap 7 Kebiasaan' },
  { key: 'rekap-karakter-kelas', label: 'Kebiasaan Per Kelas' },
];

const HABIT_COLORS = [
  'bg-amber-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-rose-400',
  'bg-violet-400',
  'bg-teal-400',
  'bg-orange-400',
];

export function KepalaSekolahDashboard({ serverData }: KepalaSekolahDashboardProps = {}) {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const [data, setData] = useState<DashboardData | null>(serverData ?? null);
  const [loading, setLoading] = useState(!serverData);
  const [error, setError] = useState<string | null>(null);

  // Derive active tab from currentView so sidebar navigation works
  const viewToTab: Partial<Record<string, TabKey>> = {
    'dashboard': 'rekap-kelas',
    'dashboard-kepsek': 'rekap-kelas',
    'kepsek-rekap-kelas': 'rekap-kelas',
    'kepsek-rekap-guru': 'rekap-guru',
    'kepsek-rekap-karakter': 'rekap-karakter',
  };
  const [activeTab, setActiveTab] = useState<TabKey>('rekap-kelas');

  // Sync tab with currentView changes (e.g. sidebar click)
  useEffect(() => {
    const tabFromView = viewToTab[currentView];
    if (tabFromView) {
      setActiveTab(tabFromView);
    }
  }, [currentView]);

  useEffect(() => {
    if (serverData) {
      setData(serverData);
      setLoading(false);
      return;
    }
    const schoolId = user?.schoolId;
    if (!schoolId) {
      setError('Data sekolah tidak ditemukan. Silakan hubungi admin.');
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const res = await apiClient(`/api/kepsek/dashboard?schoolId=${schoolId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Gagal memuat data');
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [serverData, user?.id, user?.schoolId, user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
        <span className="ml-3 text-sm text-muted-foreground">Memuat data dashboard...</span>
      </div>
    );
  }

  if (error === 'UNAUTHORIZED') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-foreground">Sesi Anda telah berakhir</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Silakan masuk kembali untuk melihat dashboard kepala sekolah.
          </p>
        </div>
        <Button
          onClick={() => useAppStore.getState().logout()}
          className="mt-2 gap-2 bg-[#1F3864] hover:bg-[#152850]"
        >
          <LogIn className="h-4 w-4" />
          Masuk Ulang
        </Button>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <School className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">{error || 'Data tidak tersedia'}</p>
      </div>
    );
  }

  const { schoolInfo, rekapKelas, rekapGuru, rekapKebiasaan, rekapKebiasaanPerKelas } = data;

  const summaryCards = [
    {
      label: 'Total Siswa',
      value: schoolInfo.totalSiswa,
      icon: Users,
      color: 'from-amber-400 to-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: 'Total Guru',
      value: schoolInfo.totalGuru,
      icon: GraduationCap,
      color: 'from-emerald-400 to-emerald-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Total Kelas',
      value: schoolInfo.totalKelas,
      icon: School,
      color: 'from-sky-400 to-sky-500',
      bgLight: 'bg-sky-50',
      textColor: 'text-sky-700',
    },
    {
      label: 'Rata-rata Kehadiran',
      value: schoolInfo.overallAvgKehadiran !== null ? `${schoolInfo.overallAvgKehadiran}%` : '-',
      icon: Clock,
      color: 'from-violet-400 to-violet-500',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-700',
    },
  ];

  const isDashboardView = currentView === 'dashboard' || currentView === 'dashboard-kepsek';

  const tabTitles: Record<TabKey, string> = {
    'rekap-kelas': 'Rekap Per Kelas',
    'rekap-guru': 'Rekap Per Guru',
    'rekap-karakter': 'Rekap 7 Kebiasaan',
    'rekap-karakter-kelas': 'Kebiasaan Per Kelas',
  };

  const tabDescriptions: Record<TabKey, string> = {
    'rekap-kelas': 'Ringkasan kehadiran, nilai, dan kebiasaan per kelas',
    'rekap-guru': 'Aktivitas mengajar dan kontribusi materi per guru',
    'rekap-karakter': 'Rekap 7 Kebiasaan Anak Indonesia Hebat',
    'rekap-karakter-kelas': 'Rincian kebiasaan per kelas',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isDashboardView ? 'Dashboard Kepala Sekolah' : tabTitles[activeTab]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isDashboardView ? schoolInfo.schoolName : tabDescriptions[activeTab]}
        </p>
      </div>

      {/* ── Summary Cards (only on main dashboard) ── */}
      {isDashboardView && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="overflow-hidden border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium truncate">{card.label}</p>
                      <p className={`text-xl font-bold ${card.textColor} mt-0.5`}>{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                pb-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-[#1F3864] text-[#1F3864]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'rekap-kelas' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Rekap Per Kelas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold">Kelas</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Siswa</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Kehadiran</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Nilai Eksternal</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Kebiasaan (/4)</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rekapKelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Belum ada data kelas
                      </TableCell>
                    </TableRow>
                  ) : (
                    rekapKelas.map((kelas) => {
                      const kehadiran = kelas.avgKehadiran ?? null;
                      const kebiasaan = kelas.avgKebiasaan ?? null;
                      let statusLabel = 'Belum Ada Data';
                      let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
                      if (kehadiran !== null && kebiasaan !== null) {
                        if (kehadiran >= 80 && kebiasaan >= 2.5) {
                          statusLabel = 'Tuntas';
                          statusVariant = 'default';
                        } else if (kehadiran >= 60 && kebiasaan >= 1.5) {
                          statusLabel = 'Perlu Perhatian';
                          statusVariant = 'secondary';
                        } else {
                          statusLabel = 'Belum Tuntas';
                          statusVariant = 'destructive';
                        }
                      }
                      return (
                        <TableRow key={kelas.classId}>
                          <TableCell className="font-medium text-sm">{kelas.className}</TableCell>
                          <TableCell className="text-center text-sm">{kelas.studentCount}</TableCell>
                          <TableCell className="text-center text-sm">
                            {kehadiran !== null ? (
                              <span className={kehadiran >= 80 ? 'text-emerald-600 font-semibold' : kehadiran >= 60 ? 'text-amber-600' : 'text-red-600'}>
                                {kehadiran}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {kelas.avgNilai !== null ? kelas.avgNilai : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {kebiasaan !== null ? (
                              <span className={kebiasaan >= 2.5 ? 'text-emerald-600 font-semibold' : kebiasaan >= 1.5 ? 'text-amber-600' : 'text-red-600'}>
                                {kebiasaan}/4
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={statusVariant} className="text-[11px]">
                              {statusLabel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rekap-guru' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Rekap Per Guru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold">Nama Guru</TableHead>
                    <TableHead className="text-xs font-semibold">NIP</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Jurnal Mengajar</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Materi</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Kuis</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Tugas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rekapGuru.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Belum ada data guru
                      </TableCell>
                    </TableRow>
                  ) : (
                    rekapGuru.map((guru) => (
                      <TableRow key={guru.teacherId}>
                        <TableCell className="font-medium text-sm">{guru.teacherName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {guru.nip ? (
                            <span className="font-mono text-xs">{guru.nip}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs font-mono">{guru.kehadiranMengajar}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{guru.jumlahMateri}</TableCell>
                        <TableCell className="text-center text-sm">{guru.jumlahKuis}</TableCell>
                        <TableCell className="text-center text-sm">{guru.jumlahTugas}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rekap-karakter' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Rekap 7 Kebiasaan Anak Indonesia Hebat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rekapKebiasaan.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data kebiasaan</p>
            ) : (
              rekapKebiasaan.map((habit, idx) => {
                const maxRating = 4;
                const rating = habit.avgRating ?? 0;
                const percentage = habit.avgRating !== null ? Math.round((rating / maxRating) * 100) : 0;
                const barColor = HABIT_COLORS[idx % HABIT_COLORS.length];
                const ratingLabel = habit.avgRating !== null ? `${rating}/4` : '-';
                return (
                  <div key={habit.habitId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{habit.habitName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{habit.reportCount} laporan</span>
                        <span className={`text-sm font-semibold ${rating >= 2.5 ? 'text-emerald-600' : rating >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {ratingLabel}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'rekap-karakter-kelas' && (
        <div className="space-y-4">
          {rekapKebiasaanPerKelas.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Belum ada data kebiasaan per kelas</p>
              </CardContent>
            </Card>
          ) : (
            rekapKebiasaanPerKelas.map((kelas) => (
              <Card key={kelas.classId} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{kelas.className}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{kelas.totalReports} laporan</span>
                      {kelas.avgOverall !== null && (
                        <Badge variant={kelas.avgOverall >= 2.5 ? 'default' : kelas.avgOverall >= 1.5 ? 'secondary' : 'destructive'} className="text-[11px]">
                          Rata-rata: {kelas.avgOverall}/4
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2.5">
                  {kelas.habits.map((habit, idx) => {
                    const maxRating = 4;
                    const rating = habit.avgRating ?? 0;
                    const percentage = habit.avgRating !== null ? Math.round((rating / maxRating) * 100) : 0;
                    const barColor = HABIT_COLORS[idx % HABIT_COLORS.length];
                    const ratingLabel = habit.avgRating !== null ? `${rating}/4` : '-';
                    return (
                      <div key={habit.habitId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">{habit.habitName}</span>
                          <span className={`text-xs font-semibold ${rating >= 2.5 ? 'text-emerald-600' : rating >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {ratingLabel}
                            <span className="ml-1 font-normal text-muted-foreground">({habit.reportCount})</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
