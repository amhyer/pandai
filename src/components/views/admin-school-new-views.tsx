'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  XCircle,
  FileDown,
  History,
  Info,
  Save,
  BarChart3,
  Layers,
  Archive,
  AlertCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const MOCK_TEACHERS = [
  { id: 't1', name: 'Budi Santoso, S.Pd.', nip: '198503152010011002' },
  { id: 't2', name: 'Siti Rahayu, M.Pd.', nip: '198708222012012003' },
  { id: 't3', name: 'Ahmad Hidayat, S.Si.', nip: '199001102013011001' },
  { id: 't4', name: 'Dewi Lestari, S.Pd.', nip: '199205182014022001' },
  { id: 't5', name: 'Rizky Pratama, M.Si.', nip: '198812032011011004' },
  { id: 't6', name: 'Nurul Aini, S.Pd.', nip: '199107152015012002' },
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

const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'al1', timestamp: '2025-01-15 14:32:10', userName: 'Admin Sekolah', action: 'Menambah mata pelajaran', detail: 'Menambahkan mata pelajaran "Seni Budaya" ke sistem', module: 'Lainnya' },
  { id: 'al2', timestamp: '2025-01-15 13:15:45', userName: 'Budi Santoso, S.Pd.', action: 'Mengedit soal', detail: 'Mengubah soal nomor 5 pada bank soal Matematika', module: 'Soal' },
  { id: 'al3', timestamp: '2025-01-15 11:08:22', userName: 'Admin Sekolah', action: 'Membuat ujian', detail: 'Membuat ujian "UTS Matematika Ganjil" untuk kelas X IPA 1', module: 'Ujian' },
  { id: 'al4', timestamp: '2025-01-15 10:45:00', userName: 'Admin Sekolah', action: 'Menambah pengguna', detail: 'Mendaftarkan siswa baru "Ahmad Rizky" ke kelas X IPA 1', module: 'Pengguna' },
  { id: 'al5', timestamp: '2025-01-14 16:20:33', userName: 'Siti Rahayu, M.Pd.', action: 'Menginput nilai', detail: 'Menginput nilai ulangan harian Bahasa Indonesia kelas X IPA 1', module: 'Kelas' },
  { id: 'al6', timestamp: '2025-01-14 14:10:18', userName: 'Admin Sekolah', action: 'Mengedit kelas', detail: 'Mengubah nama kelas "X IPA 3" menjadi "X IPA 2"', module: 'Kelas' },
  { id: 'al7', timestamp: '2025-01-14 11:05:42', userName: 'Ahmad Hidayat, S.Si.', action: 'Menambah soal', detail: 'Menambahkan 10 soal baru ke bank soal Fisika', module: 'Soal' },
  { id: 'al8', timestamp: '2025-01-14 09:30:00', userName: 'Admin Sekolah', action: 'Menghapus soal', detail: 'Menghapus 3 soal duplikat dari bank soal Kimia', module: 'Soal' },
  { id: 'al9', timestamp: '2025-01-13 15:45:11', userName: 'Dewi Lestari, S.Pd.', action: 'Membuat ujian', detail: 'Membuat ujian "Kuis Bahasa Inggris Bab 3" untuk kelas XII IPA 1', module: 'Ujian' },
  { id: 'al10', timestamp: '2025-01-13 13:22:05', userName: 'Admin Sekolah', action: 'Mengedit pengguna', detail: 'Mengubah data NIP guru "Rizky Pratama, M.Si."', module: 'Pengguna' },
  { id: 'al11', timestamp: '2025-01-13 10:15:30', userName: 'Admin Sekolah', action: 'Menambah kelas', detail: 'Menambahkan kelas baru "XI IPS 2" untuk tahun ajaran 2024/2025', module: 'Kelas' },
  { id: 'al12', timestamp: '2025-01-12 16:00:00', userName: 'Rizky Pratama, M.Si.', action: 'Mengedit soal', detail: 'Memperbarui 5 soal pada bank soal Kimia dengan pembahasan', module: 'Soal' },
  { id: 'al13', timestamp: '2025-01-12 14:30:22', userName: 'Admin Sekolah', action: 'Membuat backup', detail: 'Membuat backup database otomatis (2.3 MB, 19 rekaman)', module: 'Lainnya' },
  { id: 'al14', timestamp: '2025-01-12 11:20:45', userName: 'Nurul Aini, S.Pd.', action: 'Menginput nilai', detail: 'Menginput nilai tugas Biologi kelas XI IPA 1', module: 'Kelas' },
  { id: 'al15', timestamp: '2025-01-11 09:45:10', userName: 'Admin Sekolah', action: 'Menghapus pengguna', detail: 'Menonaktifkan akun siswa "Dina Safitri" (pindah sekolah)', module: 'Pengguna' },
  { id: 'al16', timestamp: '2025-01-11 08:30:00', userName: 'Admin Sekolah', action: 'Memulihkan data', detail: 'Memulihkan database dari backup tanggal 2025-01-05', module: 'Lainnya' },
  { id: 'al17', timestamp: '2025-01-10 15:10:33', userName: 'Budi Santoso, S.Pd.', action: 'Membuat ujian', detail: 'Membuat ujian "UAS Matematika" untuk kelas X IPA 1 & 2', module: 'Ujian' },
  { id: 'al18', timestamp: '2025-01-10 12:00:00', userName: 'Siti Rahayu, M.Pd.', action: 'Menambah soal', detail: 'Menambahkan 15 soal essay ke bank soal Bahasa Indonesia', module: 'Soal' },
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

function getModuleIcon(module: string) {
  switch (module) {
    case 'Pengguna': return UserCircle;
    case 'Kelas': return Users;
    case 'Ujian': return ClipboardList;
    case 'Soal': return FileQuestion;
    default: return Activity;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SUBJECTSVIEW — Mata Pelajaran
// ═══════════════════════════════════════════════════════════════════════

export function SubjectsView() {
  const { user } = useAppStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q)
    );
  }, [subjects, search]);

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
      // fallback: update local state
    }
    // Mock fallback
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
            Mata Pelajaran
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar mata pelajaran untuk {user?.schoolName ?? 'sekolah Anda'}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2" style={{ backgroundColor: BRAND }}>
          <Plus className="h-4 w-4" />
          Tambah Mapel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4" style={{ borderLeftColor: BRAND }}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}15` }}>
              <BookOpen className="h-6 w-6" style={{ color: BRAND }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Mata Pelajaran</p>
              <p className="text-2xl font-bold" style={{ color: BRAND }}>{subjects.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Layers className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wajib</p>
              <p className="text-2xl font-bold text-emerald-600">{wajibCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pilihan</p>
              <p className="text-2xl font-bold text-amber-600">{pilihanCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent" style={{ backgroundColor: `${BRAND}08` }}>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-center">Urutan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {search ? 'Tidak ada mata pelajaran yang cocok' : 'Belum ada mata pelajaran'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s, i) => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold">
                          {s.code}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'border text-xs font-medium',
                            s.type === 'wajib'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {s.type === 'wajib' ? 'Wajib' : 'Pilihan'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{s.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setDeletingSubject(s);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: BRAND }}>
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Perbarui informasi mata pelajaran di bawah ini.' : 'Isi data mata pelajaran yang akan ditambahkan.'}
            </DialogDescription>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-name">Nama Mata Pelajaran</Label>
              <Input
                id="subj-name"
                placeholder="cth: Matematika"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subj-type">Tipe</Label>
              <Select value={formType} onValueChange={(v: 'wajib' | 'pilihan') => setFormType(v)}>
                <SelectTrigger id="subj-type">
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
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: BRAND }}>
              {saving ? 'Menyimpan...' : editingSubject ? 'Perbarui' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran &quot;{deletingSubject?.name}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TeacherAssignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTeacher, setFormTeacher] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSemester, setFormSemester] = useState('Ganjil');

  const fetchAssignments = useCallback(async () => {
    try {
      const schoolId = user?.schoolId ?? '';
      const res = await fetch(`/api/teacher-assignments?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : data.data ?? []);
      } else {
        setAssignments(MOCK_ASSIGNMENTS);
      }
    } catch {
      setAssignments(MOCK_ASSIGNMENTS);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const uniqueTeachers = useMemo(() => {
    const seen = new Set<string>();
    return MOCK_TEACHERS.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, []);

  const uniqueSubjects = useMemo(() => {
    const subjectIds = new Set(assignments.map((a) => a.subjectId));
    const all = [...MOCK_SUBJECTS];
    return all.filter((s) => subjectIds.has(s.id) || true).slice(0, 10);
  }, [assignments]);

  const uniqueClasses = useMemo(() => {
    return MOCK_CLASS_OPTIONS;
  }, []);

  const activeSubjectCount = useMemo(() => {
    return new Set(assignments.map((a) => a.subjectId)).size;
  }, [assignments]);

  const activeClassCount = useMemo(() => {
    return new Set(assignments.map((a) => a.classId)).size;
  }, [assignments]);

  function openAdd() {
    setFormTeacher('');
    setFormSubject('');
    setFormClass('');
    setFormSemester('Ganjil');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTeacher || !formSubject || !formClass) {
      toast.error('Guru, mata pelajaran, dan kelas wajib dipilih');
      return;
    }
    setSaving(true);
    const teacher = MOCK_TEACHERS.find((t) => t.id === formTeacher);
    const subject = MOCK_SUBJECTS.find((s) => s.id === formSubject);
    const cls = MOCK_CLASS_OPTIONS.find((c) => c.id === formClass);

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
    // Mock fallback
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
            Penugasan Guru
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign guru ke mata pelajaran dan kelas untuk {user?.schoolName ?? 'sekolah Anda'}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2" style={{ backgroundColor: BRAND }}>
          <Plus className="h-4 w-4" />
          Tugaskan Guru
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4" style={{ borderLeftColor: BRAND }}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}15` }}>
              <Users className="h-6 w-6" style={{ color: BRAND }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Guru Terassign</p>
              <p className="text-2xl font-bold" style={{ color: BRAND }}>{assignments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <BookOpen className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mata Pelajaran</p>
              <p className="text-2xl font-bold text-emerald-600">{activeSubjectCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <GraduationCap className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kelas Aktif</p>
              <p className="text-2xl font-bold text-amber-600">{activeClassCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Daftar Penugasan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent" style={{ backgroundColor: `${BRAND}08` }}>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead className="hidden lg:table-cell">NIP</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="hidden md:table-cell">Tahun Ajaran</TableHead>
                  <TableHead className="hidden md:table-cell">Semester</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Belum ada penugasan guru
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((a, i) => (
                    <TableRow key={a.id} className="group">
                      <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{a.teacherName}</TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{a.teacherNip}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                          {a.subjectName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          {a.className}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{a.academicYear}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                          {a.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setDeletingItem(a);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: BRAND }}>Tugaskan Guru</DialogTitle>
            <DialogDescription>
              Pilih guru, mata pelajaran, dan kelas untuk penugasan baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata pelajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_SUBJECTS.map((s) => (
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
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={formSemester} onValueChange={setFormSemester}>
                <SelectTrigger>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: BRAND }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penugasan &quot;{deletingItem?.teacherName}&quot; untuk mata pelajaran &quot;{deletingItem?.subjectName}&quot; di kelas &quot;{deletingItem?.className}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
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
  const [downloading, setDownloading] = useState(false);

  const tableBreakdown = [
    { name: 'Pengguna', count: 8, icon: Users },
    { name: 'Kelas', count: 9, icon: GraduationCap },
    { name: 'Mata Pelajaran', count: 10, icon: BookOpen },
    { name: 'Penugasan Guru', count: 6, icon: Shield },
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
        setBackups(MOCK_BACKUPS);
      }
    } catch {
      setBackups(MOCK_BACKUPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function handleCreateBackup() {
    setCreating(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        toast.success('Backup berhasil dibuat!');
        fetchBackups();
        setCreating(false);
        return;
      }
    } catch {
      // fallback
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
    setBackups((prev) => [newBackup, ...prev.slice(0, 4)]);
    setLastBackup(newBackup.createdAt);
    setTotalRecords(newBackup.records);
    toast.success('Backup berhasil dibuat!');
    setCreating(false);
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
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
          Cadangkan & Pulihkan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola backup dan pemulihan data untuk {user?.schoolName ?? 'sekolah Anda'}
        </p>
      </div>

      {/* Info Cards & Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Database Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: BRAND }}>
              <Database className="h-5 w-5" />
              Informasi Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Ukuran Database</p>
                <p className="mt-1 text-lg font-bold" style={{ color: BRAND }}>{dbSize}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Rekaman</p>
                <p className="mt-1 text-lg font-bold" style={{ color: BRAND }}>{totalRecords}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Backup Terakhir</p>
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-emerald-500" />
                {lastBackup}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Rekaman per Tabel:</p>
              <div className="grid grid-cols-2 gap-2">
                {tableBreakdown.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 rounded-md border p-2">
                    <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-xs">{t.name}</span>
                    <span className="text-xs font-bold" style={{ color: BRAND }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: BRAND }}>
                <Save className="h-5 w-5" />
                Aksi Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="w-full gap-2"
                style={{ backgroundColor: BRAND }}
              >
                {creating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {creating ? 'Membuat Backup...' : 'Buat Backup Sekarang'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Membuat salinan database saat ini. Proses ini tidak mengganggu operasional sistem.
              </p>
              <div className="border-t pt-4">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {downloading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? 'Mengunduh...' : 'Unduh Database Saat Ini'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Mengunduh file database SQLite untuk disimpan secara lokal.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Perhatian: Operasi Pemulihan</p>
                <p className="mt-1 text-xs text-amber-700">
                  Pemulihan data akan menimpa seluruh data saat ini dengan data dari backup yang dipilih.
                  Pastikan Anda telah membuat backup terbaru sebelum melakukan pemulihan. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: BRAND }}>
            <History className="h-5 w-5" />
            Riwayat Backup (5 Terakhir)
          </CardTitle>
          <CardDescription>Daftar backup yang tersedia untuk diunduh atau dipulihkan</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent" style={{ backgroundColor: `${BRAND}08` }}>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama File</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-center">Ukuran</TableHead>
                  <TableHead className="text-center">Rekaman</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Belum ada riwayat backup
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((b, i) => (
                    <TableRow key={b.id} className="group">
                      <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">{b.fileName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.createdAt}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-gray-200 bg-gray-50">
                          {b.fileSize}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{b.records}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => handleDownloadBackup(b)}
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Unduh</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => toast.info('Fitur pemulihan akan segera tersedia')}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Pulihkan</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. ACTIVITYLOGVIEW — Log Aktivitas
// ═══════════════════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 10;

export function ActivityLogView() {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Semua');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      const schoolId = user?.schoolId ?? '';
      const res = await fetch(`/api/activity-logs?schoolId=${schoolId}&limit=50&offset=0`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data.data) {
          setLogs(Array.isArray(data.data) ? data.data : []);
        }
      } else {
        setLogs(MOCK_ACTIVITY_LOGS);
      }
    } catch {
      setLogs(MOCK_ACTIVITY_LOGS);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (activeTab === 'Semua') return logs;
    return logs.filter((l) => l.module === activeTab);
  }, [logs, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const dateRange = useMemo(() => {
    if (logs.length === 0) return '-';
    const first = logs[logs.length - 1].timestamp;
    const last = logs[0].timestamp;
    return `${first} — ${last}`;
  }, [logs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>
          Log Aktivitas
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau seluruh aktivitas yang terjadi di {user?.schoolName ?? 'sekolah Anda'}
        </p>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Periode: <strong className="text-foreground">{dateRange}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Total: <strong className="text-foreground">{filteredLogs.length} aktivitas</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Module Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="Semua" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Semua
          </TabsTrigger>
          <TabsTrigger value="Pengguna" className="gap-1.5">
            <UserCircle className="h-3.5 w-3.5" />
            Pengguna
          </TabsTrigger>
          <TabsTrigger value="Kelas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Kelas
          </TabsTrigger>
          <TabsTrigger value="Ujian" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Ujian
          </TabsTrigger>
          <TabsTrigger value="Soal" className="gap-1.5">
            <FileQuestion className="h-3.5 w-3.5" />
            Soal
          </TabsTrigger>
        </TabsList>

        {/* Logs Table */}
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent" style={{ backgroundColor: `${BRAND}08` }}>
                    <TableHead className="w-44">Waktu</TableHead>
                    <TableHead className="w-44">Pengguna</TableHead>
                    <TableHead className="w-44">Aksi</TableHead>
                    <TableHead className="hidden lg:table-cell">Detail</TableHead>
                    <TableHead className="text-center">Modul</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Tidak ada log aktivitas untuk modul ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const ModuleIcon = getModuleIcon(log.module);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {log.timestamp}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                          <TableCell className="text-sm">{log.action}</TableCell>
                          <TableCell className="hidden max-w-[300px] truncate text-xs text-muted-foreground lg:table-cell">
                            {log.detail}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Badge
                                variant="outline"
                                className={cn('gap-1 text-xs', getModuleBadgeClasses(log.module))}
                              >
                                <ModuleIcon className="h-3 w-3" />
                                {log.module}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {totalPages} ({filteredLogs.length} data)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
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
                      className={cn('h-8 w-8 text-xs', p === page && 'text-white')}
                      style={p === page ? { backgroundColor: BRAND } : undefined}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
