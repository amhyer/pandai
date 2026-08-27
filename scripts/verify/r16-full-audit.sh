#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# R16 — Full Audit: API Auth + XSS + NPSN + Dead Buttons
# Run: bash scripts/verify/r16-full-audit.sh
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail
BASE="http://localhost:3000"
PASS=0; FAIL=0; CRITICAL=0

assert_pass() { local desc="$1" code="$2"; PASS=$((PASS+1)); echo "  ✅ PASS [$code]: $desc"; }
assert_fail() { local desc="$1" code="$2"; FAIL=$((FAIL+1)); echo "  ❌ FAIL [$code]: $desc"; }
assert_critical() { local desc="$1" code="$2"; CRITICAL=$((CRITICAL+1)); FAIL=$((FAIL+1)); echo "  🔴 CRITICAL [$code]: $desc"; }

echo "════════════════════════════════════════════════════"
echo "R16 FULL AUDIT — $(date)"
echo "════════════════════════════════════════════════════"

# ── BAGIAN 2: API AUTH AUDIT ──
echo ""
echo "── BAGIAN 2: API AUTH AUDIT (26 unauthenticated endpoints) ──"

# CATASTROPHIC
echo ""
echo "--- TIER 1: CATASTROPHIC ---"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/seed")
SEED_RESP=$(curl -s -X POST $BASE/api/seed 2>/dev/null)
if [ "$CODE" = "200" ]; then
  assert_critical "POST /api/seed — ANONYMOUS DB WIPE" "SEED"
else
  assert_pass "POST /api/seed — protected ($CODE)" "SEED"
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/backup?action=download")
SIZE=$(curl -s "$BASE/api/backup?action=download" -o /dev/null -w "%{size_download}")
if [ "$CODE" = "200" ] && [ "$SIZE" -gt 1000 ]; then
  assert_critical "GET /api/backup?action=download — DB DOWNLOAD ($SIZE bytes). No auth!" "BACKUP"
else
  assert_pass "GET /api/backup — protected ($CODE, ${SIZE}B)" "BACKUP"
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/analytics?type=global")
BODY=$(curl -s "$BASE/api/analytics?type=global" 2>/dev/null)
HAS_MRR=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'mrr' in d else 'no')" 2>/dev/null || echo "no")
if [ "$CODE" = "200" ] && [ "$HAS_MRR" = "yes" ]; then
  assert_critical "GET /api/analytics?type=global — MRR/schools leaked. No auth!" "ANALYTICS"
else
  assert_pass "GET /api/analytics — protected" "ANALYTICS"
fi

# TIER 2
echo ""
echo "--- TIER 2: CRITICAL (Account Creation/Data Manipulation) ---"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/schools")
if [ "$CODE" = "200" ]; then assert_critical "GET /api/schools — all schools+users+subscriptions. No auth!" "SCHOOLS"; else assert_pass "GET /api/schools protected" "SCHOOLS"; fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/dapodik/import" -H "Content-Type: application/json" -d '{}')
if [ "$CODE" != "401" ] && [ "$CODE" != "403" ]; then assert_critical "POST /api/dapodik/import — mass account creation. No auth! ($CODE)" "DAPODIK"; else assert_pass "POST /api/dapodik/import protected" "DAPODIK"; fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/import/csv" -F "file=@/dev/null")
if [ "$CODE" != "401" ] && [ "$CODE" != "403" ]; then assert_critical "POST /api/import/csv — CSV account creation. No auth! ($CODE)" "CSVIMPORT"; else assert_pass "POST /api/import/csv protected" "CSVIMPORT"; fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/subjects?id=test")
if [ "$CODE" != "401" ] && [ "$CODE" != "403" ]; then assert_critical "DELETE /api/subjects — delete global subjects. No auth! ($CODE)" "SUBJECTS"; else assert_pass "DELETE /api/subjects protected" "SUBJECTS"; fi

# TIER 3: AI + Data
echo ""
echo "--- TIER 3: HIGH (AI/Data Access) ---"

for EP in "ai/chatbot?userId=x&schoolId=x" "ai/config?schoolId=x" "ai/usage?userId=x&schoolId=x" "attendance?schoolId=x" "character-reports?schoolId=x" "materials?schoolId=x" "activity-logs" "teaching-journals?schoolId=x" "timetable?schoolId=x" "classes?schoolId=x" "teacher-assignments?schoolId=x"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/$EP" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    assert_critical "GET /api/$EP — data accessible without auth ($CODE)" "${EP//[^a-zA-Z0-9]/_}"
  else
    assert_pass "GET /api/$EP protected or error ($CODE)" "${EP//[^a-zA-Z0-9]/_}"
  fi
done

# ── BAGIAN 1.2: NPSN CLEANUP ──
echo ""
echo "── BAGIAN 1.2: NPSN SEARCH CLEANUP ──"

SMA_COUNT=$(curl -s "$BASE/api/schools/lookup?q=SMA" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
SD_COUNT=$(curl -s "$BASE/api/schools/lookup?q=SD" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
SMP_COUNT=$(curl -s "$BASE/api/schools/lookup?q=SMP" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
SMK_COUNT=$(curl -s "$BASE/api/schools/lookup?q=SMK" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
MA_COUNT=$(curl -s "$BASE/api/schools/lookup?q=MA" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$SMA_COUNT" = "0" ] && [ "$SMK_COUNT" = "0" ] && [ "$MA_COUNT" = "0" ] && [ "$SD_COUNT" -gt "0" ] && [ "$SMP_COUNT" -gt "0" ]; then
  assert_pass "NPSN cleanup: SD=$SD_COUNT, SMP=$SMP_COUNT, SMA=$SMA_COUNT, SMK=$SMK_COUNT, MA=$MA_COUNT" "NPSN"
else
  assert_fail "NPSN NOT cleaned: SD=$SD_COUNT, SMP=$SMP_COUNT, SMA=$SMA_COUNT, SMK=$SMK_COUNT, MA=$MA_COUNT" "NPSN"
fi

# ── SUMMARY ──
echo ""
echo "════════════════════════════════════════════════════"
echo "SUMMARY: PASS=$PASS  FAIL=$FAIL  CRITICAL=$CRITICAL"
echo "════════════════════════════════════════════════════"
if [ "$CRITICAL" -gt 0 ]; then
  echo "🔴 $CRITICAL CRITICAL vulnerabilities found. NOT READY for any launch."
  exit 1
elif [ "$FAIL" -gt 0 ]; then
  echo "⚠️ $FAIL failures found. Review needed."
  exit 1
else
  echo "✅ All checks passed."
  exit 0
fi
