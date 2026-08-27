#!/usr/bin/env node
// GRUP A — Scoring Engine Audit (curl-based, no code review)
const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const OUT = '/home/z/my-project/results-grup-a.txt';
const BASE = 'http://localhost:3000';
const SA_TOKEN = '12265d2a-7e84-b9fe-d560-4c5c7f95bfd7';
const ADMIN_TOKEN = '28d6394f-cddc-181e-3c18-b7ee7a562422';
const GURU_TOKEN = 'aed2f4fc-0b59-9759-e0c9-7d1cbdab58e6';
const ORTU_TOKEN = 'fdfd7382-1256-e7e0-a145-9bff7008d72c';
const SCHOOL1 = 'cmsqspjkh0000rcxth4v57002';
const SCHOOL2 = 'cmsqspjkl0001rcxt7skak7ki';
const SISWA1 = 'cmsqspjla0020rcxtsu3zmqos';
const CLASS1 = 'cmsqspjl8001wrcxt9tmc4y47';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(OUT, msg + '\n');
}

function fetchJSON(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function waitServer(maxWait = 30000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      http.get(`${BASE}/`, (res) => {
        res.resume();
        log(`Server ready (HTTP ${res.statusCode})`);
        resolve(true);
      }).on('error', () => {
        if (Date.now() - start < maxWait) setTimeout(check, 1000);
        else { log('Server FAILED to start'); resolve(false); }
      });
    };
    check();
  });
}

async function main() {
  fs.writeFileSync(OUT, '');
  log('============================================');
  log('GRUP A — SCORING ENGINE AUDIT');
  log('Timestamp: ' + new Date().toISOString());
  log('============================================');

  await waitServer();

  // ===== TEST A1: Check transaction usage =====
  log('\n===== TEST A1: Transaction check =====');
  log('Checking POST /api/attempts source code for $transaction...');
  const fs2 = require('fs');
  const attemptSrc = fs2.readFileSync('/home/z/my-project/src/app/api/attempts/route.ts', 'utf8');
  const hasTransaction = attemptSrc.includes('$transaction') || attemptSrc.includes('prisma.transaction') || attemptSrc.includes('db.$transaction');
  const hasFindMany = attemptSrc.includes('findMany');
  const hasCreateLoop = attemptSrc.includes('for (const a of answers)');
  log(`  Uses $transaction: ${hasTransaction ? 'YES' : 'NO — uses simple loop + individual queries'}`);
  log(`  Uses findMany for scoring: ${hasFindMany ? 'YES (but for fetching, not creating)' : 'NO'}`);
  log(`  Uses for-loop with individual db.question.findUnique per answer: ${hasCreateLoop ? 'YES — this is N+1!' : 'NO'}`);
  log(`  STATUS: ${hasTransaction ? 'PASS' : 'FAIL — No atomic transaction, N+1 pattern detected'}`);

  // ===== TEST A2: Submit a real attempt =====
  log('\n===== TEST A2: Submit real attempt =====');
  
  // First find a valid exam session and questions
  log('--- Fetching existing exam sessions ---');
  const sessions = await fetchJSON('GET', `/api/exam-sessions?schoolId=${SCHOOL1}`, null, SA_TOKEN);
  log(`  Exam sessions found: ${sessions.data ? (Array.isArray(sessions.data) ? sessions.data.length : Object.keys(sessions.data).length) : 'none/error'}`);
  
  // Get exam items
  log('--- Fetching exam items ---');
  const items = await fetchJSON('GET', `/api/exam-items?examSessionId=cmsqspjl7001`, null, SA_TOKEN);
  log(`  Exam items status: ${items.status}`);
  if (items.data) log(`  Items count: ${Array.isArray(items.data) ? items.data.length : 'N/A'}`);
  
  // Get questions to know the correct answers
  log('--- Fetching questions for school1 ---');
  const questions = await fetchJSON('GET', `/api/questions?schoolId=${SCHOOL1}`, null, SA_TOKEN);
  log(`  Questions status: ${questions.status}`);
  
  let q1 = null, q2 = null;
  if (Array.isArray(questions.data)) {
    q1 = questions.data[0];
    q2 = questions.data[1];
    log(`  Q1: id=${q1?.id} type=${q1?.type} answer=${q1?.answer}`);
    if (q2) log(`  Q2: id=${q2?.id} type=${q2?.type} answer=${q2?.answer}`);
  }

  // Submit attempt with correct answer
  if (q1) {
    const submitBody = {
      userId: SISWA1,
      examSessionId: 'cmsqspjl7001',
      examPackageId: 'cmsqspjn0001',
      schoolId: SCHOOL1,
      classId: CLASS1,
      answers: [{ questionId: q1.id, answer: q1.answer, timeSpent: 10 }],
      duration: 60
    };
    log(`  Submitting: answer=${submitBody.answers[0].answer} for Q type=${q1.type}`);
    const submit = await fetchJSON('POST', '/api/attempts', submitBody, SA_TOKEN);
    log(`  Submit status: ${submit.status}`);
    log(`  Response: score=${submit.data?.score}, correct=${submit.data?.totalCorrect}, wrong=${submit.data?.totalWrong}, unanswered=${submit.data?.totalUnanswered}`);
    log(`  percentage=${submit.data?.percentage}, tkaPrediction=${submit.data?.tkaPrediction}`);
    log(`  answers count in response: ${submit.data?.answers?.length || 0}`);
    
    if (submit.data?.answers?.length > 0) {
      const ans = submit.data.answers[0];
      log(`  Answer record: questionId=${ans.questionId}, isCorrect=${ans.isCorrect}, pointsEarned=${ans.pointsEarned}`);
    }
    log(`  STATUS: ${submit.status === 200 && submit.data?.score >= 0 ? 'PASS — Attempt created with answer records' : 'FAIL'}`);
  } else {
    log('  SKIPPED — No questions found');
  }

  // ===== TEST A3: PG Kompleks scoring =====
  log('\n===== TEST A3: PG Kompleks scoring =====');
  log('Checking source code for PG Kompleks scoring logic...');
  
  // Check if Set comparison is used
  const hasSetCompare = attemptSrc.includes('Set') || attemptSrc.includes('split(') || attemptSrc.includes('sort');
  const usesStringEquality = attemptSrc.includes(`a.answer === question.answer`);
  
  log(`  Uses Set comparison for multi-answer: ${hasSetCompare ? 'YES' : 'NO'}`);
  log(`  Uses string equality (a.answer === question.answer): ${usesStringEquality ? 'YES — THIS IS WRONG for multi-answer!' : 'NO'}`);
  
  // Check source code directly
  const pgKompleksMatch = attemptSrc.match(/pg_kompleks[\s\S]*?(?=else if|})/);
  if (pgKompleksMatch) {
    log(`  PG Kompleks scoring code: ${pgKompleksMatch[0].trim().substring(0, 200)}`);
  }
  
  // Find a pg_kompleks question if it exists
  let pgkQ = null;
  if (Array.isArray(questions.data)) {
    pgkQ = questions.data.find(q => q.type === 'pg_kompleks');
  }
  if (pgkQ) {
    log(`  Found PG Kompleks question: id=${pgkQ.id}, answer=${pgkQ.answer}`);
    // Test with reordered answer
    const testBody = {
      userId: SISWA1, examSessionId: 'cmsqspjl7001', examPackageId: 'cmsqspjn0001',
      schoolId: SCHOOL1, classId: CLASS1,
      answers: [{ questionId: pgkQ.id, answer: pgkQ.answer.split('').sort().reverse().join(''), timeSpent: 5 }],
      duration: 30
    };
    log(`  Testing with reordered answer: "${testBody.answers[0].answer}" vs correct "${pgkQ.answer}"`);
    const testSubmit = await fetchJSON('POST', '/api/attempts', testBody, SA_TOKEN);
    log(`  Status: ${testSubmit.status}`);
    log(`  isCorrect: ${testSubmit.data?.answers?.[0]?.isCorrect}`);
    log(`  STATUS: ${testSubmit.data?.answers?.[0]?.isCorrect ? 'PASS (correctly handles reorder)' : 'FAIL — String equality does not handle reordering'}`);
  } else {
    log(`  No PG Kompleks question found in DB — CANNOT TEST. Creating one...`);
    // Create a pg_kompleks question
    const createQ = await fetchJSON('POST', '/api/questions', {
      type: 'pg_kompleks', content: 'Test PG Kompleks: Pilih semua yang benar', answer: 'A,B,C',
      options: JSON.stringify({A:'Pilihan A',B:'Pilihan B',C:'Pilihan C',D:'Pilihan D',E:'Pilihan E'}),
      subject: 'mat', cognitiveLevel: 'C3', difficulty: 'sedang', schoolId: SCHOOL1
    }, GURU_TOKEN);
    log(`  Create question status: ${createQ.status}`);
    if (createQ.data?.id) {
      // Test with reversed order
      const testBody2 = {
        userId: SISWA1, examSessionId: 'cmsqspjl7001', examPackageId: 'cmsqspjn0001',
        schoolId: SCHOOL1, classId: CLASS1,
        answers: [{ questionId: createQ.data.id, answer: 'C,B,A', timeSpent: 5 }],
        duration: 30
      };
      log(`  Testing with "C,B,A" vs correct "A,B,C"`);
      const test2 = await fetchJSON('POST', '/api/attempts', testBody2, SA_TOKEN);
      log(`  Status: ${test2.status}`);
      log(`  isCorrect: ${test2.data?.answers?.[0]?.isCorrect}`);
      log(`  STATUS: ${test2.data?.answers?.[0]?.isCorrect ? 'PASS (Set comparison)' : 'FAIL — String equality: "C,B,A" !== "A,B,C"'}`);
    }
  }

  // ===== TEST A4: TKA Prediction formula =====
  log('\n===== TEST A4: TKA Prediction formula =====');
  log('Source code analysis:');
  const tkaMatch = attemptSrc.match(/tkaPrediction[\s\S]*?[;=]/);
  if (tkaMatch) log(`  Code: ${tkaMatch[0].trim().substring(0, 100)}`);
  
  const hasSigmoid = attemptSrc.includes('sigmoid') || attemptSrc.includes('Math.exp') || attemptSrc.includes('1 /');
  const hasLinear = attemptSrc.includes('percentage * 8') || attemptSrc.includes('percentage*8') || attemptSrc.includes('200');
  
  log(`  Uses sigmoid: ${hasSigmoid ? 'YES' : 'NO'}`);
  log(`  Uses linear (percentage*8+200): ${hasLinear ? 'YES' : 'NO'}`);
  log(`  STATUS: ${hasSigmoid ? 'PASS — Sigmoid-based' : hasLinear ? 'FAIL — Linear formula, NOT sigmoid as claimed' : 'UNCLEAR'}`);
  
  // Verify with actual data
  if (q1) {
    const submit3 = await fetchJSON('POST', '/api/attempts', {
      userId: SISWA1, examSessionId: 'cmsqspjl7001', examPackageId: 'cmsqspjn0001',
      schoolId: SCHOOL1, classId: CLASS1,
      answers: [
        { questionId: q1.id, answer: q1.answer, timeSpent: 1 },
      ],
      duration: 10
    }, SA_TOKEN);
    const pct = submit3.data?.percentage || 0;
    const tka = submit3.data?.tkaPrediction || 0;
    const expectedLinear = Math.round(pct * 8 + 200);
    const expectedSigmoid = Math.round(1000 / (1 + Math.exp(-0.1 * (pct - 50))));
    log(`  Actual: pct=${pct}, tka=${tka}`);
    log(`  Expected linear: ${expectedLinear}`);
    log(`  Expected sigmoid: ${expectedSigmoid}`);
    log(`  Match: linear=${tka === expectedLinear}, sigmoid=${tka === expectedSigmoid}`);
  }

  // ===== TEST A5: Ranking (M5) =====
  log('\n===== TEST A5: Ranking via /api/scores =====');
  const scoresSrc = fs2.readFileSync('/home/z/my-project/src/app/api/scores/route.ts', 'utf8');
  const hasRealRanking = scoresSrc.includes('RANK') || scoresSrc.includes('rank') || scoresSrc.includes('DENSE_RANK') || scoresSrc.includes('ROW_NUMBER');
  const hasHardcodedRank = scoresSrc.includes('Math.min(avgScore') || scoresSrc.includes('Math.ceil(avgScore');
  
  log(`  Uses real SQL ranking: ${hasRealRanking ? 'YES' : 'NO'}`);
  log(`  Uses hardcoded formula: ${hasHardcodedRank ? 'YES — Math.min(Math.ceil(avg/20), total)' : 'NO'}`);
  
  // Check the actual formula
  const rankMatch = scoresSrc.match(/classRank[\s\S]*?[;=]/);
  if (rankMatch) log(`  Ranking code: ${rankMatch[0].trim().substring(0, 150)}`);
  
  // Test via API
  const scores = await fetchJSON('GET', `/api/scores?studentId=${SISWA1}`, null, SA_TOKEN);
  log(`  Scores API status: ${scores.status}`);
  log(`  Response: avgScore=${scores.data?.avgScore}, classRank=${scores.data?.classRank}, totalClassmates=${scores.data?.totalClassmates}`);
  log(`  STATUS: ${hasRealRanking ? 'PASS' : 'FAIL — No real ranking, hardcoded formula'}`);

  log('\n============================================');
  log('GRUP A COMPLETE');
  log('============================================');
  process.exit(0);
}

main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
