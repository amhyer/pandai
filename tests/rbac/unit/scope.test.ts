import { describe, test, expect, beforeAll } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import {
  requireStudentScope,
  requireSchoolScope,
  getSchoolFilter,
  getAccessibleStudentIds,
} from '@/lib/scope';
import { AuthError, type AuthUser } from '@/lib/auth';
import { FIX } from '../fixtures';

const db = new PrismaClient();

function auth(
  partial: Partial<AuthUser> & Pick<AuthUser, 'userId' | 'role'>,
): AuthUser {
  return {
    schoolId: partial.schoolId ?? null,
    ...partial,
  };
}

beforeAll(async () => {
  // Ensure seed was run (CI does this). Local: bun run tests/rbac/seed.ts
  const school = await db.school.findUnique({ where: { id: FIX.schoolA } });
  if (!school) {
    throw new Error('RBAC fixtures missing. Run: bun run tests/rbac/seed.ts');
  }
});

describe('requireSchoolScope', () => {
  test('SUPER_ADMIN can access any school', () => {
    expect(() =>
      requireSchoolScope(auth({ userId: FIX.superAdmin, role: 'SUPER_ADMIN' }), FIX.schoolB),
    ).not.toThrow();
  });

  test('ADMIN_SCHOOL cannot access other school', () => {
    expect(() =>
      requireSchoolScope(
        auth({ userId: FIX.adminA, role: 'ADMIN_SCHOOL', schoolId: FIX.schoolA }),
        FIX.schoolB,
      ),
    ).toThrow(AuthError);
  });

  test('ADMIN_SCHOOL can access own school', () => {
    expect(() =>
      requireSchoolScope(
        auth({ userId: FIX.adminA, role: 'ADMIN_SCHOOL', schoolId: FIX.schoolA }),
        FIX.schoolA,
      ),
    ).not.toThrow();
  });
});

describe('requireStudentScope', () => {
  test('SISWA can access self', async () => {
    await requireStudentScope(
      auth({ userId: FIX.siswaA1, role: 'SISWA', schoolId: FIX.schoolA }),
      FIX.siswaA1,
    );
  });

  test('SISWA cannot access other student', async () => {
    await expect(
      requireStudentScope(
        auth({ userId: FIX.siswaA1, role: 'SISWA', schoolId: FIX.schoolA }),
        FIX.siswaA2,
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  test('ORANG_TUA can access own child', async () => {
    await requireStudentScope(
      auth({ userId: FIX.ortuA, role: 'ORANG_TUA', schoolId: FIX.schoolA }),
      FIX.siswaA1,
    );
  });

  test('ORANG_TUA cannot access other child', async () => {
    await expect(
      requireStudentScope(
        auth({ userId: FIX.ortuA, role: 'ORANG_TUA', schoolId: FIX.schoolA }),
        FIX.siswaB1,
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  test('GURU cannot access student from other school', async () => {
    await expect(
      requireStudentScope(
        auth({ userId: FIX.guruA, role: 'GURU', schoolId: FIX.schoolA }),
        FIX.siswaB1,
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  test('GURU can access student same school', async () => {
    await requireStudentScope(
      auth({ userId: FIX.guruA, role: 'GURU', schoolId: FIX.schoolA }),
      FIX.siswaA1,
    );
  });

  test('SUPER_ADMIN can access any student', async () => {
    await requireStudentScope(
      auth({ userId: FIX.superAdmin, role: 'SUPER_ADMIN' }),
      FIX.siswaB1,
    );
  });
});

describe('getSchoolFilter', () => {
  test('SUPER_ADMIN has no filter', () => {
    expect(getSchoolFilter(auth({ userId: FIX.superAdmin, role: 'SUPER_ADMIN' }))).toBeUndefined();
  });

  test('GURU filtered to school', () => {
    expect(
      getSchoolFilter(auth({ userId: FIX.guruA, role: 'GURU', schoolId: FIX.schoolA })),
    ).toBe(FIX.schoolA);
  });
});

describe('getAccessibleStudentIds', () => {
  test('SISWA only self', async () => {
    const ids = await getAccessibleStudentIds(
      auth({ userId: FIX.siswaA1, role: 'SISWA', schoolId: FIX.schoolA }),
    );
    expect(ids).toEqual([FIX.siswaA1]);
  });

  test('ORANG_TUA only children', async () => {
    const ids = await getAccessibleStudentIds(
      auth({ userId: FIX.ortuA, role: 'ORANG_TUA', schoolId: FIX.schoolA }),
    );
    expect(ids).toContain(FIX.siswaA1);
    expect(ids).not.toContain(FIX.siswaB1);
  });
});
