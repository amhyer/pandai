import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';

// Helper: auth headers
function getAuth(req: NextRequest) {
  const userId = req.headers.get('X-User-Id');
  const schoolId = req.headers.get('X-School-Id');
  const userRole = req.headers.get('X-User-Role');
  return { userId, schoolId, userRole };
}

// GET /api/assignments — list assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (status) where.status = status;

    const assignments = await db.assignment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        questions: { include: { question: { select: { id: true, content: true, type: true, options: true, answer: true } } }, orderBy: { orderNum: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });

    // If studentId, enrich with submission status per assignment
    if (studentId) {
      const enriched = await Promise.all(assignments.map(async (a) => {
        const sub = await db.assignmentSubmission.findUnique({
          where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
        });
        return { ...a, mySubmission: sub || null };
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
      return { ...a, teacher, subject, class: cls };
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    await logError({ error, route: '/api/assignments', method: 'GET' });
    return NextResponse.json({ error: 'Gagal mengambil tugas' }, { status: 500 });
  }
}

// POST /api/assignments — create assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, instructions, subjectId, classId, teacherId, schoolId, deadline, learningObjective, submissionType, maxScore, status, questionIds } = body;
    const auth = getAuth(req);

    if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!deadline) return NextResponse.json({ error: 'Deadline wajib diisi' }, { status: 400 });
    if (!schoolId) return NextResponse.json({ error: 'SchoolId wajib' }, { status: 400 });

    const assignment = await db.assignment.create({
      data: {
        title,
        description: description || null,
        instructions: instructions || null,
        subjectId: subjectId || null,
        classId: classId || null,
        teacherId: teacherId || auth.userId || null,
        schoolId,
        deadline,
        learningObjective: learningObjective || null,
        submissionType: submissionType || 'essay_only',
        maxScore: maxScore || 100,
        status: status || 'draft',
      },
    });

    // Add questions if provided
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      await db.assignmentQuestion.createMany({
        data: questionIds.map((qId: string, idx: number) => ({
          assignmentId: assignment.id,
          questionId: qId,
          orderNum: idx,
          points: Math.floor((assignment.maxScore || 100) / questionIds.length),
        })),
      });
    }

    // Fetch with questions
    const withQuestions = await db.assignment.findUnique({
      where: { id: assignment.id },
      include: { questions: { include: { question: { select: { id: true, content: true, type: true, options: true, answer: true } } }, orderBy: { orderNum: 'asc' } } },
    });

    return NextResponse.json(withQuestions, { status: 201 });
  } catch (error) {
    await logError({ error, route: '/api/assignments', method: 'POST' });
    return NextResponse.json({ error: 'Gagal membuat tugas' }, { status: 500 });
  }
}

// PATCH /api/assignments — update assignment
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, instructions, subjectId, classId, deadline, learningObjective, submissionType, maxScore, status } = body;
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    // Guard: can't change if submissions exist (and status is not draft)
    if (status !== 'draft') {
      const subCount = await db.assignmentSubmission.count({ where: { assignmentId: id } });
      if (subCount > 0) {
        // Allow only status change (publish/closed), not content changes
        if (title || description !== undefined || instructions !== undefined || submissionType || maxScore || deadline) {
          return NextResponse.json({ error: 'Tidak bisa mengubah tugas yang sudah memiliki submission aktif' }, { status: 403 });
        }
      }
    }

    const assignment = await db.assignment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(subjectId && { subjectId }),
        ...(classId && { classId }),
        ...(deadline && { deadline }),
        ...(learningObjective !== undefined && { learningObjective: learningObjective || null }),
        ...(submissionType && { submissionType }),
        ...(maxScore && { maxScore }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    await logError({ error, route: '/api/assignments', method: 'PATCH' });
    return NextResponse.json({ error: 'Gagal mengupdate tugas' }, { status: 500 });
  }
}

// DELETE /api/assignments — delete assignment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 });

    await db.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError({ error, route: '/api/assignments', method: 'DELETE' });
    return NextResponse.json({ error: 'Gagal menghapus tugas' }, { status: 500 });
  }
}
