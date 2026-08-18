// Mata uji TKA
export const SUBJECTS = [
  { code: 'bindo', name: 'Bahasa Indonesia', type: 'wajib' },
  { code: 'bing', name: 'Bahasa Inggris', type: 'wajib' },
  { code: 'mat', name: 'Matematika', type: 'wajib' },
  { code: 'fis', name: 'Fisika', type: 'pilihan' },
  { code: 'kim', name: 'Kimia', type: 'pilihan' },
  { code: 'bio', name: 'Biologi', type: 'pilihan' },
  { code: 'eko', name: 'Ekonomi', type: 'pilihan' },
  { code: 'sos', name: 'Sosiologi', type: 'pilihan' },
  { code: 'sej', name: 'Sejarah', type: 'pilihan' },
  { code: 'geo', name: 'Geografi', type: 'pilihan' },
] as const;

// Level kognitif Bloom
export const COGNITIVE_LEVELS = [
  { code: 'C1', name: 'Mengingat (C1)' },
  { code: 'C2', name: 'Memahami (C2)' },
  { code: 'C3', name: 'Menerapkan (C3)' },
  { code: 'C4', name: 'Menganalisis (C4)' },
  { code: 'C5', name: 'Mengevaluasi (C5)' },
  { code: 'C6', name: 'Mencipta (C6)' },
] as const;

// Tingkat kesukaran
export const DIFFICULTIES = [
  { code: 'mudah', name: 'Mudah', color: 'text-green-600' },
  { code: 'sedang', name: 'Sedang', color: 'text-yellow-600' },
  { code: 'sulit', name: 'Sulit', color: 'text-red-600' },
] as const;

// Tipe soal
export const QUESTION_TYPES = [
  { code: 'pg', name: 'Pilihan Ganda' },
  { code: 'pg_kompleks', name: 'PG Kompleks' },
  { code: 'isian', name: 'Isian Singkat' },
  { code: 'esai', name: 'Esai' },
] as const;

// Paket langganan
export const PLANS = [
  {
    code: 'free',
    name: 'Free',
    price: 0,
    maxStudents: 50,
    features: ['Diagnostic test', 'Bank soal global', 'Latihan adaptif', 'Progres dasar'],
  },
  {
    code: 'starter',
    name: 'Starter',
    price: 250000,
    maxStudents: 200,
    features: ['Semua fitur Free', 'Tryout terjadwal', 'Analisis butir soal', 'Import CSV siswa', 'Laporan per kelas'],
  },
  {
    code: 'pro',
    name: 'Pro',
    price: 500000,
    maxStudents: -1,
    features: ['Semua fitur Starter', 'Unlimited siswa', 'Bank soal privat', 'Leaderboard', 'Laporan PDF', 'Support prioritas'],
  },
] as const;

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_SCHOOL: 'Admin Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  ORANG_TUA: 'Orang Tua',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
};

// Status labels
export const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Ditangguhkan',
  deleted: 'Dihapus',
  draft: 'Draft',
  published: 'Diterbitkan',
  archived: 'Diarsipkan',
  scheduled: 'Terjadwal',
  in_progress: 'Berlangsung',
  submitted: 'Dikumpulkan',
  graded: 'Dinilai',
  ended: 'Berakhir',
};

// Legacy password hashing — kept only for migration.
// New code should use `import { hashPassword, verifyPassword } from '@/lib/auth'`
// which uses bcrypt.
function getSalt(): string {
  const salt = process.env.PASSWORD_SALT;
  if (!salt || salt === 'CHANGE_ME_IN_PRODUCTION') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] PASSWORD_SALT env var is not set!');
    }
    return 'pandai_dev_salt_2024';
  }
  return salt;
}

/** @deprecated Use import from '@/lib/auth' instead */
export async function hashPassword(password: string): Promise<string> {
  // Re-export from auth module (bcrypt)
  const { hashPassword: bcryptHash } = await import('@/lib/auth');
  return bcryptHash(password);
}

/** @deprecated Use import from '@/lib/auth' instead */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { verifyPassword: bcryptVerify } = await import('@/lib/auth');
  return bcryptVerify(password, hash);
}
