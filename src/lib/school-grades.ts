// =====================================================================
// school-grades.ts — Helper tunggal untuk tingkat kelas per jenjang.
//
// Jenjang:
//   - SD/MI (SD, SDLB, SDIT, MI, ...)      → Kelas 1–6
//   - SMP/MTs (SMP, MTs, SMPLB, SLTP, ...) → Kelas 7–9
//   - SMA/SMK/MA (fallback)                → Kelas 10–12
// =====================================================================

export type SchoolLevel = 'SD' | 'SMP' | 'SMA';

const SD_KEYWORDS = ['SDLB', 'SDIT', 'SD', 'MI'];
const SMP_KEYWORDS = ['SMPLB', 'SLTP', 'MT', 'SMP'];

/** Menentukan level jenjang dari schoolType (SMA/SMK/MA/... → 'SMA' sebagai fallback). */
export function getSchoolLevel(schoolType?: string | null): SchoolLevel {
  const t = (schoolType ?? '').trim().toUpperCase();
  if (!t) return 'SMA';
  // Periksa SDLB/SDIT sebelum 'SD' agar tidak tertangkap lebih dulu.
  for (const k of SD_KEYWORDS) {
    if (t.includes(k)) return 'SD';
  }
  for (const k of SMP_KEYWORDS) {
    if (t.includes(k)) return 'SMP';
  }
  return 'SMA';
}

/** Daftar tingkat kelas yang tersedia untuk suatu jenjang. */
export function getGradeOptions(schoolType?: string | null): string[] {
  const level = getSchoolLevel(schoolType);
  if (level === 'SD') return ['1', '2', '3', '4', '5', '6'];
  if (level === 'SMP') return ['7', '8', '9'];
  return ['10', '11', '12'];
}

const ALL_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** Label tingkat kelas: '1' → 'Kelas 1', '10' → 'Kelas 10', tak dikenal → '-'. */
export function getGradeLabel(grade: string): string {
  const g = String(grade).trim();
  if (ALL_GRADES.includes(g)) return `Kelas ${g}`;
  return '-';
}

// Palet warna siklik (semua tingkat 1–12 dapat warna).
const BORDER_COLORS = [
  'border-l-emerald-500',
  'border-l-blue-500',
  'border-l-amber-500',
  'border-l-violet-500',
  'border-l-rose-500',
  'border-l-cyan-500',
];
const BG_COLORS = [
  'bg-emerald-50 text-emerald-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700',
  'bg-violet-50 text-violet-700',
  'bg-rose-50 text-rose-700',
  'bg-cyan-50 text-cyan-700',
];

/** Warna tepi kiri kartu kelas (border-l-*). */
export function getGradeColor(grade: string): string {
  const g = parseInt(grade, 10);
  if (Number.isNaN(g) || g < 1 || g > 12) return 'border-l-gray-400';
  return BORDER_COLORS[(g - 1) % BORDER_COLORS.length];
}

/** Warna latar badge/ikon (bg-* text-*). */
export function getGradeBg(grade: string): string {
  const g = parseInt(grade, 10);
  if (Number.isNaN(g) || g < 1 || g > 12) return 'bg-gray-50 text-gray-700';
  return BG_COLORS[(g - 1) % BG_COLORS.length];
}

const ROMAN_TO_GRADE: Record<string, string> = {
  I: '1',
  II: '2',
  III: '3',
  IV: '4',
  V: '5',
  VI: '6',
  VII: '7',
  VIII: '8',
  IX: '9',
  X: '10',
  XI: '11',
  XII: '12',
};
// Diurutkan dari terpanjang agar 'IX' tidak terpotong jadi 'I', dst.
const ROMAN_KEYS = Object.keys(ROMAN_TO_GRADE).sort((a, b) => b.length - a.length);

/**
 * Ekstrak tingkat dari nama kelas (angka Arab maupun Romawi di awal).
 * Contoh: '1A'→1, 'VII-2'→7, 'X IPA 1'→10, '12 TKJ'→12.
 * Mengembalikan '' jika tidak dikenali (mis. 'IPA 1', 'IPS 2' → bukan tingkat).
 */
export function extractGradeFromName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim().toUpperCase();

  // Angka Arab di awal (1–12).
  const arab = /^(\d{1,2})/.exec(trimmed);
  if (arab) {
    const n = parseInt(arab[1], 10);
    if (n >= 1 && n <= 12) return String(n);
  }

  // Angka Romawi di awal, diikuti pemisah/akhir/angka (bukan huruf).
  for (const k of ROMAN_KEYS) {
    if (!trimmed.startsWith(k)) continue;
    const rest = trimmed.slice(k.length);
    if (rest === '' || /^[\s\-–—/\\]/.test(rest) || /^\d/.test(rest)) {
      return ROMAN_TO_GRADE[k];
    }
  }

  return '';
}

/** Apakah grade sesuai dengan jenjang sekolah? */
export function isGradeValidForSchool(grade: string | number, schoolType?: string | null): boolean {
  const g = String(grade).trim();
  return getGradeOptions(schoolType).includes(g);
}
