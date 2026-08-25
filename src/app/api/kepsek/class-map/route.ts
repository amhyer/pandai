import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logError } from '@/lib/error-log';
import { requireRole, AuthError } from '@/lib/auth';
import { requireSchoolScope } from '@/lib/scope';
import { SCHOOL_DAY_STATUSES, calcAttendancePct } from '@/lib/attendance';

/**
 * GET /api/kepsek/class-map
 * Peta Kelas — agregat rombongan, cakupan akun, indikator ringkas.
 * Role: KEPALA_SEKOLAH | ADMIN_SCHOOL | SUPER_ADMIN
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId') || auth.schoolId;
    const academicYear = searchParams.get('academicYear') || undefined;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId diperlukan' }, { status: 400 });
    }
    requireSchoolScope(auth, schoolId);

    const classWhere: { schoolId: string; academicYear?: string } = { schoolId };
    if (academicYear) classWhere.academicYear = academicYear;

    const classes = await db.class.findMany({
      where: classWhere,
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      include: {
        WaliKelas: { select: { id: true, name: true, isActive: true } },
      },
    });

    const classIds = classes.map((c) => c.id);

    const students = await db.user.findMany({
      where: {
        schoolId,
        role: 'SISWA',
        isActive: true,
        ...(classIds.length ? { classId: { in: classIds } } : {}),
      },
      select: {
        id: true,
        classId: true,
        parentId: true,
        username: true,
      },
    });

    // Teacher assignments for subject labels
    const assignments = await db.teacherAssignment.findMany({
      where: { schoolId, classId: { in: classIds } },
      select: { classId: true, teacherId: true, subjectId: true },
    });

    const teacherIds = [
      ...new Set(
        [
          ...classes.map((c) => c.waliKelasId).filter(Boolean),
          ...assignments.map((a) => a.teacherId),
        ].filter(Boolean) as string[],
      ),
    ];

    const teachers = teacherIds.length
      ? await db.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, name: true, isActive: true },
        })
      : [];
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    const subjectIds = [...new Set(assignments.map((a) => a.subjectId).filter(Boolean) as string[])];
    const subjects = subjectIds.length
      ? await db.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const [attendanceRecords, characterRecords, gradeRecords] = await Promise.all([
      classIds.length
        ? db.attendance.findMany({
            where: { classId: { in: classIds } },
            select: { classId: true, status: true, updatedAt: true },
          })
        : Promise.resolve([]),
      classIds.length
        ? db.characterReport.findMany({
            where: { classId: { in: classIds } },
            select: { classId: true, studentId: true, updatedAt: true },
          })
        : Promise.resolve([]),
      classIds.length
        ? db.studentGrade.findMany({
            where: { schoolId, classId: { in: classIds } },
            select: { classId: true, score: true, maxScore: true, updatedAt: true },
          })
        : Promise.resolve([]),
    ]);

    const studentsByClass = new Map<string, typeof students>();
    for (const s of students) {
      if (!s.classId) continue;
      const arr = studentsByClass.get(s.classId) || [];
      arr.push(s);
      studentsByClass.set(s.classId, arr);
    }

    // P0-09: Only count school-day statuses (exclude 'weekend'/'none') to match Siswa/Ortu calculation
    const attByClass = new Map<string, { hadir: number; total: number; maxUpdated: Date | null }>();
    for (const a of attendanceRecords) {
      if (!a.classId) continue;
      if (!SCHOOL_DAY_STATUSES.has(a.status)) continue; // skip weekend/none
      const e = attByClass.get(a.classId) || { hadir: 0, total: 0, maxUpdated: null };
      e.total += 1;
      if (a.status === 'hadir') e.hadir += 1;
      if (a.updatedAt && (!e.maxUpdated || a.updatedAt > e.maxUpdated)) e.maxUpdated = a.updatedAt;
      attByClass.set(a.classId, e);
    }

    const kaihByClass = new Map<string, { students: Set<string>; maxUpdated: Date | null }>();
    for (const r of characterRecords) {
      if (!r.classId) continue;
      const e = kaihByClass.get(r.classId) || { students: new Set(), maxUpdated: null };
      e.students.add(r.studentId);
      if (r.updatedAt && (!e.maxUpdated || r.updatedAt > e.maxUpdated)) e.maxUpdated = r.updatedAt;
      kaihByClass.set(r.classId, e);
    }

    const gradeByClass = new Map<
      string,
      { scores: number[]; maxUpdated: Date | null }
    >();
    for (const g of gradeRecords) {
      if (!g.classId) continue;
      const e = gradeByClass.get(g.classId) || { scores: [], maxUpdated: null };
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : g.score;
      e.scores.push(pct);
      if (g.updatedAt && (!e.maxUpdated || g.updatedAt > e.maxUpdated)) e.maxUpdated = g.updatedAt;
      gradeByClass.set(g.classId, e);
    }

    // First assignment subject per class (simple label)
    const subjectLabelByClass = new Map<string, string>();
    for (const a of assignments) {
      if (!a.classId || !a.subjectId) continue;
      if (!subjectLabelByClass.has(a.classId)) {
        subjectLabelByClass.set(a.classId, subjectMap.get(a.subjectId) || '—');
      }
    }

    const KKM = 70; // default threshold for masteryPct approximation

    const rows = classes.map((cls) => {
      const classStudents = studentsByClass.get(cls.id) || [];
      const studentCount = classStudents.length;
      const parentAccountCount = classStudents.filter((s) => !!s.parentId).length;
      const studentAccountCount = classStudents.filter((s) => !!s.username).length;
      const parentAccountPct =
        studentCount > 0 ? Math.round((parentAccountCount / studentCount) * 1000) / 10 : 0;
      const studentAccountPct =
        studentCount > 0 ? Math.round((studentAccountCount / studentCount) * 1000) / 10 : 0;

      const wali = cls.WaliKelas;
      const teacherId = cls.waliKelasId || null;
      let teacherName = '—';
      let teacherActive = true;
      let teacherMissing = false;
      if (teacherId) {
        const t = teacherMap.get(teacherId);
        if (!t) {
          teacherMissing = true;
          teacherName = '(akun guru terhapus)';
        } else {
          teacherName = t.name;
          teacherActive = t.isActive;
        }
      } else if (wali) {
        teacherName = wali.name;
        teacherActive = wali.isActive;
      }

      const grades = gradeByClass.get(cls.id);
      let avgScore: number | null = null;
      let masteryPct: number | null = null;
      if (grades && grades.scores.length > 0) {
        avgScore =
          Math.round((grades.scores.reduce((a, b) => a + b, 0) / grades.scores.length) * 10) / 10;
        const pass = grades.scores.filter((s) => s >= KKM).length;
        masteryPct = Math.round((pass / grades.scores.length) * 100);
      }

      const att = attByClass.get(cls.id);
      const attendancePct = att ? calcAttendancePct(att.hadir, att.total) : null;

      const kaih = kaihByClass.get(cls.id);
      const kaihFamilyCount = kaih ? kaih.students.size : null;
      const kaihFamilyPct =
        kaihFamilyCount != null && studentCount > 0
          ? Math.round((kaihFamilyCount / studentCount) * 1000) / 10
          : null;

      const dates = [grades?.maxUpdated, att?.maxUpdated, kaih?.maxUpdated].filter(
        Boolean,
      ) as Date[];
      const updatedAt =
        dates.length > 0
          ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
          : null;

      const hasData =
        avgScore != null || attendancePct != null || (kaihFamilyCount != null && kaihFamilyCount > 0);

      return {
        key: `${cls.id}`,
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        academicYear: cls.academicYear,
        teacherId,
        teacherName,
        teacherActive,
        teacherMissing,
        subjectLabel: subjectLabelByClass.get(cls.id) || (wali ? 'Wali kelas' : '—'),
        studentCount,
        parentAccountCount,
        parentAccountPct,
        studentAccountCount,
        studentAccountPct,
        avgScore,
        masteryPct,
        attendancePct,
        kaihFamilyCount,
        kaihFamilyPct,
        updatedAt,
        hasData,
      };
    });

    const totalStudents = rows.reduce((s, r) => s + r.studentCount, 0);
    const totalParents = rows.reduce((s, r) => s + r.parentAccountCount, 0);
    const totalStudentAccounts = rows.reduce((s, r) => s + r.studentAccountCount, 0);
    const masteryVals = rows.map((r) => r.masteryPct).filter((v): v is number => v != null);
    const attVals = rows.map((r) => r.attendancePct).filter((v): v is number => v != null);

    return NextResponse.json({
      summary: {
        rombel: rows.length,
        students: totalStudents,
        parentCoveragePct:
          totalStudents > 0 ? Math.round((totalParents / totalStudents) * 1000) / 10 : 0,
        studentCoveragePct:
          totalStudents > 0 ? Math.round((totalStudentAccounts / totalStudents) * 1000) / 10 : 0,
        avgMasteryPct:
          masteryVals.length > 0
            ? Math.round(masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length)
            : null,
        avgAttendancePct:
          attVals.length > 0
            ? Math.round(attVals.reduce((a, b) => a + b, 0) / attVals.length)
            : null,
        academicYear: academicYear || classes[0]?.academicYear || null,
      },
      rows,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await logError({ error, route: '/api/kepsek/class-map', method: 'GET' });
    return NextResponse.json({ error: 'Gagal memuat peta kelas' }, { status: 500 });
  }
}
