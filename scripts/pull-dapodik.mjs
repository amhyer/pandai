#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  PANDAI — Tarik Data Dapodik
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Sama seperti tool Rapor Merdeka, tapi langsung sync ke PANDAI.
 *
 *  CARA PAKAI:
 *    1. Pastikan Dapodik Lokal berjalan (port 5774)
 *    2. Aktifkan Web Service di Dapodik
 *    3. Jalankan: node scripts/pull-dapodik.mjs
 *    4. Ikuti instruksi di layar
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';

// ═══════════════════════════════════════════════════════════════════
// CONFIG — sesuaikan dengan website PANDAI kamu
// ═══════════════════════════════════════════════════════════════════
const PANDAI_API = process.env.PANDAI_API || 'https://pandai-three.vercel.app';
const PANDAI_TOKEN = process.env.PANDAI_TOKEN || ''; // Isi dengan token login PANDAI
const DAPODIK_BASE = 'http://localhost:5774/WebService';

// ═══════════════════════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════════════════════
console.log('');
console.log('  *****************************************');
console.log('  *****************************************');
console.log('  *****  TARIK DATA DAPODIK  **************');
console.log('  **   https://pandai-three.vercel.app  ***');
console.log('  *****************************************');
console.log('  *****************************************');
console.log('');
console.log('  Tool ini akan mengambil data dari Dapodik Lokal');
console.log('  dan langsung menyinkronkannya ke website PANDAI.');
console.log('');

// ═══════════════════════════════════════════════════════════════════
// READLINE
// ═══════════════════════════════════════════════════════════════════
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ═══════════════════════════════════════════════════════════════════
// FETCH DAPODIK LOCAL
// ═══════════════════════════════════════════════════════════════════
async function fetchDapodik(ws, token, npsn, extraParams = {}) {
  const params = new URLSearchParams({
    ws,
    akses_token: token,
    npsn,
    ...extraParams,
  });
  const url = `${DAPODIK_BASE}/?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data?.rows ?? [];
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SYNC TO PANDAI API
// ═══════════════════════════════════════════════════════════════════
async function syncToPandai(schoolId, data, sessionToken) {
  const res = await fetch(`${PANDAI_API}/api/dapodik/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schoolId, data, sessionToken }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACT GRADE FROM CLASS NAME
// ═══════════════════════════════════════════════════════════════════
function extractGrade(name) {
  const num = /^(\d{1,2})/.exec(name);
  if (num) return parseInt(num[1], 10);
  const roman = /^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)/i.exec(name);
  if (roman) {
    const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
    return map[roman[1].toUpperCase()] || 7;
  }
  return 7;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  try {
    // ── Konfirmasi ──
    const konfirmasi = await ask('  Ketik Y atau y jika sudah memahami dan melanjutkan.\n  Ketik N atau n untuk membatalkan kemudian tekan Enter: ');
    if (konfirmasi.toLowerCase() !== 'y') {
      console.log('\n  Dibatalkan.\n');
      process.exit(0);
    }

    // ── Input NPSN ──
    const npsn = await ask('\n  Masukkan NPSN: ');
    if (!npsn || npsn.trim().length < 5) {
      console.log('\n  ❌ NPSN tidak valid.\n');
      process.exit(1);
    }

    // ── Input Token ──
    const token = await ask('  Masukkan Dapodik Lokal Webservice Key (Token): ');
    if (!token || token.trim().length < 5) {
      console.log('\n  ❌ Token tidak valid.\n');
      process.exit(1);
    }

    // ── Input School ID (PANDAI) ──
    let schoolId = process.env.PANDAI_SCHOOL_ID || '';
    if (!schoolId) {
      console.log('');
      console.log('  ── Cara mendapatkan School ID & Token PANDAI: ──');
      console.log('  1. Login ke website PANDAI di browser');
      console.log('  2. Buka Dashboard Admin Sekolah');
      console.log('  3. School ID ada di URL: .../dashboard?schoolId=XXXXX');
      console.log('  4. Token: buka browser → F12 → Console → ketik document.cookie');
      console.log('     atau: Application → Cookies → pandai_session → Value');
      console.log('');
      schoolId = await ask('  Masukkan School ID PANDAI: ');
    }

    // ── Input Auth Token (PANDAI) ──
    let authToken = PANDAI_TOKEN;
    if (!authToken) {
      authToken = await ask('  Masukkan Token Login PANDAI (pandai_session cookie): ');
    }

    console.log('');
    console.log('  ─────────────────────────────────────────────');
    console.log('  Menghubungkan ke Dapodik Lokal...');
    console.log('  ─────────────────────────────────────────────');

    // ── 1. Test Koneksi ──
    let sekolah;
    try {
      const rows = await fetchDapodik('getSekolah', token.trim(), npsn.trim());
      sekolah = rows[0];
      if (!sekolah) throw new Error('Data sekolah tidak ditemukan');
      console.log(`  ✅ Terhubung! Sekolah: ${sekolah.nama}`);
    } catch (err) {
      console.log(`\n  ❌ Gagal terhubung ke Dapodik Lokal.`);
      console.log(`     Detail: ${err.message}`);
      console.log(`\n     Pastikan:`);
      console.log(`     1. Aplikasi Dapodik sedang berjalan`);
      console.log(`     2. Web Service sudah diaktifkan (Pengaturan → Web Service → Aktif)`);
      console.log(`     3. Token sudah benar`);
      process.exit(1);
    }

    // ── 2. Tarik Data ──
    console.log('');
    console.log('  Menarik data dari Dapodik...');

    const [pesertaDidik, ptk, rombonganBelajar] = await Promise.all([
      fetchDapodik('getPesertaDidik', token.trim(), npsn.trim()).catch(() => []),
      fetchDapodik('getPTK', token.trim(), npsn.trim()).catch(() => []),
      fetchDapodik('getRombonganBelajar', token.trim(), npsn.trim()).catch(() => []),
    ]);

    console.log(`  📊 Peserta Didik  : ${pesertaDidik.length} data`);
    console.log(`  📊 Guru/PTK       : ${ptk.length} data`);
    console.log(`  📊 Rombel         : ${rombonganBelajar.length} data`);

    // ── 3. Kirim ke PANDAI ──
    console.log('');
    console.log('  Mengirim data ke PANDAI...');

    const syncData = {
      sekolah: sekolah ? {
        npsn: sekolah.npsn,
        nama: sekolah.nama,
        alamat_jalan: sekolah.alamat_jalan,
        kecamatan: sekolah.kecamatan,
        kabupaten_kota: sekolah.kabupaten_kota,
        propinsi: sekolah.propinsi,
        nomor_telepon: sekolah.nomor_telepon,
        email: sekolah.email,
        bentuk_pendidikan: sekolah.bentuk_pendidikan,
      } : undefined,
      pesertaDidik,
      ptk,
      rombonganBelajar,
    };

    try {
      const result = await syncToPandai(schoolId.trim(), syncData, authToken.trim());

      console.log('');
      console.log('  ═══════════════════════════════════════════════');
      console.log('  ✅ SINKRONISASI BERHASIL!');
      console.log('  ═══════════════════════════════════════════════');
      console.log('');
      console.log(`  ${result.message}`);
      console.log('');

      if (result.results) {
        const r = result.results;
        if (r.pesertaDidik) {
          console.log(`  Siswa    : ${r.pesertaDidik.created} dibuat, ${r.pesertaDidik.updated} diperbarui, ${r.pesertaDidik.skipped} dilewati`);
        }
        if (r.guru) {
          console.log(`  Guru     : ${r.guru.created} dibuat, ${r.guru.updated} diperbarui, ${r.guru.skipped} dilewati`);
        }
        if (r.rombel) {
          console.log(`  Kelas    : ${r.rombel.created} dibuat, ${r.rombel.updated} diperbarui, ${r.rombel.skipped} dilewati`);
        }
      }

      console.log('');
      console.log(`  🔗 Buka website PANDAI untuk melihat data:`);
      console.log(`     ${PANDAI_API}`);
      console.log('');

    } catch (err) {
      console.log(`\n  ❌ Gagal mengirim data ke PANDAI: ${err.message}`);
      console.log(`\n     Coba jalankan ulang dengan token yang benar.`);
    }

  } catch (err) {
    console.error(`\n  ❌ Error: ${err.message}`);
  } finally {
    rl.close();
  }
}

main();
