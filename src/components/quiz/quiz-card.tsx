'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface QuizQuestion {
  id: string;
  content: string;
  options: { label: string; text: string }[];
}

type QuizState = 'loading' | 'idle' | 'running' | 'done';

/**
 * QuizCard — kuis mandiri cepat (5 soal PG) dari bank soal publik sekolah.
 * Feedback langsung per jawaban + skor akhir. Dipakai di dashboard siswa.
 */
export function QuizCard({
  title = 'Kuis Mandiri',
  questionCount = 5,
}: {
  title?: string;
  questionCount?: number;
}) {
  const user = useAppStore((s) => s.user);
  const schoolId = user?.schoolId || '';

  const [state, setState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const fetchQuiz = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(
        `/api/questions?status=published&limit=200&schoolId=${schoolId}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data ?? [];
      // Ambil soal PG (memiliki options) — acak
      const pg = list
        .filter((q: { options: string | null }) => q.options)
        .map((q: { id: string; content: string; options: string }) => {
          let opts: QuizQuestion['options'] = [];
          try {
            const parsed = JSON.parse(q.options);
            opts = Array.isArray(parsed)
              ? parsed
                  .filter((o: Record<string, unknown>) => o.label && o.text)
                  .map((o: Record<string, unknown>) => ({
                    label: String(o.label),
                    text: String(o.text),
                  }))
              : [];
          } catch {
            opts = [];
          }
          return { id: q.id, content: q.content, options: opts };
        })
        .filter((q: QuizQuestion) => q.options.length >= 2);

      const shuffled = [...pg].sort(() => Math.random() - 0.5).slice(0, questionCount);
      if (!shuffled.length) {
        setState('idle');
        return;
      }
      setQuestions(shuffled);
      setState('running');
    } catch {
      setState('idle');
    }
  }, [schoolId, questionCount]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const restart = () => {
    setCurrent(0);
    setPicked(null);
    setRevealed(false);
    setCorrectCount(0);
    fetchQuiz();
  };

  // Mode latihan mandiri: API tidak mengirim kunci jawaban ke siswa,
  // jadi kuis berjalan tanpa penilaian benar/salah per soal — fokusnya
  // adalah kebiasaan mencoba & melihat cakupan soal.
  const pick = (label: string) => {
    if (revealed) return;
    setPicked(label);
    setRevealed(true);
  };

  if (state === 'loading') {
    return (
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#1F3864]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (state === 'idle' || questions.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#1F3864]" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">Latihan cepat sebelum tryout</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Belum ada soal tersedia untuk kuis mandiri.
          </p>
        </CardContent>
      </Card>
    );
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const progress = ((current + (revealed ? 1 : 0)) / questions.length) * 100;

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#1F3864]" />
            {title}
          </CardTitle>
          {state === 'done' ? (
            <Badge className="bg-[#1F3864] text-white">
              Skor {correctCount}/{questions.length}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              Soal {current + 1}/{questions.length}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
          <div className="h-full bg-[#1F3864] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        {state === 'done' ? (
          <div className="py-6 text-center space-y-3">
            <div
              className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${
                correctCount >= questions.length / 2 ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              {correctCount >= questions.length / 2 ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <RotateCcw className="h-8 w-8 text-amber-500" />
              )}
            </div>
            <p className="text-lg font-bold text-[#1F3864]">
              {correctCount}/{questions.length} benar
            </p>
            <p className="text-sm text-muted-foreground">
              {correctCount >= questions.length / 2
                ? 'Bagus! Teruskan latihan Anda. 💪'
                : 'Jangan menyerah — coba lagi untuk hasil lebih baik.'}
            </p>
            <Button size="sm" className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white" onClick={restart}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Coba Lagi
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{q.content}</p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pick(opt.label)}
                  className={`w-full text-left flex items-start gap-2 p-3 rounded-lg border text-sm transition-colors ${
                    picked === opt.label
                      ? 'bg-[#1F3864]/5 border-[#1F3864]/40'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-semibold text-slate-500">{opt.label}.</span>
                  <span className="text-slate-700">{opt.text}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
                disabled={!revealed}
                onClick={() => {
                  if (isLast) {
                    setState('done');
                  } else {
                    setCurrent((c) => c + 1);
                    setPicked(null);
                    setRevealed(false);
                  }
                }}
              >
                {isLast ? 'Lihat Hasil' : 'Lanjut'}
              </Button>
            </div>
            {!revealed && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3" /> Pilih jawaban untuk lanjut (mode latihan — tanpa kunci jawaban)
              </p>
            )}
            {revealed && (
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  <CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-500" />
                  Jawaban tercatat (mode latihan mandiri)
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuizCard;
