// R41 Autosave/Draft Verification Test
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const BASE = 'http://localhost:3000';
const GURU = 'cmswq78ty000gsvpj4e364ihm';
const SISWA = 'cmswq78ug000usvpjcsh0pr60';
const SCHOOL = 'cmswq78tj0000svpjzj0fvr60';
const CLASS = 'cmswq78u5000ksvpj0ctlhmaq';
const SUBJECT = 'cmswq78vz002rsvpje8vhktas';
const PG1 = 'cmswsq4kb0001sv4yjabtmxmm';
const PG2 = 'cmswsq4kc0003sv4yxxnlzdcw';
const ESAI = 'cmswsq4kd0005sv4y4mzr57bg';

async function api(method, path, body = null, extraHeaders = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': extraHeaders.userId || GURU,
      'X-School-Id': SCHOOL,
      'X-User-Role': extraHeaders.role || 'GURU',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function log(step, msg, ok = true) {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
}

async function main() {
  let passed = 0;
  let failed = 0;

  // ====== STEP 1: Create + Publish ======
  console.log('\n=== STEP 1: Create + Publish Mixed Assignment ===');
  const r1 = await api('POST', '/api/assignments', {
    title: 'R41 Autosave Proof',
    subjectId: SUBJECT,
    classId: CLASS,
    teacherId: GURU,
    schoolId: SCHOOL,
    deadline: '2099-12-31T23:59',
    submissionType: 'mixed',
    maxScore: 100,
    status: 'published',
    questionIds: [PG1, PG2, ESAI],
  });
  if (r1.data.id) {
    log(1, `Created: ${r1.data.id}`);
    log(1, `Status: ${r1.data.status}`, r1.data.status === 'published');
    log(1, `Questions: ${r1.data.questions?.length}`, r1.data.questions?.length === 3);
    passed++;
  } else {
    log(1, `FAILED: ${JSON.stringify(r1.data)}`, false);
    failed++;
    return;
  }
  const A_ID = r1.data.id;

  // ====== STEP 2: Draft #1 — PG #1 only ======
  console.log('\n=== STEP 2: Draft #1 — Fill PG #1 only ===');
  const r2 = await api('POST', `/api/assignments/${A_ID}/submissions`, {
    studentId: SISWA, schoolId: SCHOOL, classId: CLASS,
    action: 'draft',
    answers: [{ questionId: PG1, answer: 'A' }],
  }, { userId: SISWA, role: 'SISWA' });
  log(2, `Status: ${r2.data.status}`, r2.data.status === 'dikerjakan');
  log(2, `Answers: ${r2.data.answers?.length}`, r2.data.answers?.length === 1);
  if (r2.status !== 200 && r2.status !== 201) {
    log(2, `HTTP ${r2.status}: ${JSON.stringify(r2.data)}`, false);
    failed++;
  } else {
    passed++;
  }

  // ====== STEP 3: DB Check — only PG #1 ======
  console.log('\n=== STEP 3: DB Check — Only PG #1 should exist ===');
  const db3 = await p.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: A_ID, studentId: SISWA } },
    include: { answers: { include: { question: { include: { question: { select: { id: true } } } } } } },
  });
  if (db3) {
    log(3, `DB status: ${db3.status}`, db3.status === 'dikerjakan');
    log(3, `DB answers count: ${db3.answers.length}`, db3.answers.length === 1);
    if (db3.answers.length > 0) {
      const q = db3.answers[0].question?.question;
      log(3, `Answer is for ${q?.id === PG1 ? 'PG#1' : 'WRONG Q: ' + q?.id}`, q?.id === PG1);
      log(3, `Answer value: ${db3.answers[0].answer}`, db3.answers[0].answer === 'A');
    }
    passed++;
  } else {
    log(3, 'Submission NOT FOUND in DB!', false);
    failed++;
  }

  // ====== STEP 4: Simulate Reopen ======
  console.log('\n=== STEP 4: Simulate Reopen — GET submission ===');
  const r4 = await api('GET', `/api/assignments/${A_ID}/submissions?studentId=${SISWA}`, null, { userId: SISWA, role: 'SISWA' });
  log(4, `Status: ${r4.data.status}`, r4.data.status === 'dikerjakan');
  log(4, `Answers: ${r4.data.answers?.length}`, r4.data.answers?.length === 1);
  if (r4.data.answers?.length > 0) {
    const pg1Ans = r4.data.answers.find(a => a.question?.question?.id === PG1);
    log(4, `PG #1 loaded: ${pg1Ans?.answer}`, pg1Ans?.answer === 'A');
  }
  passed++;

  // ====== STEP 5: Draft #2 — PG #2 + Essay (NOT PG #1) ======
  console.log('\n=== STEP 5: Draft #2 — Fill PG #2 + Essay ===');
  const r5 = await api('POST', `/api/assignments/${A_ID}/submissions`, {
    studentId: SISWA, schoolId: SCHOOL, classId: CLASS,
    action: 'draft',
    answers: [
      { questionId: PG2, answer: 'A' },
      { questionId: ESAI, essayAnswer: 'D>0: 2 akar real berbeda. D=0: 2 akar sama.' },
    ],
  }, { userId: SISWA, role: 'SISWA' });
  log(5, `Status: ${r5.data.status}`, r5.data.status === 'dikerjakan');
  log(5, `Answers: ${r5.data.answers?.length}`, r5.data.answers?.length === 3);
  if (r5.status !== 200 && r5.status !== 201) {
    log(5, `HTTP ${r5.status}: ${JSON.stringify(r5.data)}`, false);
    failed++;
  } else {
    passed++;
  }

  // ====== STEP 6: DB Check — all 3 answers ======
  console.log('\n=== STEP 6: DB Check — All 3 answers must exist ===');
  const db6 = await p.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: A_ID, studentId: SISWA } },
    include: { answers: { include: { question: { include: { question: { select: { id: true } } } } } } },
  });
  if (db6) {
    log(6, `DB status: ${db6.status}`, db6.status === 'dikerjakan');
    log(6, `DB answers: ${db6.answers.length}`, db6.answers.length === 3);
    const pg1 = db6.answers.find(a => a.question?.question?.id === PG1);
    const pg2 = db6.answers.find(a => a.question?.question?.id === PG2);
    const esai = db6.answers.find(a => a.question?.question?.id === ESAI);
    log(6, `PG#1 preserved (A): ${pg1?.answer === 'A' ? 'YES' : 'NO: ' + pg1?.answer}`, pg1?.answer === 'A');
    log(6, `PG#2 filled (A): ${pg2?.answer === 'A' ? 'YES' : 'NO: ' + pg2?.answer}`, pg2?.answer === 'A');
    log(6, `Essay filled: ${esai?.essayAnswer ? 'YES' : 'NO'}`, !!esai?.essayAnswer);
    passed++;
  } else {
    log(6, 'Submission NOT FOUND!', false);
    failed++;
  }

  // ====== STEP 7: Final Submit ======
  console.log('\n=== STEP 7: Final Submit ===');
  const r7 = await api('POST', `/api/assignments/${A_ID}/submissions`, {
    studentId: SISWA, schoolId: SCHOOL, classId: CLASS,
    action: 'submit',
    answers: [
      { questionId: PG1, answer: 'A' },
      { questionId: PG2, answer: 'A' },
      { questionId: ESAI, essayAnswer: 'D>0: 2 akar real berbeda. D=0: 2 akar sama.' },
    ],
  }, { userId: SISWA, role: 'SISWA' });
  log(7, `Status: ${r7.data.status}`, r7.data.status === 'submitted');
  log(7, `Score: ${r7.data.score}`, r7.data.score === null);

  // DB verify
  const db7 = await p.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: A_ID, studentId: SISWA } },
    include: { answers: { include: { question: { include: { question: { select: { id: true, type: true } } } } } } },
  });
  log(7, `DB status: ${db7.status}`, db7.status === 'submitted');
  log(7, `DB score: ${db7.score} (null=needs manual grading)`, db7.score === null);
  log(7, `DB submittedAt: ${db7.submittedAt ? 'SET' : 'NULL'}`, !!db7.submittedAt);
  db7.answers.forEach(a => {
    const label = a.question?.question?.id === PG1 ? 'PG#1' : a.question?.question?.id === PG2 ? 'PG#2' : 'ESAI';
    log(7, `  ${label}: correct=${a.isCorrect} pts=${a.pointsEarned}`, a.question?.question?.type === 'pg' ? a.isCorrect === true : true);
  });
  if (r7.status !== 200 && r7.status !== 201) {
    log(7, `HTTP ${r7.status}: ${JSON.stringify(r7.data)}`, false);
    failed++;
  } else {
    passed++;
  }

  // ====== STEP 8: Draft AFTER submit — must be REJECTED ======
  console.log('\n=== STEP 8: Draft After Submit (must REJECT) ===');
  const r8 = await api('POST', `/api/assignments/${A_ID}/submissions`, {
    studentId: SISWA, schoolId: SCHOOL, classId: CLASS,
    action: 'draft',
    answers: [{ questionId: PG1, answer: 'B' }],
  }, { userId: SISWA, role: 'SISWA' });
  log(8, `HTTP: ${r8.status} (expect 403)`, r8.status === 403);
  log(8, `Error: ${r8.data.error}`, r8.data.error?.includes('sudah disubmit'));

  // Verify DB not changed
  const db8 = await p.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: A_ID, studentId: SISWA } },
  });
  log(8, `DB status unchanged: ${db8.status}`, db8.status === 'submitted');
  log(8, `DB score unchanged: ${db8.score}`, db8.score === null);
  if (r8.status === 403) passed++; else failed++;

  await p.$disconnect();

  console.log('\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`ASSIGNMENT_ID: ${A_ID}`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
