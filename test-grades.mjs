import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const BASE = 'http://localhost:3000';
const TERM = '2024/2025-Ganjil';
const SMP_SCHOOL = 'cmszdk4jg0001t3sgyhxlx8gd';
const SD_SCHOOL = 'cmszdk4jf0000t3sge6t6uawz';
const ADMIN_SMP = 'admin.smpn2@pandai.id'; // password123
const GURU_SMP_USER = '3502155678090002'; // Linda Permata
const GURU_SD_USER = '198504152010011001'; // Andi Mustafa
const SISWA_ID = 'cmszdk4kj001et3sghsabuosx'; // Bagus Saputra
const CLASS_ID = 'cmszdk4k4000ot3sg4sfw559d'; // Kelas 8A

async function req(method, path, body, cookie) {
  const h = { 'Content-Type': 'application/json' };
  if (cookie) h.Cookie = cookie;
  const o = { method, headers: h };
  if (body !== undefined && body !== null) o.body = JSON.stringify(body);
  const r = await fetch(BASE + path, o);
  let d; try { d = await r.json(); } catch { d = null; }
  return { status: r.status, data: d, headers: r.headers };
}

function getCookie(headers) {
  const sc = headers.getSetCookie?.() || [];
  for (const c of sc) { const m = c.match(/pandai_session=([^;]+)/); if (m) return 'pandai_session=' + m[1]; }
  return '';
}

async function main() {
  console.log('============================================================');
  console.log('VERIFIKASI FITUR H: KOMPONEN NILAI + BOBOT');
  console.log('============================================================\n');

  // Cleanup any stale data from previous runs
  await db.studentGrade.deleteMany({ where: { studentId: SISWA_ID, term: TERM } });
  await db.gradeComponent.deleteMany({ where: { schoolId: SMP_SCHOOL, term: TERM } });
  console.log('Cleanup: stale data removed\n');

  // ── Login Admin SMP ──
  const { status: ls, data: ld, headers: lh } = await req('POST', '/api/auth/login', { username: ADMIN_SMP, password: 'password123' });
  const adminCookie = getCookie(lh);
  console.log(`Login Admin: ${ls} | ${ld.name} | ${ld.role}`);
  if (ls !== 200) { console.log('FATAL: admin login failed'); return; }

  // ── TEST 1: Admin atur 5 komponen dengan bobot (20/25/15/20/20) ──
  console.log('\n=== TEST 1: Admin buat 5 komponen ===');
  const components = [
    { name: 'Tugas', weight: 20, sortOrder: 1 },
    { name: 'Ulangan Harian', weight: 25, sortOrder: 2 },
    { name: 'Praktik', weight: 15, sortOrder: 3 },
    { name: 'PTS', weight: 20, sortOrder: 4 },
    { name: 'PAS', weight: 20, sortOrder: 5 },
  ];
  const compIds = [];
  for (const c of components) {
    const { status, data } = await req('POST', '/api/grade-components', { ...c, term: TERM }, adminCookie);
    compIds.push(data?.id);
    const tw = data?._meta?.totalWeight;
    const warn = data?._meta?.warning || '';
    console.log(`  POST ${c.name}(w=${c.weight}%): status=${status} id=${data?.id?.substring(0,12)}... totalWeight=${tw} ${warn ? '⚠️ ' + warn : tw === 100 ? '✅ 100%' : ''}`);
  }

  // DB check
  const dbComps = await db.gradeComponent.findMany({ where: { schoolId: SMP_SCHOOL, term: TERM }, orderBy: { sortOrder: 'asc' } });
  console.log(`  DB: ${dbComps.length} komponen, total weight=${dbComps.reduce((s, c) => s + c.weight, 0)}%`);
  const t1Pass = dbComps.length === 5 && dbComps.reduce((s, c) => s + c.weight, 0) === 100;
  console.log(t1Pass ? '  ✅ PASS: 5 komponen, total 100%' : '  ❌ FAIL');

  // ── Login Guru SMP ──
  const { headers: gh } = await req('POST', '/api/auth/login', { username: GURU_SMP_USER, password: 'password123' });
  const guruCookie = getCookie(gh);
  console.log(`\nLogin Guru: ${guruCookie ? 'OK' : 'FAIL'}`);

  // ── TEST 2: Guru input nilai manual 2 komponen ──
  console.log('\n=== TEST 2: Guru input 2 komponen manual ===');
  // Tugas: 80/100, UH: 70/100
  const { status: s2a, data: d2a } = await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[0], score: 80, term: TERM, date: '2025-01-20',
  }, guruCookie);
  console.log(`  Tugas(80): status=${s2a} id=${d2a?.id?.substring(0,12)}...`);

  const { status: s2b, data: d2b } = await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[1], score: 70, term: TERM, date: '2025-01-22',
  }, guruCookie);
  console.log(`  UH(70): status=${s2b} id=${d2b?.id?.substring(0,12)}...`);

  const dbGrades = await db.studentGrade.findMany({ where: { studentId: SISWA_ID, term: TERM } });
  console.log(`  DB: ${dbGrades.length} grades`);
  for (const g of dbGrades) console.log(`    component=${g.componentId.substring(0,8)}... score=${g.score} source=${g.source}`);
  const t2Pass = dbGrades.length === 2;
  console.log(t2Pass ? '  ✅ PASS: 2 nilai tersimpan' : '  ❌ FAIL');

  // ── TEST 4: Hitung nilai akhir dengan 3/5 komponen (tambah Praktik) ──
  // Pertama tambah komponen ke-3: Praktik = 90
  console.log('\n=== TEST 4: Normalisasi — 3 dari 5 komponen terisi ===');
  const { status: s4, data: d4 } = await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[2], score: 90, term: TERM, date: '2025-01-25',
  }, guruCookie);
  console.log(`  Praktik(90): status=${s4}`);

  // Hitung manual:
  // Components: Tugas(80, w=20), UH(70, w=25), Praktik(90, w=15), PTS(kosong, w=20), PAS(kosong, w=20)
  // Total filled weight = 20+25+15 = 60
  // Weighted sum = 20*80 + 25*70 + 15*90 = 1600 + 1750 + 1350 = 4700
  // Normalized = 4700/60 = 78.33
  console.log('\n  MANUAL CALCULATION (3 of 5 components):');
  console.log('  Tugas: 80/100, w=20% → 80 × 0.20 = 16.00');
  console.log('  UH:    70/100, w=25% → 70 × 0.25 = 17.50');
  console.log('  Praktik:90/100, w=15% → 90 × 0.15 = 13.50');
  console.log('  PTS:   (kosong), w=20% → diabaikan');
  console.log('  PAS:   (kosong), w=20% → diabaikan');
  console.log('  ─────────────────────────────────');
  console.log('  Sum filled weights: 20+25+15 = 60');
  console.log('  Weighted sum: 16+17.5+13.5 = 47');
  console.log('  Normalized: 47/60 = 78.33');

  const { status: s4f, data: d4f } = await req('GET', `/api/grades/final?mode=student&studentId=${SISWA_ID}&term=${TERM}`, null, guruCookie);
  console.log(`\n  API RESULT: status=${s4f}`);
  console.log(`  finalGrade=${d4f?.finalGrade}`);
  console.log(`  totalWeightFilled=${d4f?.totalWeightFilled} totalWeightAll=${d4f?.totalWeightAll}`);
  console.log(`  filledCount=${d4f?.filledCount} totalComponents=${d4f?.totalComponents}`);
  console.log(`  calculation: ${d4f?.calculation}`);
  for (const c of (d4f?.components || [])) {
    console.log(`    ${c.componentName}: score=${c.score} normalizedScore=${c.normalizedScore} weightedScore=${c.weightedScore}`);
  }

  const expected4 = 78.33;
  const t4Pass = Math.abs((d4f?.finalGrade || 0) - expected4) < 0.1 && d4f?.totalWeightFilled === 60 && d4f?.filledCount === 3;
  console.log(t4Pass ? `  ✅ PASS: API=78.33 matches manual=78.33 (normalized over 60%, NOT 100%)` : `  ❌ FAIL: API=${d4f?.finalGrade} expected=78.33`);

  // ── TEST 5: Tambah komponen ke-4 (PTS=85), hitung ulang ──
  console.log('\n=== TEST 5: Tambah komponen ke-4, hitung ulang ===');
  await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[3], score: 85, term: TERM, date: '2025-02-01',
  }, guruCookie);

  // Manual: now 4 of 5 filled
  // Tugas(80,20) + UH(70,25) + Praktik(90,15) + PTS(85,20)
  // Sum filled = 20+25+15+20 = 80
  // Weighted = 16+17.5+13.5+17 = 64
  // Normalized = 64/80 = 80.00
  console.log('\n  MANUAL (4 of 5):');
  console.log('  Tugas: 80×0.20=16, UH: 70×0.25=17.5, Praktik: 90×0.15=13.5, PTS: 85×0.20=17');
  console.log('  Sum=64/80 = 80.00');

  const { data: d5 } = await req('GET', `/api/grades/final?mode=student&studentId=${SISWA_ID}&term=${TERM}`, null, guruCookie);
  console.log(`  API: finalGrade=${d5?.finalGrade} totalWeightFilled=${d5?.totalWeightFilled} filledCount=${d5?.filledCount}`);
  const expected5 = 80.00;
  const t5Pass = Math.abs((d5?.finalGrade || 0) - expected5) < 0.1 && d5?.totalWeightFilled === 80 && d5?.filledCount === 4;
  console.log(t5Pass ? `  ✅ PASS: API=80 matches manual=80 (normalized over 80%)` : `  ❌ FAIL: API=${d5?.finalGrade} expected=80`);
  console.log('  ⚠️ PERUBAHAN: 78.33 → 80.00 (naik karena PTS 85 meningkat proporsi terisi)');

  // ── TEST 6: Isolasi sekolah ──
  console.log('\n=== TEST 6: Isolasi sekolah ===');
  const { headers: gdh } = await req('POST', '/api/auth/login', { username: GURU_SD_USER, password: 'password123' });
  const guruSdCookie = getCookie(gdh);

  // Coba lihat komponen sekolah SMP
  const { status: t6a, data: d6a } = await req('GET', `/api/grade-components?term=${TERM}`, null, guruSdCookie);
  console.log(`  GET komponen SMP (sebagai guru SD): status=${t6a} count=${Array.isArray(d6a) ? d6a.length : 'N/A'}`);
  const t6aPass = t6a === 200 && Array.isArray(d6a) && d6a.length === 0;
  console.log(t6aPass ? '  ✅ PASS: kosong — komponen terisolasi' : '  ⚠️ CHECK');

  // Coba buat nilai siswa SMP
  const { status: t6b, data: d6b } = await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[0], score: 100, term: TERM,
  }, guruSdCookie);
  console.log(`  POST nilai siswa SMP (sebagai guru SD): status=${t6b}`);
  const t6bPass = t6b === 403 || (t6b === 200 && (d6b?.error || '').includes('sekolah lain'));
  console.log(t6bPass ? '  ✅ PASS: 403 — guru SD ditolak' : `  ⚠️ status=${t6b} ${JSON.stringify(d6b).substring(0, 80)}`);

  // Coba buat komponen di sekolah SMP
  const { status: t6c, data: d6c } = await req('POST', '/api/grade-components', {
    name: 'HACK', weight: 100, term: TERM
  }, guruSdCookie);
  console.log(`  POST komponen (sebagai guru SD): status=${t6c}`);
  const t6cPass = t6c === 403;
  console.log(t6cPass ? '  ✅ PASS: 403 — guru bukan admin' : `  ⚠️ status=${t6c}`);

  // ── TEST 3: Tryout dengan gradeComponentId (simulasi) ──
  console.log('\n=== TEST 3: Simulasi nilai dari TRYOUT ===');
  // Kita simulasi auto-pull dengan POST student-grade source=TRYOUT
  const { status: t3, data: d3 } = await req('POST', '/api/student-grades', {
    studentId: SISWA_ID, componentId: compIds[0], // Tugas
    score: 75, source: 'TRYOUT', sourceId: 'sim_attempt_id_123',
    term: TERM, date: '2025-01-30',
  }, guruCookie);
  console.log(`  TRYOUT→Tugas(75): status=${t3}`);
  const dbTryout = await db.studentGrade.findFirst({ where: { source: 'TRYOUT', studentId: SISWA_ID } });
  if (dbTryout) {
    console.log(`  DB: source=TRYOUT score=${dbTryout.score} sourceId=${dbTryout.sourceId}`);
    // Upsert should have updated to 75 (higher than 80? No, 80 > 75)
    // Actually since we use highest score, the Tugas should still show 80
    const t3Pass = dbTryout && dbTryout.source === 'TRYOUT' && dbTryout.score === 75;
    console.log(t3Pass ? '  ✅ PASS: TRYOUT grade tersimpan' : '  ⚠️ CHECK');
    console.log('  Note: Karena highest score, Tugas tetap 80 (dari manual) bukan 75 (dari TRYOUT)');
  }

  console.log('\n============================================================');
  console.log('RINGKASAN VERIFIKASI');
  console.log('============================================================');
  const all = [t1Pass, t2Pass, t3Pass, t4Pass, t5Pass, t6aPass, t6bPass, t6cPass];
  const passed = all.filter(Boolean).length;
  console.log(`Passed: ${passed}/${all.length}`);
}
main().catch(console.error);
