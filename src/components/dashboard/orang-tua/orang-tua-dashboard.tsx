'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { apiClient } from '@/lib/api-client';
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
  ChevronRight,
  Star,
  Users,
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
  gradientFrom: string;
  gradientTo: string;
  iconBg?: string;
}

// ─── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  isLoading?: boolean;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}

function StatCard({ title, value, icon, subtext, isLoading, onClick, gradientFrom, gradientTo }: StatCardProps) {
  return (
    <Card
      className={`rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            {isLoading ? (
              <>
                <Skeleton className="h-3.5 w-24 mb-2 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
                {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
              </>
            )}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${gradientFrom && gradientTo ? `${gradientFrom} ${gradientTo}` : 'from-[#1F3864] to-[#2d5289]'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Animated Progress Bar ─────────────────────────────────────────

function AnimatedProgressBar({ value, label, color, delay }: { value: number; label: string; color: string; delay: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
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

// ─── Quick Action Card ──────────────────────────────────────────────

function QuickActionCard({ icon, label, description, onClick, color, badge }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
  badge?: string;
}) {
  return (
    <button
      className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] group text-center"
      onClick={onClick}
    >
      <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}>
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white font-bold shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function OrangTuaDashboard() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);

  // Current date helper
  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Parent tips with enhanced styling
  const tips: Tip[] = [
    {
      id: '1',
      icon: <Lightbulb className="h-4 w-4" />,
      title: 'Dukung rutinitas belajar',
      description: 'Bantu anak membuat jadwal belajar teratur. 30-45 menit per sesi lebih efektif daripada belajar bertele-tele.',
      gradientFrom: 'from-amber-400',
      gradientTo: 'to-amber-500',
    },
    {
      id: '2',
      icon: <Heart className="h-4 w-4" />,
      title: 'Pujikan usaha, bukan hanya hasil',
      description: 'Fokus pada proses belajar anak. Apresiasi konsistensi dan usaha keras.',
      gradientFrom: 'from-red-400',
      gradientTo: 'to-red-500',
    },
    {
      id: '3',
      icon: <Shield className="h-4 w-4" />,
      title: 'Jaga kesehatan anak',
      description: 'Pastikan anak cukup tidur (7-8 jam) dan makan bergizi sebelum ujian/tryout.',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600',
    },
    {
      id: '4',
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Komunikasi dengan guru',
      description: 'Rutin cek perkembangan anak dan diskusikan strategi bersama guru di sekolah.',
      gradientFrom: 'from-[#1F3864]',
      gradientTo: 'to-[#2d5289]',
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
      const res = await apiClient(`/api/users?parentId=${user.id}`);
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F3864]">
              Selamat Datang, {user?.name ?? 'Orang Tua'} ✨
            </h1>
            <Badge className="rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] text-white border-0 shadow-sm text-xs px-3 py-0.5">
              <Users className="mr-1 h-3 w-3" />
              Orang Tua
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <p className="text-sm text-muted-foreground">
            Pantau perkembangan belajar anak Anda. Dukung mereka meraih prestasi terbaik! 🌟
          </p>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-3.5 w-24 mb-2 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
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
            gradientFrom="from-[#1F3864]"
            gradientTo="to-[#2d5289]"
          />
          <StatCard
            title="Rata-rata Skor"
            value={children.length > 0
              ? (children.reduce((s, c) => s + c.avgScore, 0) / children.length).toFixed(1)
              : '-'}
            icon={<Target className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-nilai' as ViewType)}
            gradientFrom="from-amber-400"
            gradientTo="to-amber-500"
          />
          <StatCard
            title="Total Tryout"
            value={children.length > 0
              ? children.reduce((s, c) => s + c.totalExams, 0)
              : 0}
            icon={<ClipboardList className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-kuis' as ViewType)}
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
          />
          <StatCard
            title="Kehadiran"
            value={children.length > 0
              ? `${(children.reduce((s, c) => s + c.attendance, 0) / children.length).toFixed(0)}%`
              : '-'}
            icon={<UserCheck className="h-5 w-5" />}
            onClick={() => navigateTo('ortu-kehadiran' as ViewType)}
            gradientFrom="from-sky-500"
            gradientTo="to-sky-600"
          />
        </div>
      )}

      {/* ── Children Cards ── */}
      <Card className="rounded-xl shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#1F3864]" />
                Perkembangan Anak
              </CardTitle>
              <CardDescription className="mt-1">Status belajar anak-anak Anda</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-sm gap-1.5 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigateTo('ortu-nilai' as ViewType)}
            >
              Lihat Detail
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : children.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="rounded-xl border border-border/60 bg-white p-5 space-y-4 hover:border-[#1F3864]/30 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                  onClick={() => navigateTo('ortu-nilai' as ViewType)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
                        <span className="text-sm font-bold">{child.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{child.name}</h3>
                        {child.className && (
                          <p className="text-xs text-muted-foreground">{child.className}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 border-0 text-[10px] px-2.5 py-0.5 font-semibold">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Aktif
                    </Badge>
                  </div>

                  {/* Animated Progress Bars */}
                  <div className="space-y-3">
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

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Terakhir aktif: {child.lastActive}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#1F3864] font-semibold hover:text-[#2d5289] transition-colors">
                      Lihat Detail
                      <ArrowRight className="h-3 w-3" />
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

      {/* ── Tips Card ── */}
      <Card className="rounded-xl shadow-sm border-border/60 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1F3864]/5 via-amber-50/50 to-[#1F3864]/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-lg">Tips untuk Orang Tua</CardTitle>
                <CardDescription className="text-xs">Saran untuk mendukung belajar anak di rumah</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="rounded-xl border border-border/40 bg-white p-4 space-y-2.5 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tip.gradientFrom} ${tip.gradientTo} text-white shadow-sm`}>
                      {tip.icon}
                    </div>
                    <p className="text-sm font-semibold">{tip.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-[42px]">{tip.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Quick Actions ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Primary Action */}
        <button
          className="relative overflow-hidden rounded-xl border-2 border-[#1F3864] bg-gradient-to-br from-[#1F3864] to-[#152850] p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
          onClick={() => navigateTo('ortu-nilai' as ViewType)}
        >
          <div className="absolute top-3 right-3">
            <Badge className="rounded-full bg-white/20 text-white border-white/30 text-[10px] px-2.5 py-0.5">
              <TrendingUp className="mr-1 h-3 w-3" />
              Aktif
            </Badge>
          </div>
          <Target className="h-8 w-8 text-white/80 mb-3" />
          <h3 className="text-lg font-bold text-white">Nilai & Progres</h3>
          <p className="text-sm text-white/60 mt-1">Lihat nilai dan perkembangan anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/80 transition-colors">
            <span>Lihat detail</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          className="rounded-xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
          onClick={() => navigateTo('ortu-materi' as ViewType)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-amber-800">Materi Pelajaran</h3>
          <p className="text-sm text-muted-foreground mt-1">Materi yang dipelajari anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-amber-600/60 group-hover:text-amber-600 transition-colors">
            <span>Lihat materi</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          className="rounded-xl border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 active:scale-[0.98] group text-left"
          onClick={() => navigateTo('ortu-kuis' as ViewType)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm mb-3">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">Riwayat Pengerjaan</h3>
          <p className="text-sm text-muted-foreground mt-1">Tryout dan latihan anak</p>
          <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600/60 group-hover:text-emerald-600 transition-colors">
            <span>Lihat riwayat</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* ── Encouragement Banner ── */}
      <div className="rounded-xl bg-gradient-to-r from-[#1F3864]/5 to-amber-50/50 border border-[#1F3864]/10 p-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
          <Star className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1F3864]">Dukungan Anda Sangat Berarti 🏠</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Peran orang tua sebagai pendukung belajar sangat penting. Dengan memantau dan memberikan dorongan positif, Anda membantu anak mencapai potensi terbaiknya.
          </p>
        </div>
      </div>
    </div>
  );
}
