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

// ─── GET: Calculate final grades ───
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    const mode = searchParams.get('mode'); // 'student' | 'class'

    if (!term) {
      return NextResponse.json({ error: 'term wajib diisi' }, { status: 400 });
    }

    // ── Per-student mode ──
    if (mode === 'student' && studentId) {
      return getStudentFinalGrades(auth, studentId, term, subjectId);
    }

    // ── Per-class mode (overview) ──
    if (mode === 'class' && classId) {
      return getClassFinalGrades(auth, classId, term, subjectId);
    }

    // ── Default: per-student if studentId provided, else require it ──
    if (studentId) {
      return getStudentFinalGrades(auth, studentId, term, subjectId);
    }

    // If ORANG_TUA, get their children's grades
    if (auth.role === 'ORANG_TUA') {
      const children = await db.user.findMany({
        where: { parentId: auth.userId, schoolId: auth.schoolId },
        select: { id: true, name: true, classId: true },
      });
      const results = [];
      for (const child of children) {
        const grades = await getStudentFinalGrades(auth, child.id, term, subjectId, true);
        if (grades.data) {
          results.push({ studentId: child.id, studentName: child.name, ...grades.data });
        }
      }
      return NextResponse.json(results);
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

interface FinalGradeComponent {
  componentId: string;
  componentName: string;
  weight: number;
  score: number | null;
  maxScore: number;
  source: string;
  normalizedScore: number | null; // score/maxScore * 100
  weightedScore: number | null; // normalizedScore * weight / 100
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
  calculation: string; // human-readable
}

async function getStudentFinalGrades(
  auth: { userId: string; role: string; schoolId: string | null },
  studentId: string,
  term: string,
  subjectId: string | null,
  silent?: boolean
): Promise<{ data?: FinalGradeResult }> {
  // Get student
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, schoolId: true, classId: true },
  });
  if (!student) {
    if (silent) return {};
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 }) as any;
  }

  // School isolation
  if (auth.role === 'SISWA' && auth.userId !== studentId) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 }) as any;
  }
  if (auth.role === 'ORANG_TUA') {
    const child = await db.user.findFirst({ where: { parentId: auth.userId, id: studentId } });
    if (!child) return NextResponse.json({ error: 'Bukan anak Anda' }, { status: 403 }) as any;
  }
  if (auth.role !== 'SUPER_ADMIN' && student.schoolId !== auth.schoolId) {
    if (silent) return {};
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 }) as any;
  }

  // Get applicable grade components
  const componentWhere: Record<string, unknown> = {
    schoolId: student.schoolId,
    term,
  };
  // If subject-specific components exist, use those. Otherwise use generic ones.
  if (subjectId) {
    const subjectSpecific = await db.gradeComponent.findMany({
      where: { ...componentWhere, subjectId },
    });
    if (subjectSpecific.length > 0) {
      componentWhere.subjectId = subjectId;
    }
  }
  // If class-specific components exist, use those
  if (student.classId) {
    const classSpecific = await db.gradeComponent.findMany({
      where: { ...componentWhere, classId: student.classId },
    });
    if (classSpecific.length > 0) {
      componentWhere.classId = student.classId;
    }
  }

  const components = await db.gradeComponent.findMany({
    where: componentWhere,
    orderBy: { sortOrder: 'asc' },
  });

  if (components.length === 0) {
    if (silent) return {};
    return NextResponse.json({
      studentId, studentName: student.name, subjectId, term,
      components: [], totalWeightFilled: 0, totalWeightAll: 0,
      filledCount: 0, totalComponents: 0, finalGrade: null,
      calculation: 'Tidak ada komponen nilai untuk periode ini',
    }) as any;
  }

  const componentIds = components.map(c => c.id);

  // Get all student grades for these components
  const grades = await db.studentGrade.findMany({
    where: { studentId, componentId: { in: componentIds } },
  });

  // For each component, get the best/latest score (take highest)
  const gradeByComponent: Record<string, { score: number; maxScore: number; source: string; sourceId: string | null }> = {};
  for (const g of grades) {
    const existing = gradeByComponent[g.componentId];
    if (!existing || g.score > existing.score) {
      gradeByComponent[g.componentId] = {
        score: g.score,
        maxScore: g.maxScore,
        source: g.source,
        sourceId: g.sourceId,
      };
    }
  }

  // Build result
  const resultComponents: FinalGradeComponent[] = [];
  let totalWeightFilled = 0;
  let weightedSum = 0;
  let filledCount = 0;
  const calcSteps: string[] = [];

  for (const comp of components) {
    const grade = gradeByComponent[comp.id];
    let normalizedScore: number | null = null;
    let weightedScore: number | null = null;

    if (grade) {
      normalizedScore = Math.round((grade.score / Math.max(grade.maxScore, 1)) * 10000) / 100;
      weightedScore = Math.round(normalizedScore * comp.weight / 10000) * 100 / 100;
      totalWeightFilled += comp.weight;
      weightedSum += weightedScore;
      filledCount++;
      calcSteps.push(
        `${comp.name}: ${grade.score}/${grade.maxScore} = ${normalizedScore} → ×${comp.weight}% = ${weightedScore}`
      );
    } else {
      calcSteps.push(`${comp.name}: (belum diisi, bobot ${comp.weight}% diabaikan)`);
    }

    resultComponents.push({
      componentId: comp.id,
      componentName: comp.name,
      weight: comp.weight,
      score: grade?.score ?? null,
      maxScore: grade?.maxScore ?? 100,
      source: grade?.source ?? 'MANUAL',
      normalizedScore,
      weightedScore,
    });
  }

  // NORMALIZED final grade — only from filled components
  const totalWeightAll = components.reduce((s, c) => s + c.weight, 0);
  const finalGrade = filledCount > 0
    ? Math.round((weightedSum / totalWeightFilled) * 100) / 100
    : null;

  const calculation = filledCount > 0
    ? `(${calcSteps.filter(s => !s.includes('belum')).join(' + ')}) / ${totalWeightFilled} = ${finalGrade}`
    : 'Belum ada nilai';

  const result: FinalGradeResult = {
    studentId,
    studentName: student.name,
    subjectId: subjectId || undefined,
    term,
    components: resultComponents,
    totalWeightFilled,
    totalWeightAll,
    filledCount,
    totalComponents: components.length,
    finalGrade,
    calculation,
  };

  if (silent) return { data: result };
  return NextResponse.json(result) as any;
}

async function getClassFinalGrades(
  auth: { userId: string; role: string; schoolId: string | null },
  classId: string,
  term: string,
  subjectId: string | null
): Promise<Response> {
  const schoolId = auth.role === 'SUPER_ADMIN' ? undefined : (auth.schoolId || undefined);
  const students = await db.user.findMany({
    where: { role: 'SISWA', classId, ...(schoolId ? { schoolId } : {}), isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const results = [];
  for (const student of students) {
    const grades = await getStudentFinalGrades(auth, student.id, term, subjectId, true);
    if (grades.data) {
      results.push(grades.data);
    }
  }

  return NextResponse.json(results);
}
