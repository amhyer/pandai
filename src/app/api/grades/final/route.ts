import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';

/*
 * FINAL GRADE CALCULATION — SIMANTAP-style normalization
 *
 * CRITICAL: Unfilled components do NOT count as 0.
 * If 5 components have weights [20, 25, 15, 20, 20] and only 3 are filled,
 * the final grade is calculated ONLY from the 3 filled components,
 * normalized to 100%.
 *
 * Example:
 *   Components filled: Tugas(80, w=20), UH(70, w=25), Praktik(90, w=15)
 *   Sum filled weights = 20+25+15 = 60
 *   Weighted sum = 20*80 + 25*70 + 15*90 = 1600 + 1750 + 1350 = 4700
 *   Normalized final = 4700 / 60 = 78.33
 *   (NOT 4700/100 = 47)
 */

interface FinalGradeComponent {
  componentId: string;
  componentName: string;
  weight: number;
  score: number | null;
  maxScore: number;
  source: string;
  normalizedScore: number | null;
  weightedScore: number | null;
}

interface FinalGradeResult {
  studentId: string;
  studentName: string;
  subjectId?: string;
  term: string;
  components: FinalGradeComponent[];
  totalWeightFilled: number;
  totalWeightAll: number;
  filledCount: number;
  totalComponents: number;
  finalGrade: number | null;
  calculation: string;
}

type CalcError = { error: string; status: number };

async function calcStudentFinalGrades(
  auth: { userId: string; role: string; schoolId: string | null },
  studentId: string,
  term: string,
  subjectId: string | null,
): Promise<FinalGradeResult | CalcError> {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, schoolId: true, classId: true },
  });
  if (!student) return { error: 'Siswa tidak ditemukan', status: 404 };

  if (auth.role === 'SISWA' && auth.userId !== studentId)
    return { error: 'Akses ditolak', status: 403 };

  if (auth.role === 'ORANG_TUA') {
    const child = await db.user.findFirst({ where: { parentId: auth.userId, id: studentId } });
    if (!child) return { error: 'Bukan anak Anda', status: 403 };
  }

  if (auth.role !== 'SUPER_ADMIN' && student.schoolId !== auth.schoolId)
    return { error: 'Akses ditolak', status: 403 };

  // Get applicable grade components
  const componentWhere: Record<string, unknown> = { schoolId: student.schoolId, term };

  if (subjectId) {
    const subjectSpecific = await db.gradeComponent.findMany({ where: { ...componentWhere, subjectId } });
    if (subjectSpecific.length > 0) componentWhere.subjectId = subjectId;
  }

  if (student.classId) {
    const classSpecific = await db.gradeComponent.findMany({ where: { ...componentWhere, classId: student.classId } });
    if (classSpecific.length > 0) componentWhere.classId = student.classId;
  }

  const components = await db.gradeComponent.findMany({
    where: componentWhere,
    orderBy: { sortOrder: 'asc' },
  });

  if (components.length === 0) {
    return {
      studentId, studentName: student.name, subjectId: subjectId || undefined, term,
      components: [], totalWeightFilled: 0, totalWeightAll: 0,
      filledCount: 0, totalComponents: 0, finalGrade: null,
      calculation: 'Tidak ada komponen nilai untuk periode ini',
    };
  }

  const grades = await db.studentGrade.findMany({
    where: { studentId, componentId: { in: components.map(c => c.id) } },
  });

  // For each component, get the best score
  const best: Record<string, { score: number; maxScore: number; source: string }> = {};
  for (const g of grades) {
    if (!best[g.componentId] || g.score > best[g.componentId].score) {
      best[g.componentId] = { score: g.score, maxScore: g.maxScore, source: g.source };
    }
  }

  const resultComponents: FinalGradeComponent[] = [];
  let totalWeightFilled = 0;
  let weightedSum = 0;
  let filledCount = 0;
  const calcSteps: string[] = [];

  for (const comp of components) {
    const g = best[comp.id];
    let normalizedScore: number | null = null;
    let weightedScore: number | null = null;

    if (g) {
      normalizedScore = Math.round((g.score / Math.max(g.maxScore, 1)) * 10000) / 100;
      weightedScore = Math.round(normalizedScore * comp.weight / 10000) * 100 / 100;
      totalWeightFilled += comp.weight;
      weightedSum += weightedScore;
      filledCount++;
      calcSteps.push(`${comp.name}: ${g.score}/${g.maxScore}=${normalizedScore} x${comp.weight}%=${weightedScore}`);
    } else {
      calcSteps.push(`${comp.name}: (belum diisi, bobot ${comp.weight}% diabaikan)`);
    }

    resultComponents.push({
      componentId: comp.id, componentName: comp.name, weight: comp.weight,
      score: g?.score ?? null, maxScore: g?.maxScore ?? 100,
      source: g?.source ?? 'MANUAL', normalizedScore, weightedScore,
    });
  }

  const totalWeightAll = components.reduce((s, c) => s + c.weight, 0);
  const finalGrade = filledCount > 0 ? Math.round((weightedSum / totalWeightFilled) * 100) / 100 : null;
  const calculation = filledCount > 0
    ? `(${calcSteps.filter(s => !s.includes('belum')).join(' + ')}) / ${totalWeightFilled} = ${finalGrade}`
    : 'Belum ada nilai';

  return {
    studentId, studentName: student.name, subjectId: subjectId || undefined, term,
    components: resultComponents, totalWeightFilled, totalWeightAll,
    filledCount, totalComponents: components.length, finalGrade, calculation,
  };
}

// ─── GET: Calculate final grades ───
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    const mode = searchParams.get('mode');

    if (!term) return NextResponse.json({ error: 'term wajib diisi' }, { status: 400 });

    // Per-class mode
    if (mode === 'class' && classId) {
      const schoolId = auth.role === 'SUPER_ADMIN' ? undefined : (auth.schoolId || undefined);
      const students = await db.user.findMany({
        where: { role: 'SISWA', classId, ...(schoolId ? { schoolId } : {}), isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      const results: FinalGradeResult[] = [];
      for (const s of students) {
        const r = await calcStudentFinalGrades(auth, s.id, term, subjectId);
        if ('studentId' in r) results.push(r as FinalGradeResult);
      }
      return NextResponse.json(results);
    }

    // Per-student mode
    if (studentId) {
      const r = await calcStudentFinalGrades(auth, studentId, term, subjectId);
      if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
      return NextResponse.json(r);
    }

    // ORANG_TUA: auto-detect children
    if (auth.role === 'ORANG_TUA') {
      const children = await db.user.findMany({
        where: { parentId: auth.userId, schoolId: auth.schoolId },
        select: { id: true, name: true, classId: true },
      });
      const ortuResults: FinalGradeResult[] = [];
      for (const c of children) {
        const r = await calcStudentFinalGrades(auth, c.id, term, subjectId);
        if ('studentId' in r) {
          ortuResults.push(Object.assign({ studentId: c.id, studentName: c.name }, r));
        }
      }
      return NextResponse.json(ortuResults);
    }

    return NextResponse.json({ error: 'studentId atau mode=class wajib' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/grades/final', method: 'GET' });
    return NextResponse.json({ error: 'Gagal menghitung nilai akhir' }, { status: 500 });
  }
}
