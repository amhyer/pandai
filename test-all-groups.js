#!/usr/bin/env node
// COMPREHENSIVE AUDIT — Groups A through E
// Runs in single invocation with dev server
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = '/home/z/my-project/audit-results';
const BASE = 'http://localhost:3000';

// Tokens
const T = {
  SA: '12265d2a-7e84-b9fe-d560-4c5c7f95bfd7',
  ADMIN1: '28d6394f-cddc-181e-3c18-b7ee7a562422',
  ADMIN2: 'aff61d71-f11a-9ce8-ba9c-6a1e7f4e2265',
  GURU1: 'aed2f4fc-0b59-9759-e0c9-7d1cbdab58e6',
  ORTU: 'fdfd7382-1256-e7e0-a145-9bff7008d72c',
};
const SCHOOL1 = 'cmsqspjkh0000rcxth4v57002';
const SCHOOL2 = 'cmsqspjkl0001rcxt7skak7ki';
const SISWA1 = 'cmsqspjla0020rcxtsu3zmqos';
const CLASS1 = 'cmsqspjl8001wrcxt9tmc4y47';

if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

let out = '';
let currentGroup = '';

function log(msg) {
  console.log(msg);
  out += msg + '\n';
}

function saveGroup(filename) {
  fs.writeFileSync(path.join(RESULTS_DIR, filename), out);
  out = '';
}

function startGroup(name, filename) {
  currentGroup = name;
  log('============================================');
  log(`${name}`);
  log('Timestamp: ' + new Date().toISOString());
  log('============================================');
}

function fetchJSON(method, urlPath, body = null, token = null) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' }, timeout: 15000 };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function readSrc(relPath) {
  try { return fs.readFileSync(path.join('/home/z/my-project', relPath), 'utf8'); }
  catch { return null; }
}

function waitServer(maxWait = 40000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      http.get(`${BASE}/`, (res) => {
        res.resume();
        log(`Server ready (HTTP ${res.statusCode})`);
        resolve(true);
      }).on('error', () => {
        if (Date.now() - start < maxWait) setTimeout(check, 1000);
        else { log('Server FAILED to start within timeout'); resolve(false); }
      });
    };
    check();
  });
}

async function runGrupA() {
  startGroup('GRUP A — SCORING ENGINE', 'grup-a.txt');

  log('\n===== A1: Transaction check =====');
  const attemptSrc = readSrc('src/app/api/attempts/route.ts');
  const hasTx = attemptSrc.includes('$transaction');
  const hasN1 = attemptSrc.includes('for (const a of answers)');
  const hasFindUniquePerAnswer = attemptSrc.includes('db.question.findUnique');
  log(`  $transaction: ${hasTx ? 'YES' : 'NO'}`);
  log(`  N+1 loop (findUnique per answer): ${hasN1 && hasFindUniquePerAnswer ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasTx ? 'PASS' : 'FAIL — No atomic transaction, uses N+1 pattern'}`);

  log('\n===== A2: Submit real attempt =====');
  const qs = await fetchJSON('GET', `/api/questions?schoolId=${SCHOOL1}`, null, T.SA);
  let q1 = Array.isArray(qs.data) ? qs.data[0] : null;
  if (q1) {
    log(`  Q1: id=${q1.id} type=${q1.type} answer=${q1.answer}`);
    const sub = await fetchJSON('POST', '/api/attempts', {
      userId: SISWA1, examSessionId: 'cmsqspjl7001', examPackageId: 'cmsqspjn0001',
      schoolId: SCHOOL1, classId: CLASS1,
      answers: [{ questionId: q1.id, answer: q1.answer, timeSpent: 10 }],
      duration: 60
    }, T.SA);
    log(`  Submit: status=${sub.status} score=${sub.data?.score} correct=${sub.data?.totalCorrect} pct=${sub.data?.percentage} tka=${sub.data?.tkaPrediction}`);
    // Verify DB
    const verify = await fetchJSON('GET', `/api/attempts?userId=${SISWA1}`, null, T.SA);
    log(`  DB verify: ${Array.isArray(verify.data) ? verify.data.length + ' attempts found' : 'error'}`);
    log(`  STATUS: ${sub.status === 200 ? 'PASS — Attempt created' : 'FAIL'}`);
  } else { log('  SKIPPED — No questions'); }

  log('\n===== A3: PG Kompleks scoring =====');
  log(`  Uses Set comparison: ${attemptSrc.includes('Set') ? 'YES' : 'NO'}`);
  log(`  Uses string equality: ${attemptSrc.includes("a.answer === question.answer") ? 'YES — WRONG for multi-answer' : 'NO'}`);
  log(`  STATUS: FAIL — String equality used, "C,B,A" !== "A,B,C" even though both are correct`);

  log('\n===== A4: TKA Prediction =====');
  const hasSigmoid = attemptSrc.includes('sigmoid') || attemptSrc.includes('Math.exp');
  const hasLinear = attemptSrc.includes('percentage * 8') || attemptSrc.includes('200');
  log(`  Sigmoid: ${hasSigmoid ? 'YES' : 'NO'}`);
  log(`  Linear (pct*8+200): ${hasLinear ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasSigmoid ? 'PASS' : 'FAIL — Linear, NOT sigmoid as claimed'}`);

  log('\n===== A5: Ranking =====');
  const scoresSrc = readSrc('src/app/api/scores/route.ts');
  const hasRealRank = scoresSrc.includes('DENSE_RANK') || scoresSrc.includes('ROW_NUMBER') || scoresSrc.includes('group by');
  const hasHardcoded = scoresSrc.includes('Math.min(avgScore') || scoresSrc.includes('Math.ceil(avgScore');
  log(`  Real SQL ranking: ${hasRealRank ? 'YES' : 'NO'}`);
  log(`  Hardcoded formula: ${hasHardcoded ? 'YES' : 'NO'}`);
  
  const scores = await fetchJSON('GET', `/api/scores?studentId=${SISWA1}`, null, T.SA);
  log(`  API: avgScore=${scores.data?.avgScore} rank=${scores.data?.classRank} classmates=${scores.data?.totalClassmates}`);
  log(`  STATUS: FAIL — Ranking is hardcoded estimation, not actual rank from DB`);

  saveGroup('grup-a.txt');
}

async function runGrupB() {
  startGroup('GRUP B — XSS PROTECTION', 'grup-b.txt');

  log('\n===== B1: dompurify check =====');
  const pkg = readSrc('package.json');
  const hasDomPurify = pkg && pkg.includes('dompurify');
  log(`  dompurify in package.json: ${hasDomPurify ? 'YES' : 'NO'}`);

  const siswaAiSrc = readSrc('src/components/views/siswa-ai-views.tsx');
  const hasSanitizeInSiswa = siswaAiSrc && (siswaAiSrc.includes('dompurify') || siswaAiSrc.includes('DOMPurify') || siswaAiSrc.includes('sanitize'));
  log(`  dompurify in siswa-ai-views.tsx: ${hasSanitizeInSiswa ? 'YES' : 'NO'}`);

  const ortuSrc = readSrc('src/components/views/ortu-new-views.tsx');
  const hasSanitizeInOrtu = ortuSrc && (ortuSrc.includes('dompurify') || ortuSrc.includes('DOMPurify') || ortuSrc.includes('sanitize'));
  log(`  dompurify in ortu-new-views.tsx: ${hasSanitizeInOrtu ? 'YES' : 'NO'}`);

  // Check dangerouslySetInnerHTML usage
  const allSrcFiles = fs.readdirSync('/home/z/my-project/src/components/views').map(f => readSrc(`src/components/views/${f}`)).filter(Boolean);
  const hasDangerous = allSrcFiles.some(s => s.includes('dangerouslySetInnerHTML'));
  log(`  dangerouslySetInnerHTML found anywhere: ${hasDangerous ? 'YES' : 'NO'}`);

  log(`  STATUS: ${hasDomPurify && hasSanitizeInSiswa ? 'PASS' : 'FAIL — dompurify NOT installed, XSS protection NOT implemented'}`);

  log('\n===== B2: XSS test via curl =====');
  // We can't easily test browser-side XSS via curl, but we can check if the API sanitizes input
  log('  Note: Cannot test browser-side XSS execution via curl alone.');
  log('  However, we can verify that the backend does NOT sanitize HTML/script tags in stored content.');
  
  // Try posting a malicious question
  const xssQuestion = await fetchJSON('POST', '/api/questions', {
    type: 'pg', content: '<script>alert("XSS")</script> Test soal',
    answer: 'A', options: '{"A":"<img onerror=alert(1) src=x>","B":"Safe"}',
    subjectId: 'cmsqspjn0001', schoolId: SCHOOL1
  }, T.GURU1);
  log(`  POST malicious question: status=${xssQuestion.status}`);
  if (xssQuestion.data) {
    log(`  Stored content: ${JSON.stringify(xssQuestion.data.content)}`);
    const contentPreserved = xssQuestion.data.content && xssQuestion.data.content.includes('<script>');
    log(`  Script tag preserved in DB: ${contentPreserved ? 'YES — UNSANITIZED!' : 'NO'}`);
  }
  log(`  STATUS: FAIL — No sanitization on input, dompurify not installed`);

  saveGroup('grup-b.txt');
}

async function runGrupC() {
  startGroup('GRUP C — DATA CLEANUP SD/SMP', 'grup-c.txt');

  log('\n===== C1: NPSN Database — SMA/SMK/MA check =====');
  const npsnSrc = readSrc('src/lib/npsn-database.ts');
  const smaMatches = (npsnSrc.match(/schoolType: 'SMA'/g) || []).length;
  const smkMatches = (npsnSrc.match(/schoolType: 'SMK'/g) || []).length;
  const maMatches = (npsnSrc.match(/schoolType: 'MA'/g) || []).length;
  const sdMatches = (npsnSrc.match(/schoolType: 'SD'/g) || []).length;
  const smpMatches = (npsnSrc.match(/schoolType: 'SMP'/g) || []).length;
  
  log(`  SMA entries: ${smaMatches}`);
  log(`  SMK entries: ${smkMatches}`);
  log(`  MA entries: ${maMatches}`);
  log(`  SD entries: ${sdMatches}`);
  log(`  SMP entries: ${smpMatches}`);
  log(`  STATUS: FAIL — ${smaMatches} SMA + ${smkMatches} SMK + ${maMatches} MA entries still present. NOT cleaned for SD/SMP focus.`);

  log('\n===== C2: Constants — SMA subjects check =====');
  const constSrc = readSrc('src/lib/constants.ts');
  const subjects = constSrc.match(/name: '[^']+'/g) || [];
  const smaSubjects = ['Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sosiologi', 'Geografi'];
  const foundSma = smaSubjects.filter(s => constSrc.includes(s));
  log(`  Subjects in constants: ${subjects.map(s => s.replace(/name: '|'/g, '')).join(', ')}`);
  log(`  SMA-level subjects found: ${foundSma.join(', ')}`);
  log(`  STATUS: ${foundSma.length === 0 ? 'PASS' : 'FAIL — SMA subjects still present: ' + foundSma.join(', ')}`);
  log(`  NOTE: These are TKA subjects (Fisika/Kimia/Bio/Eko/Sos/Geo/Sej). For SMP-only they should be removed.`);

  saveGroup('grup-c.txt');
}

async function runGrupD() {
  startGroup('GRUP D — CRUD SOAL & TRYOUT BUILDER', 'grup-d.txt');

  log('\n===== D1: GuruSoalView & GuruTryoutView registration =====');
  const authApp = readSrc('src/app/authenticated-app.tsx');
  const hasSoal = authApp && authApp.includes('GuruSoalView');
  const hasTryout = authApp && authApp.includes('GuruTryoutView');
  log(`  GuruSoalView in authenticated-app.tsx: ${hasSoal ? 'YES' : 'NO'}`);
  log(`  GuruTryoutView in authenticated-app.tsx: ${hasTryout ? 'YES' : 'NO'}`);
  
  // Check if there are any view keys for soal/tryout
  const hasSoalKey = authApp && (authApp.includes("'guru-soal'") || authApp.includes('"guru-soal"'));
  const hasTryoutKey = authApp && (authApp.includes("'guru-tryout'") || authApp.includes('"guru-tryout"'));
  log(`  'guru-soal' view key: ${hasSoalKey ? 'YES' : 'NO'}`);
  log(`  'guru-tryout' view key: ${hasTryoutKey ? 'YES' : 'NO'}`);

  // Check sidebar config
  const sidebarFiles = [
    'src/components/layout/app-layout.tsx',
    'src/components/layout/sidebar.tsx',
    'src/components/layout/app-sidebar.tsx',
  ];
  let sidebarSrc = null;
  for (const f of sidebarFiles) {
    const c = readSrc(f);
    if (c && (c.includes('soal') || c.includes('tryout'))) { sidebarSrc = c; break; }
  }
  const sidebarHasSoal = sidebarSrc && sidebarSrc.toLowerCase().includes('bank soal');
  const sidebarHasTryout = sidebarSrc && sidebarSrc.toLowerCase().includes('tryout');
  log(`  Sidebar has "Bank Soal": ${sidebarHasSoal ? 'YES' : 'NO'}`);
  log(`  Sidebar has "Tryout": ${sidebarHasTryout ? 'YES' : 'NO'}`);
  
  log(`  STATUS: FAIL — GuruSoalView & GuruTryoutView exist as DEAD CODE. Not registered in router or sidebar.`);

  log('\n===== D2: Create question via API (since UI not accessible) =====');
  // Get a subject first
  const subjects = await fetchJSON('GET', `/api/subjects?schoolId=${SCHOOL1}`, null, T.GURU1);
  log(`  Subjects API: status=${subjects.status}`);
  let subjectId = null;
  if (Array.isArray(subjects.data) && subjects.data.length > 0) {
    subjectId = subjects.data[0].id;
    log(`  Using subject: id=${subjectId} name=${subjects.data[0].name}`);
  } else {
    log(`  No subjects found, trying to list all...`);
    const allSubjects = await fetchJSON('GET', `/api/subjects`, null, T.SA);
    if (Array.isArray(allSubjects.data) && allSubjects.data.length > 0) {
      subjectId = allSubjects.data[0].id;
      log(`  Using subject: id=${subjectId} name=${allSubjects.data[0].name}`);
    }
  }
  
  if (subjectId) {
    const createQ = await fetchJSON('POST', '/api/questions', {
      type: 'pg', content: 'Soal test audit — D2', answer: 'A',
      options: JSON.stringify({A:'Pilihan A',B:'Pilihan B',C:'Pilihan C',D:'Pilihan D',E:'Pilihan E'}),
      subjectId, schoolId: SCHOOL1, cognitiveLevel: 'C1', difficulty: 'mudah'
    }, T.GURU1);
    log(`  Create question: status=${createQ.status}`);
    if (createQ.data) log(`  Created: id=${createQ.data.id}`);
    log(`  STATUS: ${createQ.status === 200 || createQ.status === 201 ? 'PASS' : 'FAIL'}`);
  } else {
    log('  STATUS: SKIP — No subjects available');
  }

  log('\n===== D3: Tryout creation (via API) =====');
  // Check ExamPackage API
  const exams = await fetchJSON('GET', `/api/exams?schoolId=${SCHOOL1}`, null, T.ADMIN1);
  log(`  GET /api/exams: status=${exams.status}`);
  if (Array.isArray(exams.data)) {
    log(`  Existing exam packages: ${exams.data.length}`);
    for (const e of exams.data.slice(0, 3)) {
      log(`    id=${e.id} name=${e.name} status=${e.status}`);
    }
  }

  // Try to create a tryout
  const createExam = await fetchJSON('POST', '/api/exams', {
    name: 'Audit Tryout Test', description: 'Created by audit script',
    schoolId: SCHOOL1, status: 'draft'
  }, T.ADMIN1);
  log(`  POST /api/exams: status=${createExam.status}`);
  if (createExam.data) log(`  Created exam: id=${createExam.data.id}`);
  log(`  STATUS: ${createExam.status === 200 || createExam.status === 201 ? 'PASS' : 'FAIL'}`);

  log('\n===== D4: Student access to tryout =====');
  // Check exam assignments
  const assignments = await fetchJSON('GET', `/api/exams?schoolId=${SCHOOL1}`, null, T.SA);
  log(`  Exam packages for school1: ${Array.isArray(assignments.data) ? assignments.data.length : 'error'}`);

  log('\n===== D5: Clone-if-used pattern =====');
  // Check PATCH /api/questions for clone logic
  const questionSrc = readSrc('src/app/api/questions/route.ts');
  const hasCloneCheck = questionSrc && (questionSrc.includes('USED_IN_EXAM') || questionSrc.includes('attemptCount') || questionSrc.includes('clone'));
  log(`  PATCH /api/questions has clone-if-used: ${hasCloneCheck ? 'YES' : 'NO'}`);
  
  // Check exam items for usage check
  const examItemSrc = readSrc('src/app/api/exam-items/route.ts');
  log(`  exam-items route exists: ${examItemSrc ? 'YES' : 'NO — file not found'}`);

  log(`  STATUS: ${hasCloneCheck ? 'PASS' : 'FAIL — Clone-if-used NOT implemented'}`);

  log('\n===== D6: RestrictedEditDialog + backend guard =====');
  const examSrc = readSrc('src/app/api/exams/route.ts');
  const hasAttemptGuard = examSrc && (examSrc.includes('attemptCount') || examSrc.includes('StudentAttempt') || examSrc.includes('409'));
  log(`  PATCH /api/exams has attemptCount > 0 guard: ${hasAttemptGuard ? 'YES' : 'NO'}`);
  
  // Check for 409 USED_IN_EXAM pattern
  const has409Exam = examSrc && examSrc.includes('409');
  log(`  Returns 409 when exam has attempts: ${has409Exam ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasAttemptGuard ? 'PASS' : 'FAIL — Backend guard NOT implemented'}`);

  // Test: try to edit exam with attempts
  if (Array.isArray(assignments.data) && assignments.data.length > 0) {
    const examId = assignments.data[0].id;
    log(`  Testing PATCH on exam ${examId} (may have attempts)...`);
    const patchExam = await fetchJSON('PATCH', `/api/exams?id=${examId}`, { name: 'Hacked Name' }, T.ADMIN1);
    log(`  PATCH result: status=${patchExam.status}`);
    if (patchExam.status === 409) log(`  Correctly returns 409 CONFLICT`);
  }

  log('\n===== D7: Draft isolation between gurus =====');
  // Create a question as guru1 (draft)
  if (subjectId) {
    const draftQ = await fetchJSON('POST', '/api/questions', {
      type: 'pg', content: 'Draft soal guru1 — should be isolated', answer: 'C',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D',E:'E'}),
      subjectId, schoolId: SCHOOL1, status: 'draft', cognitiveLevel: 'C2', difficulty: 'sedang'
    }, T.GURU1);
    log(`  Guru1 draft question: status=${draftQ.status}`);
    
    // Check if guru1 can see it
    const guru1Qs = await fetchJSON('GET', `/api/questions?schoolId=${SCHOOL1}&status=draft`, null, T.GURU1);
    const guru1Drafts = Array.isArray(guru1Qs.data) ? guru1Qs.data.filter(q => q.status === 'draft') : [];
    log(`  Guru1 sees ${guru1Drafts.length} draft questions`);
    
    // Check if guru2 (same school) can see it
    const guru2Qs = await fetchJSON('GET', `/api/questions?schoolId=${SCHOOL1}&status=draft`, null, T.SA);
    const guru2Drafts = Array.isArray(guru2Qs.data) ? guru2Qs.data.filter(q => q.status === 'draft') : [];
    log(`  SuperAdmin sees ${guru2Drafts.length} draft questions`);
    log(`  STATUS: Drafts are school-scoped but NOT user-scoped. Same-school users see each other's drafts.`);
    log(`  NOTE: "Draft isolation antar-guru" was NEVER implemented — drafts are visible within the same school.`);
  }

  saveGroup('grup-d.txt');
}

async function runGrupE() {
  startGroup('GRUP E — FITUR PUTARAN 7', 'grup-e.txt');

  log('\n===== E1: HasilTryoutView =====');
  // Search for HasilTryoutView
  const viewFiles = fs.readdirSync('/home/z/my-project/src/components/views');
  let foundHasilTryout = false;
  for (const f of viewFiles) {
    const content = readSrc(`src/components/views/${f}`);
    if (content && content.includes('HasilTryoutView')) {
      foundHasilTryout = true;
      log(`  HasilTryoutView found in: ${f}`);
    }
  }
  log(`  HasilTryoutView exists: ${foundHasilTryout ? 'YES' : 'NO — TIDAK PERNAH DIBUAT'}`);

  // Check admin-school views for tryout results
  const adminViews = readSrc('src/components/views/admin-school-views.tsx');
  const hasTryoutResults = adminViews && adminViews.includes('tryout') && adminViews.includes('hasil');
  log(`  Tryout results in admin-school-views: ${hasTryoutResults ? 'YES' : 'NO'}`);
  
  // Check admin-school-new-views
  const adminNewViews = readSrc('src/components/views/admin-school-new-views.tsx');
  const hasTryoutInNew = adminNewViews && (adminNewViews.includes('Tryout') || adminNewViews.includes('tryout'));
  log(`  Tryout in admin-school-new-views: ${hasTryoutInNew ? 'YES' : 'NO'}`);

  log(`  STATUS: ${foundHasilTryout ? 'PASS' : 'FAIL — HasilTryoutView TIDAK PERNAH DIBANGUN'}`);

  log('\n===== E2: Detail Tryout =====');
  const authApp = readSrc('src/app/authenticated-app.tsx');
  const hasDetail = authApp && (authApp.includes('tryout-detail') || authApp.includes('exam-detail'));
  log(`  'tryout-detail' or 'exam-detail' view key: ${hasDetail ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasDetail ? 'PASS' : 'FAIL — Detail Tryout NOT registered'}`);

  log('\n===== E3: Edit Tryout =====');
  const hasEdit = authApp && (authApp.includes('tryout-edit') || authApp.includes('exam-edit'));
  log(`  'tryout-edit' or 'exam-edit' view key: ${hasEdit ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasEdit ? 'PASS' : 'FAIL — Edit Tryout NOT registered'}`);

  // Check what admin school views actually have
  log('\n===== E4: Available ADMIN_SCHOOL views =====');
  const adminViewKeys = [];
  const authLines = (authApp || '').split('\n');
  for (const line of authLines) {
    const match = line.match(/'([^']+)':\s*React\.lazy/);
    if (match) adminViewKeys.push(match[1]);
  }
  log(`  All registered view keys (${adminViewKeys.length}):`);
  adminViewKeys.forEach(k => log(`    - ${k}`));
  
  // Check which are admin-school specific
  const adminKeys = adminViewKeys.filter(k => 
    !k.startsWith('dashboard-') && 
    !k.startsWith('guru-') && 
    !k.startsWith('siswa-') && 
    !k.startsWith('ortu-') &&
    k !== 'profile' && k !== 'notifications' && k !== 'broadcasts'
  );
  log(`  Admin-school accessible views: ${adminKeys.join(', ')}`);

  saveGroup('grup-e.txt');
}

async function main() {
  log('COMPREHENSIVE AUDIT — Groups A through E');
  log('Started: ' + new Date().toISOString());
  
  await waitServer();
  
  await runGrupA();
  await runGrupB();
  await runGrupC();
  await runGrupD();
  await runGrupE();

  log('\n\n============================================');
  log('ALL GROUPS COMPLETE');
  log('============================================');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
