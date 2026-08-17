'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Target, ChevronLeft, Clock, CheckCircle2, AlertCircle, Eye, Loader2, Save, Send, FileText, BookOpen, ClipboardList } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type SubmissionType = 'pg_only' | 'essay_only' | 'mixed';
type SubStatus = 'belum_dikerjakan' | 'dikerjakan' | 'submitted' | 'dinilai';
type InternalView = 'list' | 'work' | 'result';

type QuestionType = 'pg' | 'esai' | 'pg_kompleks' | 'isian';

interface ParsedOption {
  label: string;
  text: string;
  isCorrect?: boolean;
}

interface AssignmentQuestionItem {
  id: string;
  questionId: string;
  orderNum: number;
  points: number;
  question: {
    id: string;
    content: string;
    type: QuestionType;
    options: string | null;
    answer: string | null;
  };
}

interface MySubmission {
  id: string;
  status: SubStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
}

interface AssignmentListItem {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  learningObjective: string | null;
  submissionType: SubmissionType;
  maxScore: number;
  status: string;
  questions: AssignmentQuestionItem[];
  _count: { submissions: number };
  mySubmission: MySubmission | null;
}

interface AssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  deadline: string;
  learningObjective: string | null;
  submissionType: SubmissionType;
  maxScore: number;
  status: string;
  questions: AssignmentQuestionItem[];
}

interface SubmissionAnswer {
  id: string;
  questionId: string;
  answer: string | null;
  essayAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  question: {
    id: string;
    questionId: string;
    question: {
      id: string;
      content: string;
      type: QuestionType;
      options: string | null;
    };
  };
}

interface SubmissionWithAnswers {
  id: string;
  status: SubStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  answers: SubmissionAnswer[];
}

interface LocalAnswer {
  answer?: string;
  essayAnswer?: string;
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

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Belum', value: 'belum_dikerjakan' },
  { label: 'Dikerjakan', value: 'dikerjakan' },
  { label: 'Terkirim', value: 'submitted' },
  { label: 'Dinilai', value: 'dinilai' },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatDate(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseOptions(optionsJson: string | null): ParsedOption[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function getCountdown(deadline: string): { text: string; urgent: boolean; past: boolean } {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return { text: 'Waktu habis', urgent: true, past: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days} hari ${hours} jam lagi`, urgent: days <= 1, past: false };
  if (hours > 0) return { text: `${hours} jam ${minutes} menit lagi`, urgent: hours <= 3, past: false };
  return { text: `${minutes} menit lagi`, urgent: true, past: false };
}

function getSubStatus(item: AssignmentListItem): SubStatus {
  if (!item.mySubmission) return 'belum_dikerjakan';
  return item.mySubmission.status as SubStatus;
}

function isQuestionPG(type: QuestionType): boolean {
  return type === 'pg';
}

function getQuestionTypeLabel(type: QuestionType): string {
  if (type === 'pg' || type === 'pg_kompleks') return 'PG';
  return 'Essay';
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function SiswaAssignmentView() {
  const { user } = useAppStore();

  const schoolId = user?.schoolId || '';
  const classId = user?.classId || '';
  const studentId = user?.id || '';

  // ── View state ──
  const [view, setView] = useState<InternalView>('list');

  // ── List view state ──
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Work view state ──
  const [workId, setWorkId] = useState<string | null>(null);
  const [workDetail, setWorkDetail] = useState<AssignmentDetail | null>(null);
  const [workLoading, setWorkLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedRef = useRef(false);

  // ── Result view state ──
  const [resultDetail, setResultDetail] = useState<AssignmentDetail | null>(null);
  const [resultSubmission, setResultSubmission] = useState<SubmissionWithAnswers | null>(null);
  const [resultLoading, setResultLoading] = useState(true);

  // ── Dialog ──
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════

  const fetchAssignments = useCallback(async () => {
    if (!schoolId || !classId || !studentId) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({ schoolId, classId, studentId });
      const res = await fetch(`/api/assignments?${params}`);
      if (!res.ok) throw new Error('Gagal memuat tugas');
      const data = await res.json();
      setAssignments(data);
    } catch {
      toast.error('Gagal memuat daftar tugas');
    } finally {
      setListLoading(false);
    }
  }, [schoolId, classId, studentId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ═══════════════════════════════════════════════════════════════════
  // WORK VIEW — OPEN & LOAD
  // ═══════════════════════════════════════════════════════════════════

  const openWork = useCallback(async (assignmentId: string) => {
    setWorkId(assignmentId);
    setWorkDetail(null);
    setAnswers({});
    setWorkLoading(true);
    setView('work');
    setLastSavedAt(null);
    hasUnsavedRef.current = false;

    try {
      const [detailRes, subRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(`/api/assignments/${assignmentId}/submissions?studentId=${studentId}`),
      ]);

      if (!detailRes.ok) throw new Error('Gagal memuat tugas');
      const detail: AssignmentDetail = await detailRes.json();
      setWorkDetail(detail);

      // Load existing answers from previous submission
      if (subRes.ok) {
        const sub: SubmissionWithAnswers | null = await subRes.json();
        if (sub && sub.answers && sub.answers.length > 0) {
          const loaded: Record<string, LocalAnswer> = {};
          for (const a of sub.answers) {
            // questionId in the answer is Question.id
            loaded[a.questionId] = {
              answer: a.answer || undefined,
              essayAnswer: a.essayAnswer || undefined,
            };
          }
          setAnswers(loaded);
        }
      }
    } catch {
      toast.error('Gagal memuat tugas');
      setView('list');
    } finally {
      setWorkLoading(false);
    }
  }, [studentId]);

  // ═══════════════════════════════════════════════════════════════════
  // WORK VIEW — SAVE & SUBMIT
  // ═══════════════════════════════════════════════════════════════════

  const buildAnswersPayload = useCallback(() => {
    return Object.entries(answers).map(([questionId, ans]) => ({
      questionId,
      answer: ans.answer || null,
      essayAnswer: ans.essayAnswer || null,
    }));
  }, [answers]);

  const handleSaveDraft = useCallback(async () => {
    if (!workId || !studentId) return;
    setSaving(true);
    try {
      const payload = {
        studentId,
        schoolId,
        classId,
        action: 'draft' as const,
        answers: buildAnswersPayload(),
      };
      const res = await fetch(`/api/assignments/${workId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setLastSavedAt(new Date());
      hasUnsavedRef.current = false;
      toast.success('Tersimpan');
    } catch {
      toast.error('Gagal menyimpan jawaban');
    } finally {
      setSaving(false);
    }
  }, [workId, studentId, schoolId, classId, buildAnswersPayload]);

  const handleSubmit = useCallback(async () => {
    if (!workId || !studentId) return;
    setSubmitting(true);
    try {
      const payload = {
        studentId,
        schoolId,
        classId,
        action: 'submit' as const,
        answers: buildAnswersPayload(),
      };
      const res = await fetch(`/api/assignments/${workId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Gagal mengumpulkan');
      }
      setConfirmSubmitOpen(false);
      toast.success('Tugas berhasil dikumpulkan!');
      // Navigate to result view
      openResult(workId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengumpulkan tugas');
    } finally {
      setSubmitting(false);
    }
  }, [workId, studentId, schoolId, classId, buildAnswersPayload]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTOSAVE — every 30 seconds
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (view !== 'work' || !workId) return;

    autosaveRef.current = setInterval(() => {
      if (hasUnsavedRef.current && !saving && !submitting) {
        handleSaveDraft();
      }
    }, 30_000);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [view, workId, saving, submitting, handleSaveDraft]);

  // Track unsaved changes
  useEffect(() => {
    if (view === 'work') {
      hasUnsavedRef.current = true;
    }
  }, [answers, view]);

  // ═══════════════════════════════════════════════════════════════════
  // RESULT VIEW — OPEN & LOAD
  // ═══════════════════════════════════════════════════════════════════

  const openResult = useCallback(async (assignmentId: string) => {
    setResultDetail(null);
    setResultSubmission(null);
    setResultLoading(true);
    setView('result');

    try {
      const [detailRes, subRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(`/api/assignments/${assignmentId}/submissions?studentId=${studentId}`),
      ]);

      if (!detailRes.ok) throw new Error('Gagal memuat tugas');
      const detail: AssignmentDetail = await detailRes.json();
      setResultDetail(detail);

      if (subRes.ok) {
        const sub: SubmissionWithAnswers | null = await subRes.json();
        setResultSubmission(sub);
      }
    } catch {
      toast.error('Gagal memuat hasil');
      setView('list');
    } finally {
      setResultLoading(false);
    }
  }, [studentId]);

  // ═══════════════════════════════════════════════════════════════════
  // ANSWER HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handlePGAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer: value, essayAnswer: undefined },
    }));
  }, []);

  const handleEssayAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], essayAnswer: value, answer: undefined },
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const goToList = useCallback(() => {
    setView('list');
    setWorkId(null);
    setWorkDetail(null);
    setAnswers({});
    setResultDetail(null);
    setResultSubmission(null);
    setLastSavedAt(null);
    hasUnsavedRef.current = false;
    fetchAssignments();
  }, [fetchAssignments]);

  // ═══════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ═══════════════════════════════════════════════════════════════════

  const filteredAssignments = statusFilter === 'all'
    ? assignments
    : assignments.filter((a) => getSubStatus(a) === statusFilter);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864] flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Tugas Terstruktur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat dan kerjakan tugas yang diberikan oleh guru
          </p>
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
                statusFilter === f.value &&
                  'bg-[#1F3864] hover:bg-[#1F3864]/90 text-white'
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
              <p className="text-lg font-semibold text-slate-700">
                {statusFilter === 'all'
                  ? 'Belum ada tugas'
                  : `Tidak ada tugas dengan status "${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}"`}
              </p>
              <p className="text-sm text-muted-foreground">
                Tugas yang diberikan guru akan tampil di sini
              </p>
            </CardContent>
          </Card>
        )}

        {/* Assignment cards */}
        {!listLoading && filteredAssignments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAssignments.map((a) => {
              const subStatus = getSubStatus(a);
              const countdown = getCountdown(a.deadline);
              const canWork =
                subStatus === 'belum_dikerjakan' || subStatus === 'dikerjakan';

              return (
                <Card
                  key={a.id}
                  className="border-none shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5 space-y-3">
                    {/* Title + type */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug flex-1">
                        {a.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-2 py-0 shrink-0',
                          TYPE_BADGE[a.submissionType]
                        )}
                      >
                        {TYPE_LABELS[a.submissionType]}
                      </Badge>
                    </div>

                    {/* Tujuan Pembelajaran preview */}
                    {a.learningObjective && (
                      <div className="flex items-start gap-2 bg-[#1F3864]/5 rounded-lg px-3 py-2">
                        <Target className="h-3.5 w-3.5 text-[#1F3864] mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {a.learningObjective}
                        </p>
                      </div>
                    )}

                    {/* Deadline with countdown */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(a.deadline)}</span>
                      <span
                        className={cn(
                          'ml-1 font-medium',
                          countdown.past
                            ? 'text-red-500'
                            : countdown.urgent
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        )}
                      >
                        · {countdown.text}
                      </span>
                    </div>

                    {/* Status + score row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0',
                            SUB_STATUS_BADGE[subStatus]
                          )}
                        >
                          {SUB_STATUS_LABEL[subStatus]}
                        </Badge>
                        {subStatus === 'dinilai' && (a.mySubmission?.score ?? null) !== null && (
                          <span className="text-sm font-bold text-[#1F3864]">
                            {Math.round(a.mySubmission?.score ?? 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-1">
                      {canWork && !countdown.past && (
                        <Button
                          size="sm"
                          className="w-full bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                          onClick={() => openWork(a.id)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Kerjakan
                        </Button>
                      )}
                      {canWork && countdown.past && (
                        <Button size="sm" className="w-full" disabled>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Waktu Habis
                        </Button>
                      )}
                      {subStatus === 'submitted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Menunggu Penilaian
                        </Button>
                      )}
                      {subStatus === 'dinilai' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-[#1F3864]/30 text-[#1F3864] hover:bg-[#1F3864]/5"
                          onClick={() => openResult(a.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Hasil
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — WORK VIEW (PENGERJAAN)
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'work') {
    const questions = workDetail?.questions || [];
    const countdown = workDetail ? getCountdown(workDetail.deadline) : null;
    const isPast = countdown?.past ?? false;

    return (
      <div className="space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToList}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-[#1F3864]">Pengerjaan Tugas</h1>
        </div>

        {workLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
          </div>
        )}

        {!workLoading && workDetail && (
          <>
            {/* Assignment info card */}
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <h2 className="text-lg font-bold text-slate-800">
                      {workDetail.title}
                    </h2>
                    {workDetail.description && (
                      <p className="text-sm text-muted-foreground">
                        {workDetail.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      TYPE_BADGE[workDetail.submissionType]
                    )}
                  >
                    {TYPE_LABELS[workDetail.submissionType]}
                  </Badge>
                </div>

                {workDetail.instructions && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Instruksi
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {workDetail.instructions}
                    </p>
                  </div>
                )}

                {workDetail.learningObjective && (
                  <div className="flex items-start gap-2 bg-[#1F3864]/5 rounded-lg px-3 py-2.5">
                    <Target className="h-4 w-4 text-[#1F3864] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#1F3864] uppercase tracking-wide">
                        Tujuan Pembelajaran
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 break-words">
                        {workDetail.learningObjective}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDate(workDetail.deadline)}
                  </span>
                  {countdown && (
                    <span
                      className={cn(
                        'flex items-center gap-1.5 font-medium',
                        countdown.past
                          ? 'text-red-500'
                          : countdown.urgent
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      )}
                    >
                      {countdown.past ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      {countdown.text}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {questions.length} soal
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            {questions.length === 0 ? (
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="rounded-full bg-[#1F3864]/10 p-4">
                      <FileText className="h-8 w-8 text-[#1F3864]" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      Tugas ini tidak memiliki soal dari bank soal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Silakan kumpulkan tugas Anda langsung
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((aq, idx) => {
                  const q = aq.question;
                  const pg = isQuestionPG(q.type);
                  const opts = pg ? parseOptions(q.options) : [];
                  const currentAnswer = answers[q.id] || {};

                  return (
                    <Card
                      key={aq.id}
                      className="border-none shadow-sm bg-white"
                    >
                      <CardContent className="p-6 space-y-4">
                        {/* Question header */}
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#1F3864] text-white text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-2 py-0',
                                  pg
                                    ? 'bg-pink-50 text-pink-600 border-pink-200'
                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                )}
                              >
                                {getQuestionTypeLabel(q.type)}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {aq.points} poin
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                              {q.content}
                            </p>
                          </div>
                        </div>

                        {/* PG Options */}
                        {pg && opts.length > 0 && (
                          <div className="space-y-2 ml-10">
                            {opts.map((opt) => {
                              const isSelected =
                                currentAnswer.answer === opt.label;
                              return (
                                <label
                                  key={opt.label}
                                  className={cn(
                                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                    isSelected
                                      ? 'bg-[#1F3864]/5 border-[#1F3864]/30'
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  )}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    <div
                                      className={cn(
                                        'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                        isSelected
                                          ? 'border-[#1F3864]'
                                          : 'border-slate-300'
                                      )}
                                    >
                                      {isSelected && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-[#1F3864]" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-slate-500 mr-2">
                                      {opt.label}.
                                    </span>
                                    <span className="text-sm text-slate-700">
                                      {opt.text}
                                    </span>
                                  </div>
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      handlePGAnswer(q.id, opt.label)
                                    }
                                    className="sr-only"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay textarea */}
                        {!pg && (
                          <div className="ml-10">
                            <Textarea
                              placeholder="Tulis jawaban Anda di sini..."
                              rows={6}
                              value={currentAnswer.essayAnswer || ''}
                              onChange={(e) =>
                                handleEssayAnswer(q.id, e.target.value)
                              }
                              className="resize-y rounded-lg"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Bottom bar */}
            <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 -mx-1 px-1 py-3 z-10">
              <div className="flex items-center justify-between gap-3 max-w-4xl">
                <div className="text-xs text-muted-foreground">
                  {lastSavedAt ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tersimpan {lastSavedAt.toLocaleTimeString('id-ID')}
                    </span>
                  ) : (
                    <span>Autosave setiap 30 detik</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving || submitting || isPast}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Simpan Draft
                  </Button>
                  <Button
                    className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                    onClick={() => setConfirmSubmitOpen(true)}
                    disabled={saving || submitting || isPast}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Kumpulkan
                  </Button>
                </div>
              </div>
            </div>

            {/* Confirm submit dialog */}
            <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kumpulkan Tugas?</DialogTitle>
                  <DialogDescription>
                    Pastikan semua jawaban sudah Anda periksa. Setelah dikumpulkan,
                    Anda tidak dapat mengubah jawaban lagi.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmSubmitOpen(false)}
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                  <Button
                    className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ya, Kumpulkan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER — RESULT VIEW (HASIL)
  // ═══════════════════════════════════════════════════════════════════

  if (view === 'result') {
    const questions = resultDetail?.questions || [];
    const subAnswers = resultSubmission?.answers || [];

    // Build a map of questionId -> answer for quick lookup
    const answerMap = new Map<string, SubmissionAnswer>();
    for (const a of subAnswers) {
      answerMap.set(a.questionId, a);
    }

    return (
      <div className="space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToList}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-[#1F3864]">Hasil Tugas</h1>
        </div>

        {resultLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
          </div>
        )}

        {!resultLoading && resultDetail && (
          <>
            {/* Assignment info */}
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-800">
                      {resultDetail.title}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(resultDetail.deadline)}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      TYPE_BADGE[resultDetail.submissionType]
                    )}
                  >
                    {TYPE_LABELS[resultDetail.submissionType]}
                  </Badge>
                </div>

                {resultDetail.learningObjective && (
                  <div className="flex items-start gap-2 bg-[#1F3864]/5 rounded-lg px-3 py-2.5">
                    <Target className="h-4 w-4 text-[#1F3864] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#1F3864] uppercase tracking-wide">
                        Tujuan Pembelajaran
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 break-words">
                        {resultDetail.learningObjective}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score card */}
            {resultSubmission && (
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-[#1F3864]/5 px-8 py-6 min-w-[140px]">
                      <p className="text-5xl font-bold text-[#1F3864]">
                        {resultSubmission.score !== null
                          ? Math.round(resultSubmission.score)
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        dari {resultDetail.maxScore}
                      </p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            SUB_STATUS_BADGE[resultSubmission.status]
                          )}
                        >
                          {SUB_STATUS_LABEL[resultSubmission.status]}
                        </Badge>
                        {resultSubmission.gradedAt && (
                          <span className="text-xs text-muted-foreground">
                            Dinilai {formatDate(resultSubmission.gradedAt)}
                          </span>
                        )}
                      </div>
                      {resultSubmission.feedback && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Feedback dari Guru
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {resultSubmission.feedback}
                          </p>
                        </div>
                      )}
                      {!resultSubmission.feedback && (
                        <p className="text-xs text-muted-foreground italic">
                          Belum ada feedback dari guru
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-question review */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1F3864]" />
                  Review Per Soal
                </h3>

                {questions.map((aq, idx) => {
                  const q = aq.question;
                  const pg = isQuestionPG(q.type);
                  const opts = pg ? parseOptions(q.options) : [];
                  const ans = answerMap.get(q.id);

                  return (
                    <Card
                      key={aq.id}
                      className="border-none shadow-sm bg-white"
                    >
                      <CardContent className="p-6 space-y-3">
                        {/* Question header */}
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#1F3864] text-white text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-2 py-0',
                                  pg
                                    ? 'bg-pink-50 text-pink-600 border-pink-200'
                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                )}
                              >
                                {getQuestionTypeLabel(q.type)}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {aq.points} poin
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                              {q.content}
                            </p>
                          </div>
                        </div>

                        {/* PG: show correct/wrong */}
                        {pg && (
                          <div className="ml-10 space-y-2">
                            {opts.map((opt) => {
                              const isStudentAnswer =
                                ans?.answer === opt.label;
                              const isCorrectAnswer =
                                q.answer === opt.label;

                              return (
                                <div
                                  key={opt.label}
                                  className={cn(
                                    'flex items-start gap-3 p-3 rounded-lg border',
                                    isStudentAnswer && isCorrectAnswer
                                      ? 'bg-emerald-50 border-emerald-200'
                                      : isStudentAnswer && !isCorrectAnswer
                                        ? 'bg-red-50 border-red-200'
                                        : isCorrectAnswer && !isStudentAnswer
                                          ? 'bg-emerald-50/50 border-emerald-100'
                                          : 'bg-slate-50 border-slate-100'
                                )}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isStudentAnswer && isCorrectAnswer && (
                                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    )}
                                    {isStudentAnswer && !isCorrectAnswer && (
                                      <AlertCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    {!isStudentAnswer && isCorrectAnswer && (
                                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    )}
                                    {!isStudentAnswer && !isCorrectAnswer && (
                                      <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-slate-500 mr-2">
                                      {opt.label}.
                                    </span>
                                    <span className="text-sm text-slate-700">
                                      {opt.text}
                                    </span>
                                    {isStudentAnswer && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[10px] ml-2',
                                          isCorrectAnswer
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                            : 'bg-red-100 text-red-600 border-red-200'
                                        )}
                                      >
                                        {isCorrectAnswer ? 'Benar' : 'Salah'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {!ans?.answer && (
                              <p className="text-xs text-muted-foreground italic">
                                Tidak dijawab
                              </p>
                            )}
                          </div>
                        )}

                        {/* Essay: show text + points */}
                        {!pg && (
                          <div className="ml-10 space-y-2">
                            <div className="bg-slate-50 rounded-lg p-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Jawaban Anda
                              </p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {ans?.essayAnswer || (
                                  <span className="italic text-muted-foreground">
                                    Tidak dijawab
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Poin yang diperoleh:
                              </span>
                              <span className="text-sm font-semibold text-[#1F3864]">
                                {ans?.pointsEarned ?? 0}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {aq.points}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* No questions case */}
            {questions.length === 0 && resultSubmission && (
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Tugas ini tidak memiliki soal dari bank soal
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Back button */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="border-[#1F3864]/30 text-[#1F3864] hover:bg-[#1F3864]/5"
                onClick={goToList}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Kembali ke Daftar Tugas
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Fallback
  return null;
}
