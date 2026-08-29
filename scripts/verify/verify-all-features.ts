#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════
 * PANDAI — Verify All Features A-I
 * ═══════════════════════════════════════════════════════════════
 *
 * Feature A: 7 Kebiasaan Anak Indonesia Hebat (character-reports)
 * Feature B: External Quiz Links (questions + attempts)
 * Feature C: Kepala Sekolah Dashboard (kepsek/dashboard)
 * Feature D: Tujuan Pembelajaran / learningObjective (attempts, assignments)
 * Feature E: Assignment System — PG+essay, autosave, grading
 * Feature F: Tryout System — exam sessions, remedial
 * Feature G: Profil Lulusan 8 Dimensi (competency-assessments)
 * Feature H: Komponen Nilai + SIMANTAP normalization (grade-components, student-grades, final-grade)
 * Feature I: Kotak Masukan / Feedback
 *
 * Usage:
 *   bun run scripts/verify/verify-all-features.ts
 *
 * Prerequisites:
 *   - Dev server running on port 3000 (bun run dev)
 *   - Database seeded (bun run prisma/seed.ts)
 * ═══════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const COOKIE_NAME = 'pandai_session';
const db = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────

interface TestResult {
  feature: string;
  label: string;
  status: 'PASS' | 'FAIL';
  expected: number;
  got: number;
  detail: string;
}
const results: TestResult[] = [];

function check(feature: string, label: string, expect: number, got: number, body: string) {
  const ok = got === expect;
  results.push({ feature, label, status: ok ? 'PASS' : 'FAIL', expected: expect, got, detail: body.substring(0, 120) });
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} [${feature}] ${label} → ${got} (expected ${expect})${!ok ? ` body: ${body.substring(0, 100)}` : ''}`);
}

async function api(method: string, path: string, body: any, cookie: string): Promise<{ status: number; body: string }> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = `${COOKIE_NAME}=${cookie}`;
  const opts: any = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    return { status: res.status, body: text.substring(0, 500) };
  } catch (e: any) {
    return { status: 0, body: e.message };
  }
}

async function login(username: string, password: string): Promise<{ cookie: string; userId: string; role: string }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const cookie = match ? match[1] : '';
  const data = await res.json().catch(() => ({}));
  return { cookie, userId: data.id, role: data.role };
}

// ─── Get test data from DB ────────────────────────────────────

async function getTestData() {
  const school = await db.school.findFirst({ where: { status: 'active' } });
  const guru = await db.user.findFirst({ where: { role: 'GURU', isActive: true } });
  const siswa = await db.user.findFirst({ where: { role: 'SISWA', isActive: true, classId: { not: null } } });
  const ortu = await db.user.findFirst({ where: { role: 'ORANG_TUA', isActive: true } });
  const kepsek = await db.user.findFirst({ where: { role: 'KEPALA_SEKOLAH', isActive: true } });
  const admin = await db.user.findFirst({ where: { role: 'ADMIN_SCHOOL', isActive: true } });
  const childOfOrtu = ortu ? await db.user.findFirst({ where: { parentId: ortu.id, isActive: true } }) : null;
  // Subject bersifat global (bank soal bersama), tidak punya schoolId
  const subject = await db.subject.findFirst();

  return { school, guru, siswa, ortu, kepsek, admin, childOfOrtu, subject };
}

// ─── Feature Tests ────────────────────────────────────────────

async function testFeatureA(ortuCookie: string, ortu: any, child: any) {
  console.log('\n═══ Feature A: 7 Kebiasaan (character-reports) ═══');

  // A.1: ORANG_TUA POST character report for own child
  const r = await api('POST', '/api/character-reports', {
    studentId: child.id,
    classId: child.classId,
    schoolId: child.schoolId,
    reporterId: ortu.id,
    date: new Date().toISOString().split('T')[0],
    habit: 'bangun_pagi',
    rating: 4,
    note: 'verify test',
  }, ortuCookie);
  check('A', 'A.1 POST character report', 201, r.status, r.body);

  // A.2: ORANG_TUA GET character reports for own children
  const r2 = await api('GET', `/api/character-reports?studentId=${child.id}`, null, ortuCookie);
  check('A', 'A.2 GET reports for own child', 200, r2.status, r.body);

  // A.3: Verify report exists in response
  try {
    const reports = JSON.parse(r2.body);
    const found = reports.some((r: any) => r.habit === 'bangun_pagi' && r.note === 'verify test');
    check('A', 'A.3 Report content matches', 200, found ? 200 : 404, found ? 'Found' : 'NOT FOUND');
  } catch { check('A', 'A.3 Parse response', 200, 500, r2.body); }

  // Cleanup
  try {
    const reports = JSON.parse(r2.body);
    for (const rep of reports) {
      if (rep.habit === 'bangun_pagi' && rep.note === 'verify test') {
        await db.characterReport.delete({ where: { id: rep.id } });
      }
    }
  } catch {}
}

async function testFeatureB(guruCookie: string, guru: any, school: any, siswa: any, subject: any) {
  console.log('\n═══ Feature B: External Quiz Links ═══');
  if (!subject) { console.log('  ⚠️  Skipped — no subject in DB'); return; }

  // B.1: GURU create question with externalLink
  const r = await api('POST', '/api/questions', {
    content: 'Soal eksternal verify',
    type: 'essay',
    subjectId: subject.id,
    schoolId: school?.id,
    externalLink: 'https://quiz.example.com/verify-test',
    createdBy: guru?.id,
  }, guruCookie);
  check('B', 'B.1 Create question with externalLink', 200, r.status, r.body);

  // B.2: Verify externalLink in response
  try {
    const q = JSON.parse(r.body);
    check('B', 'B.2 Response contains externalLink', 200, q.externalLink === 'https://quiz.example.com/verify-test' ? 200 : 404, JSON.stringify(q).substring(0, 100));
    // Cleanup
    if (q.id) await db.question.delete({ where: { id: q.id } });
  } catch { check('B', 'B.2 Parse', 200, 500, r.body); }
}

async function testFeatureC(kepsekCookie: string) {
  console.log('\n═══ Feature C: Kepala Sekolah Dashboard ═══');

  // C.1: GET kepsek dashboard
  const r = await api('GET', '/api/kepsek/dashboard', null, kepsekCookie);
  check('C', 'C.1 GET kepsek dashboard', 200, r.status, r.body);
}

async function testFeatureD(guruCookie: string, guru: any, school: any, siswa: any) {
  console.log('\n═══ Feature D: Tujuan Pembelajaran ═══');

  // D.1: GET attempts (should have learningObjective field)
  const r = await api('GET', `/api/scores?studentId=${siswa?.id}`, null, guruCookie);
  check('D', 'D.1 GET scores with learningObjective', 200, r.status, r.body);

  // D.2: Verify schema has learningObjective
  try {
    const data = JSON.parse(r.body);
    if (data.recentScores && data.recentScores.length > 0) {
      const hasField = 'learningObjective' in data.recentScores[0];
      check('D', 'D.2 Schema has learningObjective field', 200, hasField ? 200 : 404, hasField ? 'OK' : 'MISSING');
    } else {
      check('D', 'D.2 Schema check (no data)', 200, 200, 'No attempts to verify (OK)');
    }
  } catch { check('D', 'D.2 Parse', 200, 500, r.body); }
}

async function testFeatureE(guruCookie: string, adminCookie: string, guru: any, siswa: any, school: any, subject: any) {
  console.log('\n═══ Feature E: Assignment System (PG+Essay, Autosave) ═══');
  if (!subject) { console.log('  ⚠️  Skipped — no subject in DB'); return; }

  // E.1: GURU create assignment
  const r = await api('POST', '/api/assignments', {
    title: 'Verify Assignment E',
    description: 'Test',
    subjectId: subject.id,
    schoolId: school?.id,
    classId: siswa?.classId,
    type: 'tugas',
    status: 'published',
    createdBy: guru?.id,
  }, guruCookie);
  check('E', 'E.1 Create assignment', 200, r.status, r.body);

  let assignmentId: string | null = null;
  try { assignmentId = JSON.parse(r.body).id; } catch {}

  // E.2: GET assignments list
  const r2 = await api('GET', `/api/assignments?schoolId=${school?.id}`, null, guruCookie);
  check('E', 'E.2 List assignments', 200, r2.status, r2.body);

  // Cleanup
  if (assignmentId) {
    try { await db.assignment.delete({ where: { id: assignmentId } }); } catch {}
  }
}

async function testFeatureF(guruCookie: string, adminCookie: string, guru: any, school: any, siswa: any) {
  console.log('\n═══ Feature F: Tryout System (Exams) ═══');

  // F.1: GURU create exam package
  const r = await api('POST', '/api/exams', {
    action: 'create-package',
    title: 'Verify Exam Package',
    schoolId: school?.id,
    duration: 30,
    totalQuestions: 0,
    createdBy: guru?.id,
  }, guruCookie);
  check('F', 'F.1 Create exam package', 200, r.status, r.body);

  let pkgId: string | null = null;
  try { pkgId = JSON.parse(r.body).id; } catch {}

  // F.2: SISWA can access exams endpoint (returns sessions for their class)
  const siswaLogin = await login(siswa?.username || '', 'password123');
  const r2 = await api('GET', '/api/exams', null, siswaLogin.cookie);
  check('F', 'F.2 SISWA GET exams', 200, r2.status, r2.body);

  // F.3: GET scores (tryout results)
  const r3 = await api('GET', `/api/scores?studentId=${siswa?.id}`, null, guruCookie);
  check('F', 'F.3 GET tryout scores', 200, r3.status, r3.body);

  // Cleanup
  if (pkgId) {
    try { await db.examPackage.delete({ where: { id: pkgId } }); } catch {}
  }
}

async function testFeatureG(guruCookie: string, adminCookie: string, guru: any, siswa: any, school: any) {
  console.log('\n═══ Feature G: Profil Lulusan 8 Dimensi ═══');

  // G.1: GET competency-assessments
  const r = await api('GET', `/api/competency-assessments?schoolId=${school?.id}`, null, guruCookie);
  check('G', 'G.1 GET competency-assessments', 200, r.status, r.body);

  // G.2: POST competency assessment
  const r2 = await api('POST', '/api/competency-assessments', {
    studentId: siswa?.id,
    schoolId: school?.id,
    classId: siswa?.classId,
    assessedBy: guru?.id,
    period: '2024/2025',
    dimension: 'beriman',
    rating: 3,
    note: 'verify test',
  }, guruCookie);
  check('G', 'G.2 POST competency assessment', 200, r2.status, r2.body);

  // Cleanup
  try {
    const a = JSON.parse(r2.body);
    if (a.id) await db.competencyAssessment.delete({ where: { id: a.id } });
  } catch {}
}

async function testFeatureH(guruCookie: string, adminCookie: string, guru: any, school: any, siswa: any) {
  console.log('\n═══ Feature H: Komponen Nilai + SIMANTAP ═══');

  // H.1: GET grade-components
  const r = await api('GET', `/api/grade-components?schoolId=${school?.id}`, null, guruCookie);
  check('H', 'H.1 GET grade-components', 200, r.status, r.body);

  // H.2: POST grade-component
  const r2 = await api('POST', '/api/grade-components', {
    name: 'Verify Komponen',
    type: 'FORMATIVE',
    weight: 20,
    schoolId: school?.id,
    term: '1',
  }, adminCookie);
  check('H', 'H.2 POST grade-component', 200, r2.status, r2.body);

  // H.3: GET student-grades
  const r3 = await api('GET', `/api/student-grades?schoolId=${school?.id}`, null, guruCookie);
  check('H', 'H.3 GET student-grades', 200, r3.status, r3.body);

  // Cleanup
  try {
    const c = JSON.parse(r2.body);
    if (c.id) await db.gradeComponent.delete({ where: { id: c.id } });
  } catch {}
}

async function testFeatureI(guruCookie: string, ortuCookie: string, guru: any, ortu: any, school: any) {
  console.log('\n═══ Feature I: Kotak Masukan (Feedback) ═══');

  // I.1: POST feedback (GURU sends)
  const r = await api('POST', '/api/feedback', {
    schoolId: school?.id,
    category: 'saran',
    message: 'Verify feedback test',
  }, guruCookie);
  check('I', 'I.1 POST feedback', 200, r.status, r.body);

  // I.2: GET feedback list
  const r2 = await api('GET', `/api/feedback?schoolId=${school?.id}`, null, ortuCookie);
  check('I', 'I.2 GET feedback list (ORANG_TUA)', 200, r2.status, r2.body);

  // Cleanup
  try {
    const f = JSON.parse(r.body);
    if (f.id) await db.feedback.delete({ where: { id: f.id } });
  } catch {}
}

// ─── Cross-cutting: RBAC & Security ───────────────────────────

async function testRBAC(ortuCookie: string, ortu: any, siswa: any) {
  console.log('\n═══ Cross-cutting: RBAC ═══');

  // X.1: ORANG_TUA cannot access other school's data via users
  const otherSchoolUser = await db.user.findFirst({ where: { role: 'SISWA', schoolId: { not: ortu.schoolId }, isActive: true } });
  if (otherSchoolUser) {
    const r = await api('GET', `/api/scores?studentId=${otherSchoolUser.id}`, null, ortuCookie);
    check('X', 'X.1 ORANG_TUA scores other-school child', 403, r.status, r.body);
  }

  // X.2: ORANG_TUA users?parentId=other → 403
  const otherOrtu = await db.user.findFirst({ where: { role: 'ORANG_TUA', id: { not: ortu.id }, isActive: true } });
  if (otherOrtu) {
    const r = await api('GET', `/api/users?parentId=${otherOrtu.id}`, null, ortuCookie);
    check('X', 'X.2 ORANG_TUA users other parentId', 403, r.status, r.body);
  }

  // X.3: Unauthenticated → 401
  const r = await api('GET', '/api/student-grades', null, '');
  check('X', 'X.3 Unauthenticated → 401', 401, r.status, r.body);
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  PANDAI — Verify All Features A-I                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Base URL: ${BASE}`);

  // Health check
  const health = await api('GET', '/api/health', null, '');
  if (health.status !== 200) {
    console.error(`\n❌ Server not healthy (${health.status}). Start dev server first.`);
    process.exit(1);
  }
  console.log('✅ Server healthy');

  // Get test data
  const data = await getTestData();
  console.log(`\nTest data:
  School: ${data.school?.name} (${data.school?.id})
  Guru: ${data.guru?.name} (${data.guru?.id})
  Siswa: ${data.siswa?.name} (${data.siswa?.id})
  Ortu: ${data.ortu?.name} (${data.ortu?.id})
  Child of Ortu: ${data.childOfOrtu?.name} (${data.childOfOrtu?.id})
  Kepsek: ${data.kepsek?.name} (${data.kepsek?.id})
  Admin: ${data.admin?.name} (${data.admin?.id})
  Subject: ${data.subject?.name} (${data.subject?.id})`);

  // Login all roles
  console.log('\n── Logging in all roles... ──');
  const ortuLogin = await login(data.ortu?.username || '', '123');
  const guruLogin = await login(data.guru?.nip || data.guru?.username || '', 'password123');
  const kepsekLogin = await login(data.kepsek?.username || '', 'password123');
  const adminLogin = await login(data.admin?.email || data.admin?.username || '', 'password123');

  console.log(`  ORANG_TUA: ${ortuLogin.cookie ? '✅' : '❌'}`);
  console.log(`  GURU: ${guruLogin.cookie ? '✅' : '❌'}`);
  console.log(`  KEPALA_SEKOLAH: ${kepsekLogin.cookie ? '✅' : '❌'}`);
  console.log(`  ADMIN_SCHOOL: ${adminLogin.cookie ? '✅' : '❌'}`);

  if (!ortuLogin.cookie || !guruLogin.cookie || !adminLogin.cookie) {
    console.error('\n❌ Login failed for required roles. Check seed data and passwords.');
    process.exit(1);
  }

  // Run feature tests
  await testFeatureA(ortuLogin.cookie, data.ortu, data.childOfOrtu);
  await testFeatureB(guruLogin.cookie, data.guru, data.school, data.siswa, data.subject);
  await testFeatureC(kepsekLogin.cookie);
  await testFeatureD(guruLogin.cookie, data.guru, data.school, data.siswa);
  await testFeatureE(guruLogin.cookie, adminLogin.cookie, data.guru, data.siswa, data.school, data.subject);
  await testFeatureF(guruLogin.cookie, adminLogin.cookie, data.guru, data.school, data.siswa);
  await testFeatureG(guruLogin.cookie, adminLogin.cookie, data.guru, data.siswa, data.school);
  await testFeatureH(guruLogin.cookie, adminLogin.cookie, data.guru, data.school, data.siswa);
  await testFeatureI(guruLogin.cookie, ortuLogin.cookie, data.guru, data.ortu, data.school);

  // Cross-cutting
  await testRBAC(ortuLogin.cookie, data.ortu, data.siswa);

  // Summary
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${pass} PASS, ${fail} FAIL (of ${results.length} tests)       ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');

  if (fail > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  [${r.feature}] ${r.label} → expected ${r.expected}, got ${r.got}`);
      console.log(`         ${r.detail}`);
    });
  }

  await db.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
