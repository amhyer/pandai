import { db } from '@/lib/db';
import { SCHOOL_DAY_STATUSES, calcAttendancePct } from '@/lib/attendance';

/**
 * Server-only dashboard data loaders.
 *
 * These mirror the Supabase/API route queries used by the client dashboards
 * but run directly on the Next.js server. Server Component routes can pass
 * the result through props so the client does not perform a second fetch on
 * first load.
 */

export interface SuperAdminDashboardData {
  analytics: {
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
    totalQuestions: number;
    totalAttempts: number;
    mrr: number;
    monthlyGrowth: { month: string; sekolah: number; siswa: number }[];
    topSchools: {
      id: string;
      name: string;
      code: string;
      plan: string;
      status: string;
      _count?: { users: number };
    }[];
  };
  activities: {
    id: string;
    action: string;
    detail: string | null;
    module: string | null;
    createdAt: Date;
  }[];
}

export interface AdminSchoolDashboardData {
  analytics: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalQuestions: number;
    avgScore: number;
    predictedScore: number;
    recentAttempts: { name: string; score: number; date: string }[];
  };
  upcomingExams: {
    id: string;
    name: string;
    date: string;
    status: 'scheduled' | 'in_progress' | 'grading';
    participants: number;
    subject: string;
  }[];
}

export async function getAdminSchoolDashboardData(
  schoolId: string
): Promise<AdminSchoolDashboardData> {
  const [totalStudents, totalTeachers, totalClasses, totalQuestions, attempts, examSessions] =
    await Promise.all([
      db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } }),
      db.user.count({ where: { schoolId, role: 'GURU', isActive: true } }),
      db.class.count({ where: { schoolId } }),
      db.question.count({ where: { schoolId } }),
      db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.examSession.findMany({
        where: { schoolId, status: { in: ['scheduled', 'active'] } },
        include: { examPackage: true, assignments: { select: { id: true } } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
    ]);

  const avgScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) * 10) / 10
      : 0;
  const avgTka =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.tkaPrediction || 0), 0) / attempts.length)
      : 0;

  return {
    analytics: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalQuestions,
      avgScore,
      predictedScore: avgTka,
      recentAttempts: attempts.slice(0, 10).map((a) => ({
        name: a.user?.name || 'Anonim',
        score: a.percentage,
        date: a.createdAt.toISOString().split('T')[0],
      })),
    },
    upcomingExams: examSessions.map((session) => ({
      id: session.id,
      name: session.title || session.examPackage?.title || 'Tryout',
      date: session.startDate.toISOString(),
      status: session.status === 'active' ? 'in_progress' as const : 'scheduled' as const,
      participants: session.assignments.length,
      subject: session.examPackage?.title || 'Tryout',
    })),
  };
}

export interface GuruDashboardData {
  totalQuestions: number;
  totalExams: number;
  avgStudentScore: number;
  recentActivities: {
    id: string;
    action: string;
    detail: string;
    time: string;
    type: 'create' | 'exam' | 'result';
  }[];
  topStudents: {
    name: string;
    score: number;
    progress: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface StudentAnalyticsData {
  lastScore: number;
  totalExams: number;
  avgCorrect: number;
  rank?: number;
  weakTopics: { topic: string; score: number; total: number }[];
  scoreTrend: { date: string; score: number }[];
  subjectBreakdown: { subject: string; score: number; maxScore: number }[];
}

export interface OtuChildDashboardData {
  id: string;
  name: string;
  className?: string;
  avgScore: number;
  totalExams: number;
  attendance: number;
  lastActive: string;
}

export interface KepalaSekolahDashboardData {
  schoolInfo: {
    schoolName: string;
    totalSiswa: number;
    totalGuru: number;
    totalKelas: number;
    overallAvgKehadiran: number | null;
  };
  rekapKelas: {
    className: string;
    classId: string;
    studentCount: number;
    avgKehadiran: number | null;
    avgNilai: number | null;
    avgKebiasaan: number | null;
  }[];
  rekapGuru: {
    teacherName: string;
    teacherId: string;
    nip: string | null;
    kehadiranMengajar: number;
    jumlahMateri: number;
    jumlahKuis: number;
    jumlahTugas: number;
  }[];
  rekapKebiasaan: {
    habitId: string;
    habitName: string;
    avgRating: number | null;
    reportCount: number;
  }[];
  rekapKebiasaanPerKelas: {
    className: string;
    classId: string;
    totalReports: number;
    avgOverall: number | null;
    habits: { habitId: string; habitName: string; avgRating: number | null; reportCount: number }[];
  }[];
}

export async function getGuruDashboardData(schoolId: string): Promise<GuruDashboardData> {
  const [totalQuestions, totalExams, attempts, latestAttempts, recentActivities] =
    await Promise.all([
      db.question.count({ where: { OR: [{ schoolId }, { schoolId: null }] } }),
      db.examSession.count({ where: { schoolId, status: { in: ['published', 'in_progress'] } } }),
      db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      db.studentAttempt.findMany({
        where: { schoolId, status: 'submitted' },
        select: { percentage: true, tkaPrediction: true, user: { select: { name: true } } },
        orderBy: { percentage: 'desc' },
        take: 3,
      }),
      db.activityLog.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, detail: true, createdAt: true },
      }),
    ]);

  const avgStudentScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) * 10) / 10
      : 0;

  const activityTypes: Record<string, 'create' | 'exam' | 'result'> = {
    create_question: 'create',
    create_exam: 'exam',
    submit_attempt: 'result',
  };
  const formattedActivities = recentActivities.map((a) => {
    const hours = Math.floor((Date.now() - a.createdAt.getTime()) / 3600000);
    const days = Math.floor(hours / 24);
    const time = hours < 1 ? 'Baru saja' : hours < 24 ? `${hours} jam lalu` : `${days} hari lalu`;
    return { id: a.id, action: a.action, detail: a.detail || '', time, type: activityTypes[a.action] || 'create' };
  });

  const topStudents = latestAttempts.map((a, idx) => ({
    name: a.user?.name || 'Anonim',
    score: a.percentage,
    progress: Math.min(Math.round(a.percentage), 100),
    trend: (idx === 0 ? 'up' : idx === 1 ? 'up' : 'stable') as const,
  }));

  return { totalQuestions, totalExams, avgStudentScore, recentActivities: formattedActivities, topStudents };
}

export async function getSiswaDashboardData(userId: string): Promise<StudentAnalyticsData> {
  const student = await db.user.findUnique({
    where: { id: userId },
    select: { schoolId: true, classId: true },
  });
  if (!student) {
    return { lastScore: 0, totalExams: 0, avgCorrect: 0, weakTopics: [], scoreTrend: [], subjectBreakdown: [] };
  }

  const attempts = await db.studentAttempt.findMany({
    where: { userId, status: 'submitted' },
    include: {
      answers: { select: { questionId: true, isCorrect: true, question: { select: { subjectId: true, topicId: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const totalExams = attempts.length;
  const lastScore = attempts.length > 0 ? Math.round(attempts[0].percentage * 10) / 10 : 0;
  const avgCorrect =
    attempts.length > 0 ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) * 10) / 10 : 0;

  const topicScores: Record<string, { topic: string; totalScore: number; count: number }> = {};
  const subjectScores: Record<string, { subject: string; totalScore: number; totalMax: number }> = {};

  for (const att of attempts) {
    for (const ans of att.answers) {
      const tId = ans.question?.topicId;
      if (tId) {
        if (!topicScores[tId]) {
          const topic = await db.topic.findUnique({ where: { id: tId }, select: { name: true } });
          topicScores[tId] = { topic: topic?.name || 'Tanpa Topik', totalScore: 0, count: 0 };
        }
        topicScores[tId].count++;
        if (ans.isCorrect) topicScores[tId].totalScore++;
      }
      const sId = ans.question?.subjectId;
      if (sId) {
        if (!subjectScores[sId]) {
          const subj = await db.subject.findUnique({ where: { id: sId }, select: { name: true } });
          subjectScores[sId] = { subject: subj?.name || 'Unknown', totalScore: 0, totalMax: 0 };
        }
        subjectScores[sId].totalMax++;
        if (ans.isCorrect) subjectScores[sId].totalScore++;
      }
    }
  }

  const weakTopics = Object.values(topicScores)
    .map((t) => ({ ...t, score: t.count > 0 ? Math.round((t.totalScore / t.count) * 100) : 0 }))
    .filter((t) => t.score < 70)
    .sort((a, b) => a.score - b.score)
    .map((t) => ({ topic: t.topic, score: t.score, total: t.totalScore }));

  const scoreTrend = attempts
    .slice(0, 20)
    .reverse()
    .map((a) => ({ date: (a.submittedAt || a.createdAt).toISOString().split('T')[0], score: a.percentage }));

  const subjectBreakdown = Object.values(subjectScores)
    .map((s) => ({
      ...s,
      score: s.totalMax > 0 ? Math.round((s.totalScore / s.totalMax) * 100) : 0,
      maxScore: 100,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ subject: s.subject, score: s.score, maxScore: s.maxScore }));

  let rank: number | undefined;
  if (student.schoolId) {
    const schoolStudents = await db.user.findMany({
      where: { schoolId: student.schoolId, role: 'SISWA', isActive: true },
      select: { id: true },
    });
    const studentIds = schoolStudents.map((s) => s.id);
    const schoolAttempts = await db.studentAttempt.findMany({
      where: { userId: { in: studentIds }, status: 'submitted' },
      select: { userId: true, percentage: true },
    });
    const agg: Record<string, { total: number; count: number }> = {};
    for (const sa of schoolAttempts) {
      if (!agg[sa.userId]) agg[sa.userId] = { total: 0, count: 0 };
      agg[sa.userId].total += sa.percentage;
      agg[sa.userId].count++;
    }
    const ranked = Object.entries(agg)
      .map(([uid, v]) => ({ uid, avg: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.avg - a.avg);
    const rankIdx = ranked.findIndex((r) => r.uid === userId);
    if (rankIdx >= 0) rank = rankIdx + 1;
  }

  return { lastScore, totalExams, avgCorrect, rank, weakTopics, scoreTrend, subjectBreakdown };
}

export async function getOrtuDashboardData(
  userId: string,
  schoolId?: string | null,
): Promise<OtuChildDashboardData[]> {
  const children = await db.user.findMany({
    where: { parentId: userId, isActive: true, ...(schoolId ? { schoolId } : {}) },
    include: { class: true },
    orderBy: { createdAt: 'desc' },
  });

  const childIds = children.map((c) => c.id);
  const attendanceRecords = await db.attendance.findMany({
    where: { studentId: { in: childIds } },
    select: { studentId: true, status: true },
  });
  const attendanceByChild = new Map<string, { hadir: number; total: number }>();
  for (const r of attendanceRecords) {
    if (!SCHOOL_DAY_STATUSES.has(r.status)) continue;
    const entry = attendanceByChild.get(r.studentId) || { hadir: 0, total: 0 };
    entry.total++;
    if (r.status === 'hadir') entry.hadir++;
    attendanceByChild.set(r.studentId, entry);
  }

  const analyticsList = await Promise.all(children.map((child) => getSiswaDashboardData(child.id)));

  const enriched: OtuChildDashboardData[] = children.map((child, index) => {
    const analytics = analyticsList[index] || ({} as StudentAnalyticsData);
    const att = attendanceByChild.get(child.id);
    const attendance = att && att.total > 0 ? calcAttendancePct(att.hadir, att.total) ?? 0 : 0;
    return {
      id: child.id,
      name: child.name,
      className: child.class?.name || '-',
      avgScore: analytics.avgCorrect ?? 0,
      totalExams: analytics.totalExams ?? 0,
      attendance,
      lastActive: child.lastLogin
        ? new Date(child.lastLogin).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : '-',
    };
  });
  return enriched;
}

export async function getKepalaSekolahDashboardData(schoolId: string): Promise<KepalaSekolahDashboardData> {
  const [school, totalSiswa, totalGuru, totalKelas, classes, gurus] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId } }),
    db.user.count({ where: { schoolId, role: 'SISWA', isActive: true } }),
    db.user.count({ where: { schoolId, role: 'GURU', isActive: true } }),
    db.class.count({ where: { schoolId } }),
    db.class.findMany({ where: { schoolId }, orderBy: [{ grade: 'asc' }, { name: 'asc' }] }),
    db.user.findMany({ where: { schoolId, role: 'GURU', isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  const classIds = classes.map((c) => c.id);
  const guruIds = gurus.map((g) => g.id);

  const [studentCountsByClass, attendanceRecords, characterRecords, extScoreRecords, journalCounts, materialCounts] =
    await Promise.all([
      db.user.groupBy({ by: ['classId'], where: { classId: { in: classIds }, role: 'SISWA', isActive: true }, _count: true }),
      db.attendance.findMany({ where: { classId: { in: classIds } }, select: { classId: true, status: true } }),
      db.characterReport.findMany({ where: { classId: { in: classIds } }, select: { classId: true, habit: true, rating: true } }),
      db.externalQuizScore.findMany({ where: { classId: { in: classIds } }, select: { classId: true, score: true } }),
      db.teachingJournal.groupBy({ by: ['teacherId'], where: { teacherId: { in: guruIds } }, _count: true }),
      db.material.groupBy({ by: ['teacherId', 'type'], where: { teacherId: { in: guruIds } }, _count: true }),
    ]);

  const studentCountMap = new Map(studentCountsByClass.map((r) => [r.classId, r._count as number]));
  const schoolDayRecords = attendanceRecords.filter((a) => SCHOOL_DAY_STATUSES.has(a.status));
  const overallHadir = schoolDayRecords.filter((a) => a.status === 'hadir').length;
  const overallAvgKehadiran = calcAttendancePct(overallHadir, schoolDayRecords.length);

  const attendanceByClass = new Map<string, { hadir: number; total: number }>();
  for (const a of schoolDayRecords) {
    if (!a.classId) continue;
    const entry = attendanceByClass.get(a.classId) || { hadir: 0, total: 0 };
    entry.total++;
    if (a.status === 'hadir') entry.hadir++;
    attendanceByClass.set(a.classId, entry);
  }

  const characterByClass = new Map<string, { habit: string; rating: number }[]>();
  for (const r of characterRecords) if (r.classId) {
    const arr = characterByClass.get(r.classId) || [];
    arr.push({ habit: r.habit, rating: r.rating });
    characterByClass.set(r.classId, arr);
  }

  const extScoresByClass = new Map<string, number[]>();
  for (const s of extScoreRecords) if (s.classId) {
    const arr = extScoresByClass.get(s.classId) || [];
    arr.push(s.score);
    extScoresByClass.set(s.classId, arr);
  }

  const journalCountMap = new Map(journalCounts.map((r) => [r.teacherId, r._count as number]));
  const materialCountMap = new Map<string, Map<string, number>>();
  for (const r of materialCounts) {
    if (!r.teacherId) continue;
    if (!materialCountMap.has(r.teacherId)) materialCountMap.set(r.teacherId, new Map());
    materialCountMap.get(r.teacherId)!.set(r.type, r._count as number);
  }

  const rekapKelas = classes.map((cls) => {
    const att = attendanceByClass.get(cls.id);
    const charReports = characterByClass.get(cls.id) || [];
    const scores = extScoresByClass.get(cls.id) || [];
    return {
      className: cls.name,
      classId: cls.id,
      studentCount: studentCountMap.get(cls.id) || 0,
      avgKehadiran: att ? calcAttendancePct(att.hadir, att.total) : null,
      avgNilai: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100 : null,
      avgKebiasaan: charReports.length > 0
        ? Math.round((charReports.reduce((s, r) => s + r.rating, 0) / charReports.length) * 100) / 100
        : null,
    };
  });

  const rekapGuru = gurus.map((guru) => {
    const types = materialCountMap.get(guru.id) || new Map<string, number>();
    return {
      teacherName: guru.name,
      teacherId: guru.id,
      nip: guru.nip || null,
      kehadiranMengajar: journalCountMap.get(guru.id) || 0,
      jumlahMateri: types.get('materi') || 0,
      jumlahKuis: types.get('quiz') || 0,
      jumlahTugas: types.get('tugas') || 0,
    };
  });

  // Build habit aggregates (7 kebiasaan global + per-kelas) matching the API route.
  const HABIT_LABELS: Record<string, string> = {
    bangun_pagi: 'Bangun Pagi',
    beribadah: 'Beribadah',
    berolahraga: 'Berolahraga',
    makan_sehat: 'Makan Sehat dan Bergizi',
    gemar_belajar: 'Gemar Belajar',
    bermasyarakat: 'Bermasyarakat',
    tidur_cepat: 'Tidur Cepat',
  };
  const habitByClass = new Map<string, Record<string, { total: number; count: number }>>();
  for (const r of characterRecords) {
    if (!r.classId || !r.habit) continue;
    if (!habitByClass.has(r.classId)) habitByClass.set(r.classId, {});
    const arr = habitByClass.get(r.classId)!;
    if (!arr[r.habit]) arr[r.habit] = { total: 0, count: 0 };
    arr[r.habit].total += r.rating;
    arr[r.habit].count++;
  }

  const rekapKebiasaan = Object.entries(HABIT_LABELS).map(([habitId, habitName]) => {
    let total = 0;
    let count = 0;
    for (const cls of habitByClass.values()) {
      const entry = cls[habitId];
      if (entry) {
        total += entry.total;
        count += entry.count;
      }
    }
    return {
      habitId,
      habitName,
      avgRating: count > 0 ? Math.round((total / count) * 100) / 100 : null,
      reportCount: count,
    };
  });

  const rekapKebiasaanPerKelas = classes.map((cls) => {
    const map = habitByClass.get(cls.id) || {};
    const habits = Object.entries(HABIT_LABELS).map(([habitId, habitName]) => {
      const e = map[habitId];
      return {
        habitId,
        habitName,
        avgRating: e && e.count > 0 ? Math.round((e.total / e.count) * 100) / 100 : null,
        reportCount: e?.count || 0,
      };
    });
    const totalReports = habits.reduce((s, h) => s + h.reportCount, 0);
    const rated = habits.filter((h) => h.avgRating !== null);
    const avgOverall = rated.length > 0
      ? Math.round((rated.reduce((s, h) => s + (h.avgRating || 0), 0) / rated.length) * 100) / 100
      : null;
    return { className: cls.name, classId: cls.id, totalReports, avgOverall, habits };
  });

  return {
    schoolInfo: {
      schoolName: school?.name || 'Sekolah',
      totalSiswa,
      totalGuru,
      totalKelas,
      overallAvgKehadiran,
    },
    rekapKelas,
    rekapGuru,
    rekapKebiasaan,
    rekapKebiasaanPerKelas,
  };
}

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const [
    totalSchools,
    totalStudents,
    totalTeachers,
    totalQuestions,
    totalAttempts,
    schools,
    monthlySchools,
    activeSubs,
    activities,
  ] = await Promise.all([
    db.school.count({ where: { status: 'active' } }),
    db.user.count({ where: { role: 'SISWA', isActive: true } }),
    db.user.count({ where: { role: 'GURU', isActive: true } }),
    db.question.count(),
    db.studentAttempt.count({ where: { status: 'submitted' } }),
    db.school.findMany({
      where: { status: 'active' },
      include: {
        _count: { select: { users: true } },
        subscriptions: { orderBy: { startDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.school.findMany({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
      select: { createdAt: true },
    }),
    db.subscription.findMany({ where: { status: 'active' } }),
    db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, detail: true, module: true, createdAt: true },
    }),
  ]);

  const now = new Date();
  const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthStr = d.toLocaleString('id-ID', { month: 'short' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const schoolsThisMonth = monthlySchools.filter(
      (s) => s.createdAt >= d && s.createdAt <= monthEnd
    ).length;
    return { month: monthStr, sekolah: schoolsThisMonth, siswa: 0 };
  });
  const mrr = activeSubs.reduce((sum, sub) => sum + sub.amount, 0);

  return {
    analytics: {
      totalSchools,
      totalStudents,
      totalTeachers,
      totalQuestions,
      totalAttempts,
      mrr,
      monthlyGrowth,
      topSchools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        code: school.code || '',
        plan: school.plan || '',
        status: school.status,
        _count: school._count,
      })),
    },
    activities: activities.map((activity) => ({
      ...activity,
      detail: activity.detail ?? '',
      module: activity.module ?? '',
    })),
  };
}
