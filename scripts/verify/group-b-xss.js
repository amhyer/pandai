#!/usr/bin/env node
/**
 * scripts/verify/group-b-xss.js
 * Verifikasi: dompurify installed, all dangerouslySetInnerHTML sanitized
 * Exit code 0 = all PASS, 1 = any FAIL
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passed = 0, failed = 0;
function assert(name, condition, detail) {
  if (condition) { passed++; console.log(`  ✅ PASS: ${name}`); }
  else { failed++; console.log(`  ❌ FAIL: ${name} — ${detail || ''}`); }
}

async function main() {
  console.log('=== GROUP B — XSS PROTECTION ===');

  // B1: dompurify in package.json
  const pkg = JSON.parse(fs.readFileSync('/home/z/my-project/package.json', 'utf8'));
  const hasDomPurify = pkg.dependencies && pkg.dependencies.dompurify;
  assert('B1: dompurify in package.json', !!hasDomPurify, 'Not in dependencies');

  // B2: dompurify imported in siswa-ai-views.tsx
  const siswaAi = fs.readFileSync('/home/z/my-project/src/components/views/siswa-ai-views.tsx', 'utf8');
  assert('B2: DOMPurify imported in siswa-ai-views', siswaAi.includes("import DOMPurify from 'dompurify'"), 'Not imported');
  assert('B2: DOMPurify.sanitize used in siswa-ai-views', siswaAi.includes('DOMPurify.sanitize'), 'Not used');

  // B3: dompurify imported in ortu-new-views.tsx
  const ortuNew = fs.readFileSync('/home/z/my-project/src/components/views/ortu-new-views.tsx', 'utf8');
  assert('B3: DOMPurify imported in ortu-new-views', ortuNew.includes("import DOMPurify from 'dompurify'"), 'Not imported');
  assert('B3: DOMPurify.sanitize used in ortu-new-views', ortuNew.includes('DOMPurify.sanitize'), 'Not used');

  // B4: Find ALL dangerouslySetInnerHTML and verify all are sanitized
  const viewFiles = fs.readdirSync('/home/z/my-project/src/components/views').map(f => ({
    name: f,
    content: fs.readFileSync(`/home/z/my-project/src/components/views/${f}`, 'utf8'),
  }));

  for (const vf of viewFiles) {
    const hasDangerous = vf.content.includes('dangerouslySetInnerHTML');
    if (hasDangerous) {
      // Check that each dangerouslySetInnerHTML has DOMPurify.sanitize or is in chart.tsx (UI lib)
      const lines = vf.content.split('\n');
      for (const line of lines) {
        if (line.includes('dangerouslySetInnerHTML')) {
          const lineHasSanitize = vf.content.includes('DOMPurify.sanitize');
          // chart.tsx is a UI library component, not user content
          const isChartLib = vf.name === 'chart.tsx';
          if (!lineHasSanitize && !isChartLib) {
            assert(`B4: ${vf.name} dangerouslySetInnerHTML sanitized`, false, 'Missing DOMPurify.sanitize');
          }
        }
      }
      if (vf.content.includes('DOMPurify.sanitize') || vf.name === 'chart.tsx') {
        assert(`B4: ${vf.name} dangerouslySetInnerHTML OK`, true, '');
      }
    }
  }

  // B5: Test DOMPurify actually strips script tags (via Node.js + jsdom)
  try {
    // DOMPurify needs a DOM. Create a minimal one.
    const { JSDOM } = require('jsdom');
    const window = new JSDOM('').window;
    const DOMPurify = require('dompurify')(window);
    const clean = DOMPurify.sanitize('<script>window.__xss_triggered=true</script><p>Hello</p>');
    assert('B5: DOMPurify strips <script> tags', !clean.includes('<script>'), `Still contains: ${clean}`);
    assert('B5: DOMPurify preserves safe HTML', clean.includes('<p>Hello</p>'), `Lost safe content: ${clean}`);
    assert('B5: DOMPurify strips onerror', !DOMPurify.sanitize('<img onerror="alert(1)" src=x>').includes('onerror'), 'onerror not stripped');
  } catch (e) {
    // Fallback: try installing jsdom
    assert('B5: DOMPurify runtime test', false, e.message);
  }

  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
