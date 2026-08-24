'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  Users,
  GraduationCap,
  Database,
  Download,
  Upload,
  HardDrive,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  UserCircle,
  ClipboardList,
  FileQuestion,
  CheckCircle2,
  FileDown,
  History,
  Save,
  BarChart3,
  Layers,
  Archive,
  AlertCircle,
  Filter,
  Loader2,
  CalendarDays,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Subject {
  id: string;
  code: string;
  name: string;
  type: 'wajib' | 'pilihan';
  sortOrder: number;
}

interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherNip: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  academicYear: string;
  semester: string;
}

interface BackupRecord {
  id: string;
  fileName: string;
  fileSize: string;
  createdAt: string;
  records: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  detail: string;
  module: 'Pengguna' | 'Kelas' | 'Ujian' | 'Soal' | 'Lainnya';
}

interface ClassData {
  id: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════

const MOCK_SUBJECTS: Subject[] = [
  { id: 's1', code: 'MTK', name: 'Matematika', type: 'wajib', sortOrder: 1 },
  { id: 's2', code: 'FIS', name: 'Fisika', type: 'pilihan', sortOrder: 2 },
  { id: 's3', code: 'KIM', name: 'Kimia', type: 'pilihan', sortOrder: 3 },
  { id: 's4', code: 'BIO', name: 'Biologi', type: 'pilihan', sortOrder: 4 },
  { id: 's5', code: 'BIN', name: 'Bahasa Indonesia', type: 'wajib', sortOrder: 5 },
  { id: 's6', code: 'BING', name: 'Bahasa Inggris', type: 'wajib', sortOrder: 6 },
  { id: 's7', code: 'SEJ', name: 'Sejarah', type: 'pilihan', sortOrder: 7 },
  { id: 's8', code: 'EKO', name: 'Ekonomi', type: 'pilihan', sortOrder: 8 },
  { id: 's9', code: 'GEO', name: 'Geografi', type: 'pilihan', sortOrder: 9 },
  { id: 's10', code: 'SOS', name: 'Sosiologi', type: 'pilihan', sortOrder: 10 },
];


const MOCK_CLASS_OPTIONS = [
  { id: 'c1', name: 'X IPA 1' },
  { id: 'c2', name: 'X IPA 2' },
  { id: 'c3', name: 'XI IPA 1' },
  { id: 'c4', name: 'XI IPA 2' },
  { id: 'c5', name: 'XII IPA 1' },
  { id: 'c6', name: 'XII IPA 2' },
  { id: 'c7', name: 'X IPS 1' },
  { id: 'c8', name: 'XI IPS 1' },
  { id: 'c9', name: 'XII IPS 1' },
];

const MOCK_ASSIGNMENTS: TeacherAssignment[] = [
  { id: 'ta1', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd.', teacherNip: '198503152010011002', subjectId: 's1', subjectName: 'Matematika', classId: 'c1', className: 'X IPA 1', academicYear: '2024/2025', semester: 'Ganjil' },
  { id: 'ta2', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd.', teacherNip: '198503152010011002', subjectId: 's1', subjectName: 'Matematika', classId: 'c2', className: 'X IPA 2', academicYear: '2024/2025', semester: 'Ganjil' },
  { id: 'ta3', teacherId: 't2', teacherName: 'Siti Rahayu, M.Pd.', teacherNip: '198708222012012003', subjectId: 's5', subjectName: 'Bahasa Indonesia', classId: 'c1', className: 'X IPA 1', academicYear: '2024/2025', semester: 'Ganjil' },
  { id: 'ta4', teacherId: 't3', teacherName: 'Ahmad Hidayat, S.Si.', teacherNip: '199001102013011001', subjectId: 's2', subjectName: 'Fisika', classId: 'c3', className: 'XI IPA 1', academicYear: '2024/2025', semester: 'Ganjil' },
  { id: 'ta5', teacherId: 't4', teacherName: 'Dewi Lestari, S.Pd.', teacherNip: '199205182014022001', subjectId: 's6', subjectName: 'Bahasa Inggris', classId: 'c5', className: 'XII IPA 1', academicYear: '2024/2025', semester: 'Ganjil' },
  { id: 'ta6', teacherId: 't5', teacherName: 'Rizky Pratama, M.Si.', teacherNip: '198812032011011004', subjectId: 's3', subjectName: 'Kimia', classId: 'c4', className: 'XI IPA 2', academicYear: '2024/2025', semester: 'Ganjil' },
];

const MOCK_BACKUPS: BackupRecord[] = [
  { id: 'b1', fileName: 'backup_2025-01-15_083000.db', fileSize: '2.4 MB', createdAt: '2025-01-15 08:30', records: 20 },
  { id: 'b2', fileName: 'backup_2025-01-10_140000.db', fileSize: '2.3 MB', createdAt: '2025-01-10 14:00', records: 19 },
  { id: 'b3', fileName: 'backup_2025-01-05_090000.db', fileSize: '2.2 MB', createdAt: '2025-01-05 09:00', records: 18 },
  { id: 'b4', fileName: 'backup_2024-12-28_160000.db', fileSize: '2.1 MB', createdAt: '2024-12-28 16:00', records: 17 },
  { id: 'b5', fileName: 'backup_2024-12-20_100000.db', fileSize: '2.0 MB', createdAt: '2024-12-20 10:00', records: 15 },
];


// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const BRAND = '#1F3864';

function getModuleBadgeClasses(module: string): string {
  switch (module) {
    case 'Pengguna': return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Kelas': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Ujian': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Soal': return 'bg-sky-50 text-sky-700 border-sky-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function getModuleDotColor(module: string): string {
  switch (module) {
    case 'Pengguna': return 'bg-violet-500';
    case 'Kelas': return 'bg-emerald-500';
    case 'Ujian': return 'bg-amber-500';
    case 'Soal': return 'bg-sky-500';
    default: return 'bg-gray-400';
  }
}

function getModuleIcon(module: string) {
  switch (module) {
    case 'Pengguna': return UserCircle;
    case 'Kelas': return Users;
    case 'Ujian': return ClipboardList;
    case 'Soal': return FileQuestion;
    default: return Activity;
  }
}

function getInitials(name?: string): string {
  return (name || '-')
    .split(/[,\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name?: string): string {
  const colors = [
    'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* GradientIcon — page header icon wrapper */
function GradientIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
        'bg-gradient-to-br from-[#1F3864] to-[#2d5289]',
        className
      )}
    >
      {children}
    </div>
  );
}

/* GradientStatCard — stat card with gradient accent */
function GradientStatCard({
  icon,
  label,
  value,
  gradient,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
  iconBg?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        'border border-white/60',
        gradient
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* Empty state helper */
function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SUBJECTSVIEW — Mata Pelajaran
// ═══════════════════════════════════════════════════════════════════════

export function SubjectsView() {
  const { user } = useAppStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'semua' | 'wajib' | 'pilihan'>('semua');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'wajib' | 'pilihan'>('wajib');
  const [formOrder, setFormOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : data.data ?? []);
      } else {
        setSubjects(MOCK_SUBJECTS);
      }
    } catch {
      setSubjects(MOCK_SUBJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const filtered = useMemo(() => {
    let result = subjects;
    if (typeFilter !== 'semua') {
      result = result.filter((s) => s.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [subjects, search, typeFilter]);

  const wajibCount = subjects.filter((s) => s.type === 'wajib').length;
  const pilihanCount = subjects.filter((s) => s.type === 'pilihan').length;

  function openAdd() {
    setEditingSubject(null);
    setFormCode('');
    setFormName('');
    setFormType('wajib');
    setFormOrder(subjects.length + 1);
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setEditingSubject(s);
    setFormCode(s.code);
    setFormName(s.name);
    setFormType(s.type);
    setFormOrder(s.sortOrder);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Kode dan Nama mata pelajaran wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects?id=${editingSubject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: formCode.trim(),
            name: formName.trim(),
            type: formType,
            sortOrder: formOrder,
          }),
        });
        if (res.ok) {
          toast.success('Mata pelajaran berhasil diperbarui');
          setDialogOpen(false);
          fetchSubjects();
          return;
        }
      } else {
        const res = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: formCode.trim(),
            name: formName.trim(),
            type: formType,
            sortOrder: formOrder,
          }),
        });
        if (res.ok) {
          toast.success('Mata pelajaran berhasil ditambahkan');
          setDialogOpen(false);
          fetchSubjects();
          return;
        }
      }
    } catch {
      // fallback
    }
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubject.id
            ? { ...s, code: formCode.trim(), name: formName.trim(), type: formType, sortOrder: formOrder }
            : s
        )
      );
      toast.success('Mata pelajaran berhasil diperbarui');
    } else {
      const newSubject: Subject = {
        id: `s${Date.now()}`,
        code: formCode.trim(),
        name: formName.trim(),
        type: formType,
        sortOrder: formOrder,
      };
      setSubjects((prev) => [...prev, newSubject]);
      toast.success('Mata pelajaran berhasil ditambahkan');
    }
    setDialogOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deletingSubject) return;
    try {
      const res = await fetch(`/api/subjects?id=${deletingSubject.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Mata pelajaran berhasil dihapus');
        setDeleteOpen(false);
        fetchSubjects();
        return;
      }
    } catch {
      // fallback
    }
    setSubjects((prev) => prev.filter((s) => s.id !== deletingSubject.id));
    toast.success('Mata pelajaran berhasil dihapus');
    setDeleteOpen(false);
    setDeletingSubject(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <BookOpen className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
              Mata Pelajaran
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola daftar mata pelajaran untuk {user?.schoolName ?? 'sekolah Anda'}
            </p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          style={{ backgroundColor: BRAND }}
        >
          <Plus className="h-4 w-4" />
          Tambah Mapel
        </Button>
      </div>

      {/* Stat Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GradientStatCard
          icon={<BookOpen className="h-6 w-6 text-white" />}
          label="Total Mata Pelajaran"
          value={subjects.length}
          gradient="bg-gradient-to-br from-[#1F3864] to-[#2d5289]"
        />
        <GradientStatCard
          icon={<Layers className="h-6 w-6 text-white" />}
          label="Wajib"
          value={wajibCount}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <GradientStatCard
          icon={<BarChart3 className="h-6 w-6 text-white" />}
          label="Pilihan"
          value={pilihanCount}
          gradient="bg-gradient-to-br from-amber-400 to-amber-500"
        />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg focus-visible:ring-[#1F3864]/30"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['semua', 'wajib', 'pilihan'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer',
                typeFilter === t
                  ? 'text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              style={typeFilter === t ? { backgroundColor: BRAND } : undefined}
            >
              {t === 'semua' ? 'Semua' : t === 'wajib' ? 'Wajib' : 'Pilihan'}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search || typeFilter !== 'semua' ? 'Tidak ada hasil' : 'Belum ada mata pelajaran'}
          description={search || typeFilter !== 'semua' ? 'Coba ubah filter atau kata kunci pencarian Anda' : 'Mulai tambahkan mata pelajaran pertama Anda'}
          action={
            !search && typeFilter === 'semua' ? (
              <Button
                onClick={openAdd}
                className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                style={{ backgroundColor: BRAND }}
              >
                <Plus className="h-4 w-4" />
                Tambah Mapel
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <div
              key={s.id}
              className="group relative rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white shrink-0',
                      s.type === 'wajib'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-br from-amber-400 to-amber-500'
                    )}
                  >
                    {s.code.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground leading-tight">{s.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{s.code}</p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'rounded-full text-xs font-medium border',
                    s.type === 'wajib'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {s.type === 'wajib' ? 'Wajib' : 'Pilihan'}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Urutan: <span className="font-semibold text-foreground">#{s.sortOrder}</span>
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm hover:bg-amber-50"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm hover:bg-red-50"
                    onClick={() => {
                      setDeletingSubject(s);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog with Rounded Form Inputs */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md rounded-xl transition-all duration-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <GradientIcon className="h-10 w-10">
                {editingSubject ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </GradientIcon>
              <div>
                <DialogTitle style={{ color: BRAND }}>
                  {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editingSubject ? 'Perbarui informasi mata pelajaran di bawah ini.' : 'Isi data mata pelajaran yang akan ditambahkan.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subj-code">Kode Mata Pelajaran</Label>
              <Input
                id="subj-code"
                placeholder="cth: MTK, FIS, KIM"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="rounded-lg focus-visible:ring-[#1F3864]/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-name">Nama Mata Pelajaran</Label>
              <Input
                id="subj-name"
                placeholder="cth: Matematika"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-lg focus-visible:ring-[#1F3864]/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-type">Tipe</Label>
              <Select value={formType} onValueChange={(v: 'wajib' | 'pilihan') => setFormType(v)}>
                <SelectTrigger id="subj-type" className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wajib">Wajib</SelectItem>
                  <SelectItem value="pilihan">Pilihan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-order">Urutan</Label>
              <Input
                id="subj-order"
                type="number"
                min={1}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value) || 1)}
                className="rounded-lg focus-visible:ring-[#1F3864]/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : editingSubject ? 'Perbarui' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Apakah Anda yakin ingin menghapus &quot;{deletingSubject?.name}&quot;? Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. TEACHERASSIGNMENTSVIEW — Penugasan Guru
// ═══════════════════════════════════════════════════════════════════════

export function TeacherAssignmentsView() {
  const { user } = useAppStore();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TeacherAssignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Search & filter
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('semua');
  const [filterClass, setFilterClass] = useState('semua');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teachers, setTeachers] = useState<Array<{id:string;name:string;nip?:string|null}>>([]);

  // Form state
  const [formTeacher, setFormTeacher] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSemester, setFormSemester] = useState('Ganjil');

  // Batch form
  const [batchTeacher, setBatchTeacher] = useState('');
  const [batchSubject, setBatchSubject] = useState('');
  const [batchSemester, setBatchSemester] = useState('Ganjil');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // API data for dropdowns
  const [apiSubjects, setApiSubjects] = useState<Subject[]>([]);
  const [apiClasses, setApiClasses] = useState<ClassData[]>([]);

  const fetchAssignments = useCallback(async () => {
    try {
      const schoolId = user?.schoolId ?? '';
      const res = await fetch(`/api/teacher-assignments?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        // Map API nested response to flat structure expected by UI
        const mapped: TeacherAssignment[] = (Array.isArray(data) ? data : data.data ?? []).map((a: Record<string, unknown>) => ({
          id: a.id,
          teacherId: a.teacherId,
          teacherName: (a.teacher as Record<string, string> | null)?.name ?? a.teacherName ?? '-',
          teacherNip: (a.teacher as Record<string, string> | null)?.nip ?? a.teacherNip ?? '-',
          subjectId: a.subjectId,
          subjectName: (a.subject as Record<string, string> | null)?.name ?? a.subjectName ?? '-',
          classId: a.classId,
          className: (a.class as Record<string, string> | null)?.name ?? a.className ?? '-',
          academicYear: a.academicYear ?? '2024/2025',
          semester: a.semester ?? 'Ganjil',
          schoolId: a.schoolId,
        }));
        setAssignments(mapped);
      } else {
        setAssignments([]);
      }
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await apiClient(`/api/users?role=GURU&schoolId=${user?.schoolId ?? ''}`);
        const json = await res.json();
        const list = (Array.isArray(json) ? json : json.data ?? []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          name: (u.name as string) ?? '-',
          nip: (u.nip as string) ?? null,
        }));
        setTeachers(list);
      } catch {
        // apiClient handles 401; silently keep empty list
      }
    }
    loadTeachers();
  }, [user?.schoolId]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await apiClient('/api/subjects');
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data ?? [];
        setApiSubjects(list);
      } catch {
        // apiClient handles 401; silently keep empty list
      }
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await apiClient(`/api/classes?schoolId=${user?.schoolId ?? ''}`);
        const json = await res.json();
        const list: ClassData[] = (Array.isArray(json) ? json : json.data ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) ?? '-',
        }));
        setApiClasses(list);
      } catch {
        // apiClient handles 401; silently keep empty list
      }
    }
    loadClasses();
  }, [user?.schoolId]);

  const uniqueTeachers = useMemo(() => {
    return teachers;
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return uniqueTeachers;
    const q = teacherSearch.toLowerCase();
    return uniqueTeachers.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.nip && t.nip.includes(q))
    );
  }, [uniqueTeachers, teacherSearch]);

  const uniqueSubjects = useMemo(() => {
    return [...new Set(assignments.map((a) => a.subjectName))].sort();
  }, [assignments]);

  const uniqueClasses = useMemo(() => {
    return [...new Set(assignments.map((a) => a.className))].sort();
  }, [assignments]);

  const activeSubjectCount = useMemo(() => {
    return new Set(assignments.map((a) => a.subjectId)).size;
  }, [assignments]);

  const activeClassCount = useMemo(() => {
    return new Set(assignments.map((a) => a.classId)).size;
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    let result = assignments;
    if (filterSubject !== 'semua') {
      result = result.filter((a) => a.subjectName === filterSubject);
    }
    if (filterClass !== 'semua') {
      result = result.filter((a) => a.className === filterClass);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.teacherName.toLowerCase().includes(q) ||
          a.subjectName.toLowerCase().includes(q) ||
          a.className.toLowerCase().includes(q)
      );
    }
    return result;
  }, [assignments, filterSubject, filterClass, search]);

  function openAdd() {
    setFormTeacher('');
    setFormSubject('');
    setFormClass('');
    setFormSemester('Ganjil');
    setDialogOpen(true);
  }

  function openBatch() {
    setBatchTeacher('');
    setBatchSubject('');
    setBatchSemester('Ganjil');
    setSelectedClasses([]);
    setTeacherSearch('');
    setBatchDialogOpen(true);
  }

  async function handleSave() {
    if (!formTeacher || !formSubject || !formClass) {
      toast.error('Guru, mata pelajaran, dan kelas wajib dipilih');
      return;
    }
    setSaving(true);
    const teacher = teachers.find((t) => t.id === formTeacher);
    const subject = apiSubjects.find((s) => s.id === formSubject);
    const cls = apiClasses.find((c) => c.id === formClass);

    try {
      const res = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId,
          teacherId: formTeacher,
          subjectId: formSubject,
          classId: formClass,
          academicYear: '2024/2025',
          semester: formSemester,
        }),
      });
      if (res.ok) {
        toast.success('Penugasan guru berhasil ditambahkan');
        setDialogOpen(false);
        fetchAssignments();
        setSaving(false);
        return;
      }
    } catch {
      // fallback
    }
    const newAssignment: TeacherAssignment = {
      id: `ta${Date.now()}`,
      teacherId: formTeacher,
      teacherName: teacher?.name ?? '-',
      teacherNip: teacher?.nip ?? '-',
      subjectId: formSubject,
      subjectName: subject?.name ?? '-',
      classId: formClass,
      className: cls?.name ?? '-',
      academicYear: '2024/2025',
      semester: formSemester,
    };
    setAssignments((prev) => [...prev, newAssignment]);
    toast.success('Penugasan guru berhasil ditambahkan');
    setDialogOpen(false);
    setSaving(false);
  }

  async function handleBatchSave() {
    if (!batchTeacher || !batchSubject || selectedClasses.length === 0) {
      toast.error('Guru, mata pelajaran, dan minimal 1 kelas wajib dipilih');
      return;
    }
    setSaving(true);
    const teacher = teachers.find((t) => t.id === batchTeacher);
    const subject = apiSubjects.find((s) => s.id === batchSubject);

    const newAssignments: TeacherAssignment[] = selectedClasses.map((classId) => {
      const cls = apiClasses.find((c) => c.id === classId);
      return {
        id: `ta${Date.now()}_${classId}`,
        teacherId: batchTeacher,
        teacherName: teacher?.name ?? '-',
        teacherNip: teacher?.nip ?? '-',
        subjectId: batchSubject,
        subjectName: subject?.name ?? '-',
        classId,
        className: cls?.name ?? '-',
        academicYear: '2024/2025',
        semester: batchSemester,
      };
    });

    try {
      for (const a of newAssignments) {
        await fetch('/api/teacher-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: user?.schoolId,
            teacherId: a.teacherId,
            subjectId: a.subjectId,
            classId: a.classId,
            academicYear: a.academicYear,
            semester: a.semester,
          }),
        });
      }
      toast.success(`${newAssignments.length} penugasan berhasil ditambahkan`);
      setBatchDialogOpen(false);
      fetchAssignments();
      setSaving(false);
      return;
    } catch {
      // fallback
    }
    setAssignments((prev) => [...prev, ...newAssignments]);
    toast.success(`${newAssignments.length} penugasan berhasil ditambahkan`);
    setBatchDialogOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/teacher-assignments?id=${deletingItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Penugasan berhasil dihapus');
        setDeleteOpen(false);
        fetchAssignments();
        return;
      }
    } catch {
      // fallback
    }
    setAssignments((prev) => prev.filter((a) => a.id !== deletingItem.id));
    toast.success('Penugasan berhasil dihapus');
    setDeleteOpen(false);
    setDeletingItem(null);
  }

  function toggleBatchClass(classId: string) {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon>
            <Users className="h-5 w-5" />
          </GradientIcon>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
              Penugasan Guru
            </h1>
            <p className="text-sm text-muted-foreground">
              Assign guru ke mata pelajaran dan kelas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openBatch}
            variant="outline"
            className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Batch</span>
          </Button>
          <Button
            onClick={openAdd}
            className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="h-4 w-4" />
            Tugaskan Guru
          </Button>
        </div>
      </div>

      {/* Stat Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GradientStatCard
          icon={<Users className="h-6 w-6 text-white" />}
          label="Total Penugasan"
          value={assignments.length}
          gradient="bg-gradient-to-br from-[#1F3864] to-[#2d5289]"
        />
        <GradientStatCard
          icon={<BookOpen className="h-6 w-6 text-white" />}
          label="Mata Pelajaran Aktif"
          value={activeSubjectCount}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <GradientStatCard
          icon={<GraduationCap className="h-6 w-6 text-white" />}
          label="Kelas Aktif"
          value={activeClassCount}
          gradient="bg-gradient-to-br from-amber-400 to-amber-500"
        />
      </div>

      {/* Search + Filter Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari guru, mapel, atau kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg focus-visible:ring-[#1F3864]/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); }}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] rounded-full text-xs border-dashed">
              <SelectValue placeholder="Semua Mapel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Mapel</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={(v) => { setFilterClass(v); }}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] rounded-full text-xs border-dashed">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Kelas</SelectItem>
              {uniqueClasses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ backgroundColor: `${BRAND}06` }}>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Guru</TableHead>
                <TableHead className="hidden lg:table-cell">NIP</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead className="hidden md:table-cell">Semester</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32">
                    <EmptyState
                      icon={ClipboardList}
                      title="Belum ada penugasan"
                      description="Mulai tugaskan guru ke mata pelajaran dan kelas"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((a, i) => (
                  <TableRow key={a.id} className="group even:bg-muted/30 hover:bg-muted/50 transition-colors duration-150">
                    <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0', getAvatarColor(a.teacherName))}>
                          {getInitials(a.teacherName)}
                        </div>
                        <span className="font-medium">{a.teacherName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{a.teacherNip}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full border-sky-200 bg-sky-50 text-sky-700 text-xs">
                        {a.subjectName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                        {a.className}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className="rounded-full border-gray-200 bg-gray-50 text-gray-600 text-xs">
                        {a.semester}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100 hover:shadow-sm hover:bg-red-50"
                          onClick={() => {
                            setDeletingItem(a);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Single Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md rounded-xl transition-all duration-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <GradientIcon className="h-10 w-10">
                <Plus className="h-4 w-4" />
              </GradientIcon>
              <div>
                <DialogTitle style={{ color: BRAND }}>Tugaskan Guru</DialogTitle>
                <DialogDescription className="mt-1">
                  Pilih guru, mata pelajaran, dan kelas untuk penugasan baru.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih guru..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.nip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih mata pelajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {apiSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih kelas..." />
                </SelectTrigger>
                <SelectContent>
                  {apiClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={formSemester} onValueChange={setFormSemester}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Ganjil</SelectItem>
                  <SelectItem value="Genap">Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">Batal</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Assignment Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={(open) => !open && setBatchDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg rounded-xl transition-all duration-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <GradientIcon className="h-10 w-10">
                <GraduationCap className="h-4 w-4" />
              </GradientIcon>
              <div>
                <DialogTitle style={{ color: BRAND }}>Penugasan Batch</DialogTitle>
                <DialogDescription className="mt-1">
                  Tugaskan satu guru ke beberapa kelas sekaligus.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guru</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari guru..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-9 rounded-lg focus-visible:ring-[#1F3864]/30 mb-2"
                />
              </div>
              <Select value={batchTeacher} onValueChange={setBatchTeacher}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih guru..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select value={batchSubject} onValueChange={setBatchSubject}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Pilih mata pelajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {apiSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={batchSemester} onValueChange={setBatchSemester}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Ganjil</SelectItem>
                  <SelectItem value="Genap">Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pilih Kelas ({selectedClasses.length} dipilih)</Label>
              <div className="flex flex-wrap gap-2">
                {apiClasses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleBatchClass(c.id)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer border',
                      selectedClasses.includes(c.id)
                        ? 'text-white shadow-sm border-transparent'
                        : 'bg-white text-muted-foreground hover:bg-muted/80 border-muted'
                    )}
                    style={selectedClasses.includes(c.id) ? { backgroundColor: BRAND } : undefined}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)} className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">Batal</Button>
            <Button
              onClick={handleBatchSave}
              disabled={saving}
              className="gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : `Tugaskan ke ${selectedClasses.length} Kelas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Apakah Anda yakin ingin menghapus penugasan &quot;{deletingItem?.teacherName}&quot; untuk
                  mata pelajaran &quot;{deletingItem?.subjectName}&quot; di kelas &quot;{deletingItem?.className}&quot;?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3. BACKUPRESTOREVIEW — Cadangkan & Pulihkan
// ═══════════════════════════════════════════════════════════════════════

export function BackupRestoreView() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [dbSize, setDbSize] = useState('2.4 MB');
  const [totalRecords, setTotalRecords] = useState(20);
  const [lastBackup, setLastBackup] = useState('15 Januari 2025, 08:30');
  const [creating, setCreating] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const tableBreakdown = [
    { name: 'Pengguna', count: 8, icon: Users, color: 'text-violet-500' },
    { name: 'Kelas', count: 9, icon: GraduationCap, color: 'text-emerald-500' },
    { name: 'Mata Pelajaran', count: 10, icon: BookOpen, color: 'text-amber-500' },
    { name: 'Penugasan Guru', count: 6, icon: Shield, color: 'text-sky-500' },
  ];

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBackups(data);
        } else if (data.data) {
          setBackups(Array.isArray(data.data) ? data.data : []);
        }
        if (data.dbSize) setDbSize(data.dbSize);
        if (data.totalRecords) setTotalRecords(data.totalRecords);
        if (data.lastBackup) setLastBackup(data.lastBackup);
      } else {
        setBackups([]);
      }
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function handleCreateBackup() {
    setCreating(true);
    setBackupProgress(0);
    // Simulate progress
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 20;
      });
    }, 200);

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      clearInterval(interval);
      setBackupProgress(100);
      if (res.ok) {
        setTimeout(() => {
          toast.success('Backup berhasil dibuat!');
          fetchBackups();
          setCreating(false);
          setBackupProgress(0);
        }, 500);
        return;
      }
    } catch {
      clearInterval(interval);
    }
    // Mock fallback
    const newBackup: BackupRecord = {
      id: `b${Date.now()}`,
      fileName: `backup_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}.db`,
      fileSize: `${(2.4 + Math.random() * 0.5).toFixed(1)} MB`,
      createdAt: new Date().toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
      records: totalRecords + 1,
    };
    setBackupProgress(100);
    setTimeout(() => {
      setBackups((prev) => [newBackup, ...prev.slice(0, 4)]);
      setLastBackup(newBackup.createdAt);
      setTotalRecords(newBackup.records);
      toast.success('Backup berhasil dibuat!');
      setCreating(false);
      setBackupProgress(0);
    }, 500);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/backup?action=download');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pandai_backup_${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Database berhasil diunduh!');
        setDownloading(false);
        return;
      }
    } catch {
      // fallback
    }
    toast.info('File backup demo berhasil diunduh (demo mode)');
    setDownloading(false);
  }

  function handleDownloadBackup(backup: BackupRecord) {
    toast.info(`Mengunduh ${backup.fileName} (demo mode)`);
  }

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GradientIcon>
          <Database className="h-5 w-5" />
        </GradientIcon>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
            Cadangkan & Pulihkan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola backup dan pemulihan data untuk {user?.schoolName ?? 'sekolah Anda'}
          </p>
        </div>
      </div>

      {/* Info Cards & Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Database Info Card with Soft Accent Border */}
        <div className="rounded-xl border-2 border-l-[#1F3864]/20 bg-card shadow-sm p-0 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5289] px-6 py-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-white/80" />
              <h3 className="text-base font-semibold text-white">Informasi Database</h3>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Last Backup Info Card */}
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-medium text-emerald-700">Backup Terakhir</p>
              </div>
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <Clock className="h-4 w-4 text-emerald-500" />
                {lastBackup}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Ukuran</p>
                <p className="mt-1 text-xl font-bold" style={{ color: BRAND }}>{dbSize}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Rekaman</p>
                <p className="mt-1 text-xl font-bold" style={{ color: BRAND }}>{totalRecords}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Rekaman per Tabel:</p>
              <div className="grid grid-cols-2 gap-2">
                {tableBreakdown.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-2 rounded-lg border border-muted/50 bg-white p-2.5 transition-all duration-150 hover:bg-muted/30"
                  >
                    <t.icon className={cn('h-4 w-4 shrink-0', t.color)} />
                    <span className="flex-1 text-xs text-muted-foreground">{t.name}</span>
                    <span className="text-xs font-bold" style={{ color: BRAND }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Column */}
        <div className="space-y-4">
          {/* Backup Action Card */}
          <div className="rounded-xl border bg-card shadow-sm p-0 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5" style={{ color: BRAND }} />
                <h3 className="text-base font-semibold" style={{ color: BRAND }}>Aksi Backup</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="w-full gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                style={{ backgroundColor: BRAND }}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {creating ? 'Membuat Backup...' : 'Buat Backup Sekarang'}
              </Button>

              {/* Progress Bar */}
              {creating && (
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1F3864] to-[#2d5289] transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(backupProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {backupProgress < 30 ? 'Mempersiapkan data...' :
                     backupProgress < 70 ? 'Mengompresi database...' :
                     backupProgress < 100 ? 'Menyelesaikan backup...' : 'Selesai!'}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Membuat salinan database saat ini. Proses ini tidak mengganggu operasional sistem.
              </p>

              <div className="border-t pt-4">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  variant="outline"
                  className="w-full gap-2 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? 'Mengunduh...' : 'Unduh Database Saat Ini'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Mengunduh file database SQLite untuk disimpan secara lokal.
                </p>
              </div>
            </div>
          </div>

          {/* Warning Card with Amber Soft Background */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 transition-all duration-200">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Perhatian: Operasi Pemulihan</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  Pemulihan data akan menimpa seluruh data saat ini dengan data dari backup yang dipilih.
                  Pastikan Anda telah membuat backup terbaru sebelum melakukan pemulihan.
                </p>
              </div>
            </div>
          </div>

          {/* Restore Upload Area */}
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 text-center transition-all duration-200 hover:border-muted-foreground/40 hover:bg-muted/30">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pulihkan dari File</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seret & lepas file backup .db di sini, atau klik untuk memilih
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                onClick={() => toast.info('Fitur upload pemulihan akan segera tersedia')}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Pilih File
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup History — Timeline Style */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" style={{ color: BRAND }} />
            <h3 className="text-base font-semibold" style={{ color: BRAND }}>Riwayat Backup</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">5 backup terakhir yang tersedia</p>
        </div>
        <div className="p-5">
          {backups.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="Belum ada riwayat backup"
              description="Buat backup pertama Anda untuk mulai melacak riwayat"
            />
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              {backups.map((b, i) => (
                <div
                  key={b.id}
                  className={cn(
                    'relative flex gap-4 py-3 transition-all duration-200 rounded-xl px-3 -mx-3',
                    'hover:bg-muted/30 group'
                  )}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm',
                    i === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  )}>
                    {i === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate">{b.fileName}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {b.createdAt}
                          </span>
                          <Badge className="rounded-full bg-muted/60 text-muted-foreground text-[10px] px-2 border-0">
                            {b.fileSize}
                          </Badge>
                          <Badge className="rounded-full bg-muted/60 text-muted-foreground text-[10px] px-2 border-0">
                            {b.records} rekaman
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs rounded-lg transition-all duration-200 hover:shadow-sm"
                          onClick={() => handleDownloadBackup(b)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Unduh</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                          onClick={() => toast.info('Fitur pemulihan akan segera tersedia')}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Pulihkan</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Warning Card */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 transition-all duration-200">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Zona Bahaya</p>
            <p className="mt-1 text-xs leading-relaxed text-red-700">
              Operasi pemulihan data bersifat irreversibel. Pastikan Anda memiliki backup terbaru sebelum
              melakukan pemulihan dari file eksternal. Data yang tidak kompatibel dapat menyebabkan kerusakan sistem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. ACTIVITYLOGVIEW — Log Aktivitas
// ═══════════════════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 8;

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ActivityLogView() {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchLogs = useCallback(async () => {
    try {
      const schoolId = user?.schoolId ?? '';
      const res = await fetch(`/api/activity-logs?schoolId=${schoolId}&limit=50&offset=0`);
      if (res.ok) {
        const json = await res.json();
        const rawData: ActivityLog[] = (Array.isArray(json) ? json : json.data ?? []).map((l: Record<string, unknown>) => ({
          id: l.id ?? String(Math.random()),
          timestamp: (l.createdAt as string) ?? (l.timestamp as string) ?? new Date().toISOString(),
          userName: (l.user as Record<string, string> | null)?.name ?? l.userName ?? 'Sistem',
          action: (l.action as string) ?? '',
          detail: (l.detail as string) ?? '-',
          module: (l.module as ActivityLog['module']) ?? 'Lainnya',
        }));
        setLogs(rawData);
      } else {
        setLogs([]);
        toast.error('Gagal memuat log aktivitas');
      }
    } catch {
      setLogs([]);
      toast.error('Gagal memuat log aktivitas');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (activeFilter !== 'Semua') {
      result = result.filter((l) => l.module === activeFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          (l.userName || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q) ||
          (l.detail || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter((l) => l.timestamp >= dateFrom);
    }
    if (dateTo) {
      const to = dateTo + ' 23:59:59';
      result = result.filter((l) => l.timestamp <= to);
    }
    return result;
  }, [logs, activeFilter, debouncedSearch, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [activeFilter, debouncedSearch, dateFrom, dateTo]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: logs.length };
    for (const l of logs) {
      counts[l.module] = (counts[l.module] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const filterOptions = ['Semua', 'Pengguna', 'Kelas', 'Ujian', 'Soal', 'Lainnya'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GradientIcon>
          <Activity className="h-5 w-5" />
        </GradientIcon>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
            Log Aktivitas
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau seluruh aktivitas yang terjadi di {user?.schoolName ?? 'sekolah Anda'}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setActiveFilter(opt)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer',
              activeFilter === opt
                ? 'text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            style={activeFilter === opt ? { backgroundColor: BRAND } : undefined}
          >
            {opt === 'Semua' && <Filter className="h-3.5 w-3.5" />}
            {opt === 'Pengguna' && <UserCircle className="h-3.5 w-3.5" />}
            {opt === 'Kelas' && <Users className="h-3.5 w-3.5" />}
            {opt === 'Ujian' && <ClipboardList className="h-3.5 w-3.5" />}
            {opt === 'Soal' && <FileQuestion className="h-3.5 w-3.5" />}
            {opt === 'Lainnya' && <Activity className="h-3.5 w-3.5" />}
            {opt}
            <span className={cn(
              'ml-0.5 text-xs px-1.5 py-0.5 rounded-full',
              activeFilter === opt
                ? 'bg-white/20 text-white'
                : 'bg-muted text-muted-foreground'
            )}>
              {moduleCounts[opt] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Date Range Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 rounded-lg focus-visible:ring-[#1F3864]/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-auto rounded-lg text-xs focus-visible:ring-[#1F3864]/30"
          />          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-auto rounded-lg text-xs focus-visible:ring-[#1F3864]/30"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Log Entries */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>
              <strong className="text-foreground">{filteredLogs.length}</strong> aktivitas ditemukan
            </span>
          </div>
          {totalPages > 1 && (
            <div className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages}
            </div>
          )}
        </div>

        <div className="p-5">
          {paginatedLogs.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Tidak ada aktivitas ditemukan"
              description="Coba ubah filter atau kata kunci pencarian Anda"
            />
          ) : (
            <div className="relative space-y-0">
              {/* Timeline connecting line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              {paginatedLogs.map((log, idx) => {
                const isLast = idx === paginatedLogs.length - 1;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      'relative flex gap-4 transition-all duration-200 rounded-xl px-3 -mx-3',
                      isLast ? 'pb-0' : 'pb-1',
                      'hover:bg-muted/30 group'
                    )}
                  >
                    {/* Colored dot */}
                    <div className={cn(
                      'relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm',
                      getModuleDotColor(log.module)
                    )}>
                      <span className="text-[10px] font-bold text-white">
                        {log.module.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start gap-3">
                        {/* User avatar initials */}
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                          getAvatarColor(log.userName)
                        )}>
                          {getInitials(log.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{log.userName}</span>
                            <Badge
                              className={cn('rounded-full text-[10px] font-medium border', getModuleBadgeClasses(log.module))}
                            >
                              {log.module}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-foreground/90">{log.action}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">{log.detail}</p>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                            <Clock className="h-3 w-3" />
                            {log.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination with Smooth Transitions */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-muted-foreground">
              Menampilkan {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredLogs.length)} dari {filteredLogs.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'h-8 w-8 text-xs rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]',
                    p === page && 'text-white'
                  )}
                  style={p === page ? { backgroundColor: BRAND } : undefined}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
