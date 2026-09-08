/**
 * Utilitas penilaian (grading) — dipakai bersama oleh API analytics,
 * export, dan view dashboard. Skala huruf mengikuti predikat rapor
 * (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, E < 60).
 */

/** Batasi angka di rentang [min, max]. */
export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

/** Ubah skor mentah menjadi persentase (0-100). */
export function normalizeScore(score: number, max = 100): number {
  if (!max || max <= 0) return 0;
  return clamp(Math.round((score / max) * 1000) / 10);
}

/** Huruf predikat: A (≥90), B (≥80), C (≥70), D (≥60), E (<60). */
export function gradeLetter(score: number | null | undefined): string {
  if (score == null) return '-';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

export type Mastery = 'kuat' | 'cukup' | 'lemah';

/** Level penguasaan berdasarkan KKM (default 60): kuat ≥ 80, cukup ≥ KKM. */
export function masteryLevel(score: number, kkm = 60): Mastery {
  if (score >= 80) return 'kuat';
  if (score >= kkm) return 'cukup';
  return 'lemah';
}

export const MASTERY_LABELS: Record<Mastery, string> = {
  kuat: 'Kuat',
  cukup: 'Cukup',
  lemah: 'Lemah',
};

/** Rata-rata berbobot: [{ value, weight }]. */
export function weightedAverage(items: { value: number; weight: number }[]): number {
  const totalWeight = items.reduce((p, c) => p + c.weight, 0);
  if (totalWeight <= 0) return 0;
  const sum = items.reduce((p, c) => p + c.value * c.weight, 0);
  return Math.round((sum / totalWeight) * 10) / 10;
}

export interface Band {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

/**
 * Banding nilai (distribusi persentil) — default 5 pita:
 * <60, 60-69, 70-79, 80-89, 90-100.
 */
export function bandingScores(
  scores: number[],
  bands?: { label: string; min: number; max: number }[]
): Band[] {
  const defs =
    bands ?? [
      { label: '< 60', min: 0, max: 59.99 },
      { label: '60 - 69', min: 60, max: 69.99 },
      { label: '70 - 79', min: 70, max: 79.99 },
      { label: '80 - 89', min: 80, max: 89.99 },
      { label: '90 - 100', min: 90, max: 100 },
    ];
  const total = scores.length;
  return defs.map((d) => {
    const count = scores.filter((s) => s >= d.min && s <= d.max).length;
    return {
      ...d,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    };
  });
}

/** Statistik dasar: mean, median, min, max, std dev. */
export function scoreStats(scores: number[]) {
  if (!scores.length) {
    return { mean: 0, median: 0, min: 0, max: 0, std: 0, count: 0 };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((p, c) => p + c, 0) / n;
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = sorted.reduce((p, c) => p + (c - mean) ** 2, 0) / n;
  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    min: sorted[0],
    max: sorted[n - 1],
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    count: n,
  };
}

/** Persentase kenaikan (untuk tren). */
export function deltaPercent(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 1000) / 10;
}
