/**
 * 8 Dimensi Profil Lulusan (Kurikulum Pembelajaran Mendalam)
 * Skala: 1=Mulai Berkembang, 2=Berkembang, 3=Berkembang Sesuai Harapan, 4=Sangat Berkembang
 */

export const COMPETENCY_DIMENSIONS = [
  { key: 'KEIMANAN_KETAKWAAN', label: 'Keimanan dan Ketakwaan', icon: '🤲' },
  { key: 'KEWARGAAN',          label: 'Kewargaan',                icon: '🏘️' },
  { key: 'PENALARAN_KRITIS',  label: 'Penalaran Kritis',        icon: '🧠' },
  { key: 'KREATIVITAS',        label: 'Kreativitas',              icon: '🎨' },
  { key: 'KOLABORASI',         label: 'Kolaborasi',               icon: '🤝' },
  { key: 'KEMANDIRIAN',        label: 'Kemandirian',              icon: '💪' },
  { key: 'KESEHATAN',          label: 'Kesehatan',                icon: '🏃' },
  { key: 'KOMUNIKASI',         label: 'Komunikasi',               icon: '💬' },
] as const;

export type DimensionKey = (typeof COMPETENCY_DIMENSIONS)[number]['key'];

export const RATING_LABELS: Record<number, string> = {
  1: 'Mulai Berkembang',
  2: 'Berkembang',
  3: 'Berkembang Sesuai Harapan',
  4: 'Sangat Berkembang',
};

export const VALID_DIMENSIONS = COMPETENCY_DIMENSIONS.map(d => d.key);

export function validateDimension(d: string): boolean {
  return VALID_DIMENSIONS.includes(d as DimensionKey);
}

export function validateRating(r: number): boolean {
  return Number.isInteger(r) && r >= 1 && r <= 4;
}
