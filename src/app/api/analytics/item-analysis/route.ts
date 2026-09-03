import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import { requireSchoolScope } from '@/lib/scope'
import { Prisma } from '@prisma/client'

/**
 * GET /api/analytics/item-analysis
 * Analisis Butir Soal — real item analysis from actual answer data.
 *
 * Combines StudentAnswer (Tryout) and AssignmentAnswer (Tugas) data,
 * then calculates difficulty and discrimination per question.
 *
 * Query params (all optional except schoolId which falls back to user):
 *   schoolId, subjectId, classId
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || user.schoolId
    const subjectId = searchParams.get('subjectId') || undefined
    const classId = searchParams.get('classId') || undefined

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 })
    }

    // Tenancy enforcement: non-super-admin cannot query another school.
    requireSchoolScope(user, schoolId)

    // ────────────────────────────────────────────────────
    // 1. StudentAnswer (Tryout) — aggregated by questionId
    // ────────────────────────────────────────────────────
    const tryoutConds: Prisma.Sql[] = [
      Prisma.sql`sat."schoolId" = ${schoolId}`,
    ]
    if (classId) {
      tryoutConds.push(Prisma.sql`sat."classId" = ${classId}`)
    }

    const tryoutWhere =
      tryoutConds.length === 1
        ? tryoutConds[0]
        : tryoutConds.slice(1).reduce(
            (acc, cond) => Prisma.sql`${acc} AND ${cond}`,
            tryoutConds[0],
          )

    type AggRow = { questionId: string; totalAnswered: number; totalCorrect: number }

    const tryoutRows: AggRow[] = await db.$queryRaw`
      SELECT sa."questionId" AS "questionId",
             COUNT(*) AS "totalAnswered",
             COALESCE(SUM(CASE WHEN sa."isCorrect" = 1 THEN 1 ELSE 0 END), 0) AS "totalCorrect"
        FROM "StudentAnswer" sa
        JOIN "StudentAttempt" sat ON sa."studentAttemptId" = sat."id"
       WHERE ${tryoutWhere}
       GROUP BY sa."questionId"
    `

    // ────────────────────────────────────────────────────
    // 2. AssignmentAnswer (Tugas) — aggregated by questionId
    // ────────────────────────────────────────────────────
    const tugasConds: Prisma.Sql[] = [
      Prisma.sql`a."schoolId" = ${schoolId}`,
    ]
    if (classId) {
      tugasConds.push(Prisma.sql`aSub."classId" = ${classId}`)
    }

    const tugasWhere =
      tugasConds.length === 1
        ? tugasConds[0]
        : tugasConds.slice(1).reduce(
            (acc, cond) => Prisma.sql`${acc} AND ${cond}`,
            tugasConds[0],
          )

    const tugasRows: AggRow[] = await db.$queryRaw`
      SELECT aq."questionId" AS "questionId",
             COUNT(*) AS "totalAnswered",
             COALESCE(SUM(CASE WHEN aa."isCorrect" = 1 THEN 1 ELSE 0 END), 0) AS "totalCorrect"
        FROM "AssignmentAnswer" aa
        JOIN "AssignmentQuestion" aq ON aa."questionId" = aq."id"
        JOIN "AssignmentSubmission" aSub ON aa."submissionId" = aSub."id"
        JOIN "Assignment" a ON aSub."assignmentId" = a."id"
       WHERE ${tugasWhere}
       GROUP BY aq."questionId"
    `

    // ────────────────────────────────────────────────────
    // 3. Merge Tryout + Tugas per questionId
    // ────────────────────────────────────────────────────
    const merged = new Map<string, { totalAnswered: number; totalCorrect: number }>()

    for (const r of tryoutRows) {
      merged.set(r.questionId, {
        totalAnswered: Number(r.totalAnswered),
        totalCorrect: Number(r.totalCorrect),
      })
    }
    for (const r of tugasRows) {
      const prev = merged.get(r.questionId) ?? { totalAnswered: 0, totalCorrect: 0 }
      merged.set(r.questionId, {
        totalAnswered: prev.totalAnswered + Number(r.totalAnswered),
        totalCorrect: prev.totalCorrect + Number(r.totalCorrect),
      })
    }

    if (merged.size === 0) {
      return NextResponse.json({ data: [], total: 0 })
    }

    // ────────────────────────────────────────────────────
    // 4. Fetch question details (subject, topic names)
    // ────────────────────────────────────────────────────
    const questionIds = Array.from(merged.keys())

    const questions = await db.question.findMany({
      where: {
        id: { in: questionIds },
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
    })

    // ────────────────────────────────────────────────────
    // 5. Build analysis items
    // ────────────────────────────────────────────────────
    const analysis = questions
      .map((q) => {
        const stats = merged.get(q.id)!

        const percentage =
          stats.totalAnswered > 0
            ? Math.round((stats.totalCorrect / stats.totalAnswered) * 1000) / 10
            : 0

        // Difficulty based on percentage
        let difficulty: string
        if (percentage >= 80) difficulty = 'Mudah'
        else if (percentage >= 50) difficulty = 'Sedang'
        else difficulty = 'Sukar'

        // Discrimination proxy based on percentage band
        let discrimination: string
        if (percentage >= 30 && percentage <= 70) discrimination = 'Tinggi'
        else if (
          (percentage >= 20 && percentage < 30) ||
          (percentage > 70 && percentage <= 80)
        )
          discrimination = 'Sedang'
        else discrimination = 'Rendah'

        return {
          questionId: q.id,
          subjectName: q.subject.name,
          topicName: q.topic?.name ?? null,
          content: q.content,
          type: q.type,
          totalAnswered: stats.totalAnswered,
          totalCorrect: stats.totalCorrect,
          percentage,
          difficulty,
          discrimination,
        }
      })
      .sort((a, b) => a.content.localeCompare(b.content))

    return NextResponse.json({ data: analysis, total: analysis.length })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[item-analysis] Error:', err)
    return NextResponse.json(
      { error: 'Gagal mengambil analisis butir soal' },
      { status: 500 },
    )
  }
}
