import { db } from '@/lib/db';
import { AuthError, type AuthUser } from '@/lib/auth';

/** Explicit teaching assignments or wali-kelas ownership; no school-wide fallback. */
export async function getTeacherClassIds(auth: AuthUser): Promise<string[]> {
  if (auth.role !== 'GURU' || !auth.schoolId) return [];
  const assignments = await db.teacherAssignment.findMany({
    where: { teacherId: auth.userId, schoolId: auth.schoolId, classId: { not: null } },
    select: { classId: true },
  });
  const classes = await db.class.findMany({
    where: {
      schoolId: auth.schoolId,
      OR: [
        { waliKelasId: auth.userId },
        { id: { in: assignments.flatMap((a) => a.classId ? [a.classId] : []) } },
      ],
    },
    select: { id: true },
  });
  return classes.map((cls) => cls.id);
}

export async function requireTeacherClass(auth: AuthUser, classId: string): Promise<void> {
  if (!(await getTeacherClassIds(auth)).includes(classId)) {
    throw new AuthError('Akses ditolak — kelas ini tidak ditugaskan kepada Anda', 403);
  }
}

export const studentListSelect = {
  id: true, name: true, nisn: true, jk: true, phone: true, namaOrtu: true,
  classId: true, schoolId: true, role: true, isActive: true,
  class: { select: { id: true, name: true } },
} as const;
