'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  PenLine,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Trophy,
  Target,
  History,
  Loader2,
  ChevronLeft,
  Send,
  ListOrdered,
  FileQuestion,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface ExamSessionItem {
  id: string;
  examPackageId: string;
  title: string;
  schoolId: string | null;
  classId: string | null;
  startDate: string;
  endDate: string;
  duration: number;
  shuffleQuestions: boolean;
  status: string;
  examPackage: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    totalQuestions: number;
    status: string;
    _count: { examItems: number };
  };
  _assignment: {
    classId: string;
    className: string;
  };
}

interface QuestionItem {
  id: string;
  subjectId: string;
  type: string;
  content: string;
  options: string | null;
  cognitiveLevel: string;
  difficulty: string;
  subject: { id: string; name: string };
  examItemId: string;
  orderNum: number;
  points: number;
}

interface AttemptResult {
  id: string;
  userId: string;
  examSessionId: string;
  examPackageId: string;
  schoolId: string;
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  percentage: number;
  tkaPrediction: number | null;
  duration: number;
  status: string;
  startedAt: string;
  submittedAt: string;
  answers: StudentAnswerItem[];
}

interface StudentAnswerItem {
  id: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  question?: {
    id: string;
    content: string;
    options: string | null;
    answer: string | null;
    explanation: string | null;
    type: string;
    subject?: { id: string; name: string };
  };
}

type ExamScreen = 'list' | 'running' | 'result';

// ═══════════════════════════════════════════════════════════════════════
// HELPER: parse options JSON
// ═══════════════════════════════════════════════════════════════════════

function parseOptions(optionsJson: string | null): { label: string; text: string }[] {
  if (!optionsJson) return [];
  try {
    return JSON.parse(optionsJson);
  } catch {
    return [];
  }
}

function getPredikat(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Sangat Baik', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  if (pct >= 75) return { label: 'Baik', color: 'text-green-600 bg-green-50 border-green-200' };
  if (pct >= 60) return { label: 'Cukup', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (pct >= 40) return { label: 'Kurang', color: 'text-orange-600 bg-orange-50 border-orange-200' };
  return { label: 'Sangat Kurang', color: 'text-red-600 bg-red-50 border-red-200' };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: SiswaTryoutView
// ═══════════════════════════════════════════════════════════════════════

export function SiswaTryoutView() {
  const [screen, setScreen] = useState<ExamScreen>('list');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [resultAttempt, setResultAttempt] = useState<AttemptResult | null>(null);

  const startExam = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setScreen('running');
  }, []);

  const showResult = useCallback((attempt: AttemptResult) => {
    setResultAttempt(attempt);
    setScreen('result');
  }, []);

  const backToList = useCallback(() => {
    setScreen('list');
    setActiveSessionId(null);
    setResultAttempt(null);
  }, []);

  return (
    <div className="space-y-6">
      {screen === 'list' && <ExamListScreen onStartExam={startExam} />}
      {screen === 'running' && activeSessionId && (
        <ExamRunnerScreen
          sessionId={activeSessionId}
          onSubmit={showResult}
          onBack={backToList}
        />
      )}
      {screen === 'result' && resultAttempt && (
        <ExamResultScreen attempt={resultAttempt} onBack={backToList} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 1: DAFTAR TRYOUT TERSEDIA
// ═══════════════════════════════════════════════════════════════════════

interface ExamListScreenProps {
  onStartExam: (sessionId: string) => void;
}

function ExamListScreen({ onStartExam }: ExamListScreenProps) {
  const user = useAppStore((s) => s.user);
  const [sessions, setSessions] = useState<ExamSessionItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('tersedia');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, attemptsRes] = await Promise.all([
        fetch('/api/exams'),
        fetch(`/api/attempts?userId=${user.id}`),
      ]);
      if (!sessionsRes.ok || !attemptsRes.ok) throw new Error('Gagal mengambil data');
      const sessionsData = await sessionsRes.json();
      const attemptsData = await attemptsRes.json();
      setSessions(sessionsData);
      setAttempts(attemptsData);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data. Coba refresh halaman.');
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Map of session IDs to attempt status
  const attemptMap = useMemo(() => {
    const map = new Map<string, AttemptResult>();
    attempts
      .filter(a => a.status === 'submitted')
      .forEach(a => map.set(a.examSessionId, a));
    return map;
  }, [attempts]);

  // Categorize sessions
  const { available, completed, upcoming } = useMemo(() => {
    const now = new Date();
    const avail: ExamSessionItem[] = [];
    const comp: (ExamSessionItem & { attempt: AttemptResult })[] = [];
    const upc: ExamSessionItem[] = [];

    for (const s of sessions) {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const attempt = attemptMap.get(s.id);

      if (attempt) {
        comp.push({ ...s, attempt });
      } else if (now >= start && now <= end && (s.status === 'active' || s.status === 'scheduled')) {
        avail.push(s);
      } else if (now < start) {
        upc.push(s);
      }
    }
    return { available: avail, completed: comp, upcoming: upc };
  }, [sessions, attemptMap]);

  const stats = useMemo(() => ({
    total: sessions.length,
    available: available.length,
    completed: completed.length,
    avgPct: completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.attempt.percentage, 0) / completed.length)
      : 0,
  }), [sessions, available, completed]);

  // Sort completed by most recent
  const sortedCompleted = useMemo(() =>
    [...completed].sort((a, b) =>
      new Date(b.attempt.submittedAt).getTime() - new Date(a.attempt.submittedAt).getTime()
    ),
    [completed]
  );

  // Navigate to result from completed list
  const viewResult = (attempt: AttemptResult) => {
    useAppStore.getState().setSelectedAttemptId(attempt.id);
    // We'll navigate within the same component via a simple approach
    // For now, just show the result in a dialog or redirect
    // We reuse the same view by using the navigateTo with state
    window.dispatchEvent(new CustomEvent('show-exam-result', { detail: attempt }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d4a7a] flex items-center justify-center shadow-sm">
            <PenLine className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tryout TKA</h1>
            <p className="text-sm text-muted-foreground">
              Kerjakan tryout yang tersedia untuk kelasmu
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
          onClick={() => { fetchData(); toast.success('Data diperbarui'); }}
        >
          <Target className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Tryout', value: stats.total, icon: FileQuestion, color: 'from-[#1F3864] to-[#2d4a7a]' },
          { label: 'Tersedia', value: stats.available, icon: PenLine, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Selesai', value: stats.completed, icon: CheckCircle2, color: 'from-amber-500 to-amber-600' },
          { label: 'Rata-rata Skor', value: `${stats.avgPct}%`, icon: BarChart3, color: 'from-violet-500 to-violet-600' },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={cn('h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center', s.color)}>
                  <s.icon className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="tersedia" className="gap-1.5">
            <PenLine className="h-4 w-4" />
            Tersedia
            {available.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs px-1.5">{available.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="selesai" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Selesai
            {completed.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs px-1.5">{completed.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mendatang" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Mendatang
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs px-1.5">{upcoming.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tersedia Tab */}
        <TabsContent value="tersedia" className="mt-4">
          {!loading && !error && available.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FileQuestion className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Belum ada tryout yang tersedia</p>
                <p className="text-xs text-muted-foreground/70">Guru akan mengaktifkan tryout untuk kelasmu</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {available.map((session) => (
              <Card key={session.id} className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {session.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {session.examPackage.title}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                      Aktif
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListOrdered className="h-3.5 w-3.5" />
                        {session.examPackage._count.examItems} soal
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.duration} menit
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {session.examPackage.description || 'Tanpa deskripsi'}
                      </span>
                    </div>
                    <Separator />
                    <Button
                      className="w-full bg-[#1F3864] hover:bg-[#1F3864]/90 text-white transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      onClick={() => onStartExam(session.id)}
                    >
                      <PenLine className="mr-2 h-4 w-4" />
                      Mulai Mengerjakan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Selesai Tab */}
        <TabsContent value="selesai" className="mt-4">
          {!loading && !error && sortedCompleted.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Belum ada riwayat pengerjaan</p>
                <p className="text-xs text-muted-foreground/70">Kerjakan tryout yang tersedia untuk melihat hasil di sini</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {sortedCompleted.map((item) => {
              const a = item.attempt;
              const predikat = getPredikat(a.percentage);
              return (
                <Card key={item.id} className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.examPackage.title} • {new Date(a.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold">{a.percentage}%</p>
                          <Badge variant="outline" className={cn('text-[10px] px-2 py-0', predikat.color)}>
                            {predikat.label}
                          </Badge>
                        </div>
                        <div className="flex flex-col items-center text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" />{a.totalCorrect}
                          </span>
                          <span className="flex items-center gap-0.5 text-red-500">
                            <XCircle className="h-3 w-3" />{a.totalWrong}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Mendatang Tab */}
        <TabsContent value="mendatang" className="mt-4">
          {!loading && !error && upcoming.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Tidak ada tryout mendatang</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {upcoming.map((session) => (
              <Card key={session.id} className="rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{session.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.examPackage.title} • Mulai {new Date(session.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Belum Mulai
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 2: LAYAR MENGERJAKAN
// ═══════════════════════════════════════════════════════════════════════

interface ExamRunnerScreenProps {
  sessionId: string;
  onSubmit: (attempt: AttemptResult) => void;
  onBack: () => void;
}

function ExamRunnerScreen({ sessionId, onSubmit, onBack }: ExamRunnerScreenProps) {
  const user = useAppStore((s) => s.user);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [examPackageId, setExamPackageId] = useState('');
  const [duration, setDuration] = useState(120);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  // Fetch questions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exam-session/${sessionId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal memuat soal');
        }
        const data = await res.json();
        if (data.hasAttempt) {
          toast.info('Kamu sudah pernah mengerjakan tryout ini');
          onBack();
          return;
        }
        setQuestions(data.questions);
        setSessionTitle(data.session.title);
        setExamPackageId(data.session.examPackageId);
        setDuration(data.session.duration);
        setTimeLeft(data.session.duration * 60); // convert to seconds
      } catch (err: any) {
        setError(err.message || 'Gagal memuat soal');
        toast.error(err.message || 'Gagal memuat soal');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (!examStarted || timeLeft <= 0 || submittedRef.current || autoSubmitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAutoSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, autoSubmitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (autoSubmitted && !submittedRef.current && examPackageId) {
      toast.warning('Waktu habis! Jawaban otomatis dikirim.');
      doSubmit();
    }
  }, [autoSubmitted, examPackageId]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Current question
  const currentQ = questions[currentIdx];
  const options = currentQ ? parseOptions(currentQ.options) : [];
  const totalAnswered = Object.keys(answers).length;
  const progressPct = questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;

  // Start exam
  const handleStart = () => {
    setExamStarted(true);
    startTimeRef.current = Date.now();
  };

  // Handle answer selection
  const selectAnswer = (questionId: string, optionLabel: string) => {
    if (!examStarted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionLabel }));
  };

  // Navigate questions
  const goNext = () => setCurrentIdx(prev => Math.min(prev + 1, questions.length - 1));
  const goPrev = () => setCurrentIdx(prev => Math.max(prev - 1, 0));
  const goToQuestion = (idx: number) => setCurrentIdx(idx);

  // Submit answers (shared between manual and auto-submit)
  const doSubmit = useCallback(async () => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setShowConfirm(false);

    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;

    const answersPayload = questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || '',
      timeSpent: 0,
    }));

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examSessionId: sessionId,
          examPackageId: examPackageId,
          schoolId: user?.schoolId,
          classId: user?.classId,
          answers: answersPayload,
          duration: elapsed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengirim jawaban');
      }

      const attempt = await res.json();
      toast.success('Jawaban berhasil dikirim!');
      if (timerRef.current) clearInterval(timerRef.current);
      onSubmit(attempt);
    } catch (err: any) {
      submittedRef.current = false;
      toast.error(err.message || 'Gagal mengirim jawaban');
      setSubmitting(false);
    }
  }, [submitting, questions, answers, sessionId, examPackageId, user?.schoolId, user?.classId, onSubmit]);

  // Manual submit handler
  const handleSubmit = () => { doSubmit(); };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
        <p className="text-sm text-muted-foreground">Memuat soal...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-exam start screen
  if (!examStarted) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Daftar Tryout
        </Button>

        <Card className="rounded-xl shadow-sm max-w-2xl mx-auto">
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#1F3864] to-[#2d4a7a] flex items-center justify-center mx-auto shadow-md">
              <PenLine className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-xl mt-3">Siap Mengerjakan?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tryout</span>
                <span className="font-medium">{sessionTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah Soal</span>
                <span className="font-medium">{questions.length} soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Pengerjaan</span>
                <span className="font-medium">{duration} menit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipe Soal</span>
                <span className="font-medium">Pilihan Ganda</span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Setelah dimulai, timer akan berjalan. Pastikan koneksi internet stabil.
                Jawaban tidak dapat diubah setelah dikirim.
              </p>
            </div>

            <Button
              className="w-full bg-[#1F3864] hover:bg-[#1F3864]/90 text-white text-base py-5 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              onClick={handleStart}
            >
              <Play className="mr-2 h-5 w-5" />
              Mulai Mengerjakan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam in progress
  return (
    <div className="space-y-4">
      {/* Top bar: timer + progress */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-mono font-bold">
          <Clock className={cn('h-4 w-4', timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-[#1F3864]')} />
          <span className={timeLeft < 300 ? 'text-red-500' : 'text-[#1F3864]'}>{formatTime(timeLeft)}</span>
        </div>
        <div className="flex-1">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalAnswered}/{questions.length} soal dijawab
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'transition-all duration-200',
            totalAnswered === questions.length && 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          )}
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Kumpulkan'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main question area */}
        <div className="flex-1">
          {currentQ && (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">{currentQ.subject?.name}</Badge>
                  <Badge variant="secondary" className="text-xs">Soal {currentIdx + 1}</Badge>
                  <Badge variant="secondary" className="text-xs">C{currentQ.cognitiveLevel}</Badge>
                </div>

                <p className="text-base leading-relaxed mb-6 whitespace-pre-wrap">
                  {currentQ.content}
                </p>

                {options.length > 0 && (
                  <RadioGroup
                    value={answers[currentQ.id] || ''}
                    onValueChange={(val) => selectAnswer(currentQ.id, val)}
                    className="space-y-3"
                  >
                    {options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.label;
                      return (
                        <Label
                          key={opt.label}
                          htmlFor={`q-${currentQ.id}-${opt.label}`}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all duration-150',
                            'hover:bg-muted/50 hover:shadow-sm',
                            isSelected
                              ? 'border-[#1F3864] bg-[#1F3864]/5 shadow-sm'
                              : 'border-muted'
                          )}
                        >
                          <RadioGroupItem
                            value={opt.label}
                            id={`q-${currentQ.id}-${opt.label}`}
                          />
                          <span className="font-semibold text-sm text-muted-foreground w-6">{opt.label}.</span>
                          <span className="text-sm">{opt.text}</span>
                        </Label>
                      );
                    })}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="gap-1.5 transition-all duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIdx + 1} / {questions.length}
            </span>
            {currentIdx < questions.length - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                className="gap-1.5 transition-all duration-150"
              >
                Selanjutnya
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
                className="gap-1.5 bg-[#1F3864] hover:bg-[#1F3864]/90 text-white transition-all duration-200"
              >
                <Send className="h-4 w-4" />
                Kumpulkan
              </Button>
            )}
          </div>
        </div>

        {/* Question navigator sidebar */}
        <div className="lg:w-56 shrink-0">
          <Card className="rounded-xl shadow-sm p-4 lg:sticky lg:top-20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navigasi Soal
            </p>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={cn(
                      'h-9 w-9 rounded-lg text-xs font-semibold transition-all duration-150',
                      'hover:scale-105 active:scale-95',
                      isCurrent && 'ring-2 ring-[#1F3864] ring-offset-1',
                      isAnswered
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-muted text-muted-foreground border border-transparent'
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-200" /> Dijawab</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted" /> Belum</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm submit dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-w-md w-full rounded-xl shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg mt-2">Kumpulkan Jawaban?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                {totalAnswered < questions.length ? (
                  <>
                    <span className="text-amber-600 font-semibold">{questions.length - totalAnswered} soal</span> belum dijawab.
                    Jawaban yang kosong akan dianggap salah.
                  </>
                ) : (
                  'Semua soal sudah dijawab. Yakin ingin mengumpulkan?'
                )}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Kembali
                </Button>
                <Button
                  className="flex-1 bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ya, Kumpulkan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Need Play icon for the start button
function Play({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 3: LAYAR HASIL
// ═══════════════════════════════════════════════════════════════════════

interface ExamResultScreenProps {
  attempt: AttemptResult;
  onBack: () => void;
}

function ExamResultScreen({ attempt, onBack }: ExamResultScreenProps) {
  const [examSession, setExamSession] = useState<any>(null);
  const [questionsMap, setQuestionsMap] = useState<Map<string, any>>(new Map());
  const [showPembahasan, setShowPembahasan] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!attempt.examSessionId) return;
      try {
        const res = await fetch(`/api/exam-session/${attempt.examSessionId}?review=true`);
        if (res.ok) {
          const data = await res.json();
          setExamSession(data.session);
          const map = new Map<string, any>();
          data.questions.forEach((q: any) => map.set(q.id, q));
          setQuestionsMap(map);
        }
      } catch (err) {
        console.error('Failed to load review data:', err);
      }
    }
    loadData();
  }, [attempt.examSessionId]);

  const predikat = getPredikat(attempt.percentage);
  const totalQ = attempt.totalCorrect + attempt.totalWrong + attempt.totalUnanswered;
  const durationMin = Math.floor(attempt.duration / 60);
  const durationSec = attempt.duration % 60;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Daftar Tryout
      </Button>

      {/* Score Card */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1F3864] to-[#2d4a7a] p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/10">
                <span className="text-3xl font-bold">{attempt.percentage}</span>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-[#1F3864] rounded-full px-2 py-0.5 text-[10px] font-bold shadow">
                %
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">{examSession?.title || 'Tryout'}</h2>
              <p className="text-white/70 text-sm mt-1">
                {examSession?.examPackage?.title || 'Tryout TKA'}
              </p>
              <Badge className={cn('mt-2', predikat.color.replace(/text-\w+-\d+/, 'text-white').replace(/bg-\w+-\d+/, 'bg-white/20').replace(/border-\w+-\d+/, 'border-white/20'))}>
                {predikat.label}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Benar', value: attempt.totalCorrect, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Salah', value: attempt.totalWrong, icon: XCircle, color: 'text-red-500' },
              { label: 'Tidak Dijawab', value: attempt.totalUnanswered, icon: HelpCircle, color: 'text-gray-400' },
              { label: 'Waktu', value: `${durationMin}m ${durationSec}s`, icon: Clock, color: 'text-[#1F3864]' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {attempt.tkaPrediction && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Prediksi TKA:</span>
                <span className="text-lg font-bold text-[#1F3864]">{attempt.tkaPrediction}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pembahasan toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Detail Jawaban</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPembahasan(!showPembahasan)}
          className="gap-1.5 transition-all duration-200"
        >
          {showPembahasan ? 'Sembunyikan' : 'Tampilkan'} Pembahasan
        </Button>
      </div>

      {/* Answer details */}
      <div className="space-y-3">
        {attempt.answers.map((ans, idx) => {
          const q = questionsMap.get(ans.questionId);
          return (
            <Card key={ans.id} className={cn(
              'rounded-xl shadow-sm transition-all duration-200',
              ans.isCorrect ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-400'
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    ans.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                  )}>
                    {ans.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed">
                      {idx + 1}. {q?.content || 'Soal tidak tersedia'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full font-medium',
                        ans.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      )}>
                        Jawabanmu: {ans.answer || '-'}
                      </span>
                      {!ans.isCorrect && q?.answer && (
                        <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                          Jawaban benar: {q.answer}
                        </span>
                      )}
                      {ans.isCorrect && q?.answer && (
                        <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                          Benar: {q.answer}
                        </span>
                      )}
                    </div>
                    {showPembahasan && q?.explanation && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Pembahasan:</p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
