'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Edit3, Play, Clock, Users, BookOpen, Package, ChevronRight,
  ChevronLeft, AlertCircle, CheckCircle2, GripVertical, CalendarDays, Timer,
  Target, FileText, X, Eye, Search, Loader2, ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ExamItem {
  id: string;
  examPackageId: string;
  questionId: string;
  orderNum: number;
  points: number;
  question: {
    id: string;
    content: string;
    type: string;
    options: string | null;
    subject: { name: string };
  };
}

interface ExamAssignment {
  id: string;
  examSessionId: string;
  classId: string;
  class: { id: string; name: string };
}

interface ExamSession {
  id: string;
  examPackageId: string;
  title: string;
  schoolId: string | null;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'scheduled' | 'active' | 'ended';
  assignments: ExamAssignment[];
}

interface ExamPackage {
  id: string;
  title: string;
  description: string | null;
  schoolId: string | null;
  duration: number;
  totalQuestions: number;
  status: 'draft' | 'published';
  createdBy: string | null;
  createdAt: string;
  examItems: ExamItem[];
  examSessions: ExamSession[];
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  content: string;
  type: string;
  options: string | null;
  subject: { id: string; name: string };
}

interface ClassItem {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface SelectedQuestion {
  questionId: string;
  content: string;
  type: string;
  subjectName: string;
  points: number;
  options: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function parseOptions(raw: string | null): QuestionOption[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function truncate(str: string, max: number) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'draft':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'active':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse';
    case 'scheduled':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'ended':
      return 'bg-gray-100 text-gray-500 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function typeBadgeColor(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'essay':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'true_false':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'short_answer':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'matching':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'multiple_choice': return 'PG';
    case 'essay': return 'Essay';
    case 'true_false': return 'BF';
    case 'short_answer': return 'Jawaban Singkat';
    case 'matching': return 'Menjodohkan';
    default: return type;
  }
}

const STEPS = [
  { num: 1, label: 'Informasi' },
  { num: 2, label: 'Pilih Soal' },
  { num: 3, label: 'Jadwal & Assign' },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GuruTryoutView() {
  const user = useAppStore((s) => s.user);

  // ── View state ──
  const [mode, setMode] = useState<'list' | 'create' | 'detail'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Packages ──
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ExamPackage | null>(null);

  // ── Create wizard state ──
  const [step, setStep] = useState(1);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState(60);
  const [formSubjectId, setFormSubjectId] = useState<string>('');

  // ── Questions ──
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('');

  // ── Classes & Subjects ──
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // ── Session creation state ──
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStartDate, setSessionStartDate] = useState('');
  const [sessionEndDate, setSessionEndDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // ── Delete dialog ──
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'package' | 'session'; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Edit dialog ──
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editing, setEditing] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════

  const fetchPackages = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/exams?schoolId=${user.schoolId}`);
      if (!res.ok) throw new Error('Gagal memuat paket tryout');
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat paket tryout');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchQuestions = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const res = await fetch(`/api/questions?schoolId=${user.schoolId}`);
      if (!res.ok) throw new Error('Gagal memuat bank soal');
      const data = await res.json();
      setAllQuestions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat bank soal');
    }
  }, [user?.schoolId]);

  const fetchClasses = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const res = await fetch(`/api/classes?schoolId=${user.schoolId}`);
      if (!res.ok) throw new Error('Gagal memuat data kelas');
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data kelas');
    }
  }, [user?.schoolId]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (!res.ok) throw new Error('Gagal memuat mata pelajaran');
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat mata pelajaran');
    }
  }, []);

  const fetchPackageDetail = useCallback(async (pkgId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams?id=${pkgId}&type=package`);
      if (!res.ok) throw new Error('Gagal memuat detail paket');
      const data = await res.json();
      setSelectedPackage(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat detail paket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleStartCreate = async () => {
    setMode('create');
    setStep(1);
    setFormTitle('');
    setFormDescription('');
    setFormDuration(60);
    setFormSubjectId('');
    setSelectedQuestions([]);
    setQuestionSearch('');
    setQuestionSubjectFilter('');
    setSelectedClassIds([]);
    setSessionTitle('');
    setSessionStartDate('');
    setSessionEndDate('');
    setSessionDuration(60);
    await Promise.all([fetchQuestions(), fetchClasses(), fetchSubjects()]);
  };

  const handleSelectPackage = (pkg: ExamPackage) => {
    setSelectedPackage(pkg);
    setMode('detail');
  };

  const handleBackToList = () => {
    setMode('list');
    setSelectedPackage(null);
    fetchPackages();
  };

  const handleToggleQuestionSelection = (q: Question) => {
    const isSelected = selectedQuestions.some((sq) => sq.questionId === q.id);
    if (isSelected) {
      setSelectedQuestions((prev) => prev.filter((sq) => sq.questionId !== q.id));
    } else {
      setSelectedQuestions((prev) => [
        ...prev,
        {
          questionId: q.id,
          content: q.content,
          type: q.type,
          subjectName: q.subject?.name || '-',
          points: 1,
          options: q.options,
        },
      ]);
    }
  };

  const handleRemoveSelectedQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((sq) => sq.questionId !== questionId));
  };

  const handleUpdatePoints = (questionId: string, points: number) => {
    setSelectedQuestions((prev) =>
      prev.map((sq) => (sq.questionId === questionId ? { ...sq, points } : sq)),
    );
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newList = [...selectedQuestions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    [newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]];
    setSelectedQuestions(newList);
  };

  const handleToggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId],
    );
  };

  const handleCreatePackage = async () => {
    if (!user?.schoolId) return;
    if (!formTitle.trim()) {
      toast.error('Judul tryout wajib diisi');
      return;
    }
    if (selectedQuestions.length === 0) {
      toast.error('Pilih minimal 1 soal');
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.error('Pilih minimal 1 kelas');
      return;
    }

    try {
      setSaving(true);

      // 1. Create package
      const createRes = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-package',
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          schoolId: user.schoolId,
          duration: formDuration,
          createdBy: user.id,
        }),
      });
      if (!createRes.ok) throw new Error('Gagal membuat paket tryout');
      const pkg = await createRes.json();

      // 2. Add items
      const items = selectedQuestions.map((sq, idx) => ({
        questionId: sq.questionId,
        orderNum: idx + 1,
        points: sq.points,
      }));
      const itemsRes = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-items',
          examPackageId: pkg.id,
          items,
        }),
      });
      if (!itemsRes.ok) throw new Error('Gagal menambahkan soal');

      // 3. Create session
      const sesRes = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-session',
          examPackageId: pkg.id,
          title: sessionTitle.trim() || `Sesi 1 - ${formTitle}`,
          schoolId: user.schoolId,
          classIds: selectedClassIds,
          startDate: sessionStartDate,
          endDate: sessionEndDate,
          duration: sessionDuration || formDuration,
          createdBy: user.id,
        }),
      });
      if (!sesRes.ok) throw new Error('Gagal membuat sesi');

      toast.success('Tryout berhasil dibuat!');
      setMode('list');
      await fetchPackages();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tryout');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (pkg: ExamPackage) => {
    const newStatus = pkg.status === 'draft' ? 'published' : 'draft';
    const actionLabel = newStatus === 'published' ? 'publikasikan' : 'buka draft';
    try {
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id, type: 'package', status: newStatus }),
      });
      if (!res.ok) throw new Error(`Gagal ${actionLabel} paket`);
      toast.success(`Paket berhasil di${actionLabel}`);
      await fetchPackages();
      if (selectedPackage?.id === pkg.id) {
        await fetchPackageDetail(pkg.id);
      }
    } catch (err: any) {
      toast.error(err.message || `Gagal ${actionLabel} paket`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/exams?id=${deleteTarget.id}&type=${deleteTarget.type}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Berhasil dihapus');
      setDeleteTarget(null);
      if (mode === 'detail' && deleteTarget.type === 'package') {
        handleBackToList();
      } else {
        await fetchPackages();
        if (selectedPackage) {
          await fetchPackageDetail(selectedPackage.id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (pkg: ExamPackage) => {
    setEditTitle(pkg.title);
    setEditDescription(pkg.description || '');
    setEditDuration(pkg.duration);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPackage) return;
    try {
      setEditing(true);
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPackage.id,
          type: 'package',
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          duration: editDuration,
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan perubahan');
      toast.success('Paket berhasil diperbarui');
      setShowEditDialog(false);
      await fetchPackageDetail(selectedPackage.id);
      await fetchPackages();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setEditing(false);
    }
  };

  const handleOpenCreateSession = () => {
    setSessionTitle('');
    setSessionStartDate('');
    setSessionEndDate('');
    setSessionDuration(selectedPackage?.duration || 60);
    setSelectedClassIds([]);
    setShowSessionDialog(true);
    fetchClasses();
  };

  const handleCreateSession = async () => {
    if (!user?.schoolId || !selectedPackage) return;
    if (selectedClassIds.length === 0) {
      toast.error('Pilih minimal 1 kelas');
      return;
    }
    if (!sessionStartDate || !sessionEndDate) {
      toast.error('Tanggal mulai dan selesai wajib diisi');
      return;
    }

    try {
      setCreatingSession(true);
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-session',
          examPackageId: selectedPackage.id,
          title: sessionTitle.trim() || `Sesi ${selectedPackage.examSessions.length + 1} - ${selectedPackage.title}`,
          schoolId: user.schoolId,
          classIds: selectedClassIds,
          startDate: sessionStartDate,
          endDate: sessionEndDate,
          duration: sessionDuration,
          createdBy: user.id,
        }),
      });
      if (!res.ok) throw new Error('Gagal membuat sesi');
      toast.success('Sesi berhasil dibuat!');
      setShowSessionDialog(false);
      await fetchPackageDetail(selectedPackage.id);
      await fetchPackages();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat sesi');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleActivateSession = async (session: ExamSession) => {
    try {
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id, type: 'session', status: 'active' }),
      });
      if (!res.ok) throw new Error('Gagal mengaktifkan sesi');
      toast.success('Sesi berhasil diaktifkan');
      if (selectedPackage) await fetchPackageDetail(selectedPackage.id);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengaktifkan sesi');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: STEP INDICATOR
  // ═══════════════════════════════════════════════════════════════

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                step > s.num
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step === s.num
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-white border-gray-300 text-gray-400',
              )}
            >
              {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
            </div>
            <span
              className={cn(
                'text-sm font-medium hidden sm:inline transition-colors',
                step >= s.num ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-0.5 rounded-full transition-colors',
                step > s.num ? 'bg-emerald-500' : 'bg-gray-200',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PACKAGE LIST
  // ═══════════════════════════════════════════════════════════════

  const renderPackageList = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="w-7 h-7 text-primary" />
              Tryout
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Buat dan kelola paket tryout untuk siswa
            </p>
          </div>
          <Button onClick={handleStartCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Buat Tryout Baru
          </Button>
        </div>

        {/* Empty state */}
        {packages.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Belum Ada Tryout</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-4">
                Mulai buat paket tryout pertama untuk menguji pemahaman siswa
              </p>
              <Button onClick={handleStartCreate} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Buat Tryout Baru
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Package cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 group"
              onClick={() => handleSelectPackage(pkg)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {pkg.title}
                  </CardTitle>
                  <Badge variant="outline" className={cn('shrink-0 text-xs', statusColor(pkg.status))}>
                    {pkg.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                {pkg.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {pkg.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{pkg.totalQuestions} soal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{pkg.examSessions?.length || 0} sesi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{pkg.duration} mnt</span>
                  </div>
                </div>
                <Separator className="mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(pkg.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(pkg);
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublishToggle(pkg);
                      }}
                    >
                      {pkg.status === 'draft' ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: pkg.id, type: 'package', title: pkg.title });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CREATE WIZARD
  // ═══════════════════════════════════════════════════════════════

  const filteredQuestions = allQuestions.filter((q) => {
    const matchesSearch =
      !questionSearch ||
      q.content.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesSubject =
      !questionSubjectFilter || q.subject?.id === questionSubjectFilter;
    const alreadySelected = selectedQuestions.some((sq) => sq.questionId === q.id);
    return matchesSearch && matchesSubject && !alreadySelected;
  });

  const renderCreateWizard = () => (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={handleBackToList} className="gap-2 -ml-2">
        <ChevronLeft className="w-4 h-4" />
        Kembali ke Daftar Tryout
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Plus className="w-7 h-7 text-primary" />
          Buat Tryout Baru
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ikuti langkah-langkah berikut untuk membuat paket tryout
        </p>
      </div>

      {renderStepIndicator()}

      {/* Step 1: Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Tryout</CardTitle>
            <CardDescription>Isi detail dasar paket tryout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Tryout *</Label>
              <Input
                id="title"
                placeholder="Contoh: Tryout UTBK Matematika 2025"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang tryout ini..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Durasi (menit)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  value={formDuration}
                  onChange={(e) => setFormDuration(parseInt(e.target.value) || 60)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectFilter">Mata Pelajaran (opsional)</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger id="subjectFilter">
                    <SelectValue placeholder="Semua mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua mata pelajaran</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!formTitle.trim()} className="gap-2">
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Questions */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Soal</CardTitle>
            <CardDescription>
              Pilih soal dari bank soal untuk dimasukkan ke tryout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search & filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari soal..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={questionSubjectFilter} onValueChange={setQuestionSubjectFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua mapel</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Available questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Bank Soal ({filteredQuestions.length})
                  </h3>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {filteredQuestions.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        Tidak ada soal yang tersedia
                      </div>
                    )}
                    {filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5',
                          selectedQuestions.some((sq) => sq.questionId === q.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border',
                        )}
                        onClick={() => handleToggleQuestionSelection(q)}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedQuestions.some((sq) => sq.questionId === q.id)}
                            className="mt-0.5"
                            onCheckedChange={() => handleToggleQuestionSelection(q)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{q.content}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeBadgeColor(q.type))}>
                                {typeLabel(q.type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {q.subject?.name || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Selected questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Soal Terpilih ({selectedQuestions.length})
                  </h3>
                  {selectedQuestions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive h-7"
                      onClick={() => setSelectedQuestions([])}
                    >
                      Hapus Semua
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {selectedQuestions.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        Belum ada soal terpilih
                      </div>
                    )}
                    {selectedQuestions.map((sq, idx) => (
                      <div
                        key={sq.questionId}
                        className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center gap-0.5 mt-0.5">
                            <button
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:bg-primary/20 rounded disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3 h-3 rotate-90" />
                            </button>
                            <span className="text-xs font-bold text-primary w-5 text-center">
                              {idx + 1}
                            </span>
                            <button
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedQuestions.length - 1}
                              className="p-0.5 hover:bg-primary/20 rounded disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3 h-3 -rotate-90" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{sq.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeBadgeColor(sq.type))}>
                                {typeLabel(sq.type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {sq.subjectName}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleRemoveSelectedQuestion(sq.questionId)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 pl-7">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Poin:</Label>
                          <Input
                            type="number"
                            min={1}
                            value={sq.points}
                            onChange={(e) =>
                              handleUpdatePoints(sq.questionId, parseInt(e.target.value) || 1)
                            }
                            className="h-7 w-20 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedQuestions.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">
                      Total: <span className="text-primary font-bold">{selectedQuestions.length}</span> soal
                    </span>
                    <span className="text-muted-foreground">
                      {selectedQuestions.reduce((sum, sq) => sum + sq.points, 0)} total poin
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2">
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule & Assign */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jadwal & Penugasan Kelas</CardTitle>
            <CardDescription>
              Atur jadwal dan pilih kelas yang akan mengikuti tryout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTitle">Judul Sesi</Label>
                <Input
                  id="sessionTitle"
                  placeholder={`Sesi 1 - ${formTitle}`}
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionDuration">Durasi Sesi (menit)</Label>
                <Input
                  id="sessionDuration"
                  type="number"
                  min={5}
                  value={sessionDuration || formDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value) || formDuration)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={sessionStartDate}
                  onChange={(e) => setSessionStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Selesai *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={sessionEndDate}
                  onChange={(e) => setSessionEndDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Pilih Kelas *</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedClassIds.length} kelas dipilih
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {classes.length === 0 && (
                  <div className="col-span-full text-sm text-muted-foreground text-center py-4">
                    Belum ada data kelas
                  </div>
                )}
                {classes.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleToggleClassSelection(cls.id)}
                      className={cn(
                        'p-3 rounded-lg border text-sm font-medium transition-all text-center',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border hover:border-primary/50 bg-white',
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {cls.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="text-sm font-semibold">Ringkasan Tryout</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Judul</span>
                  <p className="font-medium">{formTitle}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Soal</span>
                  <p className="font-medium">{selectedQuestions.length} soal</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Durasi</span>
                  <p className="font-medium">{sessionDuration || formDuration} mnt</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kelas</span>
                  <p className="font-medium">{selectedClassIds.length} kelas</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              <Button
                onClick={handleCreatePackage}
                disabled={saving || selectedQuestions.length === 0 || selectedClassIds.length === 0}
                className="gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Menyimpan...' : 'Buat Tryout'}
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PACKAGE DETAIL
  // ═══════════════════════════════════════════════════════════════

  const renderPackageDetail = () => {
    if (loading || !selectedPackage) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      );
    }

    const pkg = selectedPackage;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={handleBackToList} className="gap-2 -ml-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali ke Daftar Tryout
        </Button>

        {/* Package header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{pkg.title}</h1>
                  <Badge variant="outline" className={cn(statusColor(pkg.status))}>
                    {pkg.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                {pkg.description && (
                  <p className="text-muted-foreground text-sm">{pkg.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {pkg.totalQuestions} soal
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {pkg.duration} menit
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(pkg.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(pkg)} className="gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant={pkg.status === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePublishToggle(pkg)}
                  className="gap-1.5"
                >
                  {pkg.status === 'draft' ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Publish
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Buka Draft
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ id: pkg.id, type: 'package', title: pkg.title })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="questions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="questions" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Soal ({pkg.examItems?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Sesi ({pkg.examSessions?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Questions tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daftar Soal</CardTitle>
                <CardDescription>
                  Soal-soal yang termasuk dalam paket tryout ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pkg.examItems || pkg.examItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm">Belum ada soal dalam paket ini</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-2 pr-3">
                      {pkg.examItems
                        .sort((a, b) => a.orderNum - b.orderNum)
                        .map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm">{item.question?.content || '-'}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeBadgeColor(item.question?.type || ''))}>
                                  {typeLabel(item.question?.type || '')}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {item.question?.subject?.name || '-'}
                                </span>
                                <span className="text-xs text-primary font-medium">
                                  {item.points} poin
                                </span>
                              </div>
                              {/* Show options for multiple choice */}
                              {item.question?.type === 'multiple_choice' && item.question.options && (
                                <div className="mt-1.5 space-y-0.5">
                                  {parseOptions(item.question.options).map((opt, oi) => (
                                    <div
                                      key={oi}
                                      className={cn(
                                        'text-xs px-2 py-0.5 rounded flex items-center gap-1.5',
                                        opt.isCorrect
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-muted/50 text-muted-foreground',
                                      )}
                                    >
                                      <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                                      {truncate(opt.text, 80)}
                                      {opt.isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions tab */}
          <TabsContent value="sessions">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div />
                <Button onClick={handleOpenCreateSession} className="gap-2" size="sm">
                  <Plus className="w-4 h-4" />
                  Buat Sesi Baru
                </Button>
              </div>

              {!pkg.examSessions || pkg.examSessions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="w-10 h-10 mb-3 text-muted-foreground/40" />
                    <h3 className="text-sm font-medium mb-1">Belum Ada Sesi</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mb-3">
                      Buat sesi untuk mengjadwalkan tryout ke kelas-kelas tertentu
                    </p>
                    <Button onClick={handleOpenCreateSession} variant="outline" size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Buat Sesi Baru
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pkg.examSessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold">{session.title}</CardTitle>
                          <Badge variant="outline" className={cn('shrink-0 text-[10px]', statusColor(session.status))}>
                            {session.status === 'scheduled'
                              ? 'Terjadwal'
                              : session.status === 'active'
                                ? 'Aktif'
                                : 'Selesai'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>Mulai: {formatDate(session.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>Selesai: {formatDate(session.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            <span>{session.duration} menit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{session.assignments?.length || 0} kelas</span>
                          </div>
                        </div>

                        {/* Class assignments */}
                        {session.assignments && session.assignments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {session.assignments.map((a) => (
                              <Badge key={a.id} variant="secondary" className="text-[10px]">
                                <Users className="w-2.5 h-2.5 mr-1" />
                                {a.class?.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center gap-2">
                          {session.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-7"
                              onClick={() => handleActivateSession(session)}
                            >
                              <Play className="w-3 h-3" />
                              Aktifkan
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive ml-auto"
                            onClick={() =>
                              setDeleteTarget({
                                id: session.id,
                                type: 'session',
                                title: session.title,
                              })
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {mode === 'list' && renderPackageList()}
      {mode === 'create' && renderCreateWizard()}
      {mode === 'detail' && renderPackageDetail()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.type === 'package' ? 'Paket Tryout' : 'Sesi'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteTarget?.title}&quot;?
              {deleteTarget?.type === 'package' &&
                ' Semua soal dan sesi di dalamnya juga akan dihapus.'}
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Package Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Paket Tryout</DialogTitle>
            <DialogDescription>Perbarui informasi paket tryout</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Judul *</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Deskripsi</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDuration">Durasi (menit)</Label>
              <Input
                id="editDuration"
                type="number"
                min={5}
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 60)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editing}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={editing || !editTitle.trim()} className="gap-2">
              {editing && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Sesi Baru</DialogTitle>
            <DialogDescription>
              Jadwalkan sesi baru untuk paket tryout &quot;{selectedPackage?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newSessionTitle">Judul Sesi</Label>
              <Input
                id="newSessionTitle"
                placeholder={`Sesi ${((selectedPackage?.examSessions?.length || 0) + 1)} - ${selectedPackage?.title}`}
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newSessionStart">Tanggal Mulai *</Label>
                <Input
                  id="newSessionStart"
                  type="datetime-local"
                  value={sessionStartDate}
                  onChange={(e) => setSessionStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newSessionEnd">Tanggal Selesai *</Label>
                <Input
                  id="newSessionEnd"
                  type="datetime-local"
                  value={sessionEndDate}
                  onChange={(e) => setSessionEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newSessionDuration">Durasi (menit)</Label>
              <Input
                id="newSessionDuration"
                type="number"
                min={5}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value) || 60)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Pilih Kelas *</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedClassIds.length} kelas dipilih
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {classes.length === 0 && (
                  <div className="col-span-full text-sm text-muted-foreground text-center py-3">
                    Belum ada data kelas
                  </div>
                )}
                {classes.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleToggleClassSelection(cls.id)}
                      className={cn(
                        'p-2.5 rounded-lg border text-xs font-medium transition-all text-center',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border hover:border-primary/50 bg-white',
                      )}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionDialog(false)} disabled={creatingSession}>
              Batal
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={
                creatingSession ||
                selectedClassIds.length === 0 ||
                !sessionStartDate ||
                !sessionEndDate
              }
              className="gap-2"
            >
              {creatingSession && <Loader2 className="w-4 h-4 animate-spin" />}
              Buat Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
