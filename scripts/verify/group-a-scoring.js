#!/usr/bin/env node
/**
 * scripts/verify/group-a-scoring.js
 * Verifikasi: transaction, PG Kompleks Set comparison, sigmoid TKA, real ranking
 * Exit code 0 = all PASS, 1 = any FAIL
 */
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'http://localhost:3000';

const SA_TOKEN = '12265d2a-7e84-b9fe-d560-4c5c7f95bfd7';
const SCHOOL1 = 'cmsqspjkh0000rcxth4v57002';
const SISWA1 = 'cmsqspjla0020rcxtsu3zmqos';
const CLASS1 = 'cmsqspjl8001wrcxt9tmc4y47';

let passed = 0, failed = 0;
function assert(name, condition, detail) {
  if (condition) { passed++; console.log(`  ✅ PASS: ${name}`); }
  else { failed++; console.log(`  ❌ FAIL: ${name} — ${detail || ''}`); }
}

function fetchJSON(method, path, body, token) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  return new Promise((resolve, reject) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, timeout: 120000 };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(url, opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function waitServer() {
  return new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      http.get(`${BASE}/`, (res) => { res.resume(); resolve(true); }).on('error', () => {
        if (++tries < 30) setTimeout(check, 1000); else resolve(false);
      });
    };
    check();
  });
}

async function main() {
  console.log('=== GROUP A — SCORING ENGINE ===');
  await waitServer();

  // A1: Source code has $transaction
  const fs = require('fs');
  const src = fs.readFileSync('/home/z/my-project/src/app/api/attempts/route.ts', 'utf8');
  assert('A1: Uses $transaction', src.includes('$transaction'), 'No $transaction found');
  assert('A1: Uses findMany pre-fetch', src.includes('findMany') && src.includes('id: { in: questionIds }'), 'No pre-fetch');
  assert('A1: Uses createMany for answers', src.includes('createMany'), 'No createMany');

  // A2: Submit real attempt
  const qs = await fetchJSON('GET', `/api/questions?schoolId=${SCHOOL1}`, null, SA_TOKEN);
  const q1 = Array.isArray(qs.data) ? qs.data.find(q => q.type === 'pg') : null;
  assert('A2: Has PG question', !!q1, 'No PG question found');
  
  if (q1) {
    const sub = await fetchJSON('POST', '/api/attempts', {
      userId: SISWA1, examSessionId: 'test-session', examPackageId: 'test-pkg',
      schoolId: SCHOOL1, classId: CLASS1,
      answers: [{ questionId: q1.id, answer: q1.answer, timeSpent: 5 }],
      duration: 10,
    }, SA_TOKEN);
    assert('A2: Submit 200', sub.status === 200, `status=${sub.status}`);
    assert('A2: Score correct', sub.data?.score === 1, `score=${sub.data?.score}`);
    assert('A2: Percentage correct', sub.data?.percentage === 100, `pct=${sub.data?.percentage}`);
    assert('A2: Has answers', sub.data?.answers && sub.data.answers.length > 0, 'No answers in response');
  }

  // A3: PG Kompleks Set comparison
  assert('A3: Has comparePgKompleks', src.includes('comparePgKompleks'), 'No function');
  assert('A3: Uses Set comparison', src.includes('new Set'), 'No Set usage');
  
  // Create a pg_kompleks question and test
  const subjects = await fetchJSON('GET', `/api/subjects`, null, SA_TOKEN);
  const subjId = Array.isArray(subjects.data) ? subjects.data[0]?.id : null;
  
  if (subjId) {
    const createPGK = await fetchJSON('POST', '/api/questions', {
      type: 'pg_kompleks', content: 'Test Set comparison', answer: 'A,B,C',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D',E:'E'}),
      subjectId: subjId, schoolId: SCHOOL1, status: 'published', cognitiveLevel: 'C1', difficulty: 'mudah'
    }, SA_TOKEN);
    
    if (createPGK.status === 200 && createPGK.data?.id) {
      // Test with reversed order - should still be correct
      const subReversed = await fetchJSON('POST', '/api/attempts', {
        userId: SISWA1, examSessionId: 'test-session', examPackageId: 'test-pkg',
        schoolId: SCHOOL1, classId: CLASS1,
        answers: [{ questionId: createPGK.data.id, answer: 'C,B,A', timeSpent: 3 }],
        duration: 5,
      }, SA_TOKEN);
      assert('A3: Reversed "C,B,A" correct for "A,B,C"', 
        subReversed.status === 200 && subReversed.data?.totalCorrect === 1,
        `status=${subReversed.status}, correct=${subReversed.data?.totalCorrect}`);
      
      // Test with wrong answer
      const subWrong = await fetchJSON('POST', '/api/attempts', {
        userId: SISWA1, examSessionId: 'test-session', examPackageId: 'test-pkg',
        schoolId: SCHOOL1, classId: CLASS1,
        answers: [{ questionId: createPGK.data.id, answer: 'A,B,D', timeSpent: 2 }],
        duration: 5,
      }, SA_TOKEN);
      assert('A3: "A,B,D" incorrect for "A,B,C"',
        subWrong.status === 200 && subWrong.data?.totalWrong === 1,
        `status=${subWrong.status}, wrong=${subWrong.data?.totalWrong}`);
    }
  }

  // A4: Sigmoid TKA prediction
  assert('A4: Has sigmoid/calculateTkaPrediction', src.includes('calculateTkaPrediction'), 'No function');
  assert('A4: Uses Math.exp (sigmoid)', src.includes('Math.exp'), 'No sigmoid formula');
  assert('A4: NOT linear', !src.includes('percentage * 8 + 200'), 'Still uses old linear formula');
  
  // Verify sigmoid values with a clean submission (1 correct out of 1 = 100%)
  if (q1) {
    const sub100 = await fetchJSON('POST', '/api/attempts', {
      userId: SISWA1, examSessionId: 'test-sigmoid', examPackageId: 'test-pkg',
      schoolId: SCHOOL1, classId: CLASS1,
      answers: [{ questionId: q1.id, answer: q1.answer, timeSpent: 1 }],
      duration: 5,
    }, SA_TOKEN);
    const tka100 = sub100.data?.tkaPrediction;
    assert('A4: 100% → TKA ≈ 1000 (sigmoid cap)', 
      tka100 !== undefined && tka100 >= 990 && tka100 <= 1000,
      `pct=${sub100.data?.percentage}, tka=${tka100}`);
  }

  // A5: Real ranking from DB
  const scoresSrc = fs.readFileSync('/home/z/my-project/src/app/api/scores/route.ts', 'utf8');
  assert('A5: Calculates classmate averages', scoresSrc.includes('classmateAvgs'), 'No classmate average calc');
  assert('A5: Sorts and finds rank by index', scoresSrc.includes('sort') && scoresSrc.includes('indexOf'), 'No real rank calc');
  assert('A5: NOT hardcoded formula', !scoresSrc.includes('Math.min(avgScore') && !scoresSrc.includes('Math.ceil(avgScore'), 'Still hardcoded');

  const scores = await fetchJSON('GET', `/api/scores?studentId=${SISWA1}`, null, SA_TOKEN);
  assert('A5: Scores API 200', scores.status === 200, `status=${scores.status}`);
  assert('A5: Has classRank', scores.data?.classRank !== undefined, 'No classRank');

  await db.$disconnect();
  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
