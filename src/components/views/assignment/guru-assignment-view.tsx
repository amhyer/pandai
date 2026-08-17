'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Target, Plus, Eye, Pencil, Trash2, ClipboardList, Clock, Users, CheckCircle2, AlertCircle, ChevronLeft, Save, FileText, BookOpen, Loader2, Star, RotateCcw } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type SubmissionType = 'pg_only' | 'essay_only' | 'mixed';
type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
type InternalView = 'list' | 'form' | 'detail';

type SubStatus = 'belum_dikerjakan' | 'dikerjakan' | 'submitted' | 'dinilai';

interface AssignmentSummary {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  classId: string;
  deadline: string;
  learningObjective: string | null;
  submissionType: SubmissionType;
  maxScore: number;
  status: AssignmentStatus;
  _count: { questions: number; submissions: number };
}

interface AssignmentDetail extends Omit<AssignmentSummary, '_count'> {
  instructions: string | null;
  subject?: { id: string; name: string };
  classInfo?: { id: string; name: string };
  questions: QuestionItem[];
}

interface QuestionItem {
  id: string;
  question: { id: string; content: string };
  type: 'PG' | 'ESSAY';
  options?: { id: string; label: string; content: string; isCorrect: boolean }[];
}

interface QuestionBank {
  id: string;
  question: { id: string; content: string };
  type: 'PG' | 'ESSAY';
  options?: { id: string; label: string; content: string; isCorrect: boolean }[];
}

interface StudentRow {
  id: string;
  name: string;
  submissionId: string | null;
  submissionStatus: SubStatus;
  score: number | null;
  hasRemedial?: boolean;
  remedialId?: string;
  remedialStatus?: string;
  remedialScore?: number;
  activeScore?: number;
  originalScore?: number;
}

interface SubmissionDetail {
  studentId: string;
  studentName: string;
  score: number | null;
  feedback: string | null;
  essayScores?: { questionId: string; pointsEarned: number }[];
  answers: {
    id: string;
    questionId: string;
    question?: { content: string };
    answer: string;
    selectedOptionId?: string;
    pointsEarned?: number | null;
    isCorrect?: boolean | null;
  }[];
}

interface SubjectItem {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface FormData {
  title: string;
  description: string;
  instructions: string;
  subjectId: string;
  classId: string;
  deadline: string;
  learningObjective: string;
  submissionType: SubmissionType;
  maxScore: number;
  status: AssignmentStatus;
  questionIds: string[];
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const TYPE_LABELS: Record<SubmissionType, string> = {
  pg_only: 'PG Saja',
  essay_only: 'Essay Saja',
  mixed: 'Campuran',
};

const TYPE_BADGE: Record<SubmissionType, string> = {
  pg_only: 'bg-pink-100 text-pink-700 border-pink-200',
  essay_only: 'bg-blue-100 text-blue-700 border-blue-200',
  mixed: 'bg-purple-100 text-purple-700 border-purple-200',
};

const STATUS_BADGE: Record<AssignmentStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const SUB_STATUS_BADGE: Record<SubStatus, string> = {
  belum_dikerjakan: 'bg-red-50 text-red-600 border-red-200',
  dikerjakan: 'bg-amber-50 text-amber-600 border-amber-200',
  submitted: 'bg-blue-50 text-blue-600 border-blue-200',
  dinilai: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  belum_dikerjakan: 'Belum Dikerjakan',
  dikerjakan: 'Dalam Pengerjaan',
  submitted: 'Terkirim',
  dinilai: 'Dinilai',
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
};

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  instructions: '',
  subjectId: '',
  classId: '',
  deadline: '',
  learningObjective: '',
  submissionType: 'pg_only',
  maxScore: 100,
  status: 'DRAFT',
  questionIds: [],
};

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Closed', value: 'CLOSED' },
];

// ═══════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════

function formatDate(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function toLocalDatetime(d: string) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GuruAssignmentView() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const schoolId = user?.schoolId || '';
  const teacherId = user?.id || '';

  // ── View state ──
  const [view, setView] = useState<InternalView>('list');

  // ── List view state ──
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Form state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  // ── Detail view state ──
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // ── Grading state ──
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [gradingStudentName, setGradingStudentName] = useState('');
  const [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingSaving, setGradingSaving] = useState(false);
  const [essayPoints, setEssayPoints] = useState<Record<string, number>>({});
  const [gradingFeedback, setGradingFeedback] = useState('');

  // ── Delete confirm ──
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Question picker dialog ──
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<QuestionBank[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // ── Master data ──
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const fetchAssignments = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`/api/assignments?schoolId=${schoolId}&teacherId=${teacherId}`);
      if (!res.ok) throw new Error('Gagal memuat tugas');
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : data.data ?? data.assignments ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat tugas');
    } finally {
      setListLoading(false);
    }
  }, [schoolId, teacherId]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (!res.ok) return;
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : data.data ?? data.subjects ?? []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      if (!res.ok) return;
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : data.data ?? data.classes ?? []);
    } catch {
      /* silent */
    }
  }, [schoolId]);

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!schoolId || !teacherId) return;
    fetchAssignments();
    fetchSubjects();
    fetchClasses();
  }, [schoolId, teacherId, fetchAssignments, fetchSubjects, fetchClasses]);

  // ═══════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const totalAssignments = assignments.length;
  const publishedCount = assignments.filter((a) => a.status === 'PUBLISHED').length;
  const draftCount = assignments.filter((a) => a.status === 'DRAFT').length;
  const closedCount = assignments.filter((a) => a.status === 'CLOSED').length;

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/assignments?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus tugas');
      toast.success('Tugas berhasil dihapus');
      setDeleteId(null);
      fetchAssignments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus tugas');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (a: AssignmentSummary) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description || '',
      instructions: '',
      subjectId: a.subjectId,
      classId: a.classId,
      deadline: toLocalDatetime(a.deadline),
      learningObjective: a.learningObjective || '',
      submissionType: a.submissionType,
      maxScore: a.maxScore,
      status: a.status,
      questionIds: [],
    });
    setView('form');
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetail(null);
    setStudents([]);
    setView('detail');
  };

  // ═══════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ═══════════════════════════════════════════════════════════════════

  const updateForm = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const handleFormSubmit = async () => {
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return; }
    if (!form.deadline) { toast.error('Deadline wajib diisi'); return; }
    if (!form.subjectId) { toast.error('Pilih mata pelajaran'); return; }
    if (!form.classId) { toast.error('Pilih kelas'); return; }
    if ((form.submissionType === 'pg_only' || form.submissionType === 'mixed') && form.questionIds.length === 0) {
      toast.error('Tambahkan minimal satu soal PG');
      return;
    }
    if (form.status === 'PUBLISHED' && (form.submissionType === 'pg_only' || form.submissionType === 'mixed') && form.questionIds.length === 0) {
      toast.error('Tidak bisa publish tanpa soal');
      return;
    }

    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        subjectId: form.subjectId,
        classId: form.classId,
        teacherId,
        schoolId,
        deadline: new Date(form.deadline).toISOString(),
        learningObjective: form.learningObjective.trim() || null,
        submissionType: form.submissionType,
        maxScore: form.maxScore,
        status: form.status,
      };
      if (form.submissionType === 'pg_only' || form.submissionType === 'mixed') {
        body.questionIds = form.questionIds;
      }

      let res: Response;
      if (editingId) {
        body.id = editingId;
        res = await fetch('/api/assignments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || (editingId ? 'Gagal memperbarui tugas' : 'Gagal membuat tugas'));
      }
      toast.success(editingId ? 'Tugas berhasil diperbarui' : 'Tugas berhasil dibuat');
      setView('list');
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchAssignments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Question picker ──

  const fetchBankQuestions = useCallback(async (subjectId: string) => {
    setBankLoading(true);
    try {
      const res = await fetch(`/api/questions?subjectId=${subjectId}&status=published`);
      if (!res.ok) throw new Error('Gagal memuat soal');
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data ?? data.questions ?? [];
      setBankQuestions(items);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat bank soal');
      setBankQuestions([]);
    } finally {
      setBankLoading(false);
    }
  }, []);

  const openQuestionPicker = () => {
    if (!form.subjectId) { toast.error('Pilih mata pelajaran terlebih dahulu'); return; }
    setBankSearch('');
    setQuestionPickerOpen(true);
    fetchBankQuestions(form.subjectId);
  };

  const filteredBank = bankQuestions.filter((q) => {
    if (!bankSearch.trim()) return true;
    return q.question.content.toLowerCase().includes(bankSearch.toLowerCase());
  });

  const toggleBankQuestion = (qId: string) => {
    setForm((f) => {
      const exists = f.questionIds.includes(qId);
      return { ...f, questionIds: exists ? f.questionIds.filter((id) => id !== qId) : [...f.questionIds, qId] };
    });
  };

  const removeQuestion = (qId: string) => {
    setForm((f) => ({ ...f, questionIds: f.questionIds.filter((id) => id !== qId) }));
  };

  // ═══════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (view !== 'detail' || !detailId) return;

    let cancelled = false;

    const load = async () => {
      setDetailLoading(true);
      setStudentsLoading(true);
      try {
        const [detailRes, subRes] = await Promise.all([
          fetch(`/api/assignments/${detailId}`),
          fetch(`/api/assignments/${detailId}/submissions`),
        ]);
        if (!detailRes.ok) throw new Error('Gagal memuat detail tugas');

        const detailData = await detailRes.json();
        const d = detailData.data ?? detailData.assignment ?? detailData;
        if (!cancelled) setDetail(d);

        if (subRes.ok) {
          const subData = await subRes.json();
          const subs = Array.isArray(subData) ? subData : subData.data ?? subData.submissions ?? [];
          if (!cancelled) {
            // fetch students in the class
            const classId = d.classId || d.classInfo?.id;
            if (classId) {
              const stuRes = await fetch(`/api/users?schoolId=${schoolId}&classId=${classId}&role=SISWA`);
              if (stuRes.ok) {
                const stuData = await stuRes.json();
                const stuList = Array.isArray(stuData) ? stuData : stuData.data ?? stuData.users ?? [];
                const rows: StudentRow[] = stuList.map((s: { id: string; name: string }) => {
                  // Find non-remedial submission for this student
                  const sub = subs.find((sub: { studentId: string; isRemedial: boolean }) => sub.studentId === s.id && !sub.isRemedial);
                  // Find remedial submission if exists
                  const remedial = subs.find((sub: { studentId: string; isRemedial: boolean }) => sub.studentId === s.id && sub.isRemedial);
                  let status: SubStatus = 'belum_dikerjakan';
                  if (sub) {
                    status = sub.score !== null ? 'dinilai' : sub.status === 'submitted' ? 'submitted' : sub.status === 'dikerjakan' ? 'dikerjakan' : 'belum_dikerjakan';
                  }
                  return {
                    id: s.id, name: s.name, submissionId: sub?.id ?? null, submissionStatus: status, score: sub?.score ?? null,
                    hasRemedial: !!remedial,
                    remedialId: remedial?.id,
                    remedialStatus: remedial?.status as SubStatus | undefined,
                    remedialScore: remedial?.score ?? undefined,
                    activeScore: (remedial && (remedial.status === 'submitted' || remedial.status === 'dinilai')) ? remedial.score : sub?.score ?? undefined,
                    originalScore: sub?.score ?? undefined,
                  };
                });
                if (!cancelled) setStudents(rows);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Gagal memuat detail');
      } finally {
        if (!cancelled) { setDetailLoading(false); setStudentsLoading(false); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [view, detailId, schoolId]);

  // ═══════════════════════════════════════════════════════════════════
  // GRADING
  // ═══════════════════════════════════════════════════════════════════

  const openGrading = async (student: StudentRow) => {
    if (!detailId) return;
    setGradingStudentId(student.id);
    setGradingStudentName(student.name);
    setGradingLoading(true);
    setEssayPoints({});
    setGradingFeedback('');
    try {
      const res = await fetch(`/api/assignments/${detailId}/submissions?studentId=${student.id}`);
      if (!res.ok) throw new Error('Gagal memuat jawaban siswa');
      const data = await res.json();
      const sub = data.data ?? data.submission ?? data;
      setSubmissionDetail(sub);
      // Pre-fill essay points
      const ep: Record<string, number> = {};
      if (sub?.essayScores) {
        sub.essayScores.forEach((es: { questionId: string; pointsEarned: number }) => { ep[es.questionId] = es.pointsEarned; });
      }
      setEssayPoints(ep);
      setGradingFeedback(sub?.feedback || '');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat jawaban');
      setSubmissionDetail(null);
    } finally {
      setGradingLoading(false);
    }
  };

  const calcTotalScore = useCallback((): number => {
    if (!submissionDetail || !detail) return 0;
    let total = 0;
    for (const ans of submissionDetail.answers) {
      if (ans.isCorrect) {
        // PG correct: auto-score
        total += ans.pointsEarned ?? 1;
      } else if (detail.questions.find((q) => q.id === ans.questionId)?.type === 'ESSAY') {
        total += essayPoints[ans.questionId] || 0;
      }
    }
    return total;
  }, [submissionDetail, detail, essayPoints]);

  const saveGrade = async () => {
    if (!detailId || !gradingStudentId) return;
    setGradingSaving(true);
    try {
      const essayScoresList = Object.entries(essayPoints).map(([questionId, pointsEarned]) => ({ questionId, pointsEarned }));
      const body: Record<string, unknown> = {
        score: calcTotalScore(),
        feedback: gradingFeedback.trim() || null,
        essayScores: essayScoresList,
      };
      const res = await fetch(`/api/assignments/${detailId}/submissions/${gradingStudentId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Gagal menyimpan nilai');
      toast.success('Nilai berhasil disimpan');
      setGradingStudentId(null);
      setSubmissionDetail(null);
      // Refresh detail
      setDetailId(detailId);
      setDetail(null);
      setStudents([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan nilai');
    } finally {
      setGradingSaving(false);
    }
  };

  const handleActivateRemedial = async (studentId: string) => {
    if (!detailId) return;
    try {
      const res = await fetch(`/api/assignments/${detailId}/submissions/remedial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal mengaktifkan remedial');
        return;
      }
      toast.success('Remedial berhasil diaktifkan');
      setDetailId(detailId);
      setDetail(null);
      setStudents([]);
    } catch {
      toast.error('Gagal mengaktifkan remedial');
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Tugas Terstruktur
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola tugas, kuis, dan ujian untuk siswa</p>
          </div>
          <Button
            onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setView('form'); }}
            className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Buat Tugas Baru
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-[#1F3864]/10 p-2.5"><FileText className="h-5 w-5 text-[#1F3864]" /></div>
              <div>
                <p className="text-2xl font-bold text-[#1F3864]">{totalAssignments}</p>
                <p className="text-xs text-muted-foreground">Total Tugas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
                <p className="text-xs text-muted-foreground">Draft</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2.5"><BookOpen className="h-5 w-5 text-slate-500" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-500">{closedCount}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                statusFilter === f.value && 'bg-[#1F3864] hover:bg-[#1F3864]/90 text-white'
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Loading */}
        {listLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
          </div>
        )}

        {/* Empty state */}
        {!listLoading && filteredAssignments.length === 0 && (
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <div className="rounded-full bg-[#1F3864]/10 p-4">
                <ClipboardList className="h-10 w-10 text-[#1F3864]" />
              </div>
              <p className="text-lg font-semibold text-slate-700">Belum ada tugas</p>
              <p className="text-sm text-muted-foreground">Klik "Buat Tugas Baru" untuk membuat tugas pertama Anda</p>
            </CardContent>
          </Card>
        )}

        {/* Assignment cards */}
        {!listLoading && filteredAssignments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAssignments.map((a) => (
              <Card
                key={a.id}
                className="border-none shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openDetail(a.id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug flex-1">{a.title}</h3>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0', TYPE_BADGE[a.submissionType])}>
                      {TYPE_LABELS[a.submissionType]}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0', STATUS_BADGE[a.status])}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                  {a.learningObjective && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.learningObjective}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(a.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{a._count.questions}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{a._count.submissions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirm dialog */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Tugas</DialogTitle>
              <DialogDescription>Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — FORM VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'form') {
    const hasQuestions = form.questionIds.length > 0;
    const showQuestions = form.submissionType === 'pg_only' || form.submissionType === 'mixed';
    const canPublish = !showQuestions || hasQuestions;

    return (
      <div className="space-y-6 max-w-3xl">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('list')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-[#1F3864]">
            {editingId ? 'Edit Tugas' : 'Buat Tugas Baru'}
          </h1>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 space-y-5">
            {/* Judul */}
            <div className="space-y-2">
              <Label>Judul <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Masukkan judul tugas..."
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                className="rounded-lg"
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                placeholder="Deskripsi singkat tugas (opsional)"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className="rounded-lg"
              />
            </div>

            {/* Instruksi */}
            <div className="space-y-2">
              <Label>Instruksi</Label>
              <Textarea
                placeholder="Tulis instruksi pengerjaan tugas..."
                rows={4}
                value={form.instructions}
                onChange={(e) => updateForm({ instructions: e.target.value })}
                className="rounded-lg resize-none"
              />
            </div>

            {/* Mata Pelajaran & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran <span className="text-red-500">*</span></Label>
                <Select value={form.subjectId} onValueChange={(v) => updateForm({ subjectId: v, questionIds: [] })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelas <span className="text-red-500">*</span></Label>
                <Select value={form.classId} onValueChange={(v) => updateForm({ classId: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label>Deadline <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => updateForm({ deadline: e.target.value })}
                className="rounded-lg"
              />
            </div>

            {/* Tujuan Pembelajaran */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-[#1F3864]" />
                Tujuan Pembelajaran
                <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3864]/30 focus-visible:ring-offset-2 resize-none"
                placeholder="Contoh: Siswa mampu menganalisis struktur teks eksplanasi..."
                maxLength={500}
                value={form.learningObjective}
                onChange={(e) => updateForm({ learningObjective: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground text-right">{form.learningObjective.length}/500</p>
            </div>

            {/* Tipe Submission */}
            <div className="space-y-2">
              <Label>Tipe Submission</Label>
              <div className="flex flex-wrap gap-2">
                {(['pg_only', 'essay_only', 'mixed'] as SubmissionType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={form.submissionType === t ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-lg',
                      form.submissionType === t && 'bg-[#1F3864] hover:bg-[#1F3864]/90 text-white'
                    )}
                    onClick={() => updateForm({ submissionType: t, questionIds: [] })}
                  >
                    {TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Skor Maks */}
            <div className="space-y-2">
              <Label>Skor Maks</Label>
              <Input
                type="number"
                min={1}
                value={form.maxScore}
                onChange={(e) => updateForm({ maxScore: parseInt(e.target.value) || 100 })}
                className="rounded-lg w-full sm:w-32"
              />
            </div>

            {/* Soal section (PG only or Mixed) */}
            {showQuestions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Soal ({form.questionIds.length} dipilih)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={openQuestionPicker}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ambil Soal
                  </Button>
                </div>

                {form.questionIds.length === 0 && (
                  <p className="text-sm text-muted-foreground bg-slate-50 rounded-lg p-4 text-center">
                    Belum ada soal dipilih. Klik "Ambil Soal" untuk menambahkan.
                  </p>
                )}

                {/* Selected questions list */}
                {form.questionIds.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {form.questionIds.map((qId, idx) => {
                      const q = bankQuestions.find((bq) => bq.id === qId);
                      return (
                        <div
                          key={qId}
                          className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="text-xs font-semibold text-[#1F3864] mt-0.5 shrink-0 w-5">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 line-clamp-2">{q?.question?.content || 'Soal...'}</p>
                            <Badge variant="outline" className={cn('text-[10px] mt-1', q?.type === 'PG' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600')}>
                              {q?.type || 'PG'}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => removeQuestion(qId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Status toggle */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.status === 'DRAFT' ? 'default' : 'outline'}
                  size="sm"
                  className={cn('rounded-lg', form.status === 'DRAFT' && 'bg-amber-500 hover:bg-amber-600 text-white')}
                  onClick={() => updateForm({ status: 'DRAFT' })}
                >
                  Draft
                </Button>
                <Button
                  type="button"
                  variant={form.status === 'PUBLISHED' ? 'default' : 'outline'}
                  size="sm"
                  className={cn('rounded-lg', form.status === 'PUBLISHED' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                  onClick={() => {
                    if (!canPublish) {
                      toast.error('Tambahkan soal terlebih dahulu sebelum mempublish');
                      return;
                    }
                    updateForm({ status: 'PUBLISHED' });
                  }}
                >
                  Published
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setView('list')}
                className="rounded-lg"
              >
                Batal
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={formSaving}
                className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white rounded-lg"
              >
                {formSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Perbarui Tugas' : 'Simpan Tugas'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Picker Dialog */}
        <Dialog open={questionPickerOpen} onOpenChange={setQuestionPickerOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Pilih Soal dari Bank Soal</DialogTitle>
              <DialogDescription>Pilih soal yang ingin ditambahkan ke tugas ini</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Cari soal..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              className="rounded-lg my-2"
            />
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-96">
              {bankLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1F3864]" />
                </div>
              )}
              {!bankLoading && filteredBank.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">Tidak ada soal ditemukan</p>
              )}
              {!bankLoading && filteredBank.map((q) => {
                const selected = form.questionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleBankQuestion(q.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selected ? 'bg-[#1F3864]/5 border-[#1F3864]/30' : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                      selected ? 'bg-[#1F3864] border-[#1F3864]' : 'border-slate-300'
                    )}>
                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 line-clamp-2">{q.question?.content || 'Soal...'}</p>
                      <Badge variant="outline" className={cn('text-[10px] mt-1', q.type === 'PG' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600')}>
                        {q.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <p className="text-sm text-muted-foreground mr-auto">{form.questionIds.length} soal dipilih</p>
              <Button variant="outline" onClick={() => setQuestionPickerOpen(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'detail') {
    const submittedCount = students.filter((s) => s.submissionStatus === 'submitted' || s.submissionStatus === 'dinilai').length;
    const gradedCount = students.filter((s) => s.submissionStatus === 'dinilai').length;
    const avgScore = students.filter((s) => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / (gradedCount || 1);

    return (
      <div className="space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setView('list'); setDetailId(null); setDetail(null); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-[#1F3864]">Detail Tugas</h1>
        </div>

        {detailLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
          </div>
        )}

        {!detailLoading && detail && (
          <>
            {/* Assignment info card */}
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-800">{detail.title}</h2>
                    {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn('text-xs', TYPE_BADGE[detail.submissionType])}>
                      {TYPE_LABELS[detail.submissionType]}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', STATUS_BADGE[detail.status])}>
                      {STATUS_LABEL[detail.status]}
                    </Badge>
                  </div>
                </div>

                {detail.instructions && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Instruksi</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{detail.instructions}</p>
                  </div>
                )}

                {detail.learningObjective && (
                  <div className="flex items-start gap-2 bg-[#1F3864]/5 rounded-lg px-3 py-2.5">
                    <Target className="h-4 w-4 text-[#1F3864] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#1F3864] uppercase tracking-wide">Tujuan Pembelajaran</p>
                      <p className="text-xs text-slate-600 mt-0.5 break-words">{detail.learningObjective}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {formatDate(detail.deadline)}</span>
                  <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {detail.questions?.length || 0} soal</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {students.length} siswa</span>
                  <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> Skor Maks: {detail.maxScore}</span>
                </div>
              </CardContent>
            </Card>

            {/* Progress summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-[#1F3864]/10 p-2.5"><Users className="h-5 w-5 text-[#1F3864]" /></div>
                  <div>
                    <p className="text-2xl font-bold text-[#1F3864]">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Total Siswa</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2.5"><FileText className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
                    <p className="text-xs text-muted-foreground">Terkirim</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2.5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{gradedCount}</p>
                    <p className="text-xs text-muted-foreground">Dinilai</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2.5"><Star className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{gradedCount > 0 ? Math.round(avgScore) : '-'}</p>
                    <p className="text-xs text-muted-foreground">Rata-rata</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students progress table */}
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-semibold text-sm text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#1F3864]" />
                  Progres Siswa
                </h3>

                {studentsLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1F3864]" />
                  </div>
                )}

                {!studentsLoading && students.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data siswa</p>
                )}

                {!studentsLoading && students.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-24 text-center">Skor</TableHead>
                          <TableHead className="w-24 text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s, idx) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-sm">{s.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px]', SUB_STATUS_BADGE[s.submissionStatus])}>
                                {SUB_STATUS_LABEL[s.submissionStatus]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">
                              {s.score !== null ? s.score : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {(s.submissionStatus === 'submitted' || s.submissionStatus === 'dinilai') && (
                                <Button
                                  size="sm"
                                  variant={s.submissionStatus === 'dinilai' ? 'outline' : 'default'}
                                  className={cn(
                                    'text-xs rounded-lg h-7',
                                    s.submissionStatus === 'submitted' && 'bg-[#1F3864] hover:bg-[#1F3864]/90 text-white'
                                  )}
                                  onClick={() => openGrading(s)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Nilai
                                </Button>
                              )}
                              {s.submissionStatus === 'dinilai' && s.score !== null && s.score < (detail?.maxScore ?? 100) * 0.8 && !s.hasRemedial && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[10px] rounded-lg h-7 ml-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleActivateRemedial(s.id)}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Remedial
                                </Button>
                              )}
                              {s.hasRemedial && s.remedialStatus && (
                                <Badge variant="outline" className="text-[10px] ml-1 border-blue-200 text-blue-600">
                                  Remedial {s.remedialStatus === 'dinilai' || s.remedialStatus === 'submitted' ? '✓' : '⏳'}
                                  {s.activeScore !== undefined && s.activeScore !== s.score && (
                                    <span className="ml-1 text-emerald-600">{s.activeScore}</span>
                                  )}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grading Panel (inline) */}
            {gradingStudentId && (
              <Card className="border-2 border-[#1F3864]/20 shadow-md bg-white">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1F3864] flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Penilaian
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{gradingStudentName} — {detail.title}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setGradingStudentId(null); setSubmissionDetail(null); }}>
                      <span className="text-lg leading-none">&times;</span>
                    </Button>
                  </div>

                  {gradingLoading && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1F3864]" />
                    </div>
                  )}

                  {!gradingLoading && submissionDetail && (
                    <div className="space-y-4">
                      {submissionDetail.answers.map((ans, idx) => {
                        const question = detail.questions.find((q) => q.id === ans.questionId);
                        const isEssay = question?.type === 'ESSAY';

                        return (
                          <div key={ans.id || idx} className="space-y-2 p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-[#1F3864] mt-0.5 shrink-0">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800">{ans.question?.content || question?.question?.content || 'Soal...'}</p>
                                {isEssay ? (
                                  <>
                                    <div className="mt-2 p-3 bg-white rounded border border-slate-200">
                                      <p className="text-xs text-muted-foreground mb-1 font-medium">Jawaban Siswa:</p>
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{ans.answer || '(tidak dijawab)'}</p>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <Label className="text-xs shrink-0">Poin:</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={detail.maxScore}
                                        value={essayPoints[ans.questionId] ?? 0}
                                        onChange={(e) => setEssayPoints((p) => ({ ...p, [ans.questionId]: parseInt(e.target.value) || 0 }))}
                                        className="h-8 w-24 text-sm rounded-lg"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* PG: show correct/wrong */}
                                    <div className="mt-2 flex items-center gap-2">
                                      {ans.isCorrect ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                          <CheckCircle2 className="h-3 w-3 mr-1" /> Benar
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">
                                          <AlertCircle className="h-3 w-3 mr-1" /> Salah
                                        </Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        Jawaban: {ans.answer || '-'}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Total + Feedback */}
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-4 border-t border-slate-200">
                        <div className="flex-1 space-y-2">
                          <Label>Feedback</Label>
                          <Textarea
                            placeholder="Berikan feedback kepada siswa..."
                            rows={3}
                            value={gradingFeedback}
                            onChange={(e) => setGradingFeedback(e.target.value)}
                            className="rounded-lg resize-none"
                          />
                        </div>
                        <div className="shrink-0 text-center space-y-2">
                          <p className="text-xs text-muted-foreground">Total Skor</p>
                          <p className="text-3xl font-bold text-[#1F3864]">{calcTotalScore()}</p>
                          <p className="text-xs text-muted-foreground">dari {detail.maxScore}</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => { setGradingStudentId(null); setSubmissionDetail(null); }}
                          className="rounded-lg"
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={saveGrade}
                          disabled={gradingSaving}
                          className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white rounded-lg"
                        >
                          {gradingSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <Save className="h-4 w-4 mr-2" />
                          Simpan Nilai
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  // Fallback
  return null;
}
