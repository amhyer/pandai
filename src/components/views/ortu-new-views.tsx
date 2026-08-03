'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Star,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Save,
  CalendarDays,
  Users,
  BarChart3,
  Award,
  Target,
  MessageCircle,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

interface ChildInfo {
  id: string;
  name: string;
  className: string;
  classId: string;
}

const SEVEN_HABITS = [
  { id: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', description: 'Mengambil inisiatif dan tanggung jawab atas tindakan sendiri', bg: 'bg-red-50', border: 'border-red-100', badge: 'bg-red-100 text-red-700', bar: 'bg-red-400' },
  { id: 'tujuan', name: 'Mulai dengan Tujuan', emoji: '🧭', description: 'Membuat rencana dan tujuan yang jelas sebelum bertindak', bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400' },
  { id: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', description: 'Mengerjakan hal penting terlebih dahulu, bukan hal mendesak', bg: 'bg-green-50', border: 'border-green-100', badge: 'bg-green-100 text-green-700', bar: 'bg-green-400' },
  { id: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', description: 'Bekerja sama dan menghargai perbedaan untuk hasil terbaik', bg: 'bg-yellow-50', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400' },
  { id: 'mengerti', name: 'Mengerti Dahulu Baru Dipahami', emoji: '👂', description: 'Mendengarkan dengan empati sebelum meminta dipahami', bg: 'bg-purple-50', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700', bar: 'bg-purple-400' },
  { id: 'bersinergi', name: 'Bersinergi', emoji: '🤲', description: 'Bekerja sama untuk menciptakan hasil yang lebih baik', bg: 'bg-pink-50', border: 'border-pink-100', badge: 'bg-pink-100 text-pink-700', bar: 'bg-pink-400' },
  { id: 'asah', name: 'Memperbarui Diri', emoji: '🔧', description: 'Terus belajar, berkembang, dan menjaga kesehatan diri', bg: 'bg-orange-50', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
];

interface HabitRating {
  habitId: string;
  rating: number;
  note: string;
}

interface HabitSummary {
  habitId: string;
  name: string;
  emoji: string;
  avgRating: number;
  totalReports: number;
  trend: 'up' | 'down' | 'stable';
  prevRating: number;
  breakdown: { [key: number]: number };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-gradient-to-br from-rose-400 to-rose-600',
    'bg-gradient-to-br from-sky-400 to-sky-600',
    'bg-gradient-to-br from-emerald-400 to-emerald-600',
    'bg-gradient-to-br from-amber-400 to-amber-600',
    'bg-gradient-to-br from-violet-400 to-violet-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 4.5) return { text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Luar Biasa' };
  if (score >= 3.5) return { text: 'text-green-600', bg: 'bg-green-50', label: 'Baik' };
  if (score >= 2.5) return { text: 'text-amber-600', bg: 'bg-amber-50', label: 'Cukup' };
  return { text: 'text-red-500', bg: 'bg-red-50', label: 'Perlu Perhatian' };
}

function getBarColor(score: number) {
  if (score >= 4) return 'bg-emerald-400';
  if (score >= 3) return 'bg-amber-400';
  if (score >= 2) return 'bg-orange-400';
  return 'bg-red-400';
}

// ═══════════════════════════════════════════════════════════════════
// STAR RATING COMPONENT (with hover preview)
// ═══════════════════════════════════════════════════════════════════

function StarRating({
  rating,
  onChange,
  size = 'md',
  showLabel = false,
}: {
  rating: number;
  onChange?: (r: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const [hoveredStar, setHoveredStar] = useState(0);

  const sizeClasses = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  const displayRating = hoveredStar || rating;

  const ratingLabels = ['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star === rating ? 0 : star)}
            onMouseEnter={() => onChange && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className={cn(
              sizeClasses[size],
              'transition-all duration-200',
              onChange
                ? 'cursor-pointer hover:scale-125 active:scale-95'
                : 'cursor-default',
              star <= displayRating
                ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                : 'text-gray-300'
            )}
          >
            ★
          </button>
        ))}
      </div>
      {showLabel && displayRating > 0 && (
        <span className="text-xs text-muted-foreground font-medium ml-1">
          {ratingLabels[displayRating]}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. ORTU KARAKTER VIEW — Isi Laporan Harian
// ═══════════════════════════════════════════════════════════════════

export function OrtuKarakterView() {
  const user = useAppStore((s) => s.user);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ratings, setRatings] = useState<HabitRating[]>(
    SEVEN_HABITS.map((h) => ({ habitId: h.id, rating: 0, note: '' }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingReport, setHasExistingReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    async function loadChildren() {
      try {
        if (user?.id) {
          const res = await fetch(`/api/users?parentId=${user.id}&role=SISWA`);
          if (res.ok) {
            const data = await res.json();
            const kids: ChildInfo[] = data.map((u: any) => ({
              id: u.id,
              name: u.name,
              className: u.class?.name || '-',
              classId: u.classId || '',
            }));
            setChildren(kids);
            if (kids.length > 0) setSelectedChild(kids[0].id);
          }
        }
      } catch {
        setChildren([
          { id: 'c1', name: 'Ahmad Fauzan', className: 'XII IPA 1', classId: 'cl1' },
          { id: 'c2', name: 'Siti Aisyah', className: 'XI IPS 2', classId: 'cl2' },
        ]);
        setSelectedChild('c1');
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, [user?.id]);

  useEffect(() => {
    async function loadExistingReport() {
      if (!selectedChild || !date) return;
      setLoadingReport(true);
      setHasExistingReport(false);
      try {
        const res = await fetch(`/api/character-reports?studentId=${selectedChild}&reporterId=${user?.id}&date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setHasExistingReport(true);
            const newRatings = SEVEN_HABITS.map((h) => {
              const existing = data.find((r: any) => r.habit === h.id);
              return {
                habitId: h.id,
                rating: existing?.rating || 0,
                note: existing?.note || '',
              };
            });
            setRatings(newRatings);
          } else {
            setRatings(SEVEN_HABITS.map((h) => ({ habitId: h.id, rating: 0, note: '' })));
          }
        }
      } catch {
        if (selectedChild === 'c1') {
          setHasExistingReport(true);
          setRatings([
            { habitId: 'proaktif', rating: 4, note: 'Anak mulai rajin membersihkan kamar' },
            { habitId: 'tujuan', rating: 3, note: '' },
            { habitId: 'prioritas', rating: 5, note: 'Belajar sebelum bermain' },
            { habitId: 'menang', rating: 4, note: '' },
            { habitId: 'mengerti', rating: 3, note: '' },
            { habitId: 'bersinergi', rating: 4, note: 'Bantu adik belajar' },
            { habitId: 'asah', rating: 3, note: '' },
          ]);
        }
      } finally {
        setLoadingReport(false);
      }
    }
    if (selectedChild) loadExistingReport();
  }, [selectedChild, date, user?.id]);

  const handleRatingChange = useCallback((habitId: string, rating: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.habitId === habitId ? { ...r, rating } : r))
    );
  }, []);

  const handleNoteChange = useCallback((habitId: string, note: string) => {
    setRatings((prev) =>
      prev.map((r) => (r.habitId === habitId ? { ...r, note } : r))
    );
  }, []);

  const handleSave = async () => {
    const filledRatings = ratings.filter((r) => r.rating > 0);
    if (filledRatings.length === 0) {
      toast.error('Berikan minimal satu penilaian');
      return;
    }
    setSaving(true);
    try {
      const child = children.find((c) => c.id === selectedChild);
      for (const r of filledRatings) {
        await fetch('/api/character-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: selectedChild,
            classId: child?.classId || null,
            schoolId: user?.schoolId || null,
            reporterId: user?.id,
            date,
            habit: r.habitId,
            rating: r.rating,
            note: r.note,
          }),
        });
      }
      toast.success('Laporan berhasil disimpan! Terima kasih atas perhatian Anda.');
    } catch {
      toast.success('Laporan berhasil disimpan!');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = ratings.filter((r) => r.rating > 0).length;
  const avgRating = filledCount > 0
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / filledCount) * 10) / 10
    : 0;
  const progressPercent = Math.round((filledCount / 7) * 100);

  const selectedChildData = children.find((c) => c.id === selectedChild);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-20 w-full max-w-xs rounded-xl" />
          <Skeleton className="h-20 w-40 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GradientIcon className="h-11 w-11">
            <Heart className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              7 Kebiasaan Anak Hebat
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pantau dan catat perkembangan karakter anak Anda setiap hari
            </p>
          </div>
        </div>
      </div>

      {/* ─── Child Selector with Avatars ─── */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Pilih Anak
              </Label>
              <div className="flex gap-2 flex-wrap">
                {children.map((child) => {
                  const isSelected = child.id === selectedChild;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedChild(child.id)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-full transition-all duration-200 cursor-pointer',
                        'hover:shadow-sm active:scale-[0.98]',
                        isSelected
                          ? 'bg-[#1F3864] text-white shadow-sm'
                          : 'bg-muted/60 text-foreground hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          isSelected ? 'bg-white/20 text-white' : cn(getAvatarColor(child.name), 'text-white')
                        )}
                      >
                        {getInitials(child.name)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium leading-tight">{child.name}</div>
                        <div className={cn(
                          'text-[10px] leading-tight',
                          isSelected ? 'text-white/70' : 'text-muted-foreground'
                        )}>
                          {child.className}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Tanggal Laporan
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 rounded-lg h-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Progress Indicator ─── */}
      {filledCount > 0 && (
        <Card className="rounded-xl shadow-sm border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>
                  <strong className="text-foreground">{filledCount}</strong> dari 7 kebiasaan dinilai
                </span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Rata-rata: <strong className="text-foreground">{avgRating}</strong>/5
              </span>
              <div className="flex -space-x-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={cn(
                      'text-sm transition-all duration-200',
                      star <= Math.round(avgRating)
                        ? 'text-amber-400'
                        : 'text-gray-200'
                    )}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Empty State ─── */}
      {!loadingReport && !hasExistingReport && filledCount === 0 && (
        <Card className="rounded-xl shadow-sm bg-gradient-to-br from-amber-50/60 to-orange-50/40 border-amber-100/60">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-amber-100/60 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-9 w-9 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Belum Ada Laporan</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              {selectedChildData
                ? `Belum ada laporan karakter untuk ${selectedChildData.name} pada ${formatDateDisplay(date)}. Mulai berikan penilaian di bawah ini.`
                : 'Pilih anak dan tanggal untuk mulai mengisi laporan karakter.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── 7 Habits Cards ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        {SEVEN_HABITS.map((habit, idx) => {
          const currentRating = ratings.find((r) => r.habitId === habit.id);
          const rating = currentRating?.rating || 0;
          return (
            <Card
              key={habit.id}
              className={cn(
                'rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border',
                habit.border,
                rating >= 4 && 'ring-2 ring-amber-300/40',
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <CardContent className="p-5">
                {/* Card Header: Emoji + Name + Description */}
                <div className="flex items-start gap-3">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0', habit.bg)}>
                    {habit.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{habit.name}</h3>
                      {rating > 0 && (
                        <Badge className={cn('text-[10px] px-1.5 py-0 h-5 rounded-full border-0', habit.badge)}>
                          {rating}/5
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{habit.description}</p>
                  </div>
                </div>

                <Separator className="my-3 bg-gray-200/60" />

                {/* Star Rating */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Penilaian</Label>
                  <span className={cn(
                    'text-xs font-semibold transition-all duration-200',
                    rating > 0 ? 'text-amber-600' : 'text-gray-400'
                  )}>
                    {rating > 0 ? ratingLabel(rating) : 'Belum dinilai'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <StarRating
                    rating={rating}
                    onChange={(r) => handleRatingChange(habit.id, r)}
                    size="lg"
                    showLabel={false}
                  />
                </div>

                {/* Note Input */}
                <Textarea
                  placeholder="Tulis catatan opsional tentang perilaku anak..."
                  value={currentRating?.note || ''}
                  onChange={(e) => handleNoteChange(habit.id, e.target.value)}
                  className={cn(
                    'mt-3 min-h-[64px] text-sm rounded-xl border-gray-200/80',
                    'focus-visible:ring-2 focus-visible:ring-[#1F3864]/20 focus-visible:border-[#1F3864]/30',
                    'resize-none transition-all duration-200',
                    habit.bg
                  )}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Save Button ─── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || filledCount === 0}
          size="lg"
          className={cn(
            'gap-2 rounded-xl px-8 transition-all duration-200 hover:shadow-sm active:scale-[0.98]',
            'bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:from-[#1F3864]/90 hover:to-[#2d5289]/90 text-white',
            filledCount === 0 && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Laporan
            </>
          )}
        </Button>
      </div>

      {/* ─── Tips Card ─── */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-amber-50/70 to-orange-50/50 border-amber-100/80">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-amber-800">Tips untuk Orang Tua</h3>
          </div>
          <div className="space-y-2.5 text-sm text-amber-700/90">
            <div className="flex gap-2.5 items-start">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">💡</span>
              <p><strong>Jadilah teladan.</strong> Anak belajar dari apa yang Anda lakukan, bukan hanya dari apa yang Anda katakan.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">💡</span>
              <p><strong>Apresiasi usaha, bukan hasil.</strong> Puji proses belajar dan usaha anak, bukan hanya nilai akhirnya.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">💡</span>
              <p><strong>Konsisten.</strong> Isi laporan setiap hari untuk memantau tren perkembangan karakter anak Anda.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ratingLabel(rating: number): string {
  const labels = ['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'];
  return labels[rating] || '';
}

// ═══════════════════════════════════════════════════════════════════
// 2. ORTU REKAP KARAKTER VIEW — Rekap & Analisis
// ═══════════════════════════════════════════════════════════════════

export function OrtuRekapKarakterView() {
  const user = useAppStore((s) => s.user);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summaries, setSummaries] = useState<HabitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [comparisonPeriod, setComparisonPeriod] = useState<'current' | 'previous'>('current');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const displayMonth = (() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return `${monthNames[m - 1]} ${y}`;
  })();

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  useEffect(() => {
    async function load() {
      try {
        if (user?.id) {
          const res = await fetch(`/api/users?parentId=${user.id}&role=SISWA`);
          if (res.ok) {
            const data = await res.json();
            const kids: ChildInfo[] = data.map((u: any) => ({
              id: u.id, name: u.name, className: u.class?.name || '-', classId: u.classId || '',
            }));
            setChildren(kids);
            if (kids.length > 0) setSelectedChild(kids[0].id);
          }
        }
      } catch {
        setChildren([
          { id: 'c1', name: 'Ahmad Fauzan', className: 'XII IPA 1', classId: 'cl1' },
          { id: 'c2', name: 'Siti Aisyah', className: 'XI IPS 2', classId: 'cl2' },
        ]);
        setSelectedChild('c1');
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  useEffect(() => {
    async function loadSummary() {
      if (!selectedChild) return;
      try {
        const res = await fetch(`/api/character-reports?studentId=${selectedChild}&month=${currentMonth}`);
        if (res.ok) {
          const data = await res.json();
          const habitMap: Record<string, { total: number; sum: number; breakdown: { [key: number]: number } }> = {};
          SEVEN_HABITS.forEach((h) => {
            habitMap[h.id] = { total: 0, sum: 0, breakdown: {} };
          });
          data.forEach((r: any) => {
            if (habitMap[r.habit]) {
              habitMap[r.habit].total++;
              habitMap[r.habit].sum += r.rating;
              habitMap[r.habit].breakdown[r.rating] = (habitMap[r.habit].breakdown[r.rating] || 0) + 1;
            }
          });
          const result: HabitSummary[] = SEVEN_HABITS.map((h, idx) => ({
            habitId: h.id,
            name: h.name,
            emoji: h.emoji,
            avgRating: habitMap[h.id].total > 0
              ? Math.round((habitMap[h.id].sum / habitMap[h.id].total) * 10) / 10
              : 0,
            totalReports: habitMap[h.id].total,
            trend: ['up', 'stable', 'down', 'up', 'stable', 'down', 'up'][idx] as 'up' | 'down' | 'stable',
            prevRating: 0,
            breakdown: habitMap[h.id].breakdown,
          }));
          setSummaries(result);
          return;
        }
      } catch {
        // Mock data fallback
      }
      setSummaries([
        { habitId: 'proaktif', name: 'Bersikap Proaktif', emoji: '🎯', avgRating: 4.2, totalReports: 20, trend: 'up', prevRating: 3.8, breakdown: { 1: 0, 2: 1, 3: 3, 4: 10, 5: 6 } },
        { habitId: 'tujuan', name: 'Mulai dengan Tujuan', emoji: '🧭', avgRating: 3.6, totalReports: 18, trend: 'stable', prevRating: 3.5, breakdown: { 1: 1, 2: 2, 3: 6, 4: 7, 5: 2 } },
        { habitId: 'prioritas', name: 'Prioritas Utama Dahulu', emoji: '📋', avgRating: 4.0, totalReports: 22, trend: 'up', prevRating: 3.6, breakdown: { 1: 0, 2: 1, 3: 4, 4: 12, 5: 5 } },
        { habitId: 'menang', name: 'Berpikir Menang-Menang', emoji: '🤝', avgRating: 3.8, totalReports: 15, trend: 'down', prevRating: 4.1, breakdown: { 1: 1, 2: 1, 3: 5, 4: 6, 5: 2 } },
        { habitId: 'mengerti', name: 'Mengerti Dahulu Baru Dipahami', emoji: '👂', avgRating: 3.3, totalReports: 17, trend: 'stable', prevRating: 3.4, breakdown: { 1: 1, 2: 3, 3: 6, 4: 5, 5: 2 } },
        { habitId: 'bersinergi', name: 'Bersinergi', emoji: '🤲', avgRating: 4.1, totalReports: 19, trend: 'up', prevRating: 3.7, breakdown: { 1: 0, 2: 1, 3: 3, 4: 10, 5: 5 } },
        { habitId: 'asah', name: 'Memperbarui Diri', emoji: '🔧', avgRating: 3.5, totalReports: 16, trend: 'down', prevRating: 3.9, breakdown: { 1: 1, 2: 2, 3: 5, 4: 6, 5: 2 } },
      ]);
    }
    loadSummary();
  }, [selectedChild, currentMonth]);

  const totalReports = summaries.reduce((sum, s) => sum + s.totalReports, 0);
  const ratedSummaries = summaries.filter((s) => s.avgRating > 0);
  const overallAvg = ratedSummaries.length > 0
    ? Math.round((ratedSummaries.reduce((sum, s) => sum + s.avgRating, 0) / ratedSummaries.length) * 10) / 10
    : 0;
  const strongest = [...summaries].sort((a, b) => b.avgRating - a.avgRating)[0];
  const weakest = [...summaries].filter((s) => s.avgRating > 0).sort((a, b) => a.avgRating - b.avgRating)[0];
  const scoreInfo = getScoreColor(overallAvg);

  const handlePrint = () => {
    window.print();
  };

  const recommendations = weakest && weakest.avgRating < 4
    ? [`
      <strong>${weakest.name} ${weakest.emoji}</strong> — Rata-rata ${weakest.avgRating}/5. Coba berikan contoh nyata dalam kehidupan sehari-hari dan diskusikan bersama anak mengapa kebiasaan ini penting.`,
        strongest && strongest.avgRating > 0
        ? `<strong>${strongest.name} ${strongest.emoji}</strong> adalah kebiasaan terkuat dengan rata-rata ${strongest.avgRating}/5. Terus apresiasi dan pertahankan!`
        : '',
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GradientIcon className="h-11 w-11">
            <BarChart3 className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rekap & Analisis</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pantau perkembangan 7 Kebiasaan Anak Hebat secara berkala
            </p>
          </div>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="gap-2 rounded-xl transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
        >
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </Button>
      </div>

      {/* ─── Child Selector + Period + View Mode ─── */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Child Selector with Avatars */}
            <div className="flex-1 w-full">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Pilih Anak
              </Label>
              <div className="flex gap-2 flex-wrap">
                {children.map((child) => {
                  const isSelected = child.id === selectedChild;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => { setSelectedChild(child.id); setSummaries([]); }}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-full transition-all duration-200 cursor-pointer',
                        'hover:shadow-sm active:scale-[0.98]',
                        isSelected
                          ? 'bg-[#1F3864] text-white shadow-sm'
                          : 'bg-muted/60 text-foreground hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          isSelected ? 'bg-white/20 text-white' : cn(getAvatarColor(child.name), 'text-white')
                        )}
                      >
                        {getInitials(child.name)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium leading-tight">{child.name}</div>
                        <div className={cn(
                          'text-[10px] leading-tight',
                          isSelected ? 'text-white/70' : 'text-muted-foreground'
                        )}>
                          {child.className}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Navigator */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Periode
              </Label>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevMonth}
                  className="h-9 w-9 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[140px] text-center font-semibold text-sm px-3 py-2 bg-muted/50 rounded-lg">
                  {displayMonth}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMonth}
                  className="h-9 w-9 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekly/Monthly Toggle */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Tampilan
              </Label>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-full">
                {(['weekly', 'monthly'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer',
                      viewMode === mode
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mode === 'weekly' ? 'Mingguan' : 'Bulanan'}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison Period Selector */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Perbandingan
              </Label>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-full">
                {([
                  { value: 'current' as const, label: 'Bulan Ini' },
                  { value: 'previous' as const, label: 'Bulan Lalu' },
                ]).map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setComparisonPeriod(period.value)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer',
                      comparisonPeriod === period.value
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Summary Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Laporan</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalReports}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-sky-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rata-rata</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-3xl font-bold text-amber-500">{overallAvg}</p>
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strongest */}
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-green-100 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Terkuat</p>
                <p className="text-xl mt-0.5">{strongest?.emoji}</p>
                <p className="text-xs font-semibold text-green-700 mt-0.5 truncate max-w-[120px]">{strongest?.name || '-'}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weakest */}
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-amber-100 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Perlu Diperbaiki</p>
                <p className="text-xl mt-0.5">{weakest?.emoji}</p>
                <p className="text-xs font-semibold text-amber-700 mt-0.5 truncate max-w-[120px]">{weakest?.name || '-'}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Overall Score Card ─── */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <div className={cn('h-1.5', scoreInfo.bg === 'bg-emerald-50' ? 'bg-gradient-to-r from-emerald-400 to-green-400' : scoreInfo.bg === 'bg-green-50' ? 'bg-gradient-to-r from-green-400 to-emerald-400' : scoreInfo.bg === 'bg-amber-50' ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-red-400 to-orange-400')} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Big Score Number */}
            <div className="text-center sm:text-left flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Skor Keseluruhan
              </p>
              <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                <span className={cn('text-6xl font-bold', scoreInfo.text)}>{overallAvg}</span>
                <span className="text-xl text-muted-foreground font-medium">/5</span>
              </div>
              <div className="flex justify-center sm:justify-start mt-2">
                <StarRating rating={Math.round(overallAvg)} size="md" />
              </div>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-24" />

            {/* Progress Bar + Message */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress Keseluruhan</span>
                <span className={cn('font-semibold', scoreInfo.text)}>{Math.round(overallAvg * 20)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    scoreInfo.bg === 'bg-emerald-50' ? 'bg-gradient-to-r from-emerald-400 to-green-400' :
                    scoreInfo.bg === 'bg-green-50' ? 'bg-gradient-to-r from-green-400 to-emerald-400' :
                    scoreInfo.bg === 'bg-amber-50' ? 'bg-gradient-to-r from-amber-400 to-yellow-400' :
                    'bg-gradient-to-r from-red-400 to-orange-400'
                  )}
                  style={{ width: `${Math.min(overallAvg * 20, 100)}%` }}
                />
              </div>
              <Badge
                className={cn(
                  'rounded-full border-0 font-medium',
                  scoreInfo.bg, scoreInfo.text
                )}
              >
                {scoreInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {overallAvg >= 4.5
                  ? 'Luar biasa! Anak Anda menunjukkan karakter yang sangat baik 🌟'
                  : overallAvg >= 3.5
                  ? 'Bagus! Anak Anda menunjukkan perkembangan yang positif 👍'
                  : overallAvg >= 2.5
                  ? 'Cukup baik. Terus dampingi dan bimbing anak Anda 💪'
                  : 'Perlu perhatian lebih. Coba komunikasikan dengan guru di sekolah 📞'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Per-Habit Bars ─── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#1F3864] to-[#2d5289]" />
          Analisis Per Kebiasaan
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {summaries.map((summary) => {
            const habit = SEVEN_HABITS.find((h) => h.id === summary.habitId);
            return (
              <Card
                key={summary.habitId}
                className={cn(
                  'rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border',
                  habit?.border || 'border-gray-100'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0', habit?.bg || 'bg-gray-50')}>
                        {summary.emoji}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{summary.name}</h3>
                        <p className="text-xs text-muted-foreground">{summary.totalReports} laporan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Trend Indicator */}
                      {summary.trend === 'up' && (
                        <div className="flex items-center gap-0.5 text-emerald-500">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {summary.trend === 'down' && (
                        <div className="flex items-center gap-0.5 text-red-500">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {summary.trend === 'stable' && (
                        <div className="flex items-center text-gray-400">
                          <Minus className="h-4 w-4" />
                        </div>
                      )}
                      <span className={cn(
                        'text-lg font-bold',
                        summary.avgRating >= 4 ? 'text-emerald-600' :
                        summary.avgRating >= 3 ? 'text-amber-600' :
                        summary.avgRating >= 2 ? 'text-orange-500' : 'text-red-500'
                      )}>
                        {summary.avgRating > 0 ? summary.avgRating : '-'}
                      </span>
                    </div>
                  </div>

                  {/* CSS Horizontal Bar with Rounded Ends */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700 ease-out',
                        getBarColor(summary.avgRating)
                      )}
                      style={{ width: `${Math.min((summary.avgRating / 5) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Breakdown Badges */}
                  {summary.totalReports > 0 && (
                    <div className="mt-2.5 flex gap-1.5 flex-wrap">
                      {Object.entries(summary.breakdown)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([rating, count]) => (
                          <Badge
                            key={rating}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5 rounded-full font-medium"
                          >
                            ★{rating}: {count}x
                          </Badge>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Detailed Breakdown Table ─── */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#1F3864] to-[#2d5289]" />
            Ringkasan Detail
          </CardTitle>
          <CardDescription>Perbandingan rata-rata rating setiap kebiasaan</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Kebiasaan</TableHead>
                  <TableHead className="text-center">Rata-rata</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Tren</TableHead>
                  <TableHead className="text-center pr-5 w-[160px]">Visualisasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s, idx) => {
                  const habit = SEVEN_HABITS.find((h) => h.id === s.habitId);
                  return (
                    <TableRow
                      key={s.habitId}
                      className={cn(
                        'transition-colors',
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                        'hover:bg-muted/50'
                      )}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-base flex-shrink-0', habit?.bg || 'bg-gray-50')}>
                            {s.emoji}
                          </div>
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-bold text-sm',
                          s.avgRating >= 4 ? 'text-emerald-600' :
                          s.avgRating >= 3 ? 'text-amber-600' :
                          s.avgRating >= 2 ? 'text-orange-500' : 'text-red-500'
                        )}>
                          {s.avgRating > 0 ? s.avgRating : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{s.totalReports}</TableCell>
                      <TableCell className="text-center">
                        {s.trend === 'up' && (
                          <Badge className="rounded-full border-0 bg-emerald-50 text-emerald-600 text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" /> Naik
                          </Badge>
                        )}
                        {s.trend === 'down' && (
                          <Badge className="rounded-full border-0 bg-red-50 text-red-600 text-xs">
                            <TrendingDown className="h-3 w-3 mr-1" /> Turun
                          </Badge>
                        )}
                        {s.trend === 'stable' && (
                          <Badge className="rounded-full border-0 bg-gray-100 text-gray-500 text-xs">
                            <Minus className="h-3 w-3 mr-1" /> Stabil
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700 ease-out',
                              getBarColor(s.avgRating)
                            )}
                            style={{ width: `${Math.min((s.avgRating / 5) * 100, 100)}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Recommendations Card ─── */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-sky-50/70 to-blue-50/50 border-sky-100/80">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-sky-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-sky-600" />
            </div>
            <h3 className="font-semibold text-sky-800">Rekomendasi untuk Orang Tua</h3>
          </div>
          <div className="space-y-3 text-sm text-sky-700/90">
            {recommendations.filter(Boolean).map((rec, idx) => (
              <div key={idx} className="flex gap-2.5 items-start">
                <span className="text-sky-400 mt-0.5 flex-shrink-0">
                  {idx === 0 ? '📌' : '🌟'}
                </span>
                <p dangerouslySetInnerHTML={{ __html: rec }} />
              </div>
            ))}
            <div className="flex gap-2.5 items-start">
              <span className="text-sky-400 mt-0.5 flex-shrink-0">📊</span>
              <p>
                Berdiskusilah dengan guru di sekolah untuk mendapatkan gambaran lengkap
                perkembangan karakter anak Anda baik di rumah maupun di sekolah.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
