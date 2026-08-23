'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { detectExternalProvider, PROVIDER_ICONS, isValidUrl } from '@/lib/external-quiz';
import { ImportSoalWordDialog } from './guru-import-soal';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  ClipboardList,
  FileBarChart,
  Download,
  Upload,
  Printer,
  GraduationCap,
  ExternalLink,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Brain,
  Timer,
  Save,
  X,
  Loader2,
  AlertTriangle,
  BookCopy,
  UserCheck,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════

interface MaterialData {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  subjectId: string | null;
  topicId: string | null;
  classId: string | null;
  schoolId: string | null;
  teacherId: string | null;
  type: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  teacher?: { name: string } | null;
  subject?: { id: string; name: string; code: string } | null;
  class?: { id: string; name: string } | null;
  externalUrl?: string | null;
  externalProvider?: string | null;
  scoreEntryMode?: string | null;
  scores?: Array<{ id: string; materialId: string; studentId: string; score: number; note?: string; entryMode: string; createdAt: string }>;
}

interface ExamPackageData {
  id: string;
  title: string;
  description: string | null;
  schoolId: string | null;
  duration: number;
  totalQuestions: number;
  status: string;
  createdBy: string | null;
  createdAt: string;
  _count?: { examItems: number; examSessions: number };
}

interface AttemptData {
  id: string;
  userId: string;
  examSessionId: string | null;
  examPackageId: string;
  schoolId: string;
  classId: string | null;
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  percentage: number;
  tkaPrediction: number | null;
  duration: number;
  status: string;
  startedAt: string;
  isRemedial?: boolean;
  hasRemedial?: boolean;
  remedialId?: string;
  remedialStatus?: string;
  remedialScore?: number;
  activeScore?: number;
  originalScore?: number;
  submittedAt: string | null;
  createdAt: string;
  learningObjective?: string | null;
  user?: { id: string; name: string } | null;
  answers?: unknown[];
}

interface StudentData {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  nisn?: string;
  schoolId?: string;
  classId?: string;
  isActive: boolean;
  class?: { id: string; name: string } | null;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  type: string;
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY TYPES (GuruSoalView / GuruTryoutView)
// ═══════════════════════════════════════════════════════════════════

interface Soal {
  id: string;
  subject: string;
  topic: string;
  type: 'PG' | 'Isian' | 'Esai';
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'Terpublikasi' | 'Draft';
  hots: boolean;
}

interface Tryout {
  id: string;
  title: string;
  subject: string;
  duration: string;
  questionCount: number;
  participants: number;
  status: 'Aktif' | 'Terjadwal' | 'Selesai';
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SUBJECTS = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris'];

const SUBJECT_BADGE_COLORS: Record<string, string> = {
  Matematika: 'bg-blue-100 text-blue-700',
  Fisika: 'bg-purple-100 text-purple-700',
  Kimia: 'bg-green-100 text-green-700',
  Biologi: 'bg-emerald-100 text-emerald-700',
  'Bahasa Indonesia': 'bg-orange-100 text-orange-700',
  'Bahasa Inggris': 'bg-rose-100 text-rose-700',
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Mudah: 'bg-green-100 text-green-700',
  Sedang: 'bg-amber-100 text-amber-700',
  Sulit: 'bg-red-100 text-red-700',
};

const DAYA_BEDA_COLORS: Record<string, string> = {
  Baik: 'bg-emerald-100 text-emerald-700',
  Cukup: 'bg-amber-100 text-amber-700',
  Kurang: 'bg-red-100 text-red-700',
};

const BRAND = '#1F3864';
const BRAND_LIGHT = '#2d5289';

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA (FALLBACK)
// ═══════════════════════════════════════════════════════════════════

const MOCK_MATERI: MaterialData[] = [
  { id: 'm1', title: 'Persamaan Kuadrat & Fungsi Kuadrat', subject: undefined as unknown as any, subjectId: null, description: 'Materi mencakup konsep persamaan kuadrat, rumus abc, hubungan akar-akar persamaan kuadrat, serta grafik fungsi kuadrat.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'published', dueDate: null, createdAt: '2025-01-12T00:00:00.000Z', updatedAt: '2025-01-12T00:00:00.000Z' },
  { id: 'm2', title: 'Hukum Newton tentang Gerak', subject: undefined as unknown as any, subjectId: null, description: 'Pembahasan tiga hukum Newton, penerapannya pada benda diam dan bergerak, serta contoh soal TKA.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'published', dueDate: null, createdAt: '2025-01-10T00:00:00.000Z', updatedAt: '2025-01-10T00:00:00.000Z' },
  { id: 'm3', title: 'Struktur Atom & Sistem Periodik', subject: undefined as unknown as any, subjectId: null, description: 'Teori atom, konfigurasi elektron, dan sifat-sifat unsur dalam tabel periodik.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'published', dueDate: null, createdAt: '2025-01-08T00:00:00.000Z', updatedAt: '2025-01-08T00:00:00.000Z' },
  { id: 'm4', title: 'Sel sebagai Unit Terkecil Kehidupan', subject: undefined as unknown as any, subjectId: null, description: 'Struktur dan fungsi sel prokariotik dan eukariotik, organel sel, serta proses transportasi membran.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'draft', dueDate: null, createdAt: '2025-01-05T00:00:00.000Z', updatedAt: '2025-01-05T00:00:00.000Z' },
  { id: 'm5', title: 'Teks Eksposisi & Argumentasi', subject: undefined as unknown as any, subjectId: null, description: 'Menganalisis struktur teks eksposisi dan argumentasi.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'published', dueDate: null, createdAt: '2025-01-03T00:00:00.000Z', updatedAt: '2025-01-03T00:00:00.000Z' },
  { id: 'm6', title: 'Reading Comprehension: Narrative Text', subject: undefined as unknown as any, subjectId: null, description: 'Teknik membaca pemahaman untuk teks naratif.', content: null, topicId: null, classId: null, schoolId: null, teacherId: null, type: 'materi', status: 'draft', dueDate: null, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
];



const TRYOUT_STATUS_BADGE: Record<string, { className: string; icon: React.ElementType }> = {
  Aktif: { className: 'bg-emerald-100 text-emerald-700', icon: CircleDot },
  Terjadwal: { className: 'bg-blue-100 text-blue-700', icon: CalendarClock },
  Selesai: { className: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

const REPORT_TYPES = [
  { id: 'rt1', title: 'Laporan Nilai Per Tryout', description: 'Rekap nilai seluruh siswa pada satu paket tryout lengkap dengan statistik.', icon: FileBarChart, color: 'text-[#1F3864]', bgColor: 'bg-[#1F3864]/10' },
  { id: 'rt2', title: 'Laporan Peringkat', description: 'Peringkat siswa berdasarkan total skor tryout, per kelas atau keseluruhan.', icon: Award, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'rt3', title: 'Laporan Per Mata Pelajaran', description: 'Analisis performa siswa per mata pelajaran dengan perbandingan antar kelas.', icon: BookMarked, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'rt4', title: 'Laporan Per Siswa', description: 'Laporan individual siswa berisi riwayat tryout, kekuatan, dan area perbaikan.', icon: GraduationCap, color: 'text-purple-600', bgColor: 'bg-purple-50' },
];

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  label,
  value,
  gradientFrom,
  gradientTo,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const from = gradientFrom || 'from-[#1F3864]';
  const to = gradientTo || 'to-[#2d5289]';
  return (
    <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="flex items-start gap-4 p-4 sm:p-6">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', from, to)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SoftStatCard({
  icon: Icon,
  label,
  value,
  iconColor = 'text-[#1F3864]',
  iconBg = 'bg-[#1F3864]/10',
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="flex items-start gap-4 p-4 sm:p-6">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconBg, iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function PerformanceBar({ value, max = 100, height = 'h-2.5' }: { value: number; max?: number; height?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-muted', height)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: pct + '%' }}
      />
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-[#1F3864] text-white shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatTanggal(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function subjectColor(name: string): string {
  return SUBJECT_BADGE_COLORS[name] || 'bg-gray-100 text-gray-700';
}

// ═══════════════════════════════════════════════════════════════════
// 1. GURU MATERI VIEW  (UPGRADED WITH API)
// ═══════════════════════════════════════════════════════════════════

export function GuruMateriView() {
  const user = useAppStore((s) => s.user);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Import soal dialog
  const [importSoalOpen, setImportSoalOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('Semua');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<string>('materi');
  const [quizSource, setQuizSource] = useState<'internal' | 'external'>('internal');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formScoreEntryMode, setFormScoreEntryMode] = useState<'SELF_REPORTED' | 'TEACHER_ENTERED'>('SELF_REPORTED');
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<MaterialData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // View detail state
  const [viewMaterial, setViewMaterial] = useState<MaterialData | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      if (user?.id) params.set('teacherId', user.id);
      const res = await fetch(`/api/materials?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch {
      console.warn('Falling back to mock materi data');
      setMaterials(MOCK_MATERI);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, user?.id]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
    fetchSubjects();
  }, [fetchMaterials, fetchSubjects]);

  const filteredMaterials = useMemo(() => {
    let list = materials;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q) ||
          (m.subject?.name || '').toLowerCase().includes(q)
      );
    }
    if (subjectFilter !== 'Semua') {
      list = list.filter((m) => m.subject?.name === subjectFilter);
    }
    return list;
  }, [materials, search, subjectFilter]);

  const uniqueSubjectNames = useMemo(() => {
    const names = new Set<string>();
    materials.forEach((m) => { if (m.subject?.name) names.add(m.subject.name); });
    return Array.from(names);
  }, [materials]);

  const totalMateri = materials.length;
  const published = materials.filter((m) => m.status === 'published').length;
  const draft = materials.filter((m) => m.status === 'draft').length;

  const handleOpenDialog = useCallback(() => {
    setFormTitle('');
    setFormSubjectId('');
    setFormDescription('');
    setFormContent('');
    setFormType('materi');
    setQuizSource('internal');
    setFormExternalUrl('');
    setFormScoreEntryMode('SELF_REPORTED');
    setDialogOpen(true);
  }, []);

  const detectedProvider = formExternalUrl ? detectExternalProvider(formExternalUrl) : null;
  const providerInfo = detectedProvider ? PROVIDER_ICONS[detectedProvider] : null;

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) {
      toast.error('Judul materi wajib diisi');
      return;
    }
    if (quizSource === 'external' && formExternalUrl.trim() && !isValidUrl(formExternalUrl.trim())) {
      toast.error('URL tidak valid. Gunakan format https://...');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        content: quizSource === 'internal' ? (formContent.trim() || null) : null,
        subjectId: formSubjectId || null,
        schoolId: user?.schoolId || null,
        teacherId: user?.id || null,
        type: formType,
        status: 'published',
      };
      if (quizSource === 'external' && formExternalUrl.trim()) {
        body.externalUrl = formExternalUrl.trim();
        body.scoreEntryMode = formScoreEntryMode;
      }
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Materi berhasil dibuat!');
      setDialogOpen(false);
      fetchMaterials();
    } catch {
      toast.error('Gagal membuat materi. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }, [formTitle, formSubjectId, formDescription, formContent, formType, quizSource, formExternalUrl, formScoreEntryMode, user, fetchMaterials]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/materials?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Materi berhasil dihapus');
      setDeleteTarget(null);
      fetchMaterials();
    } catch {
      toast.error('Gagal menghapus materi. Coba lagi.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetchMaterials]);

  return (
    <div className="space-y-6">
      <PageHeader icon={BookOpen} title="Materi Ajar" description="Kelola materi pelajaran untuk persiapan TKA siswa Anda.">
        <div className="flex items-center gap-2">
          <Button
            className="bg-amber-500 text-white transition-all duration-200 hover:bg-amber-600 hover:shadow-sm active:scale-[0.98]"
            onClick={() => setImportSoalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Soal Word
          </Button>
          <Button
            className="bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]"
            onClick={handleOpenDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Materi
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Total Materi" value={totalMateri} gradientFrom="from-[#1F3864]" gradientTo="to-[#2d5289]" />
        <SoftStatCard icon={CheckCircle2} label="Dipublikasikan" value={published} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <SoftStatCard icon={FileText} label="Draft" value={draft} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      {/* Search + Filter pills */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari materi..."
              className="rounded-lg pl-9 focus-visible:ring-[#1F3864]/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={subjectFilter === 'Semua'} onClick={() => setSubjectFilter('Semua')}>Semua</FilterPill>
            {uniqueSubjectNames.map((s) => (
              <FilterPill key={s} active={subjectFilter === s} onClick={() => setSubjectFilter(s)}>{s}</FilterPill>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada materi"
          description="Materi untuk filter ini belum tersedia. Klik 'Tambah Materi' untuk membuat materi baru."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((materi) => (
            <Card key={materi.id} className="flex flex-col rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{materi.title}</CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {materi.externalProvider && (
                      <Badge className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', PROVIDER_ICONS[materi.externalProvider]?.color || 'bg-gray-100 text-gray-700')}>
                        {PROVIDER_ICONS[materi.externalProvider]?.emoji || '🔗'} {materi.externalProvider}
                      </Badge>
                    )}
                    {materi.status === 'draft' && (
                      <Badge variant="secondary" className="shrink-0 rounded-full bg-amber-100 text-xs text-amber-700">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
                {materi.subject && (
                  <Badge className={cn('w-fit rounded-full text-xs', subjectColor(materi.subject.name))}>
                    {materi.subject.name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{materi.description || 'Tidak ada deskripsi'}</p>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">{formatTanggal(materi.createdAt)}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 rounded-lg text-xs transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                      onClick={() => setViewMaterial(materi)}
                    >
                      <Eye className="h-3 w-3" />
                      Lihat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 rounded-lg text-xs text-red-600 transition-all duration-200 hover:bg-red-50 hover:shadow-sm active:scale-[0.98]"
                      onClick={() => setDeleteTarget(materi)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                <Plus className="h-4 w-4" />
              </div>
              Tambah Materi Baru
            </DialogTitle>
            <DialogDescription>Isi form di bawah untuk membuat materi pelajaran baru.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="materi-title">Judul *</Label>
              <Input
                id="materi-title"
                placeholder="Contoh: Kuis Hukum Newton"
                className="rounded-lg focus-visible:ring-[#1F3864]/30"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materi-subject">Mata Pelajaran</Label>
              <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                <SelectTrigger className="rounded-lg focus:ring-[#1F3864]/30">
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="materi-type">Tipe</Label>
              <Select value={formType} onValueChange={(v) => { setFormType(v); if (v !== 'quiz') setQuizSource('internal'); }}>
                <SelectTrigger className="rounded-lg focus:ring-[#1F3864]/30">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materi">Materi Pelajaran</SelectItem>
                  <SelectItem value="tugas">Tugas</SelectItem>
                  <SelectItem value="quiz">Kuis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiz source toggle — only shown when type=quiz */}
            {formType === 'quiz' && (
              <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                <Label className="text-sm font-semibold text-foreground">Sumber Soal</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setQuizSource('internal')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer',
                      quizSource === 'internal'
                        ? 'border-[#1F3864] bg-[#1F3864]/5 text-[#1F3864]'
                        : 'border-border hover:border-gray-300'
                    )}
                  >
                    📝 Disusun di Aplikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizSource('external')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer',
                      quizSource === 'external'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-border hover:border-gray-300'
                    )}
                  >
                    🔗 Tautan Luar
                  </button>
                </div>

                {/* External quiz URL */}
                {quizSource === 'external' && (
                  <div className="space-y-3 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="external-url">URL Kuis *</Label>
                      <Input
                        id="external-url"
                        placeholder="https://docs.google.com/forms/d/..."
                        className="rounded-lg focus-visible:ring-amber-500/30"
                        value={formExternalUrl}
                        onChange={(e) => setFormExternalUrl(e.target.value)}
                      />
                    </div>
                    {formExternalUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Provider terdeteksi:</span>
                        {providerInfo ? (
                          <Badge className={cn('text-xs font-medium px-2 py-0.5 rounded-lg border', providerInfo.color)}>
                            {providerInfo.emoji} {detectedProvider}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Tidak dikenali</span>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Mode Input Nilai</Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormScoreEntryMode('SELF_REPORTED')}
                          className={cn(
                            'flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                            formScoreEntryMode === 'SELF_REPORTED'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-border hover:border-gray-300'
                          )}
                        >
                          👤 Siswa Lapor Sendiri
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormScoreEntryMode('TEACHER_ENTERED')}
                          className={cn(
                            'flex-1 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                            formScoreEntryMode === 'TEACHER_ENTERED'
                              ? 'border-sky-500 bg-sky-50 text-sky-700'
                              : 'border-border hover:border-gray-300'
                          )}
                        >
                          👨‍🏫 Guru Input Manual
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formScoreEntryMode === 'SELF_REPORTED'
                          ? 'Siswa mengisi nilai sendiri setelah mengerjakan kuis di tautan luar'
                          : 'Guru yang menginput nilai secara manual untuk setiap siswa'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="materi-desc">Deskripsi</Label>
              <Textarea
                id="materi-desc"
                placeholder="Deskripsi singkat..."
                className="min-h-[80px] rounded-lg focus-visible:ring-[#1F3864]/30"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            {quizSource === 'internal' && (
              <div className="space-y-2">
                <Label htmlFor="materi-content">Konten Materi</Label>
                <Textarea
                  id="materi-content"
                  placeholder="Tulis konten materi di sini..."
                  className="min-h-[150px] rounded-lg focus-visible:ring-[#1F3864]/30"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              className="rounded-lg bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Menyimpan...' : 'Buat Materi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              Hapus Materi
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus materi <strong>&quot;{deleteTarget?.title}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 transition-all duration-200 hover:bg-red-700 hover:shadow-sm active:scale-[0.98]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewMaterial} onOpenChange={(open) => { if (!open) setViewMaterial(null); }}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                <Eye className="h-4 w-4" />
              </div>
              Detail Materi
            </DialogTitle>
          </DialogHeader>
          {viewMaterial && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground">Judul</Label>
                <p className="mt-1 text-lg font-semibold">{viewMaterial.title}</p>
              </div>
              {viewMaterial.subject && (
                <div>
                  <Label className="text-muted-foreground">Mata Pelajaran</Label>
                  <p className="mt-1">
                    <Badge className={cn('rounded-full', subjectColor(viewMaterial.subject.name))}>{viewMaterial.subject.name}</Badge>
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Deskripsi</Label>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{viewMaterial.description || 'Tidak ada deskripsi'}</p>
              </div>
              {viewMaterial.content && (
                <div>
                  <Label className="text-muted-foreground">Konten</Label>
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {viewMaterial.content}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTanggal(viewMaterial.createdAt)}</span>
                <Badge variant="outline" className="rounded-full text-xs">{viewMaterial.status}</Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => setViewMaterial(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImportSoalWordDialog open={importSoalOpen} onOpenChange={setImportSoalOpen} subjects={subjects} onImportComplete={fetchMaterials} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. GURU SOAL VIEW  (DESIGN UPGRADE ONLY)
// ═══════════════════════════════════════════════════════════════════

export function GuruSoalView() {
  const user = useAppStore((s) => s.user);
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchSoal = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      params.set('limit', '50');
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const items: Soal[] = (Array.isArray(data) ? data : []).map((q: any) => ({
        id: q.id,
        subject: q.subject?.name ?? 'Tanpa Mapel',
        topic: q.topic?.name ?? 'Tanpa Topik',
        type: (q.type === 'pg' || q.type === 'pg_kompleks') ? 'PG' : q.type === 'isian' ? 'Isian' : 'Esai',
        difficulty: q.difficulty === 'mudah' ? 'Mudah' : q.difficulty === 'sulit' ? 'Sulit' : 'Sedang',
        status: q.status === 'published' ? 'Terpublikasi' : 'Draft',
        hots: ['C4', 'C5', 'C6'].includes(q.cognitiveLevel),
      }));
      setSoalList(items);
    } catch {
      setSoalList([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchSoal();
  }, [fetchSoal]);

  const filtered = soalList.filter((s) => {
    if (search && !s.topic.toLowerCase().includes(search.toLowerCase()) && !s.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (subjectFilter !== 'all' && s.subject !== subjectFilter) return false;
    if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  });

  const totalSoal = soalList.length;
  const terpublikasi = soalList.filter((s) => s.status === 'Terpublikasi').length;
  const draft = soalList.filter((s) => s.status === 'Draft').length;
  const hots = soalList.filter((s) => s.hots).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Bank Soal" description="Kelola dan organisir soal-soal yang telah Anda buat untuk persiapan TKA.">
        <Button className="bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Fitur pembuat soal segera hadir')}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Soal Baru
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total Soal" value={totalSoal} gradientFrom="from-[#1F3864]" gradientTo="to-[#2d5289]" />
        <SoftStatCard icon={CheckCircle2} label="Terpublikasi" value={terpublikasi} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <SoftStatCard icon={FileText} label="Draft" value={draft} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <SoftStatCard icon={Brain} label="HOTS" value={hots} iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari topik atau mata pelajaran..." className="rounded-lg pl-9 focus-visible:ring-[#1F3864]/30" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full rounded-lg sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Mata Pelajaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mapel</SelectItem>
              {SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full rounded-lg sm:w-[160px]">
              <SelectValue placeholder="Kesulitan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkat</SelectItem>
              <SelectItem value="Mudah">Mudah</SelectItem>
              <SelectItem value="Sedang">Sedang</SelectItem>
              <SelectItem value="Sulit">Sulit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full rounded-lg sm:w-[140px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="PG">Pilihan Ganda</SelectItem>
              <SelectItem value="Isian">Isian Singkat</SelectItem>
              <SelectItem value="Esai">Esai</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead className="text-center">Tipe</TableHead>
                <TableHead className="text-center">Kesulitan</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Memuat soal...</span></div>
                  </TableCell>
                </TableRow>
              ) : soalList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <EmptyState icon={ClipboardList} title="Belum ada soal" description="Soal yang Anda buat akan tampil di sini." />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <EmptyState icon={ClipboardList} title="Tidak ada soal ditemukan" description="Ubah filter atau buat soal baru untuk memulai." />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((soal, idx) => (
                  <TableRow key={soal.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                    <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge className={cn('rounded-full text-xs', SUBJECT_BADGE_COLORS[soal.subject] ?? 'bg-muted text-muted-foreground')}>{soal.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{soal.topic}</span>
                        {soal.hots && <Badge variant="outline" className="rounded-full border-purple-300 text-xs text-purple-600"><Brain className="mr-1 h-3 w-3" />HOTS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="rounded-full text-xs">{soal.type}</Badge></TableCell>
                    <TableCell className="text-center"><Badge className={cn('rounded-full text-xs', DIFFICULTY_BADGE[soal.difficulty])}>{soal.difficulty}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('rounded-full text-xs', soal.status === 'Terpublikasi' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                        {soal.status === 'Terpublikasi' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
                        {soal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Edit soal: ' + soal.topic)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Hapus soal: ' + soal.topic)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. GURU TRYOUT VIEW  (DESIGN UPGRADE ONLY)
// ═══════════════════════════════════════════════════════════════════

export function GuruTryoutView() {
  const user = useAppStore((s) => s.user);
  const [tryoutList, setTryoutList] = useState<Tryout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Aktif');

  const fetchTryout = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('type', 'session');
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/exams?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const items: Tryout[] = (Array.isArray(data) ? data : []).map((s: any) => {
        const statusMap: Record<string, 'Aktif' | 'Terjadwal' | 'Selesai'> = {
          active: 'Aktif',
          scheduled: 'Terjadwal',
          ended: 'Selesai',
        };
        return {
          id: s.id,
          title: s.title,
          subject: s.examPackage?.title ?? 'Tanpa Paket',
          duration: `${s.duration ?? 120} menit`,
          questionCount: s.examPackage?.totalQuestions ?? s.examPackage?._count?.examItems ?? 0,
          participants: s.assignments?.length ?? 0,
          status: statusMap[s.status] ?? 'Terjadwal',
        };
      });
      setTryoutList(items);
    } catch {
      setTryoutList([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchTryout();
  }, [fetchTryout]);

  const filtered = tryoutList.filter((t) => t.status === activeTab);

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Kelola Tryout" description="Buat, jadwalkan, dan pantau tryout untuk siswa Anda.">
        <Button className="bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Fitur buat tryout segera hadir')}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Tryout
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="Aktif" className="transition-all duration-200"><CircleDot className="mr-1.5 h-4 w-4 text-emerald-500" />Aktif</TabsTrigger>
          <TabsTrigger value="Terjadwal" className="transition-all duration-200"><CalendarClock className="mr-1.5 h-4 w-4 text-blue-500" />Terjadwal</TabsTrigger>
          <TabsTrigger value="Selesai" className="transition-all duration-200"><CheckCircle2 className="mr-1.5 h-4 w-4 text-gray-500" />Selesai</TabsTrigger>
        </TabsList>

        {['Aktif', 'Terjadwal', 'Selesai'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <Card className="rounded-xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Judul Tryout</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-center">Jumlah Soal</TableHead>
                      <TableHead className="text-center">Peserta</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-24 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Memuat tryout...</span></div>
                        </TableCell>
                      </TableRow>
                    ) : tryoutList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <EmptyState
                            icon={ClipboardList}
                            title="Belum ada tryout"
                            description="Tryout yang Anda buat akan tampil di sini."
                          />
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <EmptyState
                            icon={ClipboardList}
                            title={"Tidak ada tryout " + tab.toLowerCase()}
                            description={tab === 'Aktif' ? 'Tidak ada tryout yang sedang berlangsung saat ini.' : tab === 'Terjadwal' ? 'Belum ada tryout yang dijadwalkan.' : 'Belum ada tryout yang selesai.'}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((tryout) => {
                        const statusConf = TRYOUT_STATUS_BADGE[tryout.status];
                        const StatusIcon = statusConf.icon;
                        return (
                          <TableRow key={tryout.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{tryout.title}</TableCell>
                            <TableCell>
                              <Badge className={cn('rounded-full text-xs', SUBJECT_BADGE_COLORS[tryout.subject] ?? 'bg-muted text-muted-foreground')}>{tryout.subject}</Badge>
                            </TableCell>
                            <TableCell className="text-center"><div className="flex items-center justify-center gap-1 text-sm"><Timer className="h-4 w-4 text-muted-foreground" />{tryout.duration}</div></TableCell>
                            <TableCell className="text-center">{tryout.questionCount} soal</TableCell>
                            <TableCell className="text-center"><div className="flex items-center justify-center gap-1 text-sm"><Users className="h-4 w-4 text-muted-foreground" />{tryout.participants}</div></TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn('rounded-full text-xs', statusConf.className)}><StatusIcon className="mr-1 h-3 w-3" />{tryout.status}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Detail tryout: ' + tryout.title)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => toast.info('Edit tryout: ' + tryout.title)}><Pencil className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. GURU NILAI VIEW  (UPGRADED WITH API)
// ═══════════════════════════════════════════════════════════════════

export function GuruNilaiView() {
  const user = useAppStore((s) => s.user);
  const [exams, setExams] = useState<ExamPackageData[]>([]);
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nilaiMap, setNilaiMap] = useState<Record<string, string>>({});
  const [learningObjective, setLearningObjective] = useState('');

  const fetchExams = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/exams?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      // silent fallback
    }
  }, [user?.schoolId]);

  const fetchAttempts = useCallback(async (examPackageId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/attempts?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      let all = Array.isArray(data) ? data : [];
      if (examPackageId) {
        all = all.filter((a: AttemptData) => a.examPackageId === examPackageId);
      }
      setAttempts(all);
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('role', 'SISWA');
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchExams();
    fetchStudents();
    fetchAttempts();
  }, [fetchExams, fetchStudents, fetchAttempts]);

  const handleExamChange = useCallback((examId: string) => {
    setSelectedExam(examId);
    fetchAttempts(examId || undefined);
    setNilaiMap({});
    // Restore learningObjective from existing attempts
    const examAttempts = attempts.filter((a) => a.examPackageId === examId);
    const existingLO = examAttempts.find((a) => a.learningObjective);
    setLearningObjective(existingLO?.learningObjective || '');
  }, [fetchAttempts]);

  const getNilai = useCallback((id: string, defaultVal: string) => nilaiMap[id] ?? defaultVal, [nilaiMap]);

  const handleNilaiChange = useCallback((id: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setNilaiMap((prev) => ({ ...prev, [id]: value }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const entries = Object.entries(nilaiMap);
      if (entries.length === 0) {
        toast.info('Tidak ada nilai yang diubah');
        setSaving(false);
        return;
      }
      for (const [attemptId, nilaiStr] of entries) {
        const nilai = parseFloat(nilaiStr);
        if (isNaN(nilai)) continue;
        const attempt = attempts.find((a) => a.id === attemptId);
        if (!attempt) continue;
        const totalItems = attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered;
        const benar = Math.round((nilai / 100) * totalItems);
        await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: attempt.userId,
            examPackageId: attempt.examPackageId,
            schoolId: attempt.schoolId,
            classId: attempt.classId,
            answers: Array.from({ length: totalItems || 1 }, (_, i) => ({
              questionId: `placeholder-${i}`,
              answer: i < benar ? 'correct' : 'wrong',
              timeSpent: 0,
            })),
            duration: 0,
            learningObjective: learningObjective.trim() || undefined,
          }),
        });
      }
      toast.success('Nilai berhasil disimpan!');
      fetchAttempts(selectedExam || undefined);
      setNilaiMap({});
    } catch {
      toast.error('Gagal menyimpan nilai. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [nilaiMap, attempts, selectedExam, fetchAttempts]);

  const handleActivateRemedial = useCallback(async (attemptId: string) => {
    try {
      const res = await fetch('/api/attempts/remedial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal mengaktifkan remedial');
        return;
      }
      toast.success('Remedial berhasil diaktifkan');
      fetchAttempts(selectedExam || undefined);
    } catch {
      toast.error('Gagal mengaktifkan remedial');
    }
  }, [fetchAttempts, selectedExam]);

  const selectedExamData = exams.find((e) => e.id === selectedExam);

  return (
    <div className="space-y-6">
      <PageHeader icon={Save} title="Input & Kelola Nilai" description="Masukkan dan kelola nilai siswa berdasarkan hasil tryout.">
        <Button
          className="bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Nilai'}
        </Button>
      </PageHeader>

      {/* Selectors */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-sm font-medium">Pilih Tryout</Label>
            <Select value={selectedExam} onValueChange={handleExamChange}>
              <SelectTrigger className="rounded-lg focus:ring-[#1F3864]/30">
                <GraduationCap className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Pilih tryout..." />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            onClick={() => fetchAttempts(selectedExam || undefined)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Muat Data
          </Button>
        </CardContent>
      </Card>

      {/* Tujuan Pembelajaran — opsional, ditulis guru */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-[#1F3864]" />
            Tujuan Pembelajaran
            <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
          </Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3864]/30 focus-visible:ring-offset-2 resize-none"
            placeholder="Contoh: Siswa mampu menganalisis struktur teks eksplanasi dan mengidentifikasi ciri kebahasaannya..."
            value={learningObjective}
            onChange={(e) => setLearningObjective(e.target.value)}
            maxLength={500}
          />
          <p className="text-[11px] text-muted-foreground text-right">{learningObjective.length}/500</p>
        </CardContent>
      </Card>

      {/* Stats overview */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SoftStatCard icon={Users} label="Peserta" value={attempts.length} iconColor="text-[#1F3864]" iconBg="bg-[#1F3864]/10" />
          <SoftStatCard
            icon={BarChart3}
            label="Rata-rata"
            value={attempts.length > 0 ? (attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length).toFixed(1) : '0'}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <SoftStatCard
            icon={TrendingUp}
            label="Tertinggi"
            value={attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)).toFixed(1) : '0'}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
          />
          <SoftStatCard
            icon={TrendingDown}
            label="Terendah"
            value={attempts.length > 0 ? Math.min(...attempts.map((a) => a.percentage)).toFixed(1) : '0'}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
        </div>
      )}

      {/* Table */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        {/* Show existing learningObjective if any attempt has it */}
        {attempts.length > 0 && attempts.some((a) => a.learningObjective) && (
          <div className="bg-[#1F3864]/5 border-b px-4 py-2.5 flex items-start gap-2">
            <Target className="h-4 w-4 text-[#1F3864] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#1F3864] uppercase tracking-wide">Tujuan Pembelajaran</p>
              <p className="text-xs text-slate-600 mt-0.5 break-words">{attempts.find((a) => a.learningObjective)?.learningObjective}</p>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-center">NISN</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Benar</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1"><CircleSlash className="h-3.5 w-3.5 text-red-500" />Salah</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1"><CircleSlash className="h-3.5 w-3.5 text-gray-400" />Tidak Dijawab</div>
                </TableHead>
                <TableHead className="text-center">Skor</TableHead>
                <TableHead className="w-32 text-center">Nilai (%)</TableHead>
                <TableHead className="w-28 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48">
                    <EmptyState
                      icon={ClipboardList}
                      title="Belum ada data nilai"
                      description={selectedExam ? 'Tidak ada siswa yang mengerjakan tryout ini.' : 'Pilih tryout untuk melihat data nilai siswa.'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt, idx) => {
                  const currentNilai = getNilai(attempt.id, attempt.percentage.toFixed(1));
                  const numNilai = parseFloat(currentNilai);
                  const nilaiColor = numNilai >= 80 ? 'text-emerald-600' : numNilai >= 60 ? 'text-amber-600' : 'text-red-600';
                  const studentName = attempt.user?.name || students.find((s) => s.id === attempt.userId)?.name || 'Unknown';
                  const studentNisn = students.find((s) => s.id === attempt.userId)?.nisn || '-';
                  return (
                    <TableRow key={attempt.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                      <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{studentName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{studentNisn}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full border-emerald-300 text-emerald-700">{attempt.totalCorrect}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full border-red-300 text-red-700">{attempt.totalWrong}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full border-gray-300 text-gray-600">{attempt.totalUnanswered}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{attempt.score}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="text"
                          value={currentNilai}
                          onChange={(e) => handleNilaiChange(attempt.id, e.target.value)}
                          className={cn('h-8 w-20 text-center text-sm font-semibold rounded-lg focus-visible:ring-[#1F3864]/30', nilaiColor)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {!attempt.isRemedial && !attempt.hasRemedial && numNilai < 80 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] rounded-lg h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleActivateRemedial(attempt.id)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Remedial
                          </Button>
                        )}
                        {!attempt.isRemedial && attempt.hasRemedial && attempt.remedialStatus && (
                          <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600">
                            Remedial {attempt.remedialStatus === 'submitted' || attempt.remedialStatus === 'graded' ? '✓' : '⏳'}
                            {attempt.activeScore !== undefined && attempt.activeScore !== attempt.score && (
                              <span className="ml-1 text-emerald-600">{attempt.activeScore}</span>
                            )}
                          </Badge>
                        )}
                        {attempt.isRemedial && (
                          <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">
                            Remedial
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. GURU ANALISIS VIEW  (UPGRADED WITH API)
// ═══════════════════════════════════════════════════════════════════

interface SubjectPerformance {
  subject: string;
  avg: number;
  max: number;
  min: number;
  students: number;
 color: string;
}

interface QuestionAnalysis {
  no: number;
  difficulty: string;
  dayaBeda: string;
  avgSkor: number;
}

function SimpleBarChart({ data, maxValue = 100 }: { data: { label: string; value: number; color?: string }[]; maxValue?: number }) {
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.min((d.value / maxValue) * 100, 100);
        const barColor = d.color || (pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500');
        return (
          <div key={i} className="group">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{d.label}</span>
              <span className="tabular-nums font-semibold">{d.value.toFixed(1)}</span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-lg bg-muted/50">
              <div
                className={cn('flex h-full items-center justify-end rounded-lg pr-2 text-xs font-medium text-white transition-all duration-700', barColor)}
                style={{ width: Math.max(pct, 8) + '%' }}
              >
                {pct > 15 && <span>{pct.toFixed(0)}%</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DistributionChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold tabular-nums">{d.value}</span>
            <div className="w-full overflow-hidden rounded-t-md bg-muted/30" style={{ height: '140px' }}>
              <div
                className={cn('w-full rounded-t-md transition-all duration-700', color)}
                style={{ height: Math.max(pct, 3) + '%', marginTop: `${100 - Math.max(pct, 3)}%` }}
              />
            </div>
            <span className="mt-1 text-[10px] text-muted-foreground text-center leading-tight">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GuruAnalisisView() {
  const user = useAppStore((s) => s.user);
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [exams, setExams] = useState<ExamPackageData[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/exams?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, [user?.schoolId]);

  const fetchAttempts = useCallback(async (examPackageId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/attempts?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      let all = Array.isArray(data) ? data : [];
      if (examPackageId) {
        all = all.filter((a: AttemptData) => a.examPackageId === examPackageId);
      }
      setAttempts(all);
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('type', 'dashboard');
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (data && typeof data === 'object') setAnalyticsData(data);
    } catch {
      // silent
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchExams();
    fetchAttempts();
    fetchAnalytics();
  }, [fetchExams, fetchAttempts, fetchAnalytics]);

  const handleExamChange = useCallback((examId: string) => {
    setSelectedExam(examId);
    fetchAttempts(examId || undefined);
  }, [fetchAttempts]);

  // Computed stats from real attempts
  const stats = useMemo(() => {
    if (attempts.length === 0) return { avg: 0, max: 0, min: 0, stdDev: 0 };
    const percentages = attempts.map((a) => a.percentage);
    const avg = percentages.reduce((s, v) => s + v, 0) / percentages.length;
    const max = Math.max(...percentages);
    const min = Math.min(...percentages);
    const variance = percentages.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / percentages.length;
    const stdDev = Math.sqrt(variance);
    return { avg: Math.round(avg * 10) / 10, max: Math.round(max * 10) / 10, min: Math.round(min * 10) / 10, stdDev: Math.round(stdDev * 10) / 10 };
  }, [attempts]);

  // Subject performance from attempts
  const subjectPerformance = useMemo((): SubjectPerformance[] => {
    if (attempts.length === 0) return [];
    const grouped: Record<string, number[]> = {};
    attempts.forEach((a) => {
      const exam = exams.find((e) => e.id === a.examPackageId);
      const subject = exam?.title || 'Lainnya';
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(a.percentage);
    });
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
    return Object.entries(grouped).map(([subject, pcts], i) => ({
      subject,
      avg: Math.round((pcts.reduce((s, v) => s + v, 0) / pcts.length) * 10) / 10,
      max: Math.round(Math.max(...pcts) * 10) / 10,
      min: Math.round(Math.min(...pcts) * 10) / 10,
      students: pcts.length,
      color: colors[i % colors.length],
    }));
  }, [attempts, exams]);

  // Question analysis (derived from attempts)
  const questionAnalysis = useMemo((): QuestionAnalysis[] => {
    if (attempts.length === 0) return [];
    // Generate per-student analysis rows
    return attempts.slice(0, 15).map((a, i) => {
      const total = a.totalCorrect + a.totalWrong + a.totalUnanswered;
      const pct = total > 0 ? (a.totalCorrect / total) * 100 : 0;
      const dayaBeda = pct >= 70 ? 'Baik' : pct >= 50 ? 'Cukup' : 'Kurang';
      const difficulty = pct >= 75 ? 'Mudah' : pct >= 50 ? 'Sedang' : 'Sulit';
      return { no: i + 1, difficulty, dayaBeda, avgSkor: Math.round(pct * 10) / 10 };
    });
  }, [attempts]);

  // Bar chart data
  const barChartData = useMemo(() => {
    return subjectPerformance.map((sp) => ({ label: sp.subject, value: sp.avg, color: sp.color }));
  }, [subjectPerformance]);

  // Distribution data
  const distributionData = useMemo(() => {
    if (attempts.length === 0) return [];
    const ranges = [
      { label: '0-20', min: 0, max: 20 },
      { label: '21-40', min: 21, max: 40 },
      { label: '41-60', min: 41, max: 60 },
      { label: '61-80', min: 61, max: 80 },
      { label: '81-100', min: 81, max: 100 },
    ];
    return ranges.map((r) => ({
      label: r.label,
      value: attempts.filter((a) => a.percentage >= r.min && a.percentage <= r.max).length,
    }));
  }, [attempts]);

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Analisis Hasil Belajar" description="Analisis mendalam hasil tryout siswa untuk evaluasi pembelajaran.">
        <Select value={selectedExam} onValueChange={handleExamChange}>
          <SelectTrigger className="w-[280px] rounded-lg focus:ring-[#1F3864]/30">
            <SelectValue placeholder="Pilih tryout..." />
          </SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={BarChart3} label="Rata-rata Kelas" value={stats.avg} gradientFrom="from-[#1F3864]" gradientTo="to-[#2d5289]" />
        <SoftStatCard icon={TrendingUp} label="Nilai Tertinggi" value={stats.max} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <SoftStatCard icon={TrendingDown} label="Nilai Terendah" value={stats.min} iconColor="text-red-600" iconBg="bg-red-50" />
        <SoftStatCard icon={Target} label="Standar Deviasi" value={stats.stdDev} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-xl shadow-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card className="rounded-xl shadow-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState icon={BarChart3} title="Belum ada data analisis" description="Data akan muncul setelah siswa mengerjakan tryout." />
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Subject Performance Bar Chart */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                    <BookMarked className="h-4 w-4" />
                  </div>
                  Performa Per Ujian
                </CardTitle>
                <CardDescription>Rata-rata nilai siswa berdasarkan ujian</CardDescription>
              </CardHeader>
              <CardContent>
                {barChartData.length > 0 ? (
                  <SimpleBarChart data={barChartData} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data</p>
                )}
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  Distribusi Nilai
                </CardTitle>
                <CardDescription>Sebaran nilai siswa dalam rentang tertentu</CardDescription>
              </CardHeader>
              <CardContent>
                {distributionData.length > 0 ? (
                  <DistributionChart data={distributionData} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subject Performance Detail */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Detail Performa Per Ujian</CardTitle>
              <CardDescription>Statistik lengkap setiap ujian yang dipilih</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {subjectPerformance.length > 0 ? subjectPerformance.map((sp) => (
                  <div key={sp.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('rounded-full text-xs', 'bg-gray-100 text-gray-700')}>{sp.subject}</Badge>
                        <span className="text-sm text-muted-foreground">{sp.students} peserta</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">Min: <span className="font-medium text-red-600">{sp.min}</span></span>
                        <span className="text-muted-foreground">Max: <span className="font-medium text-emerald-600">{sp.max}</span></span>
                        <span className="font-bold">{sp.avg}</span>
                      </div>
                    </div>
                    <PerformanceBar value={sp.avg} />
                  </div>
                )) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data performa</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question Analysis Table */}
          <Card className="rounded-xl shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Analisis Per Peserta</CardTitle>
              <CardDescription>Detail performa setiap peserta pada tryout yang dipilih</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-20 text-center">No</TableHead>
                    <TableHead className="text-center">Siswa</TableHead>
                    <TableHead className="text-center">Tingkat</TableHead>
                    <TableHead className="text-center">Kategori</TableHead>
                    <TableHead className="text-center">Skor (%)</TableHead>
                    <TableHead className="min-w-[200px]">Distribusi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionAnalysis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40">
                        <EmptyState icon={Target} title="Belum ada analisis" description="Data analisis akan tersedia setelah ada peserta." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    questionAnalysis.map((qa, idx) => {
                      const attempt = attempts[idx];
                      return (
                        <TableRow key={qa.no} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                          <TableCell className="text-center font-semibold">{qa.no}</TableCell>
                          <TableCell className="text-center text-sm">{attempt?.user?.name || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn('rounded-full text-xs', DIFFICULTY_BADGE[qa.difficulty])}>{qa.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn('rounded-full text-xs', DAYA_BEDA_COLORS[qa.dayaBeda])}>{qa.dayaBeda}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{qa.avgSkor.toFixed(1)}</TableCell>
                          <TableCell>
                            <PerformanceBar value={qa.avgSkor} height="h-2" />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. GURU LAPORAN VIEW  (UPGRADED WITH API)
// ═══════════════════════════════════════════════════════════════════

export function GuruLaporanView() {
  const user = useAppStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('buat');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [exams, setExams] = useState<ExamPackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  // Printable report state
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState('per-tryout');
  const [reportExamId, setReportExamId] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('role', 'SISWA');
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    }
  }, [user?.schoolId]);

  const fetchAttempts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/attempts?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setAttempts(Array.isArray(data) ? data : []);
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchExams = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.schoolId) params.set('schoolId', user.schoolId);
      const res = await fetch(`/api/exams?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchStudents();
    fetchAttempts();
    fetchExams();
  }, [fetchStudents, fetchAttempts, fetchExams]);

  const handleGenerate = useCallback((reportId: string, title: string) => {
    setGenerating(reportId);
    setTimeout(() => {
      setGenerating(null);
      setReportType(reportId);
      setShowReport(true);
      toast.success('Laporan "' + title + '" berhasil dibuat!');
    }, 1200);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Report data computations
  const reportData = useMemo(() => {
    if (reportType === 'per-tryout') {
      const exam = exams.find((e) => e.id === reportExamId);
      const filtered = reportExamId ? attempts.filter((a) => a.examPackageId === reportExamId) : attempts;
      const sorted = [...filtered].sort((a, b) => b.percentage - a.percentage);
      return { title: exam?.title || 'Semua Tryout', subtitle: `Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, entries: sorted.map((a, i) => ({ no: i + 1, name: a.user?.name || '-', nisn: students.find((s) => s.id === a.userId)?.nisn || '-', score: a.percentage, correct: a.totalCorrect, wrong: a.totalWrong, unanswered: a.totalUnanswered, tka: a.tkaPrediction })) };
    }
    if (reportType === 'peringkat') {
      const studentMap = new Map<string, { name: string; nisn: string; totalScore: number; count: number }>();
      attempts.forEach((a) => {
        const existing = studentMap.get(a.userId) || { name: a.user?.name || '-', nisn: students.find((s) => s.id === a.userId)?.nisn || '-', totalScore: 0, count: 0 };
        studentMap.set(a.userId, { ...existing, name: a.user?.name || existing.name, totalScore: existing.totalScore + a.percentage, count: existing.count + 1 });
      });
      const ranked = Array.from(studentMap.entries()).map(([userId, data]) => ({ ...data, userId, avg: Math.round(data.totalScore / data.count * 10) / 10 })).sort((a, b) => b.avg - a.avg);
      return { title: 'Laporan Peringkat Siswa', subtitle: `Total ${ranked.length} siswa`, entries: ranked.map((r, i) => ({ no: i + 1, name: r.name, nisn: r.nisn, score: r.avg, correct: 0, wrong: 0, unanswered: 0, tka: null })) };
    }
    if (reportType === 'per-matapelajaran') {
      const examGroups = new Map<string, { examTitle: string; pcts: number[] }>();
      attempts.forEach((a) => {
        const exam = exams.find((e) => e.id === a.examPackageId);
        const title = exam?.title || 'Lainnya';
        const existing = examGroups.get(title) || { examTitle: title, pcts: [] };
        examGroups.set(title, { ...existing, pcts: [...existing.pcts, a.percentage] });
      });
      const entries = Array.from(examGroups.values()).map((g) => ({ no: 0, name: g.examTitle, nisn: '', score: Math.round(g.pcts.reduce((s, v) => s + v, 0) / g.pcts.length * 10) / 10, correct: g.pcts.length, wrong: 0, unanswered: 0, tka: null }));
      return { title: 'Laporan Per Mata Pelajaran', subtitle: `Total ${entries.length} ujian`, entries };
    }
    // Per siswa
    const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
    return { title: 'Laporan Per Siswa', subtitle: `Total ${sortedStudents.length} siswa`, entries: sortedStudents.map((s, i) => {
      const studentAttempts = attempts.filter((a) => a.userId === s.id);
      const avgPct = studentAttempts.length > 0 ? Math.round(studentAttempts.reduce((sum, a) => sum + a.percentage, 0) / studentAttempts.length * 10) / 10 : 0;
      return { no: i + 1, name: s.name, nisn: s.nisn || '-', score: avgPct, correct: studentAttempts.length, wrong: 0, unanswered: 0, tka: null };
    })};
  }, [reportType, reportExamId, attempts, students, exams]);

  return (
    <div className="space-y-6">
      <PageHeader icon={FileBarChart} title="Laporan Siswa" description="Buat, unduh, dan kelola laporan hasil belajar siswa." />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="buat" className="transition-all duration-200">Buat Laporan</TabsTrigger>
          <TabsTrigger value="riwayat" className="transition-all duration-200">Riwayat Laporan</TabsTrigger>
        </TabsList>

        {/* Buat Laporan */}
        <TabsContent value="buat" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {REPORT_TYPES.map((rt) => {
              const Icon = rt.icon;
              const isGenerating = generating === rt.id;
              return (
                <Card key={rt.id} className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', rt.bgColor, rt.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{rt.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{rt.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                      onClick={() => { handleGenerate(rt.id, rt.title); setReportExamId(''); }}
                      disabled={isGenerating}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {isGenerating ? 'Memproses...' : 'Cetak'}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-lg bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]"
                      onClick={() => { handleGenerate(rt.id, rt.title); setReportExamId(''); }}
                      disabled={isGenerating}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isGenerating ? 'Memproses...' : 'Unduh PDF'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Riwayat Laporan */}
        <TabsContent value="riwayat" className="mt-6">
          <Card className="rounded-xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Judul Laporan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-center">Tanggal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-24 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48">
                        <EmptyState icon={FileBarChart} title="Belum ada laporan" description="Laporan yang telah dibuat akan ditampilkan di sini." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    REPORT_TYPES.map((rt, idx) => (
                      <TableRow key={rt.id} className="even:bg-muted/30 transition-colors hover:bg-muted/50">
                        <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{rt.title}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-full text-xs">{rt.title.split(' ')[0]}</Badge></TableCell>
                        <TableCell className="text-center text-muted-foreground">{formatTanggal(new Date().toISOString())}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="rounded-full bg-emerald-100 text-xs text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Selesai</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => { setReportType(rt.id); setReportExamId(''); setShowReport(true); }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => { setReportType(rt.id); setReportExamId(''); setShowReport(true); setTimeout(() => window.print(), 300); }}><Printer className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Printable Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden rounded-xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white">
                <FileBarChart className="h-4 w-4" />
              </div>
              {reportData.title}
            </DialogTitle>
            <DialogDescription>{reportData.subtitle}</DialogDescription>
          </DialogHeader>

          {/* Exam selector for per-tryout */}
          {reportType === 'per-tryout' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium shrink-0">Pilih Ujian:</Label>
              <Select value={reportExamId} onValueChange={setReportExamId}>
                <SelectTrigger className="rounded-lg focus:ring-[#1F3864]/30">
                  <SelectValue placeholder="Semua Ujian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Ujian</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Print-friendly content */}
          <div className="flex-1 overflow-y-auto">
            <div id="printable-report" className="space-y-4 p-1">
              {/* Report header */}
              <div className="rounded-xl border bg-gradient-to-r from-[#1F3864]/5 to-[#2d5289]/5 p-4">
                <h2 className="text-lg font-bold text-[#1F3864]">{reportData.title}</h2>
                <p className="text-sm text-muted-foreground">{reportData.subtitle}</p>
                {reportData.entries.length > 0 && (
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-muted-foreground">Peserta: <span className="font-semibold text-foreground">{reportData.entries.length}</span></span>
                    <span className="text-muted-foreground">Rata-rata: <span className="font-semibold text-foreground">{reportData.entries.length > 0 ? (reportData.entries.reduce((s, e) => s + e.score, 0) / reportData.entries.length).toFixed(1) : 0}</span></span>
                  </div>
                )}
              </div>

              {/* Report table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-center">No</th>
                      <th className="p-2 text-left">Nama</th>
                      {reportType !== 'per-matapelajaran' && <th className="p-2 text-center">NISN</th>}
                      <th className="p-2 text-center">Nilai</th>
                      {reportType === 'per-tryout' && <th className="p-2 text-center">Benar</th>}
                      {reportType === 'per-tryout' && <th className="p-2 text-center">Salah</th>}
                      {reportType === 'per-tryout' && <th className="p-2 text-center">Tidak Dijawab</th>}
                      {reportType === 'per-tryout' && <th className="p-2 text-center">Prediksi TKA</th>}
                      {reportType === 'per-matapelajaran' && <th className="p-2 text-center">Peserta</th>}
                      {reportType === 'per-siswa' && <th className="p-2 text-center">Jumlah Ujian</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.entries.map((entry) => {
                      const nilaiColor = entry.score >= 80 ? 'text-emerald-600' : entry.score >= 60 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <tr key={entry.no} className="border-b even:bg-muted/30">
                          <td className="p-2 text-center">{entry.no}</td>
                          <td className="p-2 font-medium">{entry.name}</td>
                          {reportType !== 'per-matapelajaran' && <td className="p-2 text-center text-muted-foreground">{entry.nisn}</td>}
                          <td className={cn('p-2 text-center font-bold', nilaiColor)}>{entry.score.toFixed(1)}</td>
                          {reportType === 'per-tryout' && <td className="p-2 text-center"><span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium px-1.5">{entry.correct}</span></td>}
                          {reportType === 'per-tryout' && <td className="p-2 text-center"><span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-red-100 text-red-700 text-xs font-medium px-1.5">{entry.wrong}</span></td>}
                          {reportType === 'per-tryout' && <td className="p-2 text-center"><span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-gray-100 text-gray-700 text-xs font-medium px-1.5">{entry.unanswered}</span></td>}
                          {reportType === 'per-tryout' && <td className="p-2 text-center font-semibold">{entry.tka || '-'}</td>}
                          {reportType === 'per-matapelajaran' && <td className="p-2 text-center">{entry.correct}</td>}
                          {reportType === 'per-siswa' && <td className="p-2 text-center">{entry.correct}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 print:hidden">
            <Button variant="outline" className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]" onClick={() => setShowReport(false)}>
              Tutup
            </Button>
            <Button
              className="rounded-lg bg-[#1F3864] transition-all duration-200 hover:bg-[#152850] hover:shadow-sm active:scale-[0.98]"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Cetak Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


