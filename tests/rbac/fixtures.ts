/**
 * Deterministic IDs for RBAC tests.
 * Must match tests/rbac/seed.ts
 */
export const FIX = {
  schoolA: 'rbac_school_a',
  schoolB: 'rbac_school_b',
  classA: 'rbac_class_a',
  classB: 'rbac_class_b',
  subject: 'rbac_subject_mat',

  superAdmin: 'rbac_super_admin',
  adminA: 'rbac_admin_a',
  adminB: 'rbac_admin_b',
  guruA: 'rbac_guru_a',
  guruB: 'rbac_guru_b',
  kepsekA: 'rbac_kepsek_a',
  siswaA1: 'rbac_siswa_a1',
  siswaA2: 'rbac_siswa_a2',
  siswaB1: 'rbac_siswa_b1',
  ortuA: 'rbac_ortu_a',
  ortuB: 'rbac_ortu_b',

  questionA: 'rbac_question_a',
  attemptA1: 'rbac_attempt_a1',
  attemptB1: 'rbac_attempt_b1',
  attendanceA1: 'rbac_att_a1',
  charReportA1: 'rbac_char_a1',
  packageA: 'rbac_package_a',
} as const;

export type FixKey = keyof typeof FIX;

export const ALL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN_SCHOOL',
  'GURU',
  'KEPALA_SEKOLAH',
  'SISWA',
  'ORANG_TUA',
] as const;

export type Role = (typeof ALL_ROLES)[number];

/** Map logical account key → user id in FIX */
export const ACCOUNTS = {
  SUPER_ADMIN: FIX.superAdmin,
  ADMIN_A: FIX.adminA,
  ADMIN_B: FIX.adminB,
  GURU_A: FIX.guruA,
  GURU_B: FIX.guruB,
  KEPSEK_A: FIX.kepsekA,
  SISWA_A1: FIX.siswaA1,
  SISWA_A2: FIX.siswaA2,
  SISWA_B1: FIX.siswaB1,
  ORTU_A: FIX.ortuA,
  ORTU_B: FIX.ortuB,
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

/** Password used for all seeded test users */
export const TEST_PASSWORD = 'RbacTest123!';
