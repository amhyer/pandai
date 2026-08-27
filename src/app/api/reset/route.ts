import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/reset — Clear ALL data (destructive, SUPER_ADMIN only, blocked in production)
export async function POST(req: Request) {
  const { user, error } = await requireAuth(req as any, { roles: ['SUPER_ADMIN'] });
  if (error) return error;

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Reset platform dinonaktifkan di lingkungan production.' },
      { status: 403 }
    );
  }

  try {
    // Clear in correct order for FK constraints
    await db.assignmentAnswer.deleteMany();
    await db.assignmentSubmission.deleteMany();
    await db.assignmentQuestion.deleteMany();
    await db.assignment.deleteMany();
    await db.chatMessage.deleteMany();
    await db.chatbotSession.deleteMany();
    await db.aiUsageLog.deleteMany();
    await db.aiConfig.deleteMany();
    await db.notification.deleteMany();
    await db.appSetting.deleteMany();
    await db.studentAnswer.deleteMany();
    await db.studentAttempt.deleteMany();
    await db.examAssignment.deleteMany();
    await db.examSession.deleteMany();
    await db.examItem.deleteMany();
    await db.examPackage.deleteMany();
    await db.diagnosticResult.deleteMany();
    await db.question.deleteMany();
    await db.topic.deleteMany();
    await db.subject.deleteMany();
    await db.attendance.deleteMany();
    await db.teacherAssignment.deleteMany();
    await db.teachingJournal.deleteMany();
    await db.characterReport.deleteMany();
    await db.material.deleteMany();
    await db.timetable.deleteMany();
    await db.activityLog.deleteMany();
    await db.user.deleteMany();
    await db.class.deleteMany();
    await db.subscription.deleteMany();
    await db.school.deleteMany();

    // Log the reset action (this will be the only record)
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'Reset Platform',
        detail: 'Seluruh data platform telah dihapus oleh ' + user.name,
        module: 'sistem',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Platform berhasil direset. Semua data telah dihapus.',
    });
  } catch (err) {
    console.error('POST /api/reset error:', err);
    return NextResponse.json({ error: 'Gagal mereset platform' }, { status: 500 });
  }
}
