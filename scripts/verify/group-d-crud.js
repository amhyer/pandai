#!/usr/bin/env node
/**
 * scripts/verify/group-d-crud.js
 * Verifikasi: view registration, question creation, exam POST, clone-if-used, 409 guards, draft isolation
 * Exit code 0 = all PASS, 1 = any FAIL
 */
const http = require('http');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'http://localhost:3000';

const SA = '12265d2a-7e84-b9fe-d560-4c5c7f95bfd7';
const ADMIN1 = '28d6394f-cddc-181e-3c18-b7ee7a562422';
const GURU1 = 'aed2f4fc-0b59-9759-e0c9-7d1cbdab58e6';
const SCHOOL1 = 'cmsqspjkh0000rcxth4v57002';
const SCHOOL2 = 'cmsqspjkl0001rcxt7skak7ki';
const SISWA1 = 'cmsqspjla0020rcxtsu3zmqos';
const CLASS1 = 'cmsqspjl8001wrcxt9tmc4y47';

let passed = 0, failed = 0;
function assert(name, condition, detail) {
  if (condition) { passed++; console.log(`  ✅ PASS: ${name}`); }
  else { failed++; console.log(`  ❌ FAIL: ${name} — ${detail || ''}`); }
}

function f(method, path, body, token) {
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
  console.log('=== GROUP D — CRUD SOAL & TRYOUT BUILDER ===');
  await waitServer();

  // D1: guru-soal & guru-tryout registered in router
  const authApp = fs.readFileSync('/home/z/my-project/src/app/authenticated-app.tsx', 'utf8');
  assert('D1: guru-soal in router', authApp.includes("'guru-soal'"), 'Not registered');
  assert('D1: guru-tryout in router', authApp.includes("'guru-tryout'"), 'Not registered');
  assert('D1: GuruSoalView lazy import', authApp.includes('GuruSoalView'), 'Not imported');

  // D1b: In sidebar
  const sidebar = fs.readFileSync('/home/z/my-project/src/components/layout/app-layout.tsx', 'utf8');
  assert('D1: Bank Soal in sidebar', sidebar.includes("'guru-soal'"), 'Not in sidebar');
  assert('D1: Tryout in sidebar', sidebar.includes("'guru-tryout'"), 'Not in sidebar');

  // D2: Create question via API
  const subjects = await f('GET', `/api/subjects`, null, SA);
  const subjId = Array.isArray(subjects.data) ? subjects.data[0]?.id : null;
  assert('D2: Subjects API works', subjects.status === 200 && !!subjId, 'Failed');

  if (subjId) {
    const createQ = await f('POST', '/api/questions', {
      type: 'pg', content: 'Verifikasi audit D2', answer: 'B',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D',E:'E'}),
      subjectId: subjId, schoolId: SCHOOL1, cognitiveLevel: 'C1', difficulty: 'mudah', status: 'published'
    }, GURU1);
    assert('D2: Create question 200', createQ.status === 200, `status=${createQ.status}, body=${JSON.stringify(createQ.data)?.substring(0,200)}`);
  }

  // D3: POST /api/exams works (was 500 before fix)
  const createExam = await f('POST', '/api/exams', {
    title: 'Audit Test Tryout', description: 'Created by verify script',
    schoolId: SCHOOL1, duration: 60, totalQuestions: 0,
  }, ADMIN1);
  assert('D3: POST /api/exams 200', createExam.status === 200, `status=${createExam.status}, body=${JSON.stringify(createExam.data)?.substring(0,200)}`);
  
  const examId = createExam.data?.id;

  // D3b: Create exam-item and add question
  if (examId && subjId) {
    // First create a question to add
    const q = await f('POST', '/api/questions', {
      type: 'pg', content: 'Soal untuk tryout audit', answer: 'A',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D'}),
      subjectId: subjId, schoolId: SCHOOL1, status: 'published'
    }, GURU1);
    
    if (q.data?.id) {
      const addItem = await f('POST', '/api/exam-items', {
        examPackageId: examId, questionId: q.data.id, orderNum: 1, points: 1
      }, ADMIN1);
      assert('D3: POST /api/exam-items 200', addItem.status === 200, `status=${addItem.status}`);

      // D6: Submit attempt, then try to edit exam → should 409
      const submitAttempt = await f('POST', '/api/attempts', {
        userId: SISWA1, examSessionId: 'audit-session', examPackageId: examId,
        schoolId: SCHOOL1, classId: CLASS1,
        answers: [{ questionId: q.data.id, answer: 'A', timeSpent: 5 }],
        duration: 10,
      }, SA);
      assert('D6: Submit attempt for 409 test', submitAttempt.status === 200, `status=${submitAttempt.status}`);

      if (submitAttempt.status === 200) {
        // Try to PATCH exam → should be 409 (this specific exam now has an attempt)
        const patchExam = await f('PATCH', `/api/exams?id=${examId}`, { title: 'Hacked' }, ADMIN1);
        assert('D6: PATCH exam with attempt → 409', patchExam.status === 409, `status=${patchExam.status}, code=${patchExam.data?.code}`);
        
        // Try to add another item → should be 409
        const addItem2 = await f('POST', '/api/exam-items', {
          examPackageId: examId, questionId: q.data.id, orderNum: 2
        }, ADMIN1);
        assert('D6: POST exam-items with attempt → 409', addItem2.status === 409, `status=${addItem2.status}`);
        
        // Try to delete item → should be 409
        if (addItem.data?.id) {
          const delItem = await f('DELETE', `/api/exam-items?id=${addItem.data.id}`, null, ADMIN1);
          assert('D6: DELETE exam-items with attempt → 409', delItem.status === 409, `status=${delItem.status}`);
        }
      }
    }
  }

  // D5: Clone-if-used (question used in exam-item → cannot edit directly)
  if (subjId) {
    const q2 = await f('POST', '/api/questions', {
      type: 'pg', content: 'Soal clone test', answer: 'C',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D'}),
      subjectId: subjId, schoolId: SCHOOL1, status: 'published'
    }, GURU1);
    
    if (q2.data?.id) {
      // Add to an exam package without attempts
      const cleanExam = await f('POST', '/api/exams', {
        title: 'Clean exam for clone test', schoolId: SCHOOL1
      }, ADMIN1);
      
      if (cleanExam.data?.id) {
        await f('POST', '/api/exam-items', {
          examPackageId: cleanExam.data.id, questionId: q2.data.id
        }, ADMIN1);
        
        // Try to PATCH question → should clone
        const patchQ = await f('PATCH', `/api/questions`, {
          id: q2.data.id, content: 'Modified content'
        }, GURU1);
        // Clone creates a new question, or returns CLONED
        assert('D5: PATCH used question creates clone', 
          patchQ.status === 200 && (patchQ.data?._cloned || patchQ.data?.code === 'CLONED'),
          `status=${patchQ.status}, cloned=${patchQ.data?._cloned}`);
      }
    }
  }

  // D7: Draft isolation — guru's drafts only visible to themselves
  if (subjId) {
    // Create draft as GURU1
    const draftQ = await f('POST', '/api/questions', {
      type: 'pg', content: 'Draft hanya untuk guru1', answer: 'A',
      options: JSON.stringify({A:'A',B:'B',C:'C',D:'D'}),
      subjectId: subjId, schoolId: SCHOOL1, status: 'draft'
    }, GURU1);
    assert('D7: Create draft question', draftQ.status === 200, `status=${draftQ.status}`);

    if (draftQ.data?.id) {
      // GURU1 should see their own draft
      const guru1Drafts = await f('GET', `/api/questions?schoolId=${SCHOOL1}&status=draft`, null, GURU1);
      const guru1HasDraft = Array.isArray(guru1Drafts.data) && guru1Drafts.data.some(q => q.id === draftQ.data.id);
      assert('D7: Guru1 sees own draft', guru1HasDraft, 'Own draft not visible');

      // SA should see ALL drafts (SUPER_ADMIN bypasses createdBy filter)
      const saDrafts = await f('GET', `/api/questions?schoolId=${SCHOOL1}&status=draft`, null, SA);
      const saHasDraft = Array.isArray(saDrafts.data) && saDrafts.data.some(q => q.id === draftQ.data.id);
      assert('D7: SUPER_ADMIN sees all drafts', saHasDraft, 'SUPER_ADMIN should see all');
    }
  }

  await db.$disconnect();
  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
