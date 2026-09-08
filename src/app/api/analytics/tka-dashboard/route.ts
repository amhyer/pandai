import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, AuthError } from '@/lib/auth';
import { COMPETENCY_DIMENSIONS } from '@/lib/competency-dimensions';

/**
 * GET /api/analytics/tka-dashboard
 *
 * Dashboard TKA (Tes Kemampuan Akademik) — agregasi hasil belajar:
 *  - SISWA      : data pribadi (rata-rata per mapel, tren, ranking kelas,
 *                 diagnostik, radar 8 dimensi)
 *  - ORANG_TUA  : data anaknya (?studentId= — diverifikasi relasi)
 *  - GURU/KEPSEK/ADMIN : agregasi kelas (?classId=)
 *
 * Sumber data: StudentAttempt (tryout/TKA), DiagnosticResult,
 * CompetencyAssessment (profil lulusan 8 dimensi).
 */

type Mastery = 'kuat' | 'cukup' | 'lemah';

function masteryFromScore(score: number): Mastery {
  if (score >= 80) return 'kuat';
  if (score >= 60) return 'cukup';
  return 'lemah';
}

async function buildStudentData(studentId: string) {
  const student = await db.user.findUnique({
    where: { id: studentId },
    include: { class: { select: { id: true, name: true } } },
  });
  if (!student) return null;

  const attempts = await db.studentAttempt.findMany({
    where: { userId: studentId, isRemedial: false, status: { in: ['submitted', 'graded'] } },
    include: { examPackage: { include: { subject: { select: { id: true, name: true } } } } },
    orderBy: { submittedAt: 'desc' },
  });

  // Rata-rata per mapel
  type SubjectAgg = { subjectId: string; subjectName: string; scores: number[]; predictions: number[] };
  const bySubject = new Map<string, SubjectAgg>();
  for (const a of attempts) {
    const sid = a.examPackage?.subjectId ?? 'tka';
    const entry: SubjectAgg =
      bySubject.get(sid) ?? {
        subjectId: sid,
        subjectName: a.examPackage?.subject?.name ?? 'TKA Umum',
        scores: [],
        predictions: [],
      };
    entry.scores.push(a.score ?? 0);
    if (a.tkaPrediction != null) entry.predictions.push(a.tkaPrediction);
    bySubject.set(sid, entry);
  }

  const subjects = Array.from(bySubject.values()).map((s) => {
    const avg = s.scores.reduce((p, c) => p + c, 0) / Math.max(s.scores.length, 1);
    const lastScore = attempts.find((a) => (a.examPackage?.subjectId ?? 'tka') === s.subjectId)?.score ?? 0;
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      avgScore: Math.round(avg * 10) / 10,
      attemptCount: s.scores.length,
      mastery: masteryFromScore(avg),
      lastScore: Math.round(lastScore),
      tkaPrediction: s.predictions.length
        ? Math.round(s.predictions[s.predictions.length - 1])
        : null,
    };
  });

  const allScores = attempts.map((a) => a.score ?? 0);
  const avgScore = allScores.length ? allScores.reduce((p, c) => p + c, 0) / allScores.length : 0;
  const bestSubject = subjects.reduce<typeof subjects[number] | null>(
    (best, s) => (best == null || s.avgScore > best.avgScore ? s : best),
    null
  );

  // Tren: 15 attempt terbaru (kronologis)
  const trend = attempts
    .slice(0, 15)
    .reverse()
    .map((a) => ({
      date: (a.submittedAt ?? a.createdAt).toISOString().slice(5, 10),
      score: Math.round(a.score ?? 0),
      subjectName: a.examPackage?.subject?.name ?? 'TKA',
    }));

  // Ranking di kelas
  let classRank: { rank: number; total: number; percentile: number } | null = null;
  if (student.classId) {
    const classmates = await db.user.findMany({
      where: { classId: student.classId, role: 'SISWA', isActive: true },
      select: { id: true },
    });
    const classIds = classmates.map((c) => c.id);
    if (classIds.length > 1) {
      const classAttempts = await db.studentAttempt.findMany({
        where: { userId: { in: classIds }, isRemedial: false, status: { in: ['submitted', 'graded'] } },
        select: { userId: true, score: true },
      });
      const avgByUser = new Map<string, number[]>();
      for (const a of classAttempts) {
        const arr = avgByUser.get(a.userId) ?? [];
        arr.push(a.score ?? 0);
        avgByUser.set(a.userId, arr);
      }
      const avgs = Array.from(avgByUser.entries()).map(([id, arr]) => ({
        id,
        avg: arr.reduce((p, c) => p + c, 0) / arr.length,
      }));
      avgs.sort((a, b) => b.avg - a.avg);
      const rank = avgs.findIndex((a) => a.id === studentId) + 1;
      classRank = {
        rank,
        total: avgs.length,
        percentile: Math.round((rank / avgs.length) * 100),
      };
    }
  }

  // Diagnostik
  const diagnostics = await db.diagnosticResult.findMany({
    where: { userId: studentId },
    include: { subject: { select: { name: true } }, topic: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  // Radar 8 dimensi (term terbaru)
  const assessments = await db.competencyAssessment.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
    take: 40,
  });
  let competency: { term: string | null; dimensions: { dimension: string; label: string; avgRating: number }[] } | null = null;
  if (assessments.length) {
    const latestTerm = assessments[0].term;
    const termAssessments = assessments.filter((a) => a.term === latestTerm);
    const byDim = new Map<string, number[]>();
    for (const a of termAssessments) {
      const arr = byDim.get(a.dimension) ?? [];
      arr.push(a.rating);
      byDim.set(a.dimension, arr);
    }
    competency = {
      term: latestTerm,
      dimensions: COMPETENCY_DIMENSIONS.map((d) => {
        const vals = byDim.get(d.key) ?? [];
        return {
          dimension: d.key,
          label: d.label,
          avgRating: vals.length ? Math.round((vals.reduce((p, c) => p + c, 0) / vals.length) * 10) / 10 : 0,
        };
      }),
    };
  }

  return {
    id: student.id,
    name: student.name,
    nisn: student.nisn,
    class: student.class ? { id: student.class.id, name: student.class.name } : null,
    overall: {
      avgScore: Math.round(avgScore * 10) / 10,
      bestSubject: bestSubject ? { name: bestSubject.subjectName, avgScore: bestSubject.avgScore } : null,
      attemptCount: attempts.length,
      strongest: subjects.filter((s) => s.mastery === 'kuat').map((s) => s.subjectName),
      weakest: subjects.filter((s) => s.mastery === 'lemah').map((s) => s.subjectName),
    },
    subjects,
    trend,
    classRank,
    diagnostic: diagnostics.map((d) => ({
      id: d.id,
      subjectName: d.subject?.name ?? '-',
      topicName: d.topic?.name ?? null,
      score: d.score,
      level: d.level,
      date: d.createdAt.toISOString().slice(0, 10),
    })),
    competency,
  };
}

async function buildClassData(classId: string) {
  const kelas = await db.class.findUnique({ where: { id: classId } });
  if (!kelas) return null;

  const students = await db.user.findMany({
    where: { classId, role: 'SISWA', isActive: true },
    select: { id: true, name: true, nisn: true },
    orderBy: { name: 'asc' },
  });
  const studentIds = students.map((s) => s.id);
  if (!studentIds.length) {
    return { id: classId, name: kelas.name, studentCount: 0, avgScore: 0, topStudents: [], perSubject: [] };
  }

  const attempts = await db.studentAttempt.findMany({
    where: { userId: { in: studentIds }, isRemedial: false, status: { in: ['submitted', 'graded'] } },
    include: { examPackage: { select: { subjectId: true } } },
    select: { userId: true, score: true, examPackage: true },
  });

  const byUser = new Map<string, number[]>();
  const bySubject = new Map<string, number[]>();
  for (const a of attempts) {
    const u = byUser.get(a.userId) ?? [];
    u.push(a.score ?? 0);
    byUser.set(a.userId, u);
    const sid = a.examPackage?.subjectId ?? 'tka';
    const s = bySubject.get(sid) ?? [];
    s.push(a.score ?? 0);
    bySubject.set(sid, s);
  }

  const userAvgs = students
    .map((s) => {
      const arr = byUser.get(s.id) ?? [];
      return {
        id: s.id,
        name: s.name,
        nisn: s.nisn,
        avg: arr.length ? Math.round((arr.reduce((p, c) => p + c, 0) / arr.length) * 10) / 10 : 0,
        attemptCount: arr.length,
      };
    })
    .filter((s) => s.attemptCount > 0)
    .sort((a, b) => b.avg - a.avg);

  const allScores = attempts.map((a) => a.score ?? 0);

  return {
    id: classId,
    name: kelas.name,
    studentCount: students.length,
    avgScore: allScores.length ? Math.round((allScores.reduce((p, c) => p + c, 0) / allScores.length) * 10) / 10 : 0,
    topStudents: userAvgs.slice(0, 5),
    perSubject: Array.from(bySubject.entries()).map(([sid, arr]) => {
      const avg = arr.reduce((p, c) => p + c, 0) / arr.length;
      return {
        subjectId: sid,
        avgScore: Math.round(avg * 10) / 10,
        mastery: masteryFromScore(avg),
        attemptCount: arr.length,
      };
    }),
    distribution: {
      '>=85': userAvgs.filter((s) => s.avg >= 85).length,
      '70-84': userAvgs.filter((s) => s.avg >= 70 && s.avg < 85).length,
      '60-69': userAvgs.filter((s) => s.avg >= 60 && s.avg < 70).length,
      '<60': userAvgs.filter((s) => s.avg < 60).length,
    },
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');
    const classId = searchParams.get('classId');

    // ── SISWA: data sendiri ──
    if (auth.role === 'SISWA') {
      const data = await buildStudentData(auth.userId);
      if (!data) return NextResponse.json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
      return NextResponse.json({ mode: 'student', student: data });
    }

    // ── ORANG_TUA: data anak (verifikasi relasi) ──
    if (auth.role === 'ORANG_TUA') {
      if (!studentIdParam) {
        return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 });
      }
      const child = await db.user.findFirst({
        where: { id: studentIdParam, parentId: auth.userId, role: 'SISWA' },
        select: { id: true },
      });
      if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const data = await buildStudentData(studentIdParam);
      if (!data) return NextResponse.json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
      return NextResponse.json({ mode: 'student', student: data });
    }

    // ── GURU / KEPALA_SEKOLAH / ADMIN_SCHOOL / SUPER_ADMIN: agregasi kelas ──
    if (auth.role === 'GURU' || auth.role === 'KEPALA_SEKOLAH' || auth.role === 'ADMIN_SCHOOL' || auth.role === 'SUPER_ADMIN') {
      if (!classId) {
        return NextResponse.json({ error: 'classId diperlukan untuk mode kelas' }, { status: 400 });
      }
      // Sekolah terikat (non super admin)
      if (auth.role !== 'SUPER_ADMIN' && auth.schoolId) {
        const kelas = await db.class.findFirst({ where: { id: classId }, select: { schoolId: true } });
        if (!kelas || kelas.schoolId !== auth.schoolId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const data = await buildClassData(classId);
      if (!data) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
      return NextResponse.json({ mode: 'class', class: data });
    }

    return NextResponse.json({ error: 'Role tidak diizinkan' }, { status: 403 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/analytics/tka-dashboard', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat data dashboard TKA' }, { status: 500 });
  }
}
