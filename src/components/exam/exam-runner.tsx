'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  SkipForward, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────

interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: string; // pg, pg_kompleks, isian, esai
  content: string;
  options: string | null; // JSON string of QuestionOption[]
  answer: string | null;
  explanation: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  difficulty?: string;
  cognitiveLevel?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function parseOptions(optionsStr: string | null): QuestionOption[] {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch {
    return [];
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Question Nav Button ───────────────────────────────────────────────

function QuestionNavButton({
  index,
  isAnswered,
  isCurrent,
  onClick,
}: {
  index: number;
  isAnswered: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-all',
        isCurrent && 'bg-[#1F3864] text-white shadow-md scale-110 ring-2 ring-[#1F3864]/30',
        !isCurrent && isAnswered && 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200',
        !isCurrent && !isAnswered && 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
      )}
      aria-label={`Soal ${index + 1}${isAnswered ? ' (terjawab)' : ''}${isCurrent ? ' (saat ini)' : ''}`}
    >
      {index + 1}
    </button>
  );
}

// ─── Main ExamRunner ───────────────────────────────────────────────────

export function ExamRunner() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedAttemptId = useAppStore((s) => s.setSelectedAttemptId);

  // Exam data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes default
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasWarnedTab = useRef(false);

  // ── Fetch questions ──
  useEffect(() => {
    fetch('/api/questions?global=true&status=published')
      .then((r) => r.json())
      .then((data) => {
        const qs = data || [];
        setQuestions(qs);
        startTimeRef.current = Date.now();
      })
      .catch(() => toast.error('Gagal memuat soal'))
      .finally(() => setLoading(false));
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (loading || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  // ── Auto-submit when timer runs out ──
  useEffect(() => {
    if (timeLeft === 0 && !loading && questions.length > 0 && !submitting && !autoSubmitted) {
      setAutoSubmitted(true);
      toast.warning('Waktu habis! Jawaban otomatis dikumpulkan.');
      const doSubmit = async () => {
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const answersArray = questions.map((q) => ({
          questionId: q.id,
          answer: answers.get(q.id) || '',
          timeSpent: 0,
        }));
        try {
          const res = await fetch('/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              examSessionId: null,
              examPackageId: null,
              schoolId: user?.schoolId || null,
              classId: user?.classId || null,
              answers: answersArray,
              duration: durationSec,
            }),
          });
          if (!res.ok) throw new Error('Submit gagal');
          const attempt = await res.json();
          setSelectedAttemptId(attempt.id);
          toast.success('Jawaban berhasil dikumpulkan!');
          navigateTo('results');
        } catch {
          toast.error('Gagal mengumpulkan jawaban.');
        }
      };
      doSubmit();
    }
  }, [timeLeft, loading, questions.length, submitting, autoSubmitted, user, answers, navigateTo, setSelectedAttemptId]);

  // ── Tab switch detection ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !hasWarnedTab.current) {
        hasWarnedTab.current = true;
        toast.warning('Pindah tab terdeteksi. Pastikan Anda mengerjakan secara jujur!', {
          duration: 5000,
        });
        // Allow warning again after 30 seconds
        setTimeout(() => { hasWarnedTab.current = false; }, 30000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Prevent escape key ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // ── Answer handlers ──
  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, answer);
      return next;
    });
  }, []);

  // ── Navigation ──
  const goTo = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const goNext = () => goTo(currentIndex + 1);
  const goPrev = () => goTo(currentIndex - 1);

  const unansweredCount = questions.filter((q) => !answers.has(q.id) || answers.get(q.id) === '').length;

  // ── Submit ──
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setShowConfirm(false);

    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const answersArray = questions.map((q) => ({
      questionId: q.id,
      answer: answers.get(q.id) || '',
      timeSpent: 0,
    }));

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          examSessionId: null,
          examPackageId: null,
          schoolId: user?.schoolId || null,
          classId: user?.classId || null,
          answers: answersArray,
          duration: durationSec,
        }),
      });

      if (!res.ok) throw new Error('Submit gagal');
      const attempt = await res.json();
      setSelectedAttemptId(attempt.id);
      toast.success('Jawaban berhasil dikumpulkan!');
      navigateTo('results');
    } catch {
      toast.error('Gagal mengumpulkan jawaban. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Current question ──
  const currentQ = questions[currentIndex];
  const options = currentQ ? parseOptions(currentQ.options) : [];
  const currentAnswer = currentQ ? (answers.get(currentQ.id) || '') : '';
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isLowTime = timeLeft < 300; // < 5 minutes

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1F3864]/10">
          <Clock className="h-8 w-8 text-[#1F3864] animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Memuat Soal...</h2>
          <p className="mt-1 text-sm text-muted-foreground">Menyiapkan tryout Anda</p>
        </div>
        <div className="w-64 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Tidak ada soal tersedia</h2>
        <p className="text-muted-foreground">Soal untuk tryout ini belum tersedia.</p>
        <Button variant="outline" onClick={() => navigateTo('exams')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Tryout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden -m-6">
      {/* ── Top Bar: Timer + Progress ── */}
      <div className="shrink-0 border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Progress info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Soal <span className="text-foreground font-semibold">{currentIndex + 1}</span> dari{' '}
              <span className="text-foreground font-semibold">{questions.length}</span>
            </p>
            <Progress value={progressPercent} className="mt-1.5 h-2" />
          </div>

          {/* Timer */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 font-mono text-2xl font-bold tabular-nums transition-colors',
              isLowTime
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-[#1F3864] text-white'
            )}
          >
            <Clock className={cn('h-5 w-5', isLowTime && 'text-red-500')} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl">
            {/* Question meta */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {currentQ?.subject && (
                <Badge variant="outline" className="text-xs">{currentQ.subject.name}</Badge>
              )}
              {currentQ?.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    currentQ.difficulty === 'mudah' && 'border-green-300 text-green-700',
                    currentQ.difficulty === 'sedang' && 'border-yellow-300 text-yellow-700',
                    currentQ.difficulty === 'sulit' && 'border-red-300 text-red-700'
                  )}
                >
                  {currentQ.difficulty}
                </Badge>
              )}
              {currentQ?.cognitiveLevel && (
                <Badge variant="secondary" className="text-xs">{currentQ.cognitiveLevel}</Badge>
              )}
            </div>

            {/* Question text */}
            <div className="mb-6 rounded-lg border bg-white p-5 sm:p-6 shadow-sm">
              <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                {currentQ?.content}
              </p>
            </div>

            {/* Answer options based on type */}
            {currentQ?.type === 'pg' && options.length > 0 && (
              <RadioGroup
                value={currentAnswer}
                onValueChange={(val) => currentQ && setAnswer(currentQ.id, val)}
                className="space-y-3"
              >
                {options.map((opt) => (
                  <label
                    key={opt.label}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all',
                      'hover:border-[#1F3864]/30 hover:bg-[#1F3864]/5',
                      currentAnswer === opt.label
                        ? 'border-[#1F3864] bg-[#1F3864]/5 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <RadioGroupItem value={opt.label} id={`opt-${opt.label}`} className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-[#1F3864] mr-2">{opt.label}.</span>
                      <span className="text-sm text-foreground leading-relaxed">{opt.text}</span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ?.type === 'pg_kompleks' && options.length > 0 && (
              <RadioGroup
                value={currentAnswer}
                onValueChange={(val) => currentQ && setAnswer(currentQ.id, val)}
                className="space-y-3"
              >
                {options.map((opt) => (
                  <label
                    key={opt.label}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all',
                      'hover:border-[#1F3864]/30 hover:bg-[#1F3864]/5',
                      currentAnswer === opt.label
                        ? 'border-[#1F3864] bg-[#1F3864]/5 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <RadioGroupItem value={opt.label} id={`opt-${opt.label}`} className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-[#1F3864] mr-2">{opt.label}.</span>
                      <span className="text-sm text-foreground leading-relaxed">{opt.text}</span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ?.type === 'isian' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Jawaban singkat:</label>
                <Input
                  type="text"
                  placeholder="Ketik jawaban Anda..."
                  value={currentAnswer}
                  onChange={(e) => currentQ && setAnswer(currentQ.id, e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            )}

            {currentQ?.type === 'esai' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Jawaban esai:</label>
                <Textarea
                  placeholder="Tuliskan jawaban lengkap Anda di sini..."
                  value={currentAnswer}
                  onChange={(e) => currentQ && setAnswer(currentQ.id, e.target.value)}
                  className="min-h-[160px] text-base leading-relaxed"
                />
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between gap-3 pb-4">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>

              <div className="flex items-center gap-2">
                {currentIndex < questions.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={goNext}
                    className="gap-2 text-muted-foreground"
                  >
                    <SkipForward className="h-4 w-4" />
                    Lewati
                  </Button>
                )}
              </div>

              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={goNext}
                  className="gap-2 bg-[#1F3864] hover:bg-[#2A4A80] text-white"
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowConfirm(true)}
                  className="gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white"
                >
                  <Send className="h-4 w-4" />
                  Selesai & Kumpulkan
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Question Navigation Panel (desktop: right side) ── */}
        <div className="hidden lg:flex w-64 shrink-0 flex-col border-l bg-gray-50">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-foreground">Navigasi Soal</h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-green-100 border border-green-300" />
                Terjawab
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#1F3864]" />
                Saat ini
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-gray-100 border border-gray-200" />
                Belum
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <QuestionNavButton
                  key={q.id}
                  index={idx}
                  isAnswered={answers.has(q.id) && answers.get(q.id) !== ''}
                  isCurrent={idx === currentIndex}
                  onClick={() => goTo(idx)}
                />
              ))}
            </div>
          </ScrollArea>
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Terjawab</span>
              <span className="font-semibold text-green-700">{questions.length - unansweredCount}/{questions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Belum dijawab</span>
              <span className={cn('font-semibold', unansweredCount > 0 ? 'text-red-600' : 'text-green-700')}>
                {unansweredCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: Sticky bottom nav ── */}
      <div className="lg:hidden shrink-0 border-t bg-white px-3 py-3">
        <ScrollArea className="mb-3" type="scroll">
          <div className="flex gap-1.5 pb-1">
            {questions.map((q, idx) => (
              <QuestionNavButton
                key={q.id}
                index={idx}
                isAnswered={answers.has(q.id) && answers.get(q.id) !== ''}
                isCurrent={idx === currentIndex}
                onClick={() => goTo(idx)}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1}/{questions.length}
          </span>
          {currentIndex < questions.length - 1 ? (
            <Button size="sm" onClick={goNext} className="gap-1 bg-[#1F3864] hover:bg-[#2A4A80] text-white">
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="gap-1 bg-[#D4A017] hover:bg-[#B8860B] text-white"
            >
              <Send className="h-4 w-4" />
              Kumpulkan
            </Button>
          )}
        </div>
      </div>

      {/* ── Submit Confirmation Dialog ── */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan Jawaban?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0 ? (
                <>
                  Anda memiliki <span className="font-semibold text-red-600">{unansweredCount} soal</span> yang belum dijawab.
                  <br />
                  Jawaban yang belum diisi akan dianggap kosong.
                </>
              ) : (
                'Semua soal sudah dijawab. Yakin ingin mengumpulkan?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#D4A017] hover:bg-[#B8860B] text-white"
            >
              {submitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
