import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET attempts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const examSessionId = searchParams.get('examSessionId');

    const where: any = {};
    if (userId) where.userId = userId;
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (examSessionId) where.examSessionId = examSessionId;

    const attempts = await db.studentAttempt.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        answers: { include: { question: { include: { subject: true } } } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json(attempts);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// POST submit attempt
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, examSessionId, examPackageId, schoolId, classId, answers, duration } = data;

    // Calculate score
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;
    let totalPoints = 0;
    const answerRecords: any[] = [];

    for (const a of answers) {
      if (!a.answer || a.answer === '') {
        totalUnanswered++;
        answerRecords.push({
          questionId: a.questionId,
          answer: null,
          isCorrect: false,
          pointsEarned: 0,
          timeSpent: a.timeSpent || 0,
        });
      } else {
        const question = await db.question.findUnique({ where: { id: a.questionId } });
        let isCorrect = false;
        let points = 0;

        if (question) {
          if (question.type === 'pg' || question.type === 'pg_kompleks') {
            isCorrect = a.answer === question.answer;
            points = isCorrect ? 1 : 0;
          } else if (question.type === 'isian') {
            isCorrect = a.answer.toLowerCase().trim() === question.answer?.toLowerCase().trim();
            points = isCorrect ? 1 : 0;
          } else {
            // Esai - pending manual grading
            points = 0;
            isCorrect = false;
          }
        }

        if (isCorrect) totalCorrect++;
        else totalWrong++;
        totalPoints += points;

        answerRecords.push({
          questionId: a.questionId,
          answer: a.answer,
          isCorrect,
          pointsEarned: points,
          timeSpent: a.timeSpent || 0,
        });
      }
    }

    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const tkaPrediction = Math.round(percentage * 8 + 200); // Simple TKA prediction formula

    const attempt = await db.studentAttempt.create({
      data: {
        userId, examSessionId, examPackageId,
        schoolId, classId,
        score: totalPoints,
        totalCorrect, totalWrong, totalUnanswered,
        percentage: Math.round(percentage * 100) / 100,
        tkaPrediction,
        duration: duration || 0,
        status: 'submitted',
        submittedAt: new Date(),
        answers: {
          create: answerRecords,
        },
      },
    });

    return NextResponse.json(attempt);
  } catch (error: any) {
    console.error('Submit attempt error:', error);
    return NextResponse.json({ error: 'Gagal submit jawaban' }, { status: 500 });
  }
}
