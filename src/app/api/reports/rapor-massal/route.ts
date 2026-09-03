import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { getSchoolFilter } from '@/lib/scope';
import { generateRaporSiswaPDF } from '@/lib/pdf-report';

// POST /api/reports/rapor-massal — Generate bulk PDF rapor for multiple students
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'GURU', 'KEPALA_SEKOLAH']);
    const body = await request.json();
    const { studentIds, term } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'studentIds wajib diisi' }, { status: 400 });
    }

    if (!term) {
      return NextResponse.json({ error: 'term wajib diisi' }, { status: 400 });
    }

    // Limit to 50 students per request to prevent timeout
    if (studentIds.length > 50) {
      return NextResponse.json({ error: 'Maksimal 50 siswa per request' }, { status: 400 });
    }

    // Verify students belong to same school
    const students = await db.user.findMany({
      where: {
        id: { in: studentIds },
        role: 'SISWA',
      },
      select: { id: true, name: true, schoolId: true },
    });

    // School scope check
    const schoolF = getSchoolFilter(auth);
    const validStudents = schoolF 
      ? students.filter(s => s.schoolId === schoolF)
      : students;

    if (validStudents.length === 0) {
      return NextResponse.json({ error: 'Tidak ada siswa yang valid' }, { status: 404 });
    }

    // Generate PDFs sequentially (jsPDF is synchronous)
    const results: { studentId: string; studentName: string; success: boolean; error?: string }[] = [];
    
    for (const student of validStudents) {
      try {
        await generateRaporSiswaPDF(student.id, term);
        results.push({
          studentId: student.id,
          studentName: student.name,
          success: true,
        });
      } catch (error) {
        results.push({
          studentId: student.id,
          studentName: student.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      total: validStudents.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Bulk rapor generation error:', error);
    return NextResponse.json({ error: 'Gagal generate rapor massal' }, { status: 500 });
  }
}
