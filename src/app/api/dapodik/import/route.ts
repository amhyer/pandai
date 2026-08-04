import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface ImportResultItem {
  created: number;
  skipped: number;
  errors: string[];
}

interface ImportRequest {
  schoolId: string;
  data: {
    version?: string;
    exportedAt?: string;
    schoolName?: string;
    sourceTypes?: string[];
    totalRecords?: number;
    data: {
      pesertaDidik?: Record<string, unknown>[];
      guru?: Record<string, unknown>[];
      rombel?: Record<string, unknown>[];
      mataPelajaran?: Record<string, unknown>[];
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Resolve the most likely name field from a Dapodik row */
function resolveName(row: Record<string, unknown>, fallback: string): string {
  return (
    (row.nama as string) ||
    (row.nama_peserta_didik as string) ||
    (row.nama_pegawai as string) ||
    (row.ptk_terdaftar as string) ||
    fallback
  ).trim();
}

/** Extract gender from multiple possible Dapodik field names */
function resolveGender(row: Record<string, unknown>): string | undefined {
  const raw =
    (row.jenis_kelamin as string) ||
    (row.jk as string) ||
    (row.kode_jenis_kelamin as string) ||
    '';
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === 'l' || lower === 'lk' || lower === 'pria' || lower === '1') return 'L';
  if (lower === 'p' || lower === 'pr' || lower === 'wanita' || lower === 'perempuan' || lower === '2') return 'P';
  return raw.charAt(0).toUpperCase();
}

/** Extract phone */
function resolvePhone(row: Record<string, unknown>): string | undefined {
  return (row.no_hp as string) || (row.nomor_hp as string) || (row.no_telepon as string) || undefined;
}

/** Parse grade string to int (e.g. "X" → 10, "XI" → 11, "XII" → 12, "7" → 7) */
function parseGrade(raw: unknown): number {
  const str = String(raw ?? '').trim().toUpperCase();
  if (!str) return 10;
  const gradeMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
    'VII': 7, 'VIII': 8, 'IX': 9,
    'X': 10, 'XI': 11, 'XII': 12,
    'XIII': 13,
  };
  if (gradeMap[str] !== undefined) return gradeMap[str];
  const num = parseInt(str, 10);
  return isNaN(num) ? 10 : num;
}

/** Get the current academic year string (e.g. "2024/2025") */
function getCurrentAcademicYear(): string {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}/${y + 1}`;
}

// ═══════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();
    const { schoolId, data } = body;

    // ── 1. Validate schoolId ──
    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId wajib diisi. Pastikan Anda login sebagai admin sekolah.' },
        { status: 401 }
      );
    }

    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json(
        { error: 'Sekolah tidak ditemukan.' },
        { status: 401 }
      );
    }

    // ── 2. Validate data ──
    if (!data || !data.data) {
      return NextResponse.json(
        { error: 'Data impor tidak ditemukan.' },
        { status: 400 }
      );
    }

    // ── 3. Hash default password ──
    const defaultPassword = await hashPassword('pandai123');

    // ── 4. Transaction ──
    const results = await db.$transaction(async (tx) => {
      const importData = data.data;

      // ──────────────────────────────────────────────────────────────
      // PESERTA DIDIK
      // ──────────────────────────────────────────────────────────────
      const pesertaDidikResult: ImportResultItem = { created: 0, skipped: 0, errors: [] };

      if (importData.pesertaDidik && importData.pesertaDidik.length > 0) {
        for (const row of importData.pesertaDidik) {
          try {
            const nisn = String(row.nisn ?? '').trim();
            if (!nisn) {
              pesertaDidikResult.errors.push(`NISN kosong untuk: ${resolveName(row, 'Tanpa Nama')}`);
              continue;
            }

            // Check duplicate by nisn
            const existing = await tx.user.findUnique({ where: { nisn } });
            if (existing) {
              pesertaDidikResult.skipped++;
              continue;
            }

            const name = resolveName(row, `Siswa-${nisn}`);
            const jk = resolveGender(row);
            const phone = resolvePhone(row);

            await tx.user.create({
              data: {
                username: nisn,
                password: defaultPassword,
                name,
                role: 'SISWA',
                nisn,
                jk,
                phone,
                schoolId,
                isActive: true,
              },
            });
            pesertaDidikResult.created++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
            pesertaDidikResult.errors.push(`${resolveName(row, '?')}: ${msg}`);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // GURU
      // ──────────────────────────────────────────────────────────────
      const guruResult: ImportResultItem = { created: 0, skipped: 0, errors: [] };

      if (importData.guru && importData.guru.length > 0) {
        for (const row of importData.guru) {
          try {
            const nip = String(row.nip ?? '').trim();
            if (!nip) {
              guruResult.errors.push(`NIP kosong untuk: ${resolveName(row, 'Tanpa Nama')}`);
              continue;
            }

            // Check duplicate by nip
            const existing = await tx.user.findUnique({ where: { nip } });
            if (existing) {
              guruResult.skipped++;
              continue;
            }

            const name = resolveName(row, `Guru-${nip}`);
            const jk = resolveGender(row);
            const phone = resolvePhone(row);
            const nik = (row.nik as string) || undefined;

            await tx.user.create({
              data: {
                username: nip,
                password: defaultPassword,
                name,
                role: 'GURU',
                nip,
                nik,
                jk,
                phone,
                schoolId,
                isActive: true,
              },
            });
            guruResult.created++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
            guruResult.errors.push(`${resolveName(row, '?')}: ${msg}`);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // ROMBEL (Rombongan Belajar / Class)
      // ──────────────────────────────────────────────────────────────
      const rombelResult: ImportResultItem = { created: 0, skipped: 0, errors: [] };

      if (importData.rombel && importData.rombel.length > 0) {
        for (const row of importData.rombel) {
          try {
            const name = String(
              (row.nama as string) || (row.nama_rombel as string) || (row.rombel as string) || ''
            ).trim();
            if (!name) {
              rombelResult.errors.push('Nama rombel kosong');
              continue;
            }

            // Check duplicate by name + schoolId
            const existing = await tx.class.findFirst({
              where: { name, schoolId },
            });
            if (existing) {
              rombelResult.skipped++;
              continue;
            }

            const grade = parseGrade(row.tingkat);
            const academicYear =
              (row.tahun_pelajaran as string) ||
              (row.tahun_ajaran as string) ||
              getCurrentAcademicYear();

            await tx.class.create({
              data: {
                name,
                grade,
                academicYear,
                schoolId,
              },
            });
            rombelResult.created++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
            rombelResult.errors.push(`${(row.nama as string) || '?'}: ${msg}`);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // MATA PELAJARAN (Subject) — global, not per-school
      // ──────────────────────────────────────────────────────────────
      const mapelResult: ImportResultItem = { created: 0, skipped: 0, errors: [] };

      if (importData.mataPelajaran && importData.mataPelajaran.length > 0) {
        for (const row of importData.mataPelajaran) {
          try {
            const code = String(
              (row.kode_mapel as string) ||
              (row.kode_mata_pelajaran as string) ||
              (row.kode as string) ||
              (row.id_mapel as string) ||
              ''
            ).trim();
            if (!code) {
              mapelResult.errors.push(`Kode mapel kosong untuk: ${resolveName(row, 'Tanpa Nama')}`);
              continue;
            }

            // Check duplicate by code (global unique)
            const existing = await tx.subject.findUnique({ where: { code } });
            if (existing) {
              mapelResult.skipped++;
              continue;
            }

            const name = String(
              (row.nama as string) ||
              (row.nama_mata_pelajaran as string) ||
              (row.mata_pelajaran as string) ||
              `Mapel-${code}`
            ).trim();

            const rawType = String(row.jenis ?? '').trim().toLowerCase();
            const type = rawType === 'pilihan' || rawType === 'muatan_pilihan' ? 'pilihan' : 'wajib';

            await tx.subject.create({
              data: {
                name,
                code,
                type,
                sortOrder: 0,
              },
            });
            mapelResult.created++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
            mapelResult.errors.push(`${(row.nama as string) || '?'}: ${msg}`);
          }
        }
      }

      return {
        pesertaDidik: pesertaDidikResult,
        guru: guruResult,
        rombel: rombelResult,
        mataPelajaran: mapelResult,
      };
    });

    // ── 5. Return success ──
    const totalCreated =
      (results.pesertaDidik?.created ?? 0) +
      (results.guru?.created ?? 0) +
      (results.rombel?.created ?? 0) +
      (results.mataPelajaran?.created ?? 0);

    return NextResponse.json({
      success: true,
      message: `Impor berhasil! ${totalCreated} data baru ditambahkan.`,
      results,
      note: 'Password default: pandai123 — Segera minta pengguna untuk mengubah password setelah login pertama.',
    });
  } catch (error: unknown) {
    console.error('[Dapodik Import Error]', error);
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga.';
    return NextResponse.json(
      { error: `Gagal mengimpor data: ${msg}` },
      { status: 500 }
    );
  }
}
