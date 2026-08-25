'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calcAttendancePct } from '@/lib/attendance';
import { PROVIDER_ICONS } from '@/lib/external-quiz';
import {
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  Languages,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  FileText,
  ClipboardList,
  Timer,
  PlayCircle,
  Eye,
  CalendarDays,
  TrendingUp,
  XCircle,
  Sparkles,
  GraduationCap,
  BookMarked,
  BookCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  BriefcaseMedical,
  BarChart3,
  Loader2,
  FileQuestion,
  Trophy,
  Target,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  BookOpenCheck,
  ExternalLink,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
//  SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  date: string;
  isRead: boolean;
  content?: string;
}

interface SubjectData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  materials: Material[];
}

interface ExternalQuizScore {
  id: string;
  materialId: string;
  studentId: string;
  score: number;
  note?: string;
  entryMode: 'SELF_REPORTED' | 'TEACHER_ENTERED';
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  type: 'tugas' | 'kuis' | 'ujian';
  subject: string;
  dueDate: string;
  status: 'menunggu' | 'dikerjakan' | 'selesai' | 'terlambat';
  isUrgent: boolean;
  score?: number;
  externalUrl?: string;
  externalProvider?: string;
  scoreEntryMode?: 'SELF_REPORTED' | 'TEACHER_ENTERED';
  scores?: ExternalQuizScore[];
  learningObjective?: string;
}

interface AttendanceDay {
  day: number;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa' | 'weekend' | 'none';
  date?: string;
  note?: string;
}

// ═══════════════════════════════════════════════════════════════════════
//  BRAND & SUBJECT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';
const BRAND_LIGHT = '#E8EDF5';
const BRAND_DARK = '#152A4A';

// Subject colors per spec: Matematika=emerald, Fisika=sky, Kimia=amber, Biologi=green, B.Indonesia=orange, B.Inggris=purple
const SUBJECT_CONFIGS = [
  { id: 'matematika', name: 'Matematika', icon: <Calculator className="h-5 w-5" />, color: 'text-emerald-700', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-300', gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-600', ringColor: 'ring-emerald-200' },
  { id: 'fisika', name: 'Fisika', icon: <Atom className="h-5 w-5" />, color: 'text-sky-700', bgLight: 'bg-sky-50', borderColor: 'border-sky-300', gradientFrom: 'from-sky-500', gradientTo: 'to-sky-600', ringColor: 'ring-sky-200' },
  { id: 'kimia', name: 'Kimia', icon: <FlaskConical className="h-5 w-5" />, color: 'text-amber-700', bgLight: 'bg-amber-50', borderColor: 'border-amber-300', gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600', ringColor: 'ring-amber-200' },
  { id: 'biologi', name: 'Biologi', icon: <Leaf className="h-5 w-5" />, color: 'text-green-700', bgLight: 'bg-green-50', borderColor: 'border-green-300', gradientFrom: 'from-green-500', gradientTo: 'to-green-600', ringColor: 'ring-green-200' },
  { id: 'bindo', name: 'Bahasa Indonesia', icon: <BookOpen className="h-5 w-5" />, color: 'text-orange-700', bgLight: 'bg-orange-50', borderColor: 'border-orange-300', gradientFrom: 'from-orange-500', gradientTo: 'to-orange-600', ringColor: 'ring-orange-200' },
  { id: 'bing', name: 'Bahasa Inggris', icon: <Languages className="h-5 w-5" />, color: 'text-purple-700', bgLight: 'bg-purple-50', borderColor: 'border-purple-300', gradientFrom: 'from-purple-500', gradientTo: 'to-purple-600', ringColor: 'ring-purple-200' },
];

// ═══════════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════

function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm', className)}>
      {children}
    </div>
  );
}

function getSubjectConfig(name: string) {
  return SUBJECT_CONFIGS.find((s) => s.name === name) || SUBJECT_CONFIGS[0];
}

// ═══════════════════════════════════════════════════════════════════════
//  1. SISWA MATERI VIEW
// ═══════════════════════════════════════════════════════════════════════

export function SiswaMateriView() {
  const { user } = useAppStore();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('semua');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMaterials() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          schoolId: user?.schoolId || '',
          classId: user?.classId || '',
          type: 'materi',
          status: 'published',
        });
        const res = await fetch(`/api/materials?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Group materials by subject name from API data
            const grouped = new Map<string, any[]>();
            (data as any[]).forEach((m: any) => {
              const subjectName = typeof m.subject === 'string' ? m.subject : m.subject?.name || 'Lainnya';
              if (!grouped.has(subjectName)) grouped.set(subjectName, []);
              grouped.get(subjectName)!.push(m);
            });
            // Build SubjectData[] only for subjects with materials
            const mapped: SubjectData[] = Array.from(grouped.entries()).map(([subjectName, apiMaterials]) => {
              const cfg = getSubjectConfig(subjectName);
              return {
                id: cfg.id,
                name: subjectName,
                icon: cfg.icon,
                color: cfg.color,
                bgLight: cfg.bgLight,
                borderColor: cfg.borderColor,
                gradientFrom: cfg.gradientFrom,
                gradientTo: cfg.gradientTo,
                materials: apiMaterials.map((m: any) => ({
                  id: m.id,
                  title: m.title,
                  description: m.description || '',
                  subject: subjectName,
                  date: m.createdAt || m.date || '2025-01-01',
                  isRead: false,
                  content: m.content || '',
                })),
              };
            });
            setSubjects(mapped);
          } else {
            setSubjects([]);
          }
        } else {
          setSubjects([]);
        }
      } catch {
        setSubjects([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMaterials();
  }, [user?.schoolId, user?.classId]);

  const toggleSubject = useCallback((subjectId: string) => {
    setExpandedSubject((prev) => (prev === subjectId ? null : subjectId));
    if (expandedSubject === subjectId) setExpandedMaterial(null);
  }, [expandedSubject]);

  const toggleMaterial = useCallback((materialId: string) => {
    setExpandedMaterial((prev) => (prev === materialId ? null : materialId));
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects
      .map((subj) => {
        let mats = [...subj.materials];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          mats = mats.filter(
            (m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
          );
        }
        if (activeFilter === 'belum') {
          mats = mats.filter((m) => !m.isRead);
        } else if (activeFilter === 'selesai') {
          mats = mats.filter((m) => m.isRead);
        }
        return { ...subj, materials: mats };
      })
      .filter((s) => s.materials.length > 0 || activeFilter === 'semua' && !searchQuery.trim());
  }, [subjects, searchQuery, activeFilter]);

  const totalMaterials = useMemo(
    () => subjects.reduce((sum, s) => sum + s.materials.length, 0),
    [subjects]
  );
  const totalRead = useMemo(
    () => subjects.reduce((sum, s) => sum + s.materials.filter((m) => m.isRead).length, 0),
    [subjects]
  );
  const overallProgress = totalMaterials > 0 ? Math.round((totalRead / totalMaterials) * 100) : 0;

  const filterPills = [
    { key: 'semua', label: 'Semua' },
    { key: 'selesai', label: 'Sudah Dibaca' },
    { key: 'belum', label: 'Belum Dibaca' },
  ];

  const handleMarkRead = (materialId: string, subjectId: string) => {
    setSubjects((prev) =>
      prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          materials: subj.materials.map((m) =>
            m.id === materialId ? { ...m, isRead: true } : m
          ),
        };
      })
    );
    toast.success('Materi ditandai sudah dibaca!');
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    toast.loading('Memuat ulang materi...', { id: 'refresh-materi' });
    await new Promise((r) => setTimeout(r, 600));
    setIsLoading(false);
    toast.success('Materi berhasil dimuat ulang', { id: 'refresh-materi' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div className="relative rounded-xl overflow-hidden p-6 md:p-8 shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-5" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <GradientIcon><BookMarked className="h-6 w-6" /></GradientIcon>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Materi Pelajaran</h1>
              <p className="text-white/80 text-sm mt-0.5">Kelas {user?.className || 'XII IPA'} — Semua materi tersedia</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <BookOpen className="h-4 w-4 text-white/80" />
              <span className="text-white text-sm font-medium">{totalRead}/{totalMaterials}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative z-10 mt-4">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
            <span>Progres Keseluruhan</span>
            <span className="font-semibold text-white">{overallProgress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari materi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg focus-visible:ring-[#1F3864]/30 h-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={cn(
                'px-4 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer',
                activeFilter === pill.key
                  ? 'bg-[#1F3864] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subject Filter Pills (horizontal scroll) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setExpandedSubject(null)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0',
            !expandedSubject
              ? 'bg-[#1F3864] text-white shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Semua Mapel
        </button>
        {subjects.map((subj) => {
          const total = subj.materials.length;
          const completed = subj.materials.filter((m) => m.isRead).length;
          const cfg = getSubjectConfig(subj.name);
          return (
            <button
              key={subj.id}
              onClick={() => setExpandedSubject(expandedSubject === subj.id ? null : subj.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0',
                expandedSubject === subj.id
                  ? cn('bg-gradient-to-r text-white shadow-sm', cfg.gradientFrom, cfg.gradientTo)
                  : cn('bg-muted text-muted-foreground hover:bg-muted/80')
              )}
            >
              {subj.icon}
              <span>{subj.name}</span>
              <span className="ml-0.5 opacity-70">{completed}/{total}</span>
            </button>
          );
        })}
      </div>

      {/* ── Subject Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((subj) => {
          const total = subj.materials.length;
          const readCount = subj.materials.filter((m) => m.isRead).length;
          const unreadCount = total - readCount;
          const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
          const isExpanded = expandedSubject === subj.id;
          const cfg = getSubjectConfig(subj.name);

          return (
            <div key={subj.id} className="space-y-3">
              <Card
                className={cn(
                  'rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden border',
                  isExpanded ? cfg.borderColor : 'border-transparent'
                )}
                onClick={() => toggleSubject(subj.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-3 rounded-xl shrink-0 bg-gradient-to-br text-white shadow-sm', cfg.gradientFrom, cfg.gradientTo)}>
                      {subj.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">{subj.name}</h3>
                        <div className="flex items-center text-muted-foreground shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
                        <span className="flex items-center gap-1">
                          <BookCheck className="h-3 w-3 text-emerald-500" />
                          {readCount} dibaca
                        </span>
                        {unreadCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Circle className="h-3 w-3 text-amber-400" />
                            {unreadCount} belum
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r', cfg.gradientFrom, cfg.gradientTo)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-bold min-w-[32px] text-right', cfg.color)}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Expanded Material List ── */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="space-y-2 pl-1">
                  {subj.materials.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center">
                      <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Tidak ada materi yang sesuai filter.</p>
                    </div>
                  ) : (
                    subj.materials.map((mat) => {
                      const isMatExpanded = expandedMaterial === mat.id;
                      return (
                        <Card
                          key={mat.id}
                          className={cn(
                            'rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
                            mat.isRead ? 'border-l-3 border-l-emerald-400' : 'border-l-3 border-l-amber-400',
                            isMatExpanded && 'ring-1 ring-muted'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={cn('mt-0.5 shrink-0', mat.isRead ? 'text-emerald-500' : 'text-muted-foreground/40')}>
                                {mat.isRead ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={cn('text-sm truncate', mat.isRead ? 'text-muted-foreground' : 'font-semibold')}>{mat.title}</h4>
                                  <Badge
                                    className={cn(
                                      'text-[10px] px-2 py-0 rounded-full',
                                      mat.isRead
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    )}
                                  >
                                    {mat.isRead ? 'Dibaca' : 'Baru'}
                                  </Badge>
                                </div>
                                <p className={cn('text-xs text-muted-foreground mb-2.5', !isMatExpanded && 'line-clamp-2', isMatExpanded && 'line-clamp-none')}>{mat.description}</p>

                                {/* Expanded content */}
                                {isMatExpanded && mat.content && (
                                  <div className="mb-3 p-3 rounded-lg bg-muted/40 border border-muted/60 text-sm text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                    {mat.content}
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <button
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleMaterial(mat.id); }}
                                  >
                                    <CalendarDays className="h-3 w-3" />
                                    <span>{new Date(mat.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    {mat.content && (
                                      <span className="ml-1">
                                        {isMatExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </span>
                                    )}
                                  </button>
                                  {!mat.isRead && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs px-3 rounded-lg bg-[#1F3864] hover:bg-[#2d5289] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkRead(mat.id, subj.id);
                                      }}
                                    >
                                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                      Mulai Belajar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Empty State ── */}
      {!isLoading && filteredSubjects.every((s) => s.materials.length === 0) && (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground">Tidak ada materi ditemukan</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Coba ubah kata kunci pencarian atau filter.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  2. SISWA TUGAS VIEW
// ═══════════════════════════════════════════════════════════════════════

function getCountdown(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Terlambat ${Math.abs(diffDays)} hari`;
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Besok';
  if (diffDays <= 7) return `${diffDays} hari lagi`;
  return `${Math.ceil(diffDays / 7)} minggu lagi`;
}

function getDueUrgency(dueDate: string): 'overdue' | 'today' | 'soon' | 'future' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'future';
}

export function SiswaTugasView() {
  const { user } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('semua');
  const [statusFilter, setStatusFilter] = useState('semua');
  // Score report form state
  const [reportScore, setReportScore] = useState<Record<string, string>>({});
  const [reportNote, setReportNote] = useState<Record<string, string>>({});
  const [submittingScore, setSubmittingScore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          schoolId: user?.schoolId || '',
          classId: user?.classId || '',
          type: 'tugas',
          status: 'published',
        });
        const res = await fetch(`/api/materials?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: Task[] = data.map((item: any) => ({
              id: item.id,
              title: item.title,
              type: (item.type || 'tugas') as Task['type'],
              subject: item.subject?.name || item.subjectName || 'Umum',
              dueDate: item.dueDate || item.createdAt || '2025-12-31',
              status: 'menunggu' as const,
              isUrgent: false,
              externalUrl: item.externalUrl || undefined,
              externalProvider: item.externalProvider || undefined,
              scoreEntryMode: item.scoreEntryMode || undefined,
              scores: item.scores || undefined,
              learningObjective: item.learningObjective || undefined,
            }));
            setTasks(mapped);
          } else {
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
      } catch {
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, [user?.schoolId, user?.classId]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (typeFilter !== 'semua') filtered = filtered.filter((t) => t.type === typeFilter);
    if (statusFilter !== 'semua') filtered = filtered.filter((t) => t.status === statusFilter);
    return filtered;
  }, [tasks, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const menunggu = tasks.filter((t) => t.status === 'menunggu').length;
    const dikerjakan = tasks.filter((t) => t.status === 'dikerjakan').length;
    const selesai = tasks.filter((t) => t.status === 'selesai').length;
    const terlambat = tasks.filter((t) => t.status === 'terlambat').length;
    const completionPct = total > 0 ? Math.round(((selesai + terlambat) / total) * 100) : 0;
    return { total, menunggu, dikerjakan, selesai, terlambat, completionPct };
  }, [tasks]);

  const getTypeIcon = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return <FileText className="h-3.5 w-3.5" />;
      case 'kuis': return <FileQuestion className="h-3.5 w-3.5" />;
      case 'ujian': return <ClipboardList className="h-3.5 w-3.5" />;
    }
  };

  const getTypeLabel = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return 'Tugas';
      case 'kuis': return 'Kuis';
      case 'ujian': return 'Ujian';
    }
  };

  const getTypeBadgeClass = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
      case 'kuis': return 'bg-violet-100 text-violet-700 hover:bg-violet-100';
      case 'ujian': return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
    }
  };

  const getBorderClass = (type: Task['type']) => {
    switch (type) {
      case 'tugas': return 'border-l-sky-400';
      case 'kuis': return 'border-l-violet-400';
      case 'ujian': return 'border-l-orange-400';
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'menunggu':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[11px] rounded-full">Menunggu</Badge>;
      case 'dikerjakan':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[11px] rounded-full">Dikerjakan</Badge>;
      case 'selesai':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px] rounded-full">Selesai</Badge>;
      case 'terlambat':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[11px] rounded-full">Terlambat</Badge>;
    }
  };

  const getUrgencyBadge = (dueDate: string, status: Task['status']) => {
    if (status === 'selesai' || status === 'terlambat') return null;
    const urgency = getDueUrgency(dueDate);
    const countdown = getCountdown(dueDate);
    switch (urgency) {
      case 'overdue':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" />
            {countdown}
          </span>
        );
      case 'today':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
            <Timer className="h-3 w-3" />
            {countdown}
          </span>
        );
      case 'soon':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-orange-500">
            <Clock className="h-3 w-3" />
            {countdown}
          </span>
        );
      case 'future':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Clock className="h-3 w-3" />
            {countdown}
          </span>
        );
    }
  };

  const handleStartTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'dikerjakan' as const } : t))
    );
    toast.success('Tugas dimulai! Semangat mengerjakan!');
  };

  const handleViewResult = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    toast.info(`Nilai ${task?.title}: ${task?.score}/100`);
  };

  const handleSubmitScore = async (taskId: string) => {
    const scoreVal = reportScore[taskId];
    if (!scoreVal || isNaN(Number(scoreVal))) {
      toast.error('Masukkan nilai yang valid (0-100)');
      return;
    }
    const numScore = Number(scoreVal);
    if (numScore < 0 || numScore > 100) {
      toast.error('Nilai harus antara 0-100');
      return;
    }
    if (!user?.id) {
      toast.error('Anda harus login terlebih dahulu');
      return;
    }

    setSubmittingScore((prev) => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch('/api/external-quiz-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          
        },
        body: JSON.stringify({
          materialId: taskId,
          studentId: user.id,
          schoolId: user.schoolId || '',
          classId: user.classId || '',
          score: numScore,
          note: reportNote[taskId] || '',
          entryMode: 'SELF_REPORTED',
        }),
      });
      if (res.ok) {
        toast.success('Nilai berhasil dikirim!');
        setReportScore((prev) => ({ ...prev, [taskId]: '' }));
        setReportNote((prev) => ({ ...prev, [taskId]: '' }));
        // Update the task in local state to reflect the new score
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, score: numScore, status: 'selesai' as const, scores: [{ id: 'new', materialId: taskId, studentId: user.id, score: numScore, note: reportNote[taskId] || undefined, entryMode: 'SELF_REPORTED' as const, createdAt: new Date().toISOString() }] }
              : t
          )
        );
      } else {
        const err = await res.json().catch(() => ({ error: 'Gagal mengirim nilai' }));
        toast.error(err.error || 'Gagal mengirim nilai');
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengirim nilai');
    } finally {
      setSubmittingScore((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const typePills = [
    { key: 'semua', label: 'Semua' },
    { key: 'tugas', label: 'Tugas' },
    { key: 'kuis', label: 'Kuis' },
    { key: 'ujian', label: 'Ujian' },
  ];

  const statusPills = [
    { key: 'semua', label: 'Semua Status' },
    { key: 'menunggu', label: 'Menunggu' },
    { key: 'dikerjakan', label: 'Dikerjakan' },
    { key: 'selesai', label: 'Selesai' },
    { key: 'terlambat', label: 'Terlambat' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="relative rounded-xl overflow-hidden p-6 md:p-8 shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <GradientIcon><Target className="h-6 w-6" /></GradientIcon>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Tugas & Ujian</h1>
              <p className="text-white/80 text-sm mt-0.5">Kelola dan pantau semua tugasmu</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <TrendingUp className="h-4 w-4 text-white/80" />
            <span className="text-white text-sm font-medium">{stats.completionPct}% selesai</span>
          </div>
        </div>
        {/* Completion progress bar */}
        <div className="relative z-10 mt-4">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
            <span>Progres Penyelesaian</span>
            <span className="font-semibold text-white">{stats.selesai + stats.terlambat} dari {stats.total} tugas</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700 ease-out"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Tugas', value: stats.total, icon: <ClipboardList className="h-5 w-5" />, bg: 'bg-slate-50', color: 'text-slate-600', ring: 'ring-slate-200' },
          { label: 'Menunggu', value: stats.menunggu, icon: <Clock className="h-5 w-5" />, bg: 'bg-amber-50', color: 'text-amber-600', ring: 'ring-amber-200' },
          { label: 'Selesai', value: stats.selesai, icon: <CheckCircle2 className="h-5 w-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600', ring: 'ring-emerald-200' },
          { label: 'Terlambat', value: stats.terlambat, icon: <AlertCircle className="h-5 w-5" />, bg: 'bg-red-50', color: 'text-red-600', ring: 'ring-red-200' },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg, s.color)}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: BRAND }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filter Pills ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Tipe:</span>
          {typePills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setTypeFilter(pill.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer',
                typeFilter === pill.key
                  ? 'bg-[#1F3864] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Status:</span>
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer',
                statusFilter === pill.key
                  ? 'bg-[#1F3864] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Task Cards ── */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground">Tidak ada tugas ditemukan</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {typeFilter !== 'semua' || statusFilter !== 'semua'
              ? 'Coba ubah filter untuk melihat tugas lainnya.'
              : 'Semua tugas sudah selesai. Kerja bagus!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isActionable = task.status === 'menunggu' || task.status === 'dikerjakan';
            const isCompleted = task.status === 'selesai' || task.status === 'terlambat';
            const urgency = getDueUrgency(task.dueDate);
            const isExternalQuiz = !!(task.externalUrl && (task.type === 'kuis' || task.type === 'ujian'));
            const providerInfo = task.externalProvider ? PROVIDER_ICONS[task.externalProvider] : null;
            // Check if student already has a score for this external quiz
            const existingScore = isExternalQuiz && task.scores
              ? task.scores.find((s) => s.studentId === user?.id)
              : undefined;

            return (
              <Card
                key={task.id}
                className={cn(
                  'rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden border-l-4',
                  isExternalQuiz
                    ? 'border-l-amber-400 border-dashed border border-amber-200'
                    : getBorderClass(task.type),
                  task.isUrgent && isActionable && 'ring-1 ring-red-200'
                )}
              >
                <CardContent className="p-4 md:p-5">
                  {/* Urgent banner */}
                  {task.isUrgent && isActionable && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mb-3">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Segera dikerjakan!</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', getTypeBadgeClass(task.type))}>
                        {getTypeIcon(task.type)}
                        <span className="ml-1">{getTypeLabel(task.type)}</span>
                      </Badge>
                      {getStatusBadge(task.status)}
                      {/* Provider badge for external quizzes */}
                      {isExternalQuiz && providerInfo && (
                        <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', providerInfo.color)}>
                          <span className="mr-1">{providerInfo.emoji}</span>
                          {task.externalProvider}
                        </Badge>
                      )}
                    </div>
                    {(task.score !== undefined || existingScore) && isCompleted && (
                      <div className={cn('text-sm font-bold px-2 py-0.5 rounded-full', (task.score ?? existingScore?.score ?? 0) >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                        {existingScore?.score ?? task.score}
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">{task.title}</h3>

                  {/* Tujuan Pembelajaran — ditampilkan jika ada */}
                  {task.learningObjective && (
                    <div className="flex items-start gap-1.5 mb-2 text-xs bg-[#1F3864]/5 rounded-md px-2.5 py-2">
                      <Target className="h-3 w-3 text-[#1F3864] mt-0.5 shrink-0" />
                      <span className="text-slate-600 line-clamp-2">{task.learningObjective}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{task.subject}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {task.type === 'ujian' ? 'Jadwal' : 'Tenggat'}: {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {getUrgencyBadge(task.dueDate, task.status)}
                    </div>
                  </div>

                  {/* ── External Quiz Actions ── */}
                  {isExternalQuiz ? (
                    <div className="space-y-3">
                      {/* Open Quiz button */}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 transition-all duration-200 hover:shadow-sm active:scale-[0.98] gap-1"
                          onClick={() => window.open(task.externalUrl!, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buka Kuis
                        </Button>
                      </div>

                      {/* TEACHER_ENTERED mode */}
                      {task.scoreEntryMode === 'TEACHER_ENTERED' && (
                        <div className="flex items-center gap-2 bg-sky-50 text-sky-700 text-xs font-medium rounded-lg px-3 py-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Nilai akan diinput oleh guru</span>
                        </div>
                      )}

                      {/* SELF_REPORTED mode */}
                      {task.scoreEntryMode === 'SELF_REPORTED' && (
                        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-3 space-y-2.5">
                          <p className="text-xs font-medium text-amber-800">Laporkan Nilai Kamu</p>
                          {existingScore ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-semibold text-emerald-700">Nilai terkirim: {existingScore.score}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {existingScore.note && `(${existingScore.note})`}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="Nilai (0-100)"
                                  className="h-8 text-xs w-28"
                                  value={reportScore[task.id] || ''}
                                  onChange={(e) => setReportScore((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  className="h-8 text-xs rounded-lg bg-[#1F3864] hover:bg-[#2d5289] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                                  disabled={submittingScore[task.id] || !reportScore[task.id]}
                                  onClick={() => handleSubmitScore(task.id)}
                                >
                                  {submittingScore[task.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Kirim Nilai
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Catatan opsional..."
                                className="text-xs min-h-[56px] resize-none"
                                rows={2}
                                value={reportNote[task.id] || ''}
                                onChange={(e) => setReportNote((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                  /* ── Regular Task Actions ── */
                  <div className="flex justify-end">
                    {isActionable && task.status === 'menunggu' && (
                      <Button
                        size="sm"
                        className="h-8 text-xs rounded-lg bg-[#1F3864] hover:bg-[#2d5289] transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                        onClick={() => handleStartTask(task.id)}
                      >
                        <PlayCircle className="h-3.5 w-3.5 mr-1" />
                        Mulai
                      </Button>
                    )}
                    {isActionable && task.status === 'dikerjakan' && (
                      <Button
                        size="sm"
                        className="h-8 text-xs rounded-lg bg-sky-600 hover:bg-sky-700 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                        onClick={() => handleStartTask(task.id)}
                      >
                        <Loader2 className="h-3.5 w-3.5 mr-1" />
                        Lanjut
                      </Button>
                    )}
                    {isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                        onClick={() => handleViewResult(task.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Lihat Hasil
                      </Button>
                    )}
                  </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  3. SISWA KEHADIRAN VIEW
// ═══════════════════════════════════════════════════════════════════════

function PercentageRing({ percentage, size = 140, strokeWidth = 10, color = '#10B981' }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer ring - background */}
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Inner decorative ring */}
      <div
        className="absolute rounded-full border-2 border-dashed border-muted/30"
        style={{
          top: strokeWidth + 8,
          left: strokeWidth + 8,
          right: strokeWidth + 8,
          bottom: strokeWidth + 8,
        }}
      />
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold" style={{ color: BRAND }}>{percentage}%</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Kehadiran</p>
        </div>
      </div>
    </div>
  );
}

export function SiswaKehadiranView() {
  const { user } = useAppStore();
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedClass, setSelectedClass] = useState('XII IPA 1');
  const [selectedPeriod, setSelectedPeriod] = useState('2024/2025 - Semester 2');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    async function fetchAttendance() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          studentId: user?.id || '',
          month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        });
        const res = await fetch(`/api/attendance?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAttendance(data as AttendanceDay[]);
          } else {
            setAttendance([]);
          }
        } else {
          setAttendance([]);
        }
      } catch {
        setAttendance([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttendance();
  }, [user?.id, currentYear, currentMonth]);

  const stats = useMemo(() => {
    const hadir = attendance.filter((a) => a.status === 'hadir').length;
    const izin = attendance.filter((a) => a.status === 'izin').length;
    const sakit = attendance.filter((a) => a.status === 'sakit').length;
    const alpa = attendance.filter((a) => a.status === 'alpa').length;
    const totalSchoolDays = hadir + izin + sakit + alpa;
    const pct = calcAttendancePct(hadir, totalSchoolDays) ?? 0;
    return { hadir, izin, sakit, alpa, totalSchoolDays, pct };
  }, [attendance]);

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayStatus = (day: number): AttendanceDay['status'] => {
    const found = attendance.find((a) => a.day === day);
    return found ? found.status : 'none';
  };

  const getDayData = (day: number): AttendanceDay | undefined => {
    return attendance.find((a) => a.day === day);
  };

  // Timeline entries: reversed so most recent first
  const timelineEntries = useMemo(() => {
    return attendance
      .filter((a) => a.status !== 'weekend' && a.status !== 'none')
      .sort((a, b) => b.day - a.day)
      .slice(0, 10);
  }, [attendance]);

  const getTimelineDotColor = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-500';
      case 'izin': return 'bg-sky-500';
      case 'sakit': return 'bg-amber-500';
      case 'alpa': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTimelineLineColor = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'hadir': return 'border-l-emerald-400';
      case 'izin': return 'border-l-sky-400';
      case 'sakit': return 'border-l-amber-400';
      case 'alpa': return 'border-l-red-400';
      default: return 'border-l-muted';
    }
  };

  const getCalendarDotColor = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-500';
      case 'izin': return 'bg-sky-500';
      case 'sakit': return 'bg-amber-500';
      case 'alpa': return 'bg-red-500';
      default: return 'bg-transparent';
    }
  };

  const getCalendarCellBg = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'weekend': return 'bg-muted/40';
      default: return 'bg-background';
    }
  };

  // Build calendar grid cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const ringColor = stats.pct >= 80 ? '#10B981' : stats.pct >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="relative rounded-xl overflow-hidden p-6 md:p-8 shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <GradientIcon><CalendarDays className="h-6 w-6" /></GradientIcon>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Kehadiran Saya</h1>
              <p className="text-white/80 text-sm mt-0.5">Pantau rekam kehadiranmu setiap bulan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <UserCheck className="h-4 w-4 text-white/80" />
            <span className="text-white text-sm font-medium">{stats.hadir} hari hadir</span>
          </div>
        </div>
      </div>

      {/* ── Filters: Class & Period ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48 rounded-lg">
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="XII IPA 1">XII IPA 1</SelectItem>
            <SelectItem value="XII IPA 2">XII IPA 2</SelectItem>
            <SelectItem value="XII IPS 1">XII IPS 1</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-64 rounded-lg">
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024/2025 - Semester 2">2024/2025 - Semester 2</SelectItem>
            <SelectItem value="2024/2025 - Semester 1">2024/2025 - Semester 1</SelectItem>
            <SelectItem value="2023/2024 - Semester 2">2023/2024 - Semester 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Month Selector ── */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-bold capitalize" style={{ color: BRAND }}>{monthName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs rounded-full transition-all duration-200" onClick={goToToday}>
              Hari Ini
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Hadir', value: stats.hadir, icon: <UserCheck className="h-5 w-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Izin', value: stats.izin, icon: <BriefcaseMedical className="h-5 w-5" />, bg: 'bg-sky-50', color: 'text-sky-600' },
          { label: 'Sakit', value: stats.sakit, icon: <AlertCircle className="h-5 w-5" />, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Alpa', value: stats.alpa, icon: <XCircle className="h-5 w-5" />, bg: 'bg-red-50', color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg, s.color)}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: BRAND }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Attendance Percentage Ring & Summary ── */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <PercentageRing percentage={stats.pct} color={ringColor} size={150} strokeWidth={12} />
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold mb-1" style={{ color: BRAND }}>Persentase Kehadiran</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Kamu hadir <span className="font-semibold text-emerald-600">{stats.hadir}</span> dari{' '}
                <span className="font-semibold">{stats.totalSchoolDays}</span> hari sekolah bulan ini
              </p>
              {stats.pct >= 90 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <Trophy className="h-3.5 w-3.5" />
                  Luar biasa! Terus pertahankan!
                </div>
              ) : stats.pct >= 75 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Bagus! Tingkatkan lagi kehadiranmu.
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Perbaiki kehadiranmu bulan depan.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Calendar Grid with Colored Dots ── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
            <Calendar className="h-4 w-4" />
            Kalender Kehadiran
          </CardTitle>
          <CardDescription>Klik tanggal untuk melihat detail</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells with colored dots */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const status = getDayStatus(day);
              const isToday =
                day === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear();

              return (
                <button
                  key={day}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 hover:shadow-md hover:scale-105 relative cursor-pointer',
                    getCalendarCellBg(status),
                    isToday && 'ring-2 ring-offset-2 ring-[#1F3864] bg-[#1F3864]/5',
                    status === 'weekend' && 'text-muted-foreground/40',
                    status === 'none' && 'text-muted-foreground/30'
                  )}
                  onClick={() => {
                    const statusLabels: Record<string, string> = {
                      hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa',
                      weekend: 'Akhir Pekan', none: 'Tidak Ada Data',
                    };
                    const data = getDayData(day);
                    toast.info(`${day} ${monthName}: ${statusLabels[status] || status}${data?.note ? ` — ${data.note}` : ''}`);
                  }}
                >
                  <span className={cn(
                    'text-sm',
                    status === 'hadir' && 'text-foreground',
                    status === 'izin' && 'text-sky-700',
                    status === 'sakit' && 'text-amber-700',
                    status === 'alpa' && 'text-red-700'
                  )}>
                    {day}
                  </span>
                  {/* Colored dot indicator */}
                  {status !== 'weekend' && status !== 'none' && (
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', getCalendarDotColor(status))} />
                  )}
                  {isToday && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1F3864]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-4 border-t">
            {[
              { color: 'bg-emerald-500', label: 'Hadir' },
              { color: 'bg-sky-500', label: 'Izin' },
              { color: 'bg-amber-500', label: 'Sakit' },
              { color: 'bg-red-500', label: 'Alpa' },
              { color: 'bg-muted/40', label: 'Akhir Pekan' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', item.color)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Timeline Detail List ── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
            <BarChart3 className="h-4 w-4" />
            Riwayat Kehadiran Terbaru
          </CardTitle>
          <CardDescription>10 entri terakhir bulan ini</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {timelineEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">Belum ada data kehadiran.</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-96 overflow-y-auto">
              {timelineEntries.map((entry, idx) => {
                const statusLabels: Record<string, { label: string; color: string }> = {
                  hadir: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700' },
                  izin: { label: 'Izin', color: 'bg-sky-100 text-sky-700' },
                  sakit: { label: 'Sakit', color: 'bg-amber-100 text-amber-700' },
                  alpa: { label: 'Alpa', color: 'bg-red-100 text-red-700' },
                };
                const info = statusLabels[entry.status] || { label: entry.status, color: 'bg-muted text-muted-foreground' };
                const dayDate = entry.date
                  ? new Date(entry.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                  : `${entry.day} ${monthName}`;

                return (
                  <div key={entry.day} className="flex gap-3">
                    {/* Timeline line & dot */}
                    <div className="flex flex-col items-center">
                      <div className={cn('w-3 h-3 rounded-full shrink-0 mt-1.5', getTimelineDotColor(entry.status))} />
                      {idx < timelineEntries.length - 1 && (
                        <div className="w-0.5 flex-1 bg-muted/40 my-1" />
                      )}
                    </div>
                    {/* Content card */}
                    <div className={cn(
                      'flex-1 rounded-xl border-l-3 p-3 mb-3 transition-all duration-200 hover:shadow-sm',
                      getTimelineLineColor(entry.status),
                      'bg-card'
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{dayDate}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', info.color)}>
                          {info.label}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
