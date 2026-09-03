import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logError } from '@/lib/error-log';
import { logAccess } from '@/lib/audit-log';
import { requireStudentScope, getSchoolFilter } from '@/lib/scope';

// POST /api/student-grades/bulk — Bulk create/update student grades
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['GURU', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);
    try { await logAccess(auth, { action: 'CREATE', resourceType: 'student-grades-bulk' }); } catch {}
    
    const body = await request.json();
    const { grades, componentId, classId, subjectId, term } = body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ error: 'grades array wajib diisi' }, { status: 400 });
    }

    if (!componentId) {
      return NextResponse.json({ error: 'componentId wajib diisi' }, { status: 400 });
    }

    // Limit to 100 students per request
    if (grades.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 siswa per request' }, { status: 400 });
    }

    // Verify component exists and in same school
    const component = await db.gradeComponent.findUnique({ where: { id: componentId } });
    if (!component) return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 });

    const targetSchoolId = (auth.role === 'SUPER_ADMIN' ? component.schoolId : auth.schoolId)!;
    if (auth.role !== 'SUPER_ADMIN' && component.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak — komponen dari sekolah lain' }, { status: 403 });
    }

    const effectiveTerm = term || component.term;
    const effectiveSubjectId = subjectId || component.subjectId;
    const effectiveClassId = classId || component.classId;

    const results: { studentId: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each grade
    for (const grade of grades) {
      const { studentId, score, maxScore, note } = grade;

      if (!studentId || score === undefined) {
        results.push({ studentId: studentId || 'unknown', success: false, error: 'studentId dan score wajib' });
        failCount++;
        continue;
      }

      try {
        // IDOR fix: verify the student belongs to the same school
        await requireStudentScope(auth, studentId);

        const sourceType = 'MANUAL';
        const sourceId = `bulk_${auth.userId}_${componentId}`;

        await db.studentGrade.upsert({
          where: {
            studentId_componentId_source_sourceId: { studentId, componentId, source: sourceType, sourceId },
          },
          create: {
            studentId,
            schoolId: targetSchoolId,
            classId: effectiveClassId || null,
            componentId,
            subjectId: effectiveSubjectId || null,
            score: parseFloat(score),
            maxScore: maxScore ? parseFloat(maxScore) : 100,
            source: sourceType,
            sourceId,
            gradedBy: auth.userId,
            term: effectiveTerm,
            note: note || null,
          },
          update: {
            score: parseFloat(score),
            maxScore: maxScore ? parseFloat(maxScore) : 100,
            gradedBy: auth.userId,
            note: note !== undefined ? note : undefined,
          },
        });

        results.push({ studentId, success: true });
        successCount++;
      } catch (error) {
        results.push({
          studentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failCount++;
      }
    }

    return NextResponse.json({
      total: grades.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError({ error, route: '/api/student-grades/bulk', method: 'POST' });
    return NextResponse.json({ error: 'Gagal menyimpan nilai massal' }, { status: 500 });
  }
}
