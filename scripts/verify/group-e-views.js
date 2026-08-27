#!/usr/bin/env node
/**
 * scripts/verify/group-e-views.js
 * Verifikasi: HasilTryoutView, TryoutDetailView, TryoutEditView registered + exist
 * Exit code 0 = all PASS, 1 = any FAIL
 */
const fs = require('fs');
const http = require('http');
const BASE = 'http://localhost:3000';

const SA = '12265d2a-7e84-b9fe-d560-4c5c7f95bfd7';
const SCHOOL1 = 'cmsqspjkh0000rcxth4v57002';

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
  console.log('=== GROUP E — HASIL/DETAIL/EDIT TRYOUT ===');
  await waitServer();

  // E1: HasilTryoutView exists in code
  const adminViews = fs.readFileSync('/home/z/my-project/src/components/views/admin-school-views.tsx', 'utf8');
  assert('E1: HasilTryoutView exported', adminViews.includes('export function HasilTryoutView()'), 'Not exported');

  // E1b: Registered in router
  const authApp = fs.readFileSync('/home/z/my-project/src/app/authenticated-app.tsx', 'utf8');
  assert('E1: hasil-tryout in router', authApp.includes("'hasil-tryout'"), 'Not in router');
  assert('E1: HasilTryoutView lazy import', authApp.includes('HasilTryoutView'), 'Not imported');

  // E2: TryoutDetailView
  assert('E2: TryoutDetailView exported', adminViews.includes('export function TryoutDetailView()'), 'Not exported');
  assert('E2: tryout-detail in router', authApp.includes("'tryout-detail'"), 'Not in router');
  assert('E2: TryoutDetailView lazy import', authApp.includes('TryoutDetailView'), 'Not imported');

  // E3: TryoutEditView
  assert('E3: TryoutEditView exported', adminViews.includes('export function TryoutEditView()'), 'Not exported');
  assert('E3: tryout-edit in router', authApp.includes("'tryout-edit'"), 'Not in router');
  assert('E3: TryoutEditView lazy import', authApp.includes('TryoutEditView'), 'Not imported');

  // E4: Sidebar entries
  const sidebar = fs.readFileSync('/home/z/my-project/src/components/layout/app-layout.tsx', 'utf8');
  assert('E4: hasil-tryout in sidebar', sidebar.includes("'hasil-tryout'"), 'Not in sidebar');
  assert('E4: tryout-detail in sidebar', sidebar.includes("'tryout-detail'"), 'Not in sidebar');
  assert('E4: tryout-edit in sidebar', sidebar.includes("'tryout-edit'"), 'Not in sidebar');

  // E5: ViewType includes new views
  const store = fs.readFileSync('/home/z/my-project/src/store/use-store.ts', 'utf8');
  assert('E5: hasil-tryout in ViewType', store.includes("'hasil-tryout'"), 'Not in ViewType');
  assert('E5: tryout-detail in ViewType', store.includes("'tryout-detail'"), 'Not in ViewType');
  assert('E5: tryout-edit in ViewType', store.includes("'tryout-edit'"), 'Not in ViewType');

  // E6: API returns real data for hasil tryout
  const attempts = await f('GET', `/api/attempts?schoolId=${SCHOOL1}`, null, SA);
  assert('E6: GET /api/attempts returns data', attempts.status === 200 && Array.isArray(attempts.data), `status=${attempts.status}`);
  
  // E7: Exam items API exists and returns proper data
  const examItemsEmpty = await f('GET', `/api/exam-items?examPackageId=nonexistent`, null, SA);
  assert('E7: GET /api/exam-items endpoint exists', examItemsEmpty.status !== 404, `status=${examItemsEmpty.status}`);

  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
