import { db } from '@/lib/db';
import { AuthUser, AuthError } from '@/lib/auth';
import { getTeacherClassIds, requireTeacherClass } from '@/lib/teacher-scope';

/**
 * Validate that the authenticated user can access the requested student's data.
 * Throws AuthError(403) if access is denied.
 * - SISWA: requestedStudentId MUST equal auth.userId
 * - ORANG_TUA: requestedStudentId MUST be a child (parentId = auth.userId)
 * GURU: student must belong to an explicitly assigned class in the same school.
 * - ADMIN_SCHOOL/KEPALA_SEKOLAH: requestedStudentId MUST be in auth.schoolId
 * - SUPER_ADMIN: always allowed
 */
export async function requireStudentScope(auth: AuthUser, requestedStudentId: string): Promise<void> {
  if (auth.role === 'SUPER_ADMIN') return;

  if (auth.role === 'SISWA') {
    if (requestedStudentId !== auth.userId) {
      throw new AuthError('Tidak diizinkan mengakses data siswa lain', 403);
    }
    return;
  }

  if (auth.role === 'ORANG_TUA') {
    const child = await db.user.findFirst({
      where: { id: requestedStudentId, parentId: auth.userId, schoolId: auth.schoolId, role: 'SISWA' },
      select: { id: true },
    });
    if (!child) {
      throw new AuthError('Tidak diizinkan mengakses data siswa lain', 403);
    }
    return;
  }

  // School scope for staff; teachers also require an explicit class assignment.
  const student = await db.user.findUnique({
    where: { id: requestedStudentId },
    select: { id: true, schoolId: true, classId: true, role: true },
  });
  if (!student || student.role !== 'SISWA') {
    throw new AuthError('Siswa tidak ditemukan', 404);
  }
  if (!auth.schoolId || student.schoolId !== auth.schoolId) {
    throw new AuthError('Tidak diizinkan mengakses data siswa dari sekolah lain', 403);
  }
  if (auth.role === 'GURU') {
    if (!student.classId) throw new AuthError('Siswa belum berada di kelas Anda', 403);
    await requireTeacherClass(auth, student.classId);
  }
}

/**
 * Get the list of student IDs the authenticated user is allowed to access.
 * - SISWA: [auth.userId]
 * - ORANG_TUA: all children (WHERE parentId = auth.userId)
 * - GURU: students in assigned classes; ADMIN/KEPSEK: students in their school
 * - SUPER_ADMIN: all students (no filter)
 */
export async function getAccessibleStudentIds(auth: AuthUser): Promise<string[]> {
  if (auth.role === 'SUPER_ADMIN') {
    const students = await db.user.findMany({
      where: { role: 'SISWA' },
      select: { id: true },
    });
    return students.map(s => s.id);
  }

  if (auth.role === 'SISWA') {
    return [auth.userId];
  }

  if (auth.role === 'ORANG_TUA') {
    const children = await db.user.findMany({
      where: { parentId: auth.userId, schoolId: auth.schoolId },
      select: { id: true },
    });
    return children.map(c => c.id);
  }

  // School-level readers; teachers are narrowed to their assigned classes.
  if (!auth.schoolId) return [];
  const students = await db.user.findMany({
    where: { role: 'SISWA', schoolId: auth.schoolId,
      ...(auth.role === 'GURU' ? { classId: { in: await getTeacherClassIds(auth) } } : {}),
    },
    select: { id: true },
  });
  return students.map(s => s.id);
}

/**
 * Validate that a school belongs to the authenticated user's scope.
 * - SUPER_ADMIN: always allowed
 * - Others: schoolId MUST equal auth.schoolId
 */
export function requireSchoolScope(auth: AuthUser, requestedSchoolId: string): void {
  if (auth.role === 'SUPER_ADMIN') return;
  if (auth.schoolId !== requestedSchoolId) {
    throw new AuthError('Akses ditolak — bukan sekolah Anda', 403);
  }
}

/**
 * Get the schoolId filter for the authenticated user.
 * SUPER_ADMIN returns undefined (no filter), others return auth.schoolId.
 */
export function getSchoolFilter(auth: AuthUser): string | undefined {
  if (auth.role === 'SUPER_ADMIN') return undefined;
  return auth.schoolId ?? undefined;
}
