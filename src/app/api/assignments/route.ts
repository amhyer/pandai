import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireAuth, requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

// Helper: strip answer fields for student role
function stripAnswersForStudent(data: any, isStudent: boolean) {
  if (!isStudent) return data;
  const strip = (item: any) => {
    if (item?.question) {
      const { answer, explanation, ...rest } = item.question;
      return { ...item, question: rest };
    }
    return item;
  };
  if (Array.isArray(data)) return data.map(strip);
  return strip(data);
}

// GET /api/assignments — list assignments
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH', 'SISWA']);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const isStudent = auth.role === 'SISWA';

    const where: Record<string, unknown> = {};
    // Enforce school scope — non-SUPER_ADMIN can only see their own school
    const effectiveSchoolId = getSchoolFilter(auth);
    if (effectiveSchoolId) {
      where.schoolId = effectiveSchoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (status) where.status = status;

    const assignments = await db.assignment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        questions: { include: { question: { select: { id: true, content: true, type: true, options: true, answer: true, explanation: true } } }, orderBy: { orderNum: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });

    // If studentId, enrich with submission status per assignment (including remedial info)
    if (studentId) {
      const enriched = await Promise.all(assignments.map(async (a) => {
        const sub = await db.assignmentSubmission.findFirst({
          where: { assignmentId: a.id, studentId, isRemedial: false },
        });
        if (!sub) return stripAnswersForStudent({ ...a, mySubmission: null }, isStudent);

        const remedial = await db.assignmentSubmission.findFirst({
          where: { assignmentId: a.id, studentId, isRemedial: true },
        });

        const extra: Record<string, unknown> = { hasRemedial: false, activeScore: sub.score };
        if (remedial) {
          extra.hasRemedial = true;
          extra.remedialId = remedial.id;
          extra.remedialStatus = remedial.status;
          extra.remedialScore = remedial.score;
          extra.originalScore = sub.score;
          if (remedial.status === 'submitted' || remedial.status === 'dinilai') {
            extra.activeScore = remedial.score;
          }
        }

        return stripAnswersForStudent({ ...a, mySubmission: { ...sub, ...extra } }, isStudent);
      }));
      return NextResponse.json(enriched);
    }

    // Enrich with teacher/subject/class names
    const enriched = await Promise.all(assignments.map(async (a) => {
      const [teacher, subject, cls] = await Promise.all([
        a.teacherId ? db.user.findUnique({ where: { id: a.teacherId }, select: { name: true } }) : null,
        a.subjectId ? db.subject.findUnique({ where: { id: a.subjectId }, select: { name: true } }) : null,
        a.classId ? db.class.findUnique({ where: { id: a.classId }, select: { name: true } }) : null,
      ]);
      return stripAnswersForStudent({ ...a, teacher, subject, class: cls }, isStudent);
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil tugas' }, { status: 500 });
  }
}

// POST /api/assignments — create assignment
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const body = await req.json();
    const { title, description, instructions, subjectId, classId, teacherId, schoolId, deadline, learningObjective, submissionType, maxScore, status, questionIds } = body;

    if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!deadline) return NextResponse.json({ error: 'Deadline wajib diisi' }, { status: 400 });

    // Enforce school scope: non-SUPER_ADMIN must use their own schoolId
    const effectiveSchoolId = schoolId || auth.schoolId;
    if (auth.role !== 'SUPER_ADMIN' && effectiveSchoolId && effectiveSchoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak — bukan sekolah Anda' }, { status: 403 });
    }
    if (!effectiveSchoolId) return NextResponse.json({ error: 'SchoolId wajib' }, { status: 400 });

    const assignment = await db.assignment.create({
      data: {
        title, description: description || null, instructions: instructions || null,
        subjectId: subjectId || null, classId: classId || null,
        teacherId: teacherId || auth.userId || null, schoolId: effectiveSchoolId, deadline,
        learningObjective: learningObjective || null,
        submissionType: submissionType || 'essay_only', maxScore: maxScore || 100,
        status: status || 'draft',
      },
    });

    if (Array.isArray(questionIds) && questionIds.length > 0) {
      await db.assignmentQuestion.createMany({
        data: questionIds.map((qId: string, idx: number) => ({
          assignmentId: assignment.id, questionId: qId, orderNum: idx,
          points: Math.floor((assignment.maxScore || 100) / questionIds.length),
        })),
      });
    }

    const withQuestions = await db.assignment.findUnique({
      where: { id: assignment.id },
      include: { questions: { include: { question: { select: { id: true, content: true, type: true, options: true, answer: true, explanation: true } } }, orderBy: { orderNum: 'asc' } } },
    });

    return NextResponse.json(withQuestions, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat tugas' }, { status: 500 });
  }
}

// PATCH /api/assignments — update assignment
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const body = await req.json();
    const { id, title, description, instructions, subjectId, classId, deadline, learningObjective, submissionType, maxScore, status } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Verify ownership: non-SUPER_ADMIN must own the assignment's school
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.assignment.findUnique({ where: { id }, select: { schoolId: true, status: true } });
      if (!existing || existing.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      // Use DB status for guard check, not client-provided status
      if (existing.status !== 'draft') {
        const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
        if (subCount > 0) {
          if (title || description !== undefined || instructions !== undefined || submissionType || maxScore || deadline) {
            return NextResponse.json({ error: 'Tidak bisa mengubah tugas yang sudah memiliki submission aktif' }, { status: 403 });
          }
        }
      }
    } else if (status !== 'draft') {
      const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
      if (subCount > 0) {
        if (title || description !== undefined || instructions !== undefined || submissionType || maxScore || deadline) {
          return NextResponse.json({ error: 'Tidak bisa mengubah tugas yang sudah memiliki submission aktif' }, { status: 403 });
        }
      }
    }

    const assignment = await db.assignment.update({
      where: { id },
      data: {
        ...(title && { title }), ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }), ...(subjectId && { subjectId }),
        ...(classId && { classId }), ...(deadline && { deadline }),
        ...(learningObjective !== undefined && { learningObjective: learningObjective || null }),
        ...(submissionType && { submissionType }), ...(maxScore && { maxScore }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate tugas' }, { status: 500 });
  }
}

// DELETE /api/assignments — delete assignment
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Verify ownership: non-SUPER_ADMIN must own the assignment's school
    if (auth.role !== 'SUPER_ADMIN') {
      const existing = await db.assignment.findUnique({ where: { id }, select: { schoolId: true } });
      if (!existing || existing.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    await db.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/assignments', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus tugas' }, { status: 500 });
  }
}
