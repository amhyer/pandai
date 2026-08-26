/**
 * Centralized attendance percentage calculation.
 *
 * Formula: hadir / (hadir + izin + sakit + alpa) × 100
 * - Excludes weekend/none statuses (only school-day statuses count)
 * - Returns null when denominator is 0 (no school days recorded)
 * - Consistent rounding: Math.round (nearest integer)
 */

export const SCHOOL_DAY_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alpa']);

/**
 * Calculate attendance percentage from hadir count and total school-day count.
 * @param hadir - Number of 'hadir' records
 * @param totalSchoolDays - Total school-day records (hadir + izin + sakit + alpa)
 * @returns Rounded percentage (0-100) or null if totalSchoolDays is 0
 */
export function calcAttendancePct(hadir: number, totalSchoolDays: number): number | null {
  if (totalSchoolDays <= 0) return null;
  return Math.round((hadir / totalSchoolDays) * 100);
}
