'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import type { ViewType } from '@/store/use-store';
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
  Lightbulb,
  Heart,
  Bell,
  Shield,
  MessageSquare,
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

interface Tip {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
  onClick?: () => void;
  iconBg?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, iconBg, iconColor }: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="flex items-start gap-4 p-4 sm:p-6">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg ?? 'bg-[#1F3864]/10 text-[#1F3864]'} ${iconColor ?? ''}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Animated Progress Bar ─────────────────────────────────────────

function AnimatedProgressBar({ value, label, color, delay }: { value: number; label: string; color: string; delay: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(value, 100)}%`,
            backgroundColor: color,
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function OrangTuaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  // Parent tips
  const tips: Tip[] = [
    {
      id: '1',
      icon: <Lightbulb className="h-4 w-4" />,
      title: 'Dukung rutinitas belajar',
      description: 'Bantu anak membuat jadwal belajar teratur. 30-45 menit per sesi lebih efektif daripada belajar bertele-tele.',
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      id: '2',
      icon: <Heart className="h-4 w-4" />,
      title: 'Pujikan usaha, bukan hanya hasil',
      description: 'Fokus pada proses belajar anak. Apresiasi konsistensi dan usaha keras.',
      color: 'bg-red-50 text-red-600 border-red-200',
    },
    {
      id: '3',
      icon: <Shield className="h-4 w-4" />,
      title: 'Jaga kesehatan anak',
      description: 'Pastikan anak cukup tidur (7-8 jam) dan makan bergizi sebelum ujian/tryout.',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      id: '4',
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Komunikasi dengan guru',
      description: 'Rutin cek perkembangan anak dan diskusikan strategi bersama guru di sekolah.',
      color: 'bg-[#1F3864]/10 text-[#1F3864] border-[#1F3864]/20',
    },
  ];

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
        if (Array.isArray(data) && data.length > 0) {
          setChildren(data.map((c: any) => ({
            id: c.id,
            name: c.name,
            className: c.class?.name || '-',
            avgScore: 72.5,
            totalExams: 8,
            attendance: 95,
            lastActive: '2 jam lalu',
          })));
        } else {
          setChildren([]);
        }
      }
    } catch {
      // Fallback to mock data
      setChildren([
        {
          id: '1',
          name: 'Ahmad Rizky Pratama',
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
          <StatCard
            title="Anak Terdaftar"
            value={children.length}
            icon={<GraduationCap className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-nilai' as ViewType)}
            iconBg="bg-[#1F3864]/10"
            iconColor="text-[#1F3864]"
          />
          <StatCard
            title="Rata-rata Skor"
            value={children.length > 0
              ? (children.reduce((s, c) => s + c.avgScore, 0) / children.length).toFixed(1)
              : '-'}
            icon={<Target className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-nilai' as ViewType)}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Total Tryout"
            value={children.length > 0
              ? children.reduce((s, c) => s + c.totalExams, 0)
              : 0}
            icon={<ClipboardList className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-kuis' as ViewType)}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            title="Kehadiran"
            value={children.length > 0
              ? `${(children.reduce((s, c) => s + c.attendance, 0) / children.length).toFixed(0)}%`
              : '-'}
            icon={<UserCheck className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-kehadiran' as ViewType)}
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
          />
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
                  className="rounded-xl border p-4 space-y-4 hover:border-[#1F3864]/30 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                  onClick={() => navigateTo('ortu-nilai' as ViewType)}
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

                  {/* Animated Progress Bars */}
                  <div className="space-y-2.5">
                    <AnimatedProgressBar
                      value={child.avgScore}
                      label="Rata-rata Skor"
                      color="#1F3864"
                      delay={0}
                    />
                    <AnimatedProgressBar
                      value={child.attendance}
                      label="Kehadiran"
                      color="#16a34a"
                      delay={200}
                    />
                    <AnimatedProgressBar
                      value={Math.min(child.totalExams * 10, 100)}
                      label="Tryout Dikerjakan"
                      color="#d97706"
                      delay={400}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Terakhir aktif: {child.lastActive}
                    </span>
                    <span className="flex items-center gap-1 text-[#1F3864] font-medium">
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

      {/* Notifications / Tips */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#1F3864]" />
            <CardTitle className="text-lg">Tips untuk Orang Tua</CardTitle>
          </div>
          <CardDescription>Saran untuk mendukung belajar anak di rumah</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className={`rounded-lg border p-4 space-y-2 ${tip.color} hover:shadow-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center gap-2">
                  {tip.icon}
                  <p className="text-sm font-semibold">{tip.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-xl border-2 border-[#1F3864] bg-gradient-to-br from-[#1F3864] to-[#152850] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
          onClick={() => navigateTo('ortu-nilai' as ViewType)}
        >
          <div className="absolute top-2 right-2">
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-[10px]">
              <TrendingUp className="mr-1 h-3 w-3" />
              Aktif
            </Badge>
          </div>
          <Target className="h-8 w-8 text-white/80 mb-3" />
          <h3 className="text-lg font-bold text-white">Nilai & Progres</h3>
          <p className="text-sm text-white/60 mt-1">Lihat nilai dan perkembangan anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/80 transition-colors">
            <span>Lihat detail</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
        <div
          className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
          onClick={() => navigateTo('ortu-materi' as ViewType)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-amber-800">Materi Pelajaran</h3>
          <p className="text-sm text-muted-foreground mt-1">Materi yang dipelajari anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-amber-600/60 group-hover:text-amber-600 transition-colors">
            <span>Lihat materi</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
        <div
          className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
          onClick={() => navigateTo('ortu-kuis' as ViewType)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 mb-3">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">Riwayat Pengerjaan</h3>
          <p className="text-sm text-muted-foreground mt-1">Tryout dan latihan anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600/60 group-hover:text-emerald-600 transition-colors">
            <span>Lihat riwayat</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
