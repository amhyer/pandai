#!/bin/bash
# ============================================================
# PANDAI Round 14 — Runtime Verification Script
# Tests Grup A (scoring) & Grup D (CRUD + guards) via HTTP
# ============================================================

set -e

PASS=0
FAIL=0
RESULTS=""

assert_eq() {
  local desc="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    RESULTS="$RESULTS\n✅ PASS: $desc (actual=$actual)\n"
  else
    FAIL=$((FAIL + 1))
    RESULTS="$RESULTS\n❌ FAIL: $desc (expected=$expected, actual=$actual)\n"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    PASS=$((PASS + 1))
    RESULTS="$RESULTS\n✅ PASS: $desc (found '$needle')\n"
  else
    FAIL=$((FAIL + 1))
    RESULTS="$RESULTS\n❌ FAIL: $desc (did not find '$needle')\n"
  fi
}

assert_not_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    FAIL=$((FAIL + 1))
    RESULTS="$RESULTS\n❌ FAIL: $desc (should NOT contain '$needle')\n"
  else
    PASS=$((PASS + 1))
    RESULTS="$RESULTS\n✅ PASS: $desc (correctly excludes '$needle')\n"
  fi
}

echo "=========================================="
echo "BUILD & START SERVER"
echo "=========================================="

# Build
echo ">>> Building..."
cd /home/z/my-project
NODE_OPTIONS='--max-old-space-size=256' bun run build 2>&1 | tail -20
if [ $? -ne 0 ]; then
  echo "BUILD FAILED — aborting"
  exit 1
fi
echo ">>> Build complete"

# Start server in background
NODE_ENV=production bun .next/standalone/server.js 2>&1 &
SERVER_PID=$!
echo ">>> Server PID: $SERVER_PID"

# Wait for server to be ready
echo ">>> Waiting for server..."
for i in $(seq 1 15); do
  if curl -s http://localhost:3000/api/subjects > /dev/null 2>&1; then
    echo ">>> Server is alive!"
    break
  fi
  sleep 1
done

# Verify server alive
ALIVE=$(curl -s http://localhost:3000/api/subjects 2>&1)
echo ">>> Server response (first 200 chars): $(echo "$ALIVE" | head -c 200)"

echo ""
echo "=========================================="
echo "SEED DATABASE"
echo "=========================================="
SEED_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/seed 2>&1)
SEED_STATUS=$(echo "$SEED_RESP" | tail -1)
echo ">>> Seed status: $SEED_STATUS"

echo ""
echo "=========================================="
echo "GRUP A — SCORING VERIFICATION"
echo "=========================================="

# ── Fetch seed data ──
echo ""
echo "--- Fetching seed data ---"

SUBJECTS_RESP=$(curl -s http://localhost:3000/api/subjects 2>&1)
SUBJECT_ID=$(echo "$SUBJECTS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else 'NONE')" 2>/dev/null || echo "NONE")
echo "Subject ID: $SUBJECT_ID"

SCHOOLS_RESP=$(curl -s "http://localhost:3000/api/schools" 2>&1)
SCHOOL_ID=$(echo "$SCHOOLS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else 'NONE')" 2>/dev/null || echo "NONE")
echo "School ID: $SCHOOL_ID"

# Class ID will be determined after finding students in the same class
echo "School ID: $SCHOOL_ID"

GURU_RESP=$(curl -s "http://localhost:3000/api/users?schoolId=$SCHOOL_ID&role=GURU" 2>&1)
GURU_A_ID=$(echo "$GURU_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if len(d) > 0 else 'NONE')" 2>/dev/null || echo "NONE")
GURU_B_ID=$(echo "$GURU_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[1]['id'] if len(d) > 1 else 'NONE')" 2>/dev/null || echo "NONE")
echo "Guru A ID: $GURU_A_ID"
echo "Guru B ID: $GURU_B_ID"

# Find 3 students in the SAME class (required for ranking test)
SISWA_RESP=$(curl -s "http://localhost:3000/api/users?schoolId=$SCHOOL_ID&role=SISWA" 2>&1)
SISWA_COUNT=$(echo "$SISWA_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
echo "Siswa count: $SISWA_COUNT"

# Use python to find first class with >=3 students
CLASS_AND_SISWA=$(echo "$SISWA_RESP" | python3 -c "
import sys, json
from collections import defaultdict
d = json.load(sys.stdin)
groups = defaultdict(list)
for s in d:
    cid = s.get('classId')
    if cid:
        groups[cid].append(s['id'])
# Find first class with >= 3 students
for cid, ids in sorted(groups.items()):
    if len(ids) >= 3:
        print(f'{cid}|{ids[0]}|{ids[1]}|{ids[2]}')
        break
else:
    # Fallback: use first 3 students regardless of class
    print(f'{d[0].get("classId","")}|{d[0]["id"]}|{d[1]["id"]}|{d[2]["id"]}')
" 2>/dev/null)

CLASS_ID=$(echo "$CLASS_AND_SISWA" | cut -d'|' -f1)
SISWA_1_ID=$(echo "$CLASS_AND_SISWA" | cut -d'|' -f2)
SISWA_2_ID=$(echo "$CLASS_AND_SISWA" | cut -d'|' -f3)
SISWA_3_ID=$(echo "$CLASS_AND_SISWA" | cut -d'|' -f4)
echo "Selected class ID: $CLASS_ID"
echo "Siswa 1 ID: $SISWA_1_ID"
echo "Siswa 2 ID: $SISWA_2_ID"
echo "Siswa 3 ID: $SISWA_3_ID"

if [ "$SUBJECT_ID" = "NONE" ] || [ "$SCHOOL_ID" = "NONE" ] || [ "$CLASS_ID" = "NONE" ] || [ "$GURU_A_ID" = "NONE" ] || [ "$SISWA_1_ID" = "NONE" ]; then
  echo "ERROR: Seed data incomplete. Cannot continue."
  echo "Subjects: $(echo $SUBJECTS_RESP | head -c 200)"
  echo "Schools: $(echo $SCHOOLS_RESP | head -c 200)"
  echo "Classes: $(echo $CLASSES_RESP | head -c 200)"
  echo "Users: $(echo $SISWA_RESP | head -c 200)"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

# ── A2: Create PG Kompleks question ──
echo ""
echo "--- A2: Create PG Kompleks question ---"
PGK_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"type\": \"pg_kompleks\",
    \"content\": \"Negara ASEAN dengan ibukota di Jawa\",
    \"answer\": \"A,B,C\",
    \"options\": [{\"label\":\"A\",\"text\":\"Indonesia\"},{\"label\":\"B\",\"text\":\"Brunei\"},{\"label\":\"C\",\"text\":\"Thailand\"},{\"label\":\"D\",\"text\":\"Filipina\"},{\"label\":\"E\",\"text\":\"Malaysia\"}],
    \"createdBy\": \"$GURU_A_ID\"
  }")
PGK_STATUS=$(echo "$PGK_RESP" | tail -1)
PGK_BODY=$(echo "$PGK_RESP" | sed '$d')
echo "Create PG Kompleks: HTTP $PGK_STATUS"
echo "Body: $(echo "$PGK_BODY" | head -c 300)"
PGK_Q_ID=$(echo "$PGK_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "PG Kompleks Question ID: $PGK_Q_ID"

# ── A3: Create 2 more PG questions ──
PG1_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"type\": \"pg\",
    \"content\": \"Ibukota Indonesia adalah\",
    \"answer\": \"C\",
    \"options\": [{\"label\":\"A\",\"text\":\"Surabaya\"},{\"label\":\"B\",\"text\":\"Bandung\"},{\"label\":\"C\",\"text\":\"Jakarta\"},{\"label\":\"D\",\"text\":\"Medan\"},{\"label\":\"E\",\"text\":\"Makassar\"}],
    \"createdBy\": \"$GURU_A_ID\"
  }")
PG1_BODY=$(echo "$PG1_RESP" | sed '$d')
PG1_Q_ID=$(echo "$PG1_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "PG1 ID: $PG1_Q_ID"

PG2_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"type\": \"pg\",
    \"content\": \"1+1=?\",
    \"answer\": \"B\",
    \"options\": [{\"label\":\"A\",\"text\":\"1\"},{\"label\":\"B\",\"text\":\"2\"},{\"label\":\"C\",\"text\":\"3\"},{\"label\":\"D\",\"text\":\"4\"}],
    \"createdBy\": \"$GURU_A_ID\"
  }")
PG2_BODY=$(echo "$PG2_RESP" | sed '$d')
PG2_Q_ID=$(echo "$PG2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "PG2 ID: $PG2_Q_ID"

# ── A4: Submit attempt with PG Kompleks (answer "C,B,A" for key "A,B,C") → expect correct ──
echo ""
echo "=========================================="
echo "--- A4: PG Kompleks Set comparison test ---"
echo "=========================================="
ATTEMPT_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_1_ID\",
    \"examPackageId\": \"PKG_A4\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PGK_Q_ID\", \"answer\": \"C,B,A\", \"timeSpent\": 10},
      {\"questionId\": \"$PG1_Q_ID\", \"answer\": \"C\", \"timeSpent\": 5},
      {\"questionId\": \"$PG2_Q_ID\", \"answer\": \"B\", \"timeSpent\": 3}
    ],
    \"duration\": 18
  }")
ATTEMPT_STATUS=$(echo "$ATTEMPT_RESP" | tail -1)
ATTEMPT_BODY=$(echo "$ATTEMPT_RESP" | sed '$d')
echo "Submit attempt (siswa 1): HTTP $ATTEMPT_STATUS"
echo "Body: $(echo "$ATTEMPT_BODY" | head -c 500)"

ATTEMPT_CORRECT=$(echo "$ATTEMPT_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalCorrect',0))" 2>/dev/null || echo "0")
ATTEMPT_PCT=$(echo "$ATTEMPT_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('percentage',0))" 2>/dev/null || echo "0")
ATTEMPT_TKA=$(echo "$ATTEMPT_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tkaPrediction',0))" 2>/dev/null || echo "0")
echo "totalCorrect: $ATTEMPT_CORRECT"
echo "percentage: $ATTEMPT_PCT"
echo "tkaPrediction: $ATTEMPT_TKA"

assert_eq "A4: PG Kompleks Set comparison — all 3 correct" "$ATTEMPT_CORRECT" "3"
assert_eq "A4: Percentage should be 100" "$ATTEMPT_PCT" "100"

# TKA at 100%: sigmoidTKA(100) = 200 + 600/(1+exp(-0.08*(100-50)))
TKA_EXPECTED=$(python3 -c "import math; print(round(200 + 600/(1+math.exp(-0.08*(100-50)))))" 2>/dev/null)
echo "Expected TKA at 100%: $TKA_EXPECTED"
assert_eq "A4: TKA prediction uses sigmoid (not linear 1000)" "$ATTEMPT_TKA" "$TKA_EXPECTED"
assert_not_contains "A4: TKA is NOT linear formula 1000" "$ATTEMPT_TKA" "1000"

# ── A5: Submit attempt with wrong PG Kompleks answer (partial match) → expect incorrect ──
echo ""
echo "--- A5: PG Kompleks partial answer test ---"
ATTEMPT2_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_1_ID\",
    \"examPackageId\": \"PKG_A5\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PGK_Q_ID\", \"answer\": \"A,B\", \"timeSpent\": 10}
    ],
    \"duration\": 10
  }")
ATTEMPT2_BODY=$(echo "$ATTEMPT2_RESP" | sed '$d')
ATTEMPT2_CORRECT=$(echo "$ATTEMPT2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalCorrect',0))" 2>/dev/null || echo "0")
echo "Partial answer (A,B vs A,B,C): totalCorrect=$ATTEMPT2_CORRECT"
assert_eq "A5: PG Kompleks partial answer → incorrect (0 correct)" "$ATTEMPT2_CORRECT" "0"

# ── A6: Transaction safety — invalid data should not create partial attempt ──
echo ""
echo "--- A6: Transaction safety test ---"
BEFORE_COUNT=$(curl -s "http://localhost:3000/api/attempts?userId=$SISWA_1_ID" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Attempts before invalid submit: $BEFORE_COUNT"

ATTEMPT3_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_1_ID\",
    \"answers\": [{\"questionId\": \"$PGK_Q_ID\", \"answer\": \"A,B,C\"}]
  }")
ATTEMPT3_STATUS=$(echo "$ATTEMPT3_RESP" | tail -1)
echo "Invalid submit (missing schoolId): HTTP $ATTEMPT3_STATUS"
assert_eq "A6: Missing fields → 400 error" "$ATTEMPT3_STATUS" "400"

AFTER_COUNT=$(curl -s "http://localhost:3000/api/attempts?userId=$SISWA_1_ID" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Attempts after invalid submit: $AFTER_COUNT"
assert_eq "A6: No partial write — count unchanged" "$AFTER_COUNT" "$BEFORE_COUNT"

# ── A7: 3 attempts from different students → test ranking ──
echo ""
echo "=========================================="
echo "--- A7: Real DB ranking test ---"
echo "=========================================="

# Siswa 2: 1/3 correct (33.33%)
curl -s -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_2_ID\",
    \"examPackageId\": \"PKG_RANK\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PGK_Q_ID\", \"answer\": \"X,Y,Z\", \"timeSpent\": 10},
      {\"questionId\": \"$PG1_Q_ID\", \"answer\": \"C\", \"timeSpent\": 5},
      {\"questionId\": \"$PG2_Q_ID\", \"answer\": \"X\", \"timeSpent\": 3}
    ],
    \"duration\": 18
  }" > /dev/null

# Siswa 3: 0/3 correct (0%)
curl -s -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_3_ID\",
    \"examPackageId\": \"PKG_RANK\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PGK_Q_ID\", \"answer\": \"X,Y\", \"timeSpent\": 10},
      {\"questionId\": \"$PG1_Q_ID\", \"answer\": \"A\", \"timeSpent\": 5},
      {\"questionId\": \"$PG2_Q_ID\", \"answer\": \"A\", \"timeSpent\": 3}
    ],
    \"duration\": 18
  }" > /dev/null

# Siswa 1: 100% on PKG_RANK
curl -s -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_1_ID\",
    \"examPackageId\": \"PKG_RANK\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PGK_Q_ID\", \"answer\": \"A,B,C\", \"timeSpent\": 10},
      {\"questionId\": \"$PG1_Q_ID\", \"answer\": \"C\", \"timeSpent\": 5},
      {\"questionId\": \"$PG2_Q_ID\", \"answer\": \"B\", \"timeSpent\": 3}
    ],
    \"duration\": 18
  }" > /dev/null

echo "3 attempts created for ranking test"

# Check ranking for each student
echo ""
SCORE1_BODY=$(curl -s "http://localhost:3000/api/scores?studentId=$SISWA_1_ID")
SCORE1_RANK=$(echo "$SCORE1_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('classRank',0))" 2>/dev/null || echo "0")
SCORE1_AVG=$(echo "$SCORE1_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('avgScore',0))" 2>/dev/null || echo "0")
SCORE1_TOTAL=$(echo "$SCORE1_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalClassmates',0))" 2>/dev/null || echo "0")
echo "Siswa 1 → rank=$SCORE1_RANK, avgScore=$SCORE1_AVG, classmates=$SCORE1_TOTAL"

SCORE2_BODY=$(curl -s "http://localhost:3000/api/scores?studentId=$SISWA_2_ID")
SCORE2_RANK=$(echo "$SCORE2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('classRank',0))" 2>/dev/null || echo "0")
SCORE2_AVG=$(echo "$SCORE2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('avgScore',0))" 2>/dev/null || echo "0")
echo "Siswa 2 → rank=$SCORE2_RANK, avgScore=$SCORE2_AVG"

SCORE3_BODY=$(curl -s "http://localhost:3000/api/scores?studentId=$SISWA_3_ID")
SCORE3_RANK=$(echo "$SCORE3_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('classRank',0))" 2>/dev/null || echo "0")
SCORE3_AVG=$(echo "$SCORE3_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('avgScore',0))" 2>/dev/null || echo "0")
echo "Siswa 3 → rank=$SCORE3_RANK, avgScore=$SCORE3_AVG"

# Siswa 1 should be rank 1 (highest avg: has 100% + 100% + 0% = avg 67%, others lower)
assert_eq "A7: Siswa 1 (highest avg) should be rank 1" "$SCORE1_RANK" "1"
# Verify ranking order
RANK_ORDER=$(echo "$SCORE1_RANK $SCORE2_RANK $SCORE3_RANK" | awk '{
  if ($1 < $2 && $1 < $3) print "OK"; else print "WRONG"
}')
assert_eq "A7: Siswa 1 outranks both siswa 2 and 3" "$RANK_ORDER" "OK"

echo ""
echo "=========================================="
echo "GRUP D — CRUD & GUARDS VERIFICATION"
echo "=========================================="

# ── D1: Login ──
echo ""
echo "--- D1: Login ---"
GURU1_USER=$(echo "$GURU_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('username','') if len(d)>0 else '')" 2>/dev/null)
LOGIN_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$GURU1_USER\", \"password\": \"password123\"}")
LOGIN_STATUS=$(echo "$LOGIN_RESP" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')
echo "Login as $GURU1_USER: HTTP $LOGIN_STATUS"
echo "Body: $(echo "$LOGIN_BODY" | head -c 300)"
assert_eq "D1: Login success" "$LOGIN_STATUS" "200"

# ── D2: POST /api/exams (create tryout package) ──
echo ""
echo "--- D2: Create exam package ---"
EXAM_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Tryout Ujian Bulanan\",
    \"description\": \"Ujian bulanan Bahasa Indonesia\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"duration\": 90,
    \"createdBy\": \"$GURU_A_ID\"
  }")
EXAM_STATUS=$(echo "$EXAM_RESP" | tail -1)
EXAM_BODY=$(echo "$EXAM_RESP" | sed '$d')
echo "Create exam: HTTP $EXAM_STATUS"
echo "Body: $(echo "$EXAM_BODY" | head -c 400)"
EXAM_PKG_ID=$(echo "$EXAM_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "Exam Package ID: $EXAM_PKG_ID"
assert_eq "D2: Create exam package success" "$EXAM_STATUS" "200"
assert_contains "D2: Package has real ID" "$EXAM_PKG_ID" "cj"

# ── D3: Create a real attempt for this package ──
echo ""
echo "--- D3: Create attempt for package ---"
D3_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$SISWA_2_ID\",
    \"examPackageId\": \"$EXAM_PKG_ID\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"classId\": \"$CLASS_ID\",
    \"answers\": [
      {\"questionId\": \"$PG1_Q_ID\", \"answer\": \"C\", \"timeSpent\": 5}
    ],
    \"duration\": 5
  }")
D3_STATUS=$(echo "$D3_RESP" | tail -1)
echo "Create attempt for package: HTTP $D3_STATUS"
assert_eq "D3: Attempt created for package" "$D3_STATUS" "200"

# ── D4: PATCH exam package that has attempt → 409 ──
echo ""
echo "--- D4: PATCH exam with existing attempt → 409 ---"
D4_RESP=$(curl -s -w "\n%{http_code}" -X PATCH http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$EXAM_PKG_ID\",
    \"title\": \"Modified Title Should Fail\"
  }")
D4_STATUS=$(echo "$D4_RESP" | tail -1)
D4_BODY=$(echo "$D4_RESP" | sed '$d')
echo "PATCH exam with attempt: HTTP $D4_STATUS"
echo "Body: $D4_BODY"
assert_eq "D4: PATCH blocked with 409" "$D4_STATUS" "409"
assert_contains "D4: Error code HAS_ATTEMPTS" "$D4_BODY" "HAS_ATTEMPTS"

# ── D5: POST exam-item to package that has attempt → 409 ──
echo ""
echo "--- D5: POST exam-item to package with attempt → 409 ---"
D5_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/exam-items \
  -H "Content-Type: application/json" \
  -d "{
    \"examPackageId\": \"$EXAM_PKG_ID\",
    \"questionId\": \"$PG2_Q_ID\",
    \"orderNum\": 10
  }")
D5_STATUS=$(echo "$D5_RESP" | tail -1)
D5_BODY=$(echo "$D5_RESP" | sed '$d')
echo "POST exam-item with attempt: HTTP $D5_STATUS"
echo "Body: $D5_BODY"
assert_eq "D5: POST exam-item blocked with 409" "$D5_STATUS" "409"
assert_contains "D5: Error code HAS_ATTEMPTS" "$D5_BODY" "HAS_ATTEMPTS"

# ── D6: Empty package → operations should succeed ──
echo ""
echo "--- D6: Empty package operations ---"
EXAM2_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Tryout Kosong\",
    \"schoolId\": \"$SCHOOL_ID\",
    \"createdBy\": \"$GURU_A_ID\"
  }")
EXAM2_BODY=$(echo "$EXAM2_RESP" | sed '$d')
EXAM2_ID=$(echo "$EXAM2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "Empty package ID: $EXAM2_ID"

D6A_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/exam-items \
  -H "Content-Type: application/json" \
  -d "{
    \"examPackageId\": \"$EXAM2_ID\",
    \"questionId\": \"$PG1_Q_ID\",
    \"orderNum\": 1
  }")
D6A_STATUS=$(echo "$D6A_RESP" | tail -1)
echo "POST exam-item to empty package: HTTP $D6A_STATUS"
assert_eq "D6a: POST exam-item to empty package → 200" "$D6A_STATUS" "200"

D6B_RESP=$(curl -s -w "\n%{http_code}" -X PATCH http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$EXAM2_ID\",
    \"title\": \"Tryout Modified Successfully\"
  }")
D6B_STATUS=$(echo "$D6B_RESP" | tail -1)
echo "PATCH empty package: HTTP $D6B_STATUS"
assert_eq "D6b: PATCH empty package → 200" "$D6B_STATUS" "200"

# ── D7: Draft isolation between guru ──
echo ""
echo "=========================================="
echo "--- D7: Draft isolation between guru ---"
echo "=========================================="

# Guru A creates a draft question
DRAFT_A_RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"type\": \"pg\",
    \"content\": \"Draft soal milik Guru A saja\",
    \"answer\": \"A\",
    \"options\": [{\"label\":\"A\",\"text\":\"Benar\"},{\"label\":\"B\",\"text\":\"Salah\"}],
    \"createdBy\": \"$GURU_A_ID\"
  }")
DRAFT_A_BODY=$(echo "$DRAFT_A_RESP" | sed '$d')
DRAFT_A_ID=$(echo "$DRAFT_A_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','NONE'))" 2>/dev/null || echo "NONE")
echo "Draft question ID: $DRAFT_A_ID"

# Update to draft status
curl -s -X PATCH http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$DRAFT_A_ID\", \"status\": \"draft\"}" > /dev/null

# Fetch with createdBy filter
GURU_A_QUESTIONS=$(curl -s "http://localhost:3000/api/questions?createdBy=$GURU_A_ID" 2>&1)
GURU_A_DRAFTS=$(echo "$GURU_A_QUESTIONS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
drafts = [q for q in d if q.get('status')=='draft']
print(len(drafts))
" 2>/dev/null || echo "0")
echo "Guru A sees $GURU_A_DRAFTS draft(s)"

GURU_B_QUESTIONS=$(curl -s "http://localhost:3000/api/questions?createdBy=$GURU_B_ID" 2>&1)
GURU_B_DRAFTS=$(echo "$GURU_B_QUESTIONS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
drafts = [q for q in d if q.get('status')=='draft']
print(len(drafts))
" 2>/dev/null || echo "0")
echo "Guru B sees $GURU_B_DRAFTS draft(s)"

GURU_B_SEES_A_DRAFT=$(echo "$GURU_B_QUESTIONS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for q in d:
    if q.get('status')=='draft' and q.get('id')=='$DRAFT_A_ID':
        print('FOUND'); sys.exit(0)
print('NOT_FOUND')
" 2>/dev/null || echo "ERROR")
echo "Guru B sees Guru A's draft: $GURU_B_SEES_A_DRAFT"

assert_eq "D7: Guru A sees own draft" "$GURU_A_DRAFTS" "1"
assert_eq "D7: Guru B does NOT see Guru A's draft" "$GURU_B_SEES_A_DRAFT" "NOT_FOUND"

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
echo -e "$RESULTS"
echo ""
echo "Total: PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo ">>> ALL TESTS PASSED <<<"
  exit 0
else
  echo ">>> SOME TESTS FAILED <<<"
  exit 1
fi
