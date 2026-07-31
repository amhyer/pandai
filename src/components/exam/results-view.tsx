'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Trophy, Target, Clock, CheckCircle2, XCircle, MinusCircle,
  ArrowLeft, BarChart3, TrendingUp, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────

interface StudentAnswer {
  id: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  timeSpent: number;
  question?: {
    id: string;
    content: string;
    type: string;
    answer: string | null;
    explanation: string | null;
    options: string | null;
    subject?: { id: string; name: string } | null;
  };
}

interface Attempt {
  id: string;
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  percentage: number;
  tkaPrediction: number | null;
  duration: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  answers: StudentAnswer[];
}

// ─── Helpers ───────────────────────────────────────────────────────────

function parseOptions(optionsStr: string | null): { label: string; text: string }[] {
  if (!optionsStr) return [];
  try { return JSON.parse(optionsStr); } catch { return []; }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} jam ${m} menit ${s} detik`;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getAnswerText(question: StudentAnswer['question'], answerLabel: string | null): string {
  if (!answerLabel) return '-';
  if (!question?.options) return answerLabel;
  const opts = parseOptions(question.options);
  const opt = opts.find(o => o.label === answerLabel);
  return opt ? `${opt.label}. ${opt.text}` : answerLabel;
}

// ─── Summary Card ──────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  colorClass: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn('mt-2 text-3xl font-bold tracking-tight', colorClass)}>{value}</p>
            {subValue && <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', colorClass.replace('text-', 'bg-').replace('700', '100'))}>
            <Icon className={cn('h-6 w-6', colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Donut Chart (CSS-only) ────────────────────────────────────────────

function ScoreDonut({ correct, wrong, unanswered }: { correct: number; wrong: number; unanswered: number }) {
  const total = correct + wrong + unanswered;
  if (total === 0) return null;

  const correctPct = (correct / total) * 100;
  const wrongPct = (wrong / total) * 100;
  const unansweredPct = (unanswered / total) * 100;

  // CSS conic-gradient for donut
  const gradient = `conic-gradient(
    #16a34a 0% ${correctPct}%,
    #dc2626 ${correctPct}% ${correctPct + wrongPct}%,
    #d1d5db ${correctPct + wrongPct}% 100%
  )`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative h-40 w-40 rounded-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#1F3864]">{Math.round(correctPct)}%</p>
            <p className="text-xs text-muted-foreground">Benar</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-600" />
          Benar ({correct})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-600" />
          Salah ({wrong})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-300" />
          Kosong ({unanswered})
        </span>
      </div>
    </div>
  );
}

// ─── Result Row ────────────────────────────────────────────────────────

function ResultRow({ answer, index }: { answer: StudentAnswer; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const q = answer.question;

  const isUnanswered = !answer.answer || answer.answer === '';
  const iconColor = answer.isCorrect ? 'text-green-600' : isUnanswered ? 'text-gray-400' : 'text-red-500';

  const statusConfig = isUnanswered
    ? { icon: MinusCircle, label: 'Kosong', className: 'text-gray-400 bg-gray-50 border-gray-200' }
    : answer.isCorrect
    ? { icon: CheckCircle2, label: 'Benar', className: 'text-green-700 bg-green-50 border-green-200' }
    : { icon: XCircle, label: 'Salah', className: 'text-red-700 bg-red-50 border-red-200' };

  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('rounded-lg border p-4 transition-colors', statusConfig.className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-muted-foreground">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{q?.content || 'Soal tidak tersedia'}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">Jawaban Anda: </span>
              <span className={cn('font-medium',
                answer.answer === null || answer.answer === ''
                  ? 'text-gray-400 italic'
                  : answer.isCorrect ? 'text-green-700' : 'text-red-600'
              )}>
                {answer.answer === null || answer.answer === ''
                  ? 'Tidak dijawab'
                  : getAnswerText(q, answer.answer)
                }
              </span>
            </span>
            {!answer.isCorrect && q?.answer && (
              <span>
                <span className="text-muted-foreground">Jawaban Benar: </span>
                <span className="font-medium text-green-700">
                  {getAnswerText(q, q.answer)}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusIcon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>

      {/* Explanation toggle */}
      {q?.explanation && (
        <div className="mt-3">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-xs font-medium text-[#1F3864] hover:underline"
          >
            {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Pembahasan
          </button>
          {showExplanation && (
            <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 leading-relaxed">
              {q.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

function EmptyResults() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Trophy className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">Belum ada hasil</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Anda belum memiliki hasil tryout. Kerjakan tryout terlebih dahulu.
      </p>
    </div>
  );
}

// ─── Main ResultsView ──────────────────────────────────────────────────

export function ResultsView() {
  const user = useAppStore((s) => s.user);
  const selectedAttemptId = useAppStore((s) => s.selectedAttemptId);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/attempts?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data || [];
        setAttempts(list);
        // If we have a selected attempt ID, find it
        if (selectedAttemptId) {
          const found = list.find((a: Attempt) => a.id === selectedAttemptId);
          if (found) setSelectedAttempt(found);
        } else if (list.length > 0) {
          setSelectedAttempt(list[0]);
        }
      })
      .catch(() => toast.error('Gagal memuat hasil'))
      .finally(() => setLoading(false));
  }, [user?.id, selectedAttemptId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hasil Tryout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pantau skor dan analisis jawaban Anda</p>
        </div>
        <EmptyResults />
        <Button variant="outline" onClick={() => navigateTo('exams')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Tryout
        </Button>
      </div>
    );
  }

  const a = selectedAttempt || attempts[0];
  const total = a.totalCorrect + a.totalWrong + a.totalUnanswered;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hasil Tryout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {a.submittedAt && `Dikumpulkan: ${formatDate(a.submittedAt)}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigateTo('dashboard')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Button>
      </div>

      {/* Attempt selector if multiple */}
      {attempts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {attempts.map((att) => (
            <Button
              key={att.id}
              variant={att.id === a.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAttempt(att)}
              className={cn(
                att.id === a.id && 'bg-[#1F3864] hover:bg-[#2A4A80] text-white'
              )}
            >
              {att.submittedAt
                ? new Date(att.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Tanpa tanggal'}
              {' — '}{Math.round(att.percentage)}%
            </Button>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Trophy}
          label="Skor"
          value={`${a.totalCorrect}/${total}`}
          subValue={`${a.score} poin`}
          colorClass="text-[#D4A017]"
        />
        <SummaryCard
          icon={Target}
          label="Persentase Benar"
          value={`${a.percentage}%`}
          subValue={a.percentage >= 70 ? 'Bagus!' : a.percentage >= 50 ? 'Cukup, tingkatkan!' : 'Perlu belajar lebih giat'}
          colorClass={a.percentage >= 70 ? 'text-green-700' : a.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Prediksi TKA"
          value={a.tkaPrediction ? `${a.tkaPrediction}` : '-'}
          subValue="Skor estimasi TKA"
          colorClass="text-[#1F3864]"
        />
        <SummaryCard
          icon={Clock}
          label="Waktu Pengerjaan"
          value={formatDuration(a.duration)}
          subValue={`Benar: ${a.totalCorrect} | Salah: ${a.totalWrong} | Kosong: ${a.totalUnanswered}`}
          colorClass="text-[#2A4A80]"
        />
      </div>

      {/* Score Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ringkasan Jawaban
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-center sm:gap-12">
            <ScoreDonut
              correct={a.totalCorrect}
              wrong={a.totalWrong}
              unanswered={a.totalUnanswered}
            />
            {/* Bar visualization */}
            <div className="w-full max-w-xs space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700 font-medium">Benar</span>
                  <span className="font-semibold text-green-700">{a.totalCorrect}/{total}</span>
                </div>
                <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: total > 0 ? `${(a.totalCorrect / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-600 font-medium">Salah</span>
                  <span className="font-semibold text-red-600">{a.totalWrong}/{total}</span>
                </div>
                <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: total > 0 ? `${(a.totalWrong / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 font-medium">Kosong</span>
                  <span className="font-semibold text-gray-500">{a.totalUnanswered}/{total}</span>
                </div>
                <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-300 transition-all"
                    style={{ width: total > 0 ? `${(a.totalUnanswered / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Pembahasan Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!a.answers || a.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Detail jawaban tidak tersedia.
            </p>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3 pr-4">
                {a.answers.map((ans, idx) => (
                  <ResultRow key={ans.id} answer={ans} index={idx} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
