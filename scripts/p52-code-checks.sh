#!/bin/bash
# P52 — Code-level blocker verification
set +e
PASS=0; FAIL=0
check(){ local l="$1" e="$2" g="$3"; if [ "$g" = "$e" ]; then echo "  ✅ $l → $g"; PASS=$((PASS+1)); else echo "  ❌ $l → got $g (exp $e)"; FAIL=$((FAIL+1)); fi; }

api(){ local m=$1 p=$2 bf=$3 tk=$4; local tmpf=/tmp/api-c$RANDOM.txt; local args=(-s -o "$tmpf" -w '%{http_code}' -X $m -H 'Content-Type: application/json'); [ -n "$tk" ] && args+=(-H "Cookie: pandai_session=$tk"); [ -n "$bf" ] && args+=(-d "$bf"); local s=$(curl "${args[@]}" "http://localhost:3000$p" 2>/dev/null); echo "${s}|||$(cat "$tmpf" 2>/dev/null)"; }
pstatus(){ echo "$1" | cut -d'|' -f1; }


echo '═══ LANGKAH 2 Items 6-8: Code-Level Verification ═══'

# Item 6: GURU "Tryout TKA" → guru-tryout
echo ''
echo '── Item 6: GURU sidebar Tryout TKA → guru-tryout ──'
if rg -q "'guru-tryout'" src/components/layout/app-layout.tsx; then
  if rg -A2 -B2 "Tryout TKA" src/components/layout/app-layout.tsx | rg -q "guru-tryout"; then
    echo '  ✅ Tryout TKA linked to guru-tryout'
    PASS=$((PASS+1))
  else
    echo '  ❌ Tryout TKA not linked to guru-tryout'; FAIL=$((FAIL+1))
  fi
else
  echo '  ❌ guru-tryout not found'; FAIL=$((FAIL+1))
fi

if rg -q "guru-tryout.*Tryout" src/components/layout/app-layout.tsx; then
  echo '  ✅ guru-tryout in VIEW_LABELS'; PASS=$((PASS+1))
else
  echo '  ❌ guru-tryout not in VIEW_LABELS'; FAIL=$((FAIL+1))
fi

# Item 7: siswa-rapor + siswa-nilai-akhir in SISWA sidebar
echo ''
echo '── Item 7: SISWA sidebar orphan views ──'
if rg -q "siswa-rapor" src/components/layout/app-layout.tsx && rg -q "siswa-nilai-akhir" src/components/layout/app-layout.tsx; then
  echo '  ✅ Both siswa-rapor and siswa-nilai-akhir present'; PASS=$((PASS+1))
else
  echo '  ❌ Missing from sidebar'; FAIL=$((FAIL+1))
fi

# Item 8: Exam-taking UI
echo ''
echo '── Item 8: Exam-taking UI ──'
FILES_OK=true
for f in src/components/exam/exam-runner.tsx src/components/exam/exam-manager.tsx src/components/exam/results-view.tsx src/components/views/exam/siswa-exam-views.tsx; do
  [ ! -f "$f" ] && echo "  ❌ Missing: $f" && FILES_OK=false
done
if $FILES_OK; then echo '  ✅ All 4 exam UI files exist'; PASS=$((PASS+1)); fi

if rg -q 'siswa-exam' src/app/authenticated-app.tsx; then
  echo '  ✅ Exam views imported in authenticated-app'; PASS=$((PASS+1))
else
  echo '  ❌ Exam views not imported'; FAIL=$((FAIL+1))
fi

# API tests
source /tmp/pandai-env.sh
echo ''
echo '── Item 8c: Exam API ──'
E1=$(api GET '/api/exams' '' "$SISWA_TOKEN")
E1S=$(pstatus "$E1")
check 'SISWA GET /api/exams' 200 "$E1S"

E2=$(api GET '/api/exam-attempts' '' "$SISWA_TOKEN")
E2S=$(pstatus "$E2")
check 'SISWA GET /api/exam-attempts' 200 "$E2S"

E3=$(api GET '/api/exam-packages' '' "$SISWA_TOKEN")
E3S=$(pstatus "$E3")
check 'SISWA GET /api/exam-packages' 200 "$E3S"

echo ''
echo "═══ CODE CHECK RESULTS: $PASS PASS, $FAIL FAIL ═══"
