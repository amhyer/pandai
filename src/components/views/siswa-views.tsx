'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Stethoscope,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  BookOpen,
  Languages,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Info,
  Sparkles,
  Dumbbell,
  Target,
  Brain,
  Lightbulb,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Trophy,
  Medal,
  Crown,
  Star,
  History,
  ClipboardList,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  Timer,
  Award,
  User,
  GraduationCap,
  Zap,
  Flame,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Globe,
  School,
} from 'lucide-react';

// ─── Shared Types ──────────────────────────────────────────────────

interface SubjectInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  estimatedTime: string;
  totalQuestions: number;
  completed?: boolean;
  score?: number;
}

interface TopicInfo {
  id: string;
  name: string;
  subject: string;
  totalQuestions: number;
  mastered: number;
  correctRate: number;
  isWeak: boolean;
}

interface ScoreEntry {
  id: string;
  tryoutName: string;
  date: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  duration: string;
  status: 'completed' | 'in_progress' | 'timed_out';
}

interface HistoryEntry {
  id: string;
  title: string;
  type: 'tryout' | 'diagnostic' | 'latihan';
  date: string;
  score: number;
  maxScore: number;
  duration: string;
  status: 'completed' | 'in_progress' | 'timed_out';
  details?: {
    correct: number;
    wrong: number;
    unanswered: number;
    subject?: string;
    topic?: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  class: string;
  avgScore: number;
  totalTryout: number;
  avatar?: string;
  isMe?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Selesai</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Berlangsung</Badge>;
    case 'timed_out':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Waktu Habis</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'tryout':
      return <Badge className="bg-[#1F3864]/10 text-[#1F3864] hover:bg-[#1F3864]/15 border-[#1F3864]/20">Tryout</Badge>;
    case 'diagnostic':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Diagnostic</Badge>;
    case 'latihan':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Latihan</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  1. DIAGNOSTIC VIEW
// ═══════════════════════════════════════════════════════════════════

export function DiagnosticView() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const DIAGNOSTIC_SUBJECTS: SubjectInfo[] = useMemo(
    () => [
      { id: 'matematika', name: 'Matematika', icon: <Calculator className="h-6 w-6" />, estimatedTime: '30 menit', totalQuestions: 25 },
      { id: 'fisika', name: 'Fisika', icon: <Atom className="h-6 w-6" />, estimatedTime: '25 menit', totalQuestions: 20 },
      { id: 'kimia', name: 'Kimia', icon: <FlaskConical className="h-6 w-6" />, estimatedTime: '25 menit', totalQuestions: 20 },
      { id: 'biologi', name: 'Biologi', icon: <Leaf className="h-6 w-6" />, estimatedTime: '25 menit', totalQuestions: 20 },
      { id: 'b-indonesia', name: 'B. Indonesia', icon: <BookOpen className="h-6 w-6" />, estimatedTime: '20 menit', totalQuestions: 15 },
      { id: 'b-inggris', name: 'B. Inggris', icon: <Languages className="h-6 w-6" />, estimatedTime: '20 menit', totalQuestions: 15 },
    ],
    []
  );

  useEffect(() => {
    // Simulate loading diagnostic progress
    const timer = setTimeout(() => {
      setSubjects([
        { ...DIAGNOSTIC_SUBJECTS[0], completed: true, score: 720 },
        { ...DIAGNOSTIC_SUBJECTS[1], completed: true, score: 650 },
        { ...DIAGNOSTIC_SUBJECTS[2] },
        { ...DIAGNOSTIC_SUBJECTS[3] },
        { ...DIAGNOSTIC_SUBJECTS[4] },
        { ...DIAGNOSTIC_SUBJECTS[5] },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [DIAGNOSTIC_SUBJECTS]);

  const completedCount = subjects.filter((s) => s.completed).length;
  const totalCount = subjects.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleStartDiagnostic(subjectId?: string) {
    toast.success('Memulai diagnostic test...');
    // In real app: navigate to exam runner with diagnostic config
  }

  function handleStartFullDiagnostic() {
    toast.success('Memulai diagnostic lengkap...');
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-[#1F3864] border-[#1F3864] text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <CardContent className="p-6 sm:p-10 relative z-10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Stethoscope className="h-8 w-8 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Diagnostic Test TKA</h1>
              <p className="text-white/80 max-w-xl mx-auto">
                Kenali kekuatan dan kelemahanmu di setiap mata pelajaran TKA.
                Tes diagnostic ini akan menganalisis kemampuan awalmu agar belajar jadi lebih
                terarah dan efisien.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Rekomendasi topik belajar otomatis setelah selesai</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {!loading && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Progress Diagnostic</p>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} dari {totalCount} mapel selesai
                  </p>
                </div>
                <Progress value={progressPercent} className="h-2.5" />
              </div>
              {completedCount > 0 && completedCount < totalCount && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 shrink-0">
                  <Flame className="mr-1 h-3.5 w-3.5" />
                  {progressPercent}% selesai
                </Badge>
              )}
              {completedCount === totalCount && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shrink-0">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Semua selesai!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Selection Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Pilih Mata Pelajaran</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Mulai diagnostic per mapel atau pilih semua sekaligus di bawah
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-9 w-28 mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className={`group relative transition-all hover:shadow-md ${
                    subject.completed
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : selectedSubject === subject.id
                      ? 'border-[#1F3864] ring-2 ring-[#1F3864]/20'
                      : 'hover:border-[#1F3864]/40'
                  }`}
                >
                  {subject.completed && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          subject.completed
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-[#1F3864]/10 text-[#1F3864]'
                        }`}
                      >
                        {subject.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{subject.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {subject.totalQuestions} soal
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {subject.estimatedTime}
                          </span>
                        </div>
                        {subject.completed && subject.score !== undefined && (
                          <div className="mt-2">
                            <Badge
                              className={`${
                                subject.score >= 700
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              } hover:bg-transparent`}
                            >
                              Skor: {subject.score}
                            </Badge>
                          </div>
                        )}
                        {!subject.completed && (
                          <Button
                            size="sm"
                            className="mt-3 bg-[#1F3864] hover:bg-[#152850] text-xs"
                            onClick={() => handleStartDiagnostic(subject.id)}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Mulai Tes
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-blue-900">Mengapa Diagnostic Test penting?</h4>
              <p className="text-sm text-blue-800/80">
                Diagnostic Test membantu PANDAI mengenali kekuatan dan kelemahanmu di
                setiap topik. Hasilnya digunakan untuk merekomendasikan latihan yang paling
                kamu butuhkan, sehingga waktu belajarmu lebih efisien dan target TKA tercapai!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Full Diagnostic Button */}
      <div className="flex justify-center pt-2 pb-4">
        <Button
          size="lg"
          className="bg-[#1F3864] hover:bg-[#152850] px-10 py-6 text-base font-semibold"
          onClick={handleStartFullDiagnostic}
          disabled={completedCount === totalCount}
        >
          <Stethoscope className="mr-2 h-5 w-5" />
          {completedCount === totalCount
            ? 'Diagnostic Selesai! Lihat Hasil'
            : completedCount > 0
            ? 'Lanjutkan Diagnostic'
            : 'Mulai Diagnostic'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  2. PRACTICE VIEW
// ═══════════════════════════════════════════════════════════════════

export function PracticeView() {
  const user = useAppStore((s) => s.user);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [activeSession, setActiveSession] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestionsSession, setTotalQuestionsSession] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Simulated stats
  const [stats, setStats] = useState({
    topicsStudied: 0,
    questionsCorrect: 0,
    masteryLevel: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setTopics([
        { id: 't1', name: 'Turunan Fungsi', subject: 'Matematika', totalQuestions: 40, mastered: 28, correctRate: 70, isWeak: false },
        { id: 't2', name: 'Limit & Kekontinuan', subject: 'Matematika', totalQuestions: 35, mastered: 15, correctRate: 43, isWeak: true },
        { id: 't3', name: 'Kinematika GLB & GLBB', subject: 'Fisika', totalQuestions: 30, mastered: 25, correctRate: 83, isWeak: false },
        { id: 't4', name: 'Hukum Newton', subject: 'Fisika', totalQuestions: 30, mastered: 12, correctRate: 40, isWeak: true },
        { id: 't5', name: 'Stoikiometri', subject: 'Kimia', totalQuestions: 35, mastered: 30, correctRate: 86, isWeak: false },
        { id: 't6', name: 'Ikatan Kimia', subject: 'Kimia', totalQuestions: 25, mastered: 10, correctRate: 40, isWeak: true },
        { id: 't7', name: 'Sel & Organel', subject: 'Biologi', totalQuestions: 30, mastered: 22, correctRate: 73, isWeak: false },
        { id: 't8', name: 'Struktur Teks', subject: 'B. Indonesia', totalQuestions: 20, mastered: 18, correctRate: 90, isWeak: false },
      ]);
      setStats({ topicsStudied: 8, questionsCorrect: 342, masteryLevel: 67 });
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const DUMMY_OPTIONS = [
    'f(x) = 2x² - 3x + 1',
    'f(x) = 4x³ + 2x - 5',
    'f(x) = x² + 7x - 2',
    'f(x) = 3x³ - x² + 4',
  ];

  function handleStartPractice(topicId: string) {
    setSelectedTopic(topicId);
    setActiveSession(true);
    setCurrentQuestion(1);
    setSelectedAnswer(null);
    toast.success('Sesi latihan dimulai! Semangat! \ud83d\udcaa');
  }

  function handleSelectAnswer(option: string) {
    setSelectedAnswer(option);
  }

  function handleNextQuestion() {
    if (currentQuestion < totalQuestionsSession) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      toast.success('Sesi latihan selesai! Kerja bagus! \ud83c\udf89');
      setActiveSession(false);
      setSelectedTopic(null);
    }
  }

  if (activeSession && selectedTopic) {
    const topic = topics.find((t) => t.id === selectedTopic);
    return (
      <div className="space-y-4">
        {/* Session Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setActiveSession(false)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Kembali
          </Button>
          <Badge className="bg-[#1F3864]/10 text-[#1F3864] border-[#1F3864]/20">
            {topic?.name ?? 'Latihan'}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Soal {currentQuestion} dari {totalQuestionsSession}
            </span>
            <span className="font-medium">
              {Math.round((currentQuestion / totalQuestionsSession) * 100)}%
            </span>
          </div>
          <Progress value={(currentQuestion / totalQuestionsSession) * 100} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F3864] text-white text-sm font-bold">
                {currentQuestion}
              </div>
              <CardDescription>Pilihan Ganda</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base font-medium leading-relaxed">
              Tentukan turunan pertama dari fungsi f(x) = 6x\u00B3 - 4x\u00B2 + 3x - 7
            </p>
            <div className="space-y-2.5">
              {DUMMY_OPTIONS.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                return (
                  <button
                    key={idx}
                    className={`w-full text-left rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${
                      selectedAnswer === opt
                        ? 'border-[#1F3864] bg-[#1F3864]/5'
                        : 'border-border'
                    }`}
                    onClick={() => handleSelectAnswer(opt)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          selectedAnswer === opt
                            ? 'bg-[#1F3864] text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(1, prev - 1))}
            disabled={currentQuestion === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Sebelumnya
          </Button>
          <Button
            className="bg-[#1F3864] hover:bg-[#152850]"
            onClick={handleNextQuestion}
          >
            {currentQuestion === totalQuestionsSession ? 'Selesai' : 'Selanjutnya'}
            {currentQuestion === totalQuestionsSession ? (
              <CheckCircle2 className="ml-1.5 h-4 w-4" />
            ) : (
              <ChevronRight className="ml-1.5 h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-[#1F3864]" />
          Latihan Soal Adaptif
        </h1>
        <p className="text-muted-foreground mt-1">
          Belajar lebih pintar dengan soal yang disesuaikan kemampuanmu. Kuasai topik demi topik!
        </p>
      </div>

      {/* Stats Bar */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864]/10 text-[#1F3864]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Topik Dipelajari</p>
                <p className="text-xl font-bold">{stats.topicsStudied}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Soal Dijawab Benar</p>
                <p className="text-xl font-bold">{stats.questionsCorrect}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tingkat Penguasaan</p>
                <p className="text-xl font-bold">{stats.masteryLevel}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Motivation Banner */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Lightbulb className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900">
              {stats.masteryLevel >= 70
                ? '\u2b50 Hebat! Penguasaanmu sudah cukup baik. Terus tingkatkan!'
                : '\ud83d\udcaa Ayo tingkatkan penguasaanmu! Fokus ke topik yang masih lemah.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topic Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Pilih Topik Latihan</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Topik dengan border kuning membutuhkan perhatian lebih
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))
            : topics.map((topic) => (
                <Card
                  key={topic.id}
                  className={`transition-all hover:shadow-md ${
                    topic.isWeak
                      ? 'border-amber-300 border-2 bg-amber-50/30'
                      : 'hover:border-[#1F3864]/40'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{topic.name}</h3>
                        <p className="text-xs text-muted-foreground">{topic.subject}</p>
                      </div>
                      {topic.isWeak && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px]">
                          Perlu Diperkuat
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{topic.totalQuestions} soal</span>
                      <span>{topic.mastered}/{topic.totalQuestions} dikuasai</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Penguasaan</span>
                        <span
                          className={`font-medium ${
                            topic.correctRate >= 70
                              ? 'text-emerald-600'
                              : topic.correctRate >= 50
                              ? 'text-amber-600'
                              : 'text-red-500'
                          }`}
                        >
                          {topic.correctRate}%
                        </span>
                      </div>
                      <Progress
                        value={topic.correctRate}
                        className={`h-1.5 ${
                          topic.correctRate >= 70
                            ? '[&>div]:bg-emerald-500'
                            : topic.correctRate >= 50
                            ? '[&>div]:bg-amber-500'
                            : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>

                    <Button
                      size="sm"
                      className={`w-full text-xs ${
                        topic.isWeak
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#1F3864] hover:bg-[#152850]'
                      }`}
                      onClick={() => handleStartPractice(topic.id)}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      Latihan
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  3. SISWA NILAI VIEW
// ═══════════════════════════════════════════════════════════════════

export function SiswaNilaiView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [selectedScore, setSelectedScore] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScores([
        { id: 's1', tryoutName: 'Tryout TKA 1 - Batch A', date: '2025-01-15', score: 720, maxScore: 1000, correct: 58, wrong: 22, duration: '1j 45m', status: 'completed' },
        { id: 's2', tryoutName: 'Tryout TKA 2 - Batch A', date: '2025-02-10', score: 780, maxScore: 1000, correct: 64, wrong: 16, duration: '1j 38m', status: 'completed' },
        { id: 's3', tryoutName: 'Tryout TKA 3 - Batch B', date: '2025-03-05', score: 810, maxScore: 1000, correct: 68, wrong: 12, duration: '1j 30m', status: 'completed' },
        { id: 's4', tryoutName: 'Tryout TKA 4 - Batch B', date: '2025-03-28', score: 850, maxScore: 1000, correct: 72, wrong: 8, duration: '1j 25m', status: 'completed' },
        { id: 's5', tryoutName: 'Tryout TKA 5 - Final', date: '2025-04-15', score: 0, maxScore: 1000, correct: 0, wrong: 0, duration: '0j 0m', status: 'in_progress' },
      ]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const completedScores = scores.filter((s) => s.status === 'completed');
  const avgScore =
    completedScores.length > 0
      ? Math.round(completedScores.reduce((a, b) => a + b.score, 0) / completedScores.length)
      : 0;
  const highestScore =
    completedScores.length > 0
      ? Math.max(...completedScores.map((s) => s.score))
      : 0;
  const maxBarScore = Math.max(...scores.map((s) => s.score), 1);

  function handleViewDetail(scoreId: string) {
    setSelectedScore(selectedScore === scoreId ? null : scoreId);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#1F3864]" />
          Nilai Saya
        </h1>
        <p className="text-muted-foreground mt-1">
          Pantau perkembangan skor TKA dan lihat kemajuanmu dari waktu ke waktu
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs text-muted-foreground">Rata-rata Skor</p>
                </div>
                <p className="text-2xl font-bold text-[#1F3864]">{avgScore}</p>
                <p className="text-xs text-muted-foreground">dari 1000</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Skor Tertinggi</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{highestScore}</p>
                <p className="text-xs text-muted-foreground">dari 1000</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-[#1F3864]" />
                  <p className="text-xs text-muted-foreground">Total Tryout</p>
                </div>
                <p className="text-2xl font-bold">{completedScores.length}</p>
                <p className="text-xs text-muted-foreground">diselesaikan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Peringkat</p>
                </div>
                <p className="text-2xl font-bold">#12</p>
                <p className="text-xs text-muted-foreground">di sekolah</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Score Trend - Simple CSS Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tren Skor Tryout</CardTitle>
          <CardDescription>Visualisasi perkembangan skor dari tryout ke tryout</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : completedScores.length > 0 ? (
            <div className="space-y-3">
              {scores.map((entry) => {
                const heightPercent = maxBarScore > 0 ? (entry.score / 1000) * 100 : 0;
                return (
                  <div key={entry.id} className="flex items-center gap-4">
                    <div className="w-36 sm:w-48 shrink-0 text-right">
                      <p className="text-sm font-medium truncate">{entry.tryoutName}</p>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                        <div
                          className={`h-full rounded-md transition-all duration-700 flex items-center justify-end pr-3 ${
                            entry.score >= 800
                              ? 'bg-gradient-to-r from-[#1F3864] to-emerald-500'
                              : entry.score >= 600
                              ? 'bg-gradient-to-r from-[#1F3864] to-amber-400'
                              : 'bg-gradient-to-r from-[#1F3864] to-red-400'
                          }`}
                          style={{ width: `${Math.max(heightPercent, entry.status === 'completed' ? 8 : 2)}%` }}
                        >
                          {entry.score > 0 && (
                            <span className="text-white text-xs font-bold drop-shadow-sm">
                              {entry.score}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(entry.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm">Belum ada data skor</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detail Nilai Tryout</CardTitle>
          <CardDescription>Klik "Lihat Detail" untuk analisis lebih lanjut</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Tryout</th>
                    <th className="pb-3 font-medium text-muted-foreground">Tanggal</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Skor</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center hidden sm:table-cell">Benar/Salah</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center hidden md:table-cell">Durasi</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scores.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className="group">
                        <td className="py-3 pr-4">
                          <p className="font-medium max-w-[200px] truncate">{entry.tryoutName}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span
                            className={`font-bold ${
                              entry.score >= 800
                                ? 'text-emerald-600'
                                : entry.score >= 600
                                ? 'text-amber-600'
                                : entry.score > 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {entry.score > 0 ? entry.score : '-'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center hidden sm:table-cell">
                          {entry.status === 'completed' ? (
                            <span>
                              <span className="text-emerald-600 font-medium">{entry.correct}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-red-500 font-medium">{entry.wrong}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-center text-muted-foreground hidden md:table-cell">
                          {entry.duration}
                        </td>
                        <td className="py-3 pr-4 text-center">{getStatusBadge(entry.status)}</td>
                        <td className="py-3 text-center">
                          {entry.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleViewDetail(entry.id)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Lihat Detail
                            </Button>
                          )}
                        </td>
                      </tr>
                      {/* Expandable Detail Row */}
                      {selectedScore === entry.id && entry.status === 'completed' && (
                        <tr>
                          <td colSpan={7} className="bg-muted/30 px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Skor</p>
                                <p className="font-bold text-[#1F3864]">{entry.score}/1000</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Jawaban Benar</p>
                                <p className="font-bold text-emerald-600">{entry.correct} soal</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Jawaban Salah</p>
                                <p className="font-bold text-red-500">{entry.wrong} soal</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Akurasi</p>
                                <p className="font-bold">
                                  {Math.round((entry.correct / (entry.correct + entry.wrong)) * 100)}%
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  4. SISWA RIWAYAT VIEW
// ═══════════════════════════════════════════════════════════════════

export function SiswaRiwayatView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'tryout' | 'diagnostic' | 'latihan'>('semua');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistory([
        { id: 'h1', title: 'Tryout TKA 4 - Batch B', type: 'tryout', date: '2025-03-28', score: 850, maxScore: 1000, duration: '1j 25m', status: 'completed', details: { correct: 72, wrong: 8, unanswered: 0 } },
        { id: 'h2', title: 'Latihan - Hukum Newton', type: 'latihan', date: '2025-03-27', score: 80, maxScore: 100, duration: '25m', status: 'completed', details: { correct: 8, wrong: 2, unanswered: 0, subject: 'Fisika', topic: 'Hukum Newton' } },
        { id: 'h3', title: 'Diagnostic - Matematika', type: 'diagnostic', date: '2025-03-25', score: 720, maxScore: 1000, duration: '28m', status: 'completed', details: { correct: 18, wrong: 7, unanswered: 0, subject: 'Matematika' } },
        { id: 'h4', title: 'Tryout TKA 3 - Batch B', type: 'tryout', date: '2025-03-05', score: 810, maxScore: 1000, duration: '1j 30m', status: 'completed', details: { correct: 68, wrong: 12, unanswered: 0 } },
        { id: 'h5', title: 'Latihan - Turunan Fungsi', type: 'latihan', date: '2025-03-03', score: 90, maxScore: 100, duration: '20m', status: 'completed', details: { correct: 9, wrong: 1, unanswered: 0, subject: 'Matematika', topic: 'Turunan Fungsi' } },
        { id: 'h6', title: 'Diagnostic - Fisika', type: 'diagnostic', date: '2025-03-01', score: 650, maxScore: 1000, duration: '22m', status: 'completed', details: { correct: 13, wrong: 7, unanswered: 0, subject: 'Fisika' } },
        { id: 'h7', title: 'Tryout TKA 2 - Batch A', type: 'tryout', date: '2025-02-10', score: 780, maxScore: 1000, duration: '1j 38m', status: 'completed', details: { correct: 64, wrong: 16, unanswered: 0 } },
        { id: 'h8', title: 'Tryout TKA 5 - Final', type: 'tryout', date: '2025-04-15', score: 0, maxScore: 1000, duration: '0j 0m', status: 'in_progress', details: { correct: 0, wrong: 0, unanswered: 80, subject: 'Semua Mapel' } },
      ]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredHistory = history.filter((entry) => {
    if (activeFilter === 'semua') return true;
    return entry.type === activeFilter;
  });

  const completedHistory = history.filter((h) => h.status === 'completed');
  const avgScore =
    completedHistory.length > 0
      ? Math.round(
          completedHistory.reduce((a, b) => a + (b.score / b.maxScore) * 100, 0) / completedHistory.length
        )
      : 0;

  const FILTER_TABS = [
    { key: 'semua' as const, label: 'Semua', icon: <Filter className="h-3.5 w-3.5" /> },
    { key: 'tryout' as const, label: 'Tryout', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { key: 'diagnostic' as const, label: 'Diagnostic', icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { key: 'latihan' as const, label: 'Latihan', icon: <Dumbbell className="h-3.5 w-3.5" /> },
  ];

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-[#1F3864]" />
          Riwayat Pengerjaan
        </h1>
        <p className="text-muted-foreground mt-1">
          Lihat semua aktivitas pengerjaan tes dan latihanmu
        </p>
      </div>

      {/* Stats Summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#1F3864]">{history.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Pengerjaan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{avgScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">Rata-rata Skor</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">8j 48m</p>
              <p className="text-xs text-muted-foreground mt-1">Waktu Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === 'semua'
              ? history.length
              : history.filter((h) => h.type === tab.key).length;
          return (
            <Button
              key={tab.key}
              variant={activeFilter === tab.key ? 'default' : 'outline'}
              size="sm"
              className={
                activeFilter === tab.key
                  ? 'bg-[#1F3864] hover:bg-[#152850]'
                  : ''
              }
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.icon}
              <span className="ml-1.5">{tab.label}</span>
              <Badge
                variant="secondary"
                className={`ml-1.5 h-5 px-1.5 text-[10px] ${
                  activeFilter === tab.key
                    ? 'bg-white/20 text-white hover:bg-white/20'
                    : ''
                }`}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* History List (Timeline-style cards) */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map((entry, idx) => (
            <Card
              key={entry.id}
              className={`transition-all hover:shadow-sm ${
                expandedId === entry.id ? 'ring-2 ring-[#1F3864]/20' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* Main Row */}
                <div className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center mt-1">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        entry.status === 'completed'
                          ? 'bg-emerald-500'
                          : entry.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-red-400'
                      }`}
                    />
                    {idx < filteredHistory.length - 1 && (
                      <div className="w-px h-8 bg-border mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate">{entry.title}</h3>
                          {getTypeBadge(entry.type)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {entry.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {entry.status === 'completed' && (
                          <div className="text-right">
                            <p className="font-bold text-sm">{entry.score}/{entry.maxScore}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round((entry.score / entry.maxScore) * 100)}%
                            </p>
                          </div>
                        )}
                        {getStatusBadge(entry.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => toggleExpand(entry.id)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Lihat
                          {expandedId === entry.id ? (
                            <ChevronUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expandedId === entry.id && entry.details && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              Benar
                            </p>
                            <p className="text-sm font-semibold text-emerald-600">
                              {entry.details.correct} soal
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              Salah
                            </p>
                            <p className="text-sm font-semibold text-red-500">
                              {entry.details.wrong} soal
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              Tidak Dijawab
                            </p>
                            <p className="text-sm font-semibold text-muted-foreground">
                              {entry.details.unanswered} soal
                            </p>
                          </div>
                          {entry.details.subject && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                {entry.details.topic ? 'Topik' : 'Mapel'}
                              </p>
                              <p className="text-sm font-semibold">
                                {entry.details.topic ?? entry.details.subject}
                              </p>
                            </div>
                          )}
                        </div>
                        {entry.status === 'completed' && entry.type === 'tryout' && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => toast.info('Membuka pembahasan...')}
                            >
                              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                              Lihat Pembahasan
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <History className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 font-medium">Belum ada riwayat</p>
              <p className="text-sm mt-1">
                {activeFilter !== 'semua'
                  ? `Belum ada riwayat ${activeFilter}`
                  : 'Mulai tryout atau latihan untuk melihat riwayat di sini'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  5. LEADERBOARD VIEW
// ═══════════════════════════════════════════════════════════════════

export function LeaderboardView() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sekolah' | 'kelas' | 'nasional'>('sekolah');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data: LeaderboardEntry[] = [
        { rank: 1, name: 'Ahmad Rizky Pratama', class: 'XII IPA 1', avgScore: 920, totalTryout: 8, isMe: false },
        { rank: 2, name: 'Siti Nurhaliza', class: 'XII IPA 2', avgScore: 895, totalTryout: 7, isMe: false },
        { rank: 3, name: 'Budi Santoso', class: 'XII IPA 1', avgScore: 870, totalTryout: 8, isMe: false },
        { rank: 4, name: 'Dewi Lestari', class: 'XII IPA 3', avgScore: 855, totalTryout: 6, isMe: false },
        { rank: 5, name: 'Reza Firmansyah', class: 'XII IPA 2', avgScore: 840, totalTryout: 7, isMe: false },
        { rank: 6, name: 'Anisa Putri', class: 'XII IPA 1', avgScore: 830, totalTryout: 6, isMe: false },
        { rank: 7, name: 'Fajar Nugroho', class: 'XII IPA 3', avgScore: 815, totalTryout: 5, isMe: false },
        { rank: 8, name: 'Rina Wulandari', class: 'XII IPA 2', avgScore: 800, totalTryout: 7, isMe: false },
        { rank: 9, name: 'Dimas Aditya', class: 'XII IPA 1', avgScore: 790, totalTryout: 6, isMe: false },
        { rank: 10, name: 'Maya Sari', class: 'XII IPA 3', avgScore: 780, totalTryout: 5, isMe: false },
        { rank: 11, name: 'Andi Wijaya', class: 'XII IPA 2', avgScore: 760, totalTryout: 5, isMe: false },
        { rank: 12, name: user?.name ?? 'Kamu', class: 'XII IPA 1', avgScore: 790, totalTryout: 4, isMe: true },
        { rank: 13, name: 'Putri Ayu', class: 'XII IPA 1', avgScore: 750, totalTryout: 4, isMe: false },
        { rank: 14, name: 'Hendra Saputra', class: 'XII IPA 3', avgScore: 730, totalTryout: 3, isMe: false },
        { rank: 15, name: 'Lina Marlina', class: 'XII IPA 2', avgScore: 710, totalTryout: 4, isMe: false },
      ];
      setLeaderboard(data);
      setMyRank(data.find((d) => d.isMe) ?? null);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [user?.name]);

  const topThree = leaderboard.filter((e) => e.rank <= 3);
  const rest = leaderboard.filter((e) => e.rank > 3);

  const TABS = [
    { key: 'sekolah' as const, label: 'Sekolah', icon: <School className="h-3.5 w-3.5" /> },
    { key: 'kelas' as const, label: 'Kelas', icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { key: 'nasional' as const, label: 'Nasional', icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  function getMedalColor(rank: number) {
    switch (rank) {
      case 1: return { bg: 'bg-gradient-to-b from-amber-50 to-amber-100/50', border: 'border-amber-300', text: 'text-amber-600', medal: 'bg-amber-400', icon: <Crown className="h-5 w-5" /> };
      case 2: return { bg: 'bg-gradient-to-b from-slate-50 to-slate-100/50', border: 'border-slate-300', text: 'text-slate-500', medal: 'bg-slate-400', icon: <Medal className="h-5 w-5" /> };
      case 3: return { bg: 'bg-gradient-to-b from-orange-50 to-orange-100/50', border: 'border-orange-300', text: 'text-orange-600', medal: 'bg-orange-400', icon: <Medal className="h-5 w-5" /> };
      default: return null;
    }
  }

  function getAvatarColor(name: string) {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500',
      'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Peringkat
          </h1>
          <p className="text-muted-foreground mt-1">
            Lihat posisimu dan termotivasi dari siswa-siswa terbaik!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              className={
                activeTab === tab.key
                  ? 'bg-[#1F3864] hover:bg-[#152850] shadow-sm'
                  : 'hover:bg-transparent'
              }
              onClick={() => {
                if (tab.key === 'nasional') {
                  toast.info('Peringkat Nasional segera hadir!');
                  return;
                }
                setActiveTab(tab.key);
              }}
            >
              {tab.icon}
              <span className="ml-1.5 hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* My Rank Highlight */}
      {!loading && myRank && (
        <Card className="bg-[#1F3864] border-[#1F3864] text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
                #{myRank.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-medium text-white/80">Peringkat Kamu</p>
                </div>
                <p className="text-lg font-bold">{myRank.name}</p>
                <p className="text-sm text-white/70">
                  {myRank.class} &middot; Rata-rata: <span className="text-amber-400 font-semibold">{myRank.avgScore}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-white/60">Total Tryout</p>
                <p className="text-xl font-bold">{myRank.totalTryout}</p>
              </div>
            </div>
            {/* Motivation */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-sm text-white/80">
                {myRank.rank <= 5
                  ? '\u2b50 Luar biasa! Kamu ada di top 5! Pertahankan!'
                  : myRank.rank <= 10
                  ? '\ud83d\udcaa Hebat! Kamu sudah masuk top 10. Sedikit lagi ke puncak!'
                  : '\ud83d\ude80 Terus berlatih! Setiap soal membawamu lebih dekat ke peringkat atas!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {/* Podium skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Table skeleton */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* 2nd Place (left) */}
              {topThree.find((e) => e.rank === 2) && (() => {
                const entry = topThree.find((e) => e.rank === 2)!;
                const medal = getMedalColor(2)!;
                return (
                  <Card className={`${medal.bg} ${medal.border} border-2` }>
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${medal.medal} text-white`}>
                        {medal.icon}
                      </div>
                      <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full ${getAvatarColor(entry.name)} text-white text-lg font-bold`}>
                        {getInitials(entry.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base truncate max-w-full">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.class}</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl sm:text-2xl font-bold ${medal.text}`}>{entry.avgScore}</p>
                        <p className="text-[10px] text-muted-foreground">Rata-rata Skor</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* 1st Place (center, taller) */}
              {topThree.find((e) => e.rank === 1) && (() => {
                const entry = topThree.find((e) => e.rank === 1)!;
                const medal = getMedalColor(1)!;
                return (
                  <Card className={`${medal.bg} ${medal.border} border-2 sm:-mt-4` }>
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-2 pt-6 sm:pt-8">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white">
                        {medal.icon}
                      </div>
                      <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full ${getAvatarColor(entry.name)} text-white text-xl sm:text-2xl font-bold ring-4 ring-amber-200` }>
                        {getInitials(entry.name)}
                      </div>
                      <div>
                        <p className="font-bold text-sm sm:text-base truncate max-w-full">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.class}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-amber-600">{entry.avgScore}</p>
                        <p className="text-[10px] text-muted-foreground">Rata-rata Skor</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* 3rd Place (right) */}
              {topThree.find((e) => e.rank === 3) && (() => {
                const entry = topThree.find((e) => e.rank === 3)!;
                const medal = getMedalColor(3)!;
                return (
                  <Card className={`${medal.bg} ${medal.border} border-2` }>
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${medal.medal} text-white`}>
                        {medal.icon}
                      </div>
                      <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full ${getAvatarColor(entry.name)} text-white text-lg font-bold`}>
                        {getInitials(entry.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base truncate max-w-full">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.class}</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl sm:text-2xl font-bold ${medal.text}`}>{entry.avgScore}</p>
                        <p className="text-[10px] text-muted-foreground">Rata-rata Skor</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* Remaining Leaderboard Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Peringkat Lengkap</CardTitle>
            </CardHeader>
            <CardContent>
              {rest.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground w-16 text-center">#</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Nama Siswa</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Kelas</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Rata-rata Skor</th>
                        <th className="pb-3 font-medium text-muted-foreground text-center hidden sm:table-cell">Total Tryout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rest.map((entry) => (
                        <tr
                          key={entry.rank}
                          className={`group ${
                            entry.isMe
                              ? 'bg-[#1F3864]/5 font-semibold'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <td className="py-3 pr-4 text-center">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                entry.isMe
                                  ? 'bg-[#1F3864] text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColor(entry.name)} text-white text-xs font-bold`}
                              >
                                {getInitials(entry.name)}
                              </div>
                              <div>
                                <p className="font-medium truncate">{entry.name}</p>
                                {entry.isMe && (
                                  <p className="text-[10px] text-[#1F3864] font-semibold">(Kamu)</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                            {entry.class}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <span
                              className={`font-bold ${
                                entry.avgScore >= 850
                                  ? 'text-emerald-600'
                                  : entry.avgScore >= 750
                                  ? 'text-[#1F3864]'
                                  : 'text-amber-600'
                              }`}
                            >
                              {entry.avgScore}
                            </span>
                          </td>
                          <td className="py-3 text-center text-muted-foreground hidden sm:table-cell">
                            {entry.totalTryout}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm">Belum ada data peringkat</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty state for Nasional tab */}
          {activeTab === 'nasional' && (
            <Card>
              <CardContent className="py-16 text-center">
                <Globe className="mx-auto h-14 w-14 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">Peringkat Nasional</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                  Fitur peringkat nasional akan segera tersedia. Kamu bisa membandingkan
                  kemampuanmu dengan siswa dari seluruh Indonesia!
                </p>
                <Badge className="mt-4 bg-amber-100 text-amber-700 border-amber-200">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Segera Hadir
                </Badge>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
