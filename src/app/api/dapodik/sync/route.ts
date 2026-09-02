import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/constants';
import { requireRole, verifySession, AuthError } from '@/lib/auth';
import { getSchoolFilter, requireSchoolScope } from '@/lib/scope';

// ═══════════════════════════════════════════════════════════════════════
// POST /api/dapodik/sync
//
// Menerima data dari Dapodik Lokal yang sudah di-fetch oleh frontend,
// lalu mapping & upsert ke model Prisma.
//
// Body: {
//   schoolId: string,
//   data: {
//     sekolah?: DapodikSekolah,
//     pesertaDidik?: DapodikPesertaDidik[],
//     ptk?: DapodikPtk[],
//     rombonganBelajar?: DapodikRombonganBelajar[],
//   }
// }
// ═══════════════════════════════════════════════════════════════════════

interface SyncData {
  sekolah?: {
    npsn?: string;
    nama?: string;
    alamat_jalan?: string;
    kecamatan?: string;
    kabupaten_kota?: string;
    propinsi?: string;
    nomor_telepon?: string;
    email?: string;
    kepala_sekolah_id?: string;
    bentuk_pendidikan?: string;
  };
  pesertaDidik?: Array<{
    peserta_didik_id?: string;
    nama?: string;
    nisn?: string;
    jenis_kelamin?: string;
    nomor_hp?: string;
    nomor_telepon_rumah?: string;
    email?: string;
    nik?: string;
    nama_ayah?: string;
    nama_ibu_kandung?: string;
    alamat_jalan?: string;
    rombongan_belajar_id?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
  }>;
  ptk?: Array<{
    ptk_id?: string;
    nama?: string;
    nip?: string;
    nuptk?: string;
    jenis_kelamin?: string;
    nomor_hp?: string;
    email?: string;
    nik?: string;
    jenis_ptk?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
  }>;
  rombonganBelajar?: Array<{
    rombongan_belajar_id?: string;
    nama?: string;
    tingkat_pendidikan_id?: string;
    ptk_id?: string;
    tahun_ajaran_id?: string;
    semester_id?: string;
  }>;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Extract grade from class name
// ═══════════════════════════════════════════════════════════════════════

function extractGrade(className: string): number {
  // "1A" → 1, "XII IPA" → 12, "VII B" → 7
  const numMatch = /^(\d{1,2})/.exec(className);
  if (numMatch) return parseInt(numMatch[1], 10);

  const romanMatch = /^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)/i.exec(className);
  if (romanMatch) {
    const map: Record<string, number> = {
      I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
      VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
    };
    return map[romanMatch[1].toUpperCase()] || 7;
  }
  return 7; // default
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Get academic year
// ═══════════════════════════════════════════════════════════════════════

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  // If before July, use previous year
  return now.getMonth() < 6 ? `${year - 1}/${year}` : `${year}/${year + 1}`;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, data, sessionToken } = body as { schoolId: string; data: SyncData; sessionToken?: string };

    // Auth: from cookie OR from sessionToken in body (for CLI script)
    let auth;
    if (sessionToken) {
      const payload = await verifySession(sessionToken);
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Token sesi tidak valid' }, { status: 401 });
      }
      auth = payload;
    } else {
      auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN_SCHOOL']);
    }

    if (!schoolId || !data) {
      return NextResponse.json(
        { success: false, message: 'schoolId dan data wajib diisi' },
        { status: 400 }
      );
    }

    // Enforce school scope
    const effectiveSchoolId = getSchoolFilter(auth) || schoolId;
    requireSchoolScope(auth, effectiveSchoolId);

    // Verify school exists
    const school = await db.school.findUnique({ where: { id: effectiveSchoolId } });
    if (!school) {
      return NextResponse.json(
        { success: false, message: 'Sekolah tidak ditemukan' },
        { status: 404 }
      );
    }

    const academicYear = getCurrentAcademicYear();
    const results: Record<string, SyncResult> = {};

    // ── 1. Update School info ──
    if (data.sekolah) {
      const s = data.sekolah;
      await db.school.update({
        where: { id: effectiveSchoolId },
        data: {
          npsn: s.npsn || school.npsn,
          name: s.nama || school.name,
          address: s.alamat_jalan || school.address,
          district: s.kecamatan || school.district,
          city: s.kabupaten_kota || school.city,
          province: s.propinsi || school.province,
          phone: s.nomor_telepon || school.phone,
          email: s.email || school.email,
          schoolType: s.bentuk_pendidikan || school.schoolType,
        },
      });
    }

    // ── 2. Sync Rombongan Belajar → Class ──
    const rombelResult: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    const rombelIdMap = new Map<string, string>(); // dapodik_id → prisma_id

    if (data.rombonganBelajar && data.rombonganBelajar.length > 0) {
      for (const rombel of data.rombonganBelajar) {
        try {
          const nama = rombel.nama?.trim();
          if (!nama) {
            rombelResult.skipped++;
            continue;
          }

          // Check if class already exists by name + school
          const existing = await db.class.findFirst({
            where: { name: nama, schoolId: effectiveSchoolId },
          });

          if (existing) {
            rombelIdMap.set(rombel.rombongan_belajar_id || nama, existing.id);
            rombelResult.updated++;
          } else {
            const grade = extractGrade(nama);
            const newClass = await db.class.create({
              data: {
                name: nama,
                grade,
                academicYear,
                schoolId: effectiveSchoolId,
              },
            });
            rombelIdMap.set(rombel.rombongan_belajar_id || nama, newClass.id);
            rombelResult.created++;
          }
        } catch (err) {
          rombelResult.errors.push(`Rombel "${rombel.nama}": ${(err as Error).message}`);
          rombelResult.skipped++;
        }
      }
    }
    results.rombel = rombelResult;

    // ── 3. Sync Peserta Didik → User (SISWA) ──
    const siswaResult: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    if (data.pesertaDidik && data.pesertaDidik.length > 0) {
      for (const pd of data.pesertaDidik) {
        try {
          const nisn = pd.nisn?.trim();
          const nama = pd.nama?.trim();

          if (!nisn || !nama) {
            siswaResult.skipped++;
            continue;
          }

          // Find class ID from rombel mapping
          let classId: string | undefined;
          if (pd.rombongan_belajar_id) {
            classId = rombelIdMap.get(pd.rombongan_belajar_id);
          }

          // Check if user already exists by nisn
          const existing = await db.user.findFirst({
            where: { nisn },
          });

          if (existing) {
            // Update existing user
            await db.user.update({
              where: { id: existing.id },
              data: {
                name: nama,
                jk: pd.jenis_kelamin === 'L' || pd.jenis_kelamin === 'P' ? pd.jenis_kelamin : existing.jk,
                phone: pd.nomor_hp || pd.nomor_telepon_rumah || existing.phone,
                email: pd.email || existing.email,
                nik: pd.nik || existing.nik,
                namaOrtu: pd.nama_ayah || pd.nama_ibu_kandung || existing.namaOrtu,
                classId: classId || existing.classId,
                isActive: true,
              },
            });
            siswaResult.updated++;
          } else {
            // Create new user
            const password = await hashPassword(nisn);
            await db.user.create({
              data: {
                username: nisn,
                password,
                name: nama,
                role: 'SISWA',
                schoolId: effectiveSchoolId,
                classId,
                nisn,
                jk: pd.jenis_kelamin === 'L' || pd.jenis_kelamin === 'P' ? pd.jenis_kelamin : undefined,
                phone: pd.nomor_hp || pd.nomor_telepon_rumah || undefined,
                email: pd.email || undefined,
                nik: pd.nik || undefined,
                namaOrtu: pd.nama_ayah || pd.nama_ibu_kandung || undefined,
                isActive: true,
                mustChangePassword: true,
              },
            });
            siswaResult.created++;
          }
        } catch (err) {
          siswaResult.errors.push(`Siswa "${pd.nama}": ${(err as Error).message}`);
          siswaResult.skipped++;
        }
      }
    }
    results.pesertaDidik = siswaResult;

    // ── 4. Sync PTK → User (GURU/KEPALA_SEKOLAH) ──
    const guruResult: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    if (data.ptk && data.ptk.length > 0) {
      for (const ptk of data.ptk) {
        try {
          const nama = ptk.nama?.trim();
          const nip = ptk.nip?.trim();

          if (!nama) {
            guruResult.skipped++;
            continue;
          }

          // Determine role based on jenis_ptk
          const jenisPtk = (ptk.jenis_ptk || '').toLowerCase();
          let role = 'GURU';
          if (jenisPtk.includes('kepala') || jenisPtk.includes('kepsek')) {
            role = 'KEPALA_SEKOLAH';
          }

          // Use NIP as username, fallback to NUPTK
          const username = nip || ptk.nuptk?.trim();
          if (!username) {
            guruResult.errors.push(`PTK "${nama}": Tidak ada NIP/NUPTK`);
            guruResult.skipped++;
            continue;
          }

          // Check if user already exists by nip or username
          const existing = nip
            ? await db.user.findFirst({ where: { nip } })
            : await db.user.findFirst({ where: { username } });

          if (existing) {
            // Update existing user
            await db.user.update({
              where: { id: existing.id },
              data: {
                name: nama,
                role,
                jk: ptk.jenis_kelamin === 'L' || ptk.jenis_kelamin === 'P' ? ptk.jenis_kelamin : existing.jk,
                phone: ptk.nomor_hp || existing.phone,
                email: ptk.email || existing.email,
                nik: ptk.nik || existing.nik,
                isActive: true,
              },
            });
            guruResult.updated++;
          } else {
            // Create new user
            const password = await hashPassword(username);
            await db.user.create({
              data: {
                username,
                password,
                name: nama,
                role,
                schoolId: effectiveSchoolId,
                nip: nip || undefined,
                nik: ptk.nik || undefined,
                jk: ptk.jenis_kelamin === 'L' || ptk.jenis_kelamin === 'P' ? ptk.jenis_kelamin : undefined,
                phone: ptk.nomor_hp || undefined,
                email: ptk.email || undefined,
                isActive: true,
                mustChangePassword: true,
              },
            });
            guruResult.created++;
          }
        } catch (err) {
          guruResult.errors.push(`PTK "${ptk.nama}": ${(err as Error).message}`);
          guruResult.skipped++;
        }
      }
    }
    results.guru = guruResult;

    // ── Build summary ──
    const totalCreated = Object.values(results).reduce((s, r) => s + r.created, 0);
    const totalUpdated = Object.values(results).reduce((s, r) => s + r.updated, 0);
    const totalSkipped = Object.values(results).reduce((s, r) => s + r.skipped, 0);
    const allErrors = Object.values(results).flatMap((r) => r.errors);

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai. ${totalCreated} dibuat, ${totalUpdated} diperbarui, ${totalSkipped} dilewati.`,
      results,
      summary: {
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error('[Dapodik Sync Error]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyinkronkan data Dapodik' },
      { status: 500 }
    );
  }
}
