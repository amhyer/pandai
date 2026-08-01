'use client';

import React, { useEffect, useState } from 'react';
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
import {
  Target,
  ClipboardList,
  BookOpen,
  UserCheck,
  TrendingUp,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface ChildData {
  id: string;
  name: string;
  className?: string;
  avgScore: number;
  totalExams: number;
  attendance: number;
  lastActive: string;
}

// ─── Main Component ─────────────────────────────────────────────────

export function OrangTuaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    if (!user?.id) return;
    try {
      setLoading(true);
      // Fetch children data from API
      const res = await fetch(`/api/users?parentId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setChildren(Array.isArray(data) ? data : []);
      }
    } catch {
      // Fallback to mock data
      setChildren([
        {
          id: '1',
          name: user?.name ? `${user.name}'s Child` : 'Anak',
          className: 'XII IPA 1',
          avgScore: 72.5,
          totalExams: 8,
          attendance: 95,
          lastActive: '2 jam lalu',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {user?.name ?? 'Orang Tua'} 👋
        </h1>
        <p className="text-muted-foreground">
          Pantau perkembangan belajar anak Anda di sini.
        </p>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start gap-4 p-4 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Anak Terdaftar</p>
                <p className="text-2xl font-bold">{children.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-4 p-4 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Target className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rata-rata Skor</p>
                <p className="text-2xl font-bold">
                  {children.length > 0
                    ? (children.reduce((s, c) => s + c.avgScore, 0) / children.length).toFixed(1)
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-4 p-4 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Tryout</p>
                <p className="text-2xl font-bold">
                  {children.length > 0
                    ? children.reduce((s, c) => s + c.totalExams, 0)
                    : 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-4 p-4 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Kehadiran</p>
                <p className="text-2xl font-bold">
                  {children.length > 0
                    ? `${(children.reduce((s, c) => s + c.attendance, 0) / children.length).toFixed(0)}%`
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Children Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perkembangan Anak</CardTitle>
          <CardDescription>Status belajar anak-anak Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : children.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="rounded-xl border p-4 space-y-3 hover:border-[#1F3864]/30 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigateTo('ortu-nilai')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{child.name}</h3>
                      {child.className && (
                        <p className="text-sm text-muted-foreground">{child.className}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Aktif
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold text-[#1F3864]">{child.avgScore}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Rata-rata</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold text-amber-600">{child.totalExams}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Tryout</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold text-emerald-600">{child.attendance}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Hadir</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Terakhir aktif: {child.lastActive}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      Lihat Detail <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada data anak terdaftar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data akan muncul setelah admin sekolah mendaftarkan siswa
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          className="h-auto flex-col gap-2 py-6 bg-[#1F3864] hover:bg-[#152850]"
          onClick={() => navigateTo('ortu-nilai')}
        >
          <Target className="h-6 w-6" />
          <span className="font-semibold">Nilai & Progres</span>
          <span className="text-xs text-white/70">Lihat nilai dan perkembangan anak</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => navigateTo('ortu-materi')}
        >
          <BookOpen className="h-6 w-6 text-[#1F3864]" />
          <span className="font-semibold">Materi Pelajaran</span>
          <span className="text-xs text-muted-foreground">Materi yang dipelajari anak</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-6"
          onClick={() => navigateTo('ortu-kuis')}
        >
          <ClipboardList className="h-6 w-6 text-amber-600" />
          <span className="font-semibold">Riwayat Pengerjaan</span>
          <span className="text-xs text-muted-foreground">Tryout dan latihan anak</span>
        </Button>
      </div>
    </div>
  );
}
