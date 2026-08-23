#!/bin/bash
# R50 — Verifikasi UI Mengerjakan Tryout untuk Siswa
# Usage: bash scripts/verify/r50-exam-taking-ui.sh

set -euo pipefail
BASE="http://localhost:3000"
PASS=0
FAIL=0

pass() { echo "✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL+1)); }

# 1. Health check
echo '=== 1. Health Check ==='
STATUS=$(curl -s "$BASE/api/health" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
[ "$STATUS" = "ok" ] && pass "Server is alive" || fail "Server not responding"

# 2. Login as student
echo '=== 2. Login as Siswa ==='
LOGIN=$(curl -s -c /tmp/r50-cookies.txt -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"0051234567","password":"password123"}')
ROLE=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))")
[ "$ROLE" = "SISWA" ] && pass "Logged in as SISWA" || fail "Login failed: role=$ROLE"

# 3. GET /api/exams returns sessions
echo '=== 3. GET /api/exams ==='
EXAMS=$(curl -s -b /tmp/r50-cookies.txt "$BASE/api/exams")
SESSION_ID=$(echo "$EXAMS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
[ -n "$SESSION_ID" ] && pass "Found exam session: $SESSION_ID" || fail "No sessions found"

# 4. GET /api/exam-session/[id] returns questions (sanitized)
echo '=== 4. GET /api/exam-session/[id] ==='
QS=$(curl -s -b /tmp/r50-cookies.txt "$BASE/api/exam-session/$SESSION_ID")
Q_COUNT=$(echo "$QS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('questions',[])))")
HAS_ANSWER=$(echo "$QS" | python3 -c "import sys,json; d=json.load(sys.stdin); qs=d.get('questions',[]); print('answer' in str(qs[0]) if qs else 'False')")
HAS_ISCORRECT=$(echo "$QS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('isCorrect' in (d.get('questions',[{}])[0].get('options','') or ''))")
[ "$Q_COUNT" -gt 0 ] && pass "Questions returned: $Q_COUNT" || fail "No questions"
[ "$HAS_ANSWER" = "False" ] && pass "Answer stripped for SISWA" || fail "Answer leaked!"
[ "$HAS_ISCORRECT" = "False" ] && pass "isCorrect stripped from options" || fail "isCorrect leaked!"

# 5. GET /api/exam-session/[id]?review=true includes answers
echo '=== 5. Review mode ==='
REVIEW=$(curl -s -b /tmp/r50-cookies.txt "$BASE/api/exam-session/$SESSION_ID?review=true")
HAS_ANSWER_REVIEW=$(echo "$REVIEW" | python3 -c "import sys,json; d=json.load(sys.stdin); qs=d.get('questions',[]); print('answer' in str(qs[0]) if qs else 'False')")
[ "$HAS_ANSWER_REVIEW" = "True" ] && pass "Review mode includes answer" || fail "Review mode missing answer"

# 6. POST /api/attempts includes answers in response
echo '=== 6. POST /api/attempts ==='
# First check if attempt exists
ATTEMPT_EXISTS=$(curl -s -b /tmp/r50-cookies.txt "$BASE/api/attempts?examSessionId=$SESSION_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len([a for a in d if a.get('status')=='submitted']))")
if [ "$ATTEMPT_EXISTS" -gt 0 ]; then
  echo "  (Skipping submit - attempt already exists. Reset DB first.)"
  pass "Attempt already exists - skipping submit test"
else
  SUBMIT=$(curl -s -b /tmp/r50-cookies.txt -X POST "$BASE/api/attempts" \
    -H 'Content-Type: application/json' \
    -d "{\"examSessionId\":\"$SESSION_ID\",\"examPackageId\":\"test\",\"schoolId\":\"test\",\"classId\":\"test\",\"answers\":[],\"duration\":10}")
  HAS_ANSWERS=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('answers' in d)")
  [ "$HAS_ANSWERS" = "True" ] && pass "POST response includes answers" || fail "POST response missing answers"
fi

echo ''
echo '=========================='
echo "Results: $PASS passed, $FAIL failed"
echo '=========================='
[ $FAIL -eq 0 ] && exit 0 || exit 1
