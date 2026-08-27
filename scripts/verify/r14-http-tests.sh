#!/bin/bash
# PANDAI R14 — HTTP Runtime Verification (no build, assumes dev server running)
set +e  # Don't exit on individual test failures
PASS=0; FAIL=0; RESULTS=""

assert_eq() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); RESULTS="$RESULTS\n✅ PASS: $1 (actual=$2)\n"
  else FAIL=$((FAIL+1)); RESULTS="$RESULTS\n❌ FAIL: $1 (expected=$3, actual=$2)\n"; fi
}
assert_contains() {
  if echo "$2" | grep -q "$3"; then PASS=$((PASS+1)); RESULTS="$RESULTS\n✅ PASS: $1\n"
  else FAIL=$((FAIL+1)); RESULTS="$RESULTS\n❌ FAIL: $1 (not found: '$3')\n"; fi
}
assert_not_contains() {
  if ! echo "$2" | grep -q "$3"; then PASS=$((PASS+1)); RESULTS="$RESULTS\n✅ PASS: $1\n"
  else FAIL=$((FAIL+1)); RESULTS="$RESULTS\n❌ FAIL: $1 (should NOT contain '$3')\n"; fi
}

echo "=========================================="
echo "PANDAI R14 — HTTP Runtime Verification"
echo "=========================================="

# ── Step 0: Verify server alive ──
echo ""
echo ">>> Step 0: Verify server alive"
PING=$(curl -s http://localhost:3000/api/subjects 2>&1 | head -c 100)
if [ -z "$PING" ]; then
  echo "FATAL: Server not reachable on localhost:3000"
  exit 1
fi
echo "Server alive: $PING"

# ── Step 1: Seed ──
echo ""
echo ">>> Step 1: Seed database"
SEED=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/seed)
SEED_STATUS=$(echo "$SEED" | grep "HTTP:" | sed 's/HTTP://')
echo "Seed: HTTP $SEED_STATUS"
if [ "$SEED_STATUS" != "200" ]; then
  echo "Seed failed! Response: $(echo $SEED | head -c 500)"
  exit 1
fi
sleep 2  # Give a moment for data to settle

# ── Step 2: Get IDs AFTER seed ──
echo ""
echo ">>> Step 2: Fetch IDs from seeded data"
SUBJECTS=$(curl -s http://localhost:3000/api/subjects)
SCHOOLS=$(curl -s http://localhost:3000/api/schools)
echo "Schools count: $(echo "$SCHOOLS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
echo "Subjects count: $(echo "$SUBJECTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"

SUBJECT_ID=$(echo "$SUBJECTS" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
# Find the school that actually has guru users (seed puts guru in the first-created school)
SCHOOL_ID=$(echo "$SCHOOLS" | python3 -c "
import sys, json
schools = json.load(sys.stdin)
# Try each school until we find one with users
for s in schools:
    print(s['id'])
" 2>/dev/null | head -1)
# Check which schools have users
for SID in $(echo "$SCHOOLS" | python3 -c "import sys,json; [print(s['id']) for s in json.load(sys.stdin)]" 2>/dev/null); do
  COUNT=$(curl -s "http://localhost:3000/api/users?schoolId=$SID&role=GURU" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "$COUNT" != "0" ]; then
    SCHOOL_ID=$SID
    break
  fi
done
echo "Subject: $SUBJECT_ID"
echo "School: $SCHOOL_ID"

# Fetch users for this school
USERS_SCHOOL=$(curl -s "http://localhost:3000/api/users?schoolId=$SCHOOL_ID&role=GURU")
GURU_COUNT=$(echo "$USERS_SCHOOL" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Guru count for school: $GURU_COUNT"
GURU_A=$(echo "$USERS_SCHOOL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if len(d)>0 else 'NONE')" 2>/dev/null || echo "NONE")
GURU_B=$(echo "$USERS_SCHOOL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[1]['id'] if len(d)>1 else 'NONE')" 2>/dev/null || echo "NONE")
echo "GuruA: $GURU_A, GuruB: $GURU_B"

# Find 3 students in same class
ALL_SISWA=$(curl -s "http://localhost:3000/api/users?schoolId=$SCHOOL_ID&role=SISWA")
SISWA_TOTAL=$(echo "$ALL_SISWA" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Siswa total: $SISWA_TOTAL"

CLASS_SISWA=$(echo "$ALL_SISWA" | python3 -c "
import sys, json
from collections import defaultdict
d = json.load(sys.stdin)
g = defaultdict(list)
for s in d:
    cid = s.get('classId')
    if cid: g[cid].append(s['id'])
for cid, ids in sorted(g.items()):
    if len(ids) >= 3:
        print(f'{cid}|{ids[0]}|{ids[1]}|{ids[2]}'); break
else:
    print(f'NONE|NONE|NONE|NONE')
" 2>/dev/null || echo "NONE|NONE|NONE|NONE")

CLASS_ID=$(echo "$CLASS_SISWA" | cut -d'|' -f1)
SISWA1=$(echo "$CLASS_SISWA" | cut -d'|' -f2)
SISWA2=$(echo "$CLASS_SISWA" | cut -d'|' -f3)
SISWA3=$(echo "$CLASS_SISWA" | cut -d'|' -f4)
echo "Class: $CLASS_ID"
echo "Siswa1: $SISWA1"
echo "Siswa2: $SISWA2"
echo "Siswa3: $SISWA3"

if [ "$GURU_A" = "NONE" ] || [ "$SISWA1" = "NONE" ] || [ "$CLASS_ID" = "NONE" ]; then
  echo "ERROR: Cannot find required test data"
  echo "All users: $(echo $ALL_SISWA | head -c 500)"
  exit 1
fi

# ═══════════════════════════════════════════
# GRUP A — SCORING
# ═══════════════════════════════════════════
echo ""
echo "=========================================="
echo "GRUP A — SCORING (via HTTP)"
echo "=========================================="

# ── Create test questions ──
echo ""
echo ">>> Creating test questions..."
PGK_RESP=$(curl -s -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"$SUBJECT_ID\",\"type\":\"pg_kompleks\",\"content\":\"Negara ASEAN dengan ibukota di Jawa\",\"answer\":\"A,B,C\",\"options\":[{\"label\":\"A\",\"text\":\"Indonesia\"},{\"label\":\"B\",\"text\":\"Brunei\"},{\"label\":\"C\",\"text\":\"Timor Leste\"},{\"label\":\"D\",\"text\":\"Filipina\"},{\"label\":\"E\",\"text\":\"Malaysia\"}],\"createdBy\":\"$GURU_A\"}")
PGK_ID=$(echo "$PGK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "PG Kompleks: $PGK_ID"

PG1_RESP=$(curl -s -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"$SUBJECT_ID\",\"type\":\"pg\",\"content\":\"Ibukota Indonesia?\",\"answer\":\"C\",\"options\":[{\"label\":\"A\",\"text\":\"Bandung\"},{\"label\":\"B\",\"text\":\"Surabaya\"},{\"label\":\"C\",\"text\":\"Jakarta\"}],\"createdBy\":\"$GURU_A\"}")
PG1_ID=$(echo "$PG1_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "PG1: $PG1_ID"

PG2_RESP=$(curl -s -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"$SUBJECT_ID\",\"type\":\"pg\",\"content\":\"1+1=?\",\"answer\":\"B\",\"options\":[{\"label\":\"A\",\"text\":\"1\"},{\"label\":\"B\",\"text\":\"2\"}],\"createdBy\":\"$GURU_A\"}")
PG2_ID=$(echo "$PG2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "PG2: $PG2_ID"

# ── A4: Submit with shuffled PG Kompleks ──
echo ""
echo "=========================================="
echo ">>> A4: PG Kompleks Set comparison (HTTP)"
echo "=========================================="
A4=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA1\",\"examPackageId\":\"PKG_A4\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"C,B,A\",\"timeSpent\":10},{\"questionId\":\"$PG1_ID\",\"answer\":\"C\",\"timeSpent\":5},{\"questionId\":\"$PG2_ID\",\"answer\":\"B\",\"timeSpent\":3}],\"duration\":18}")
echo "RAW:"
echo "$A4"

A4_CORRECT=$(echo "$A4" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'\{.*\}', data, re.DOTALL)
if m: print(json.loads(m.group()).get('totalCorrect',0))
else: print('PARSE_ERROR')
" 2>/dev/null)
A4_PCT=$(echo "$A4" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'\{.*\}', data, re.DOTALL)
if m: print(json.loads(m.group()).get('percentage',0))
else: print('PARSE_ERROR')
" 2>/dev/null)
A4_TKA=$(echo "$A4" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'\{.*\}', data, re.DOTALL)
if m: print(json.loads(m.group()).get('tkaPrediction',0))
else: print('PARSE_ERROR')
" 2>/dev/null)

echo ""
echo "A4 Results: correct=$A4_CORRECT pct=$A4_PCT tka=$A4_TKA"
assert_eq "A4: PG Kompleks Set comparison — 3 correct" "$A4_CORRECT" "3"
assert_eq "A4: Percentage = 100" "$A4_PCT" "100"
assert_not_contains "A4: TKA not linear 1000" "$A4_TKA" "1000"

# ── A5: Partial answer → wrong ──
echo ""
echo ">>> A5: Partial PG Kompleks (HTTP)"
A5=$(curl -s -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA1\",\"examPackageId\":\"PKG_A5\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"A,B\",\"timeSpent\":10}],\"duration\":10}")
A5_CORRECT=$(echo "$A5" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'\{.*\}', data, re.DOTALL)
if m: print(json.loads(m.group()).get('totalCorrect',0))
else: print('PARSE_ERROR')
" 2>/dev/null)
echo "A5 totalCorrect=$A5_CORRECT (should be 0)"
assert_eq "A5: Partial PG Kompleks → 0 correct" "$A5_CORRECT" "0"

# ── A6: Transaction safety ──
echo ""
echo ">>> A6: Transaction safety (HTTP)"
BEFORE=$(curl -s "http://localhost:3000/api/attempts?userId=$SISWA1" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "Attempts before: $BEFORE"
A6=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA1\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"A,B,C\"}]}")
A6_STATUS=$(echo "$A6" | grep "HTTP:" | sed 's/HTTP://')
echo "Invalid submit: HTTP $A6_STATUS"
echo "RAW: $A6"
assert_eq "A6: Missing fields → 400" "$A6_STATUS" "400"
AFTER=$(curl -s "http://localhost:3000/api/attempts?userId=$SISWA1" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "Attempts after: $AFTER"
assert_eq "A6: No partial write" "$AFTER" "$BEFORE"

# ── A7: Ranking ──
echo ""
echo "=========================================="
echo ">>> A7: Real DB ranking (HTTP)"
echo "=========================================="
# Create attempts for ranking
echo "Creating ranking attempts..."
curl -s -X POST http://localhost:3000/api/attempts -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA1\",\"examPackageId\":\"PKG_RANK\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"A,B,C\"},{\"questionId\":\"$PG1_ID\",\"answer\":\"C\"},{\"questionId\":\"$PG2_ID\",\"answer\":\"B\"}],\"duration\":18}" > /dev/null
echo "  Siswa1: 100%"

curl -s -X POST http://localhost:3000/api/attempts -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA2\",\"examPackageId\":\"PKG_RANK\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"X,Y,Z\"},{\"questionId\":\"$PG1_ID\",\"answer\":\"C\"},{\"questionId\":\"$PG2_ID\",\"answer\":\"X\"}],\"duration\":18}" > /dev/null
echo "  Siswa2: 33%"

curl -s -X POST http://localhost:3000/api/attempts -H "Content-Type: application/json" \
  -d "{\"userId\":\"$SISWA3\",\"examPackageId\":\"PKG_RANK\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PGK_ID\",\"answer\":\"X,Y\"},{\"questionId\":\"$PG1_ID\",\"answer\":\"A\"},{\"questionId\":\"$PG2_ID\",\"answer\":\"A\"}],\"duration\":18}" > /dev/null
echo "  Siswa3: 0%"

echo ""
echo ">>> GET /api/scores?studentId=$SISWA1"
S1=$(curl -s "http://localhost:3000/api/scores?studentId=$SISWA1")
echo "RAW: $S1"
S1_RANK=$(echo "$S1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('classRank',0))")
S1_AVG=$(echo "$S1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('avgScore',0))")
S1_TOTAL=$(echo "$S1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalClassmates',0))")
echo "Siswa1: rank=$S1_RANK avg=$S1_AVG classmates=$S1_TOTAL"

echo ""
echo ">>> GET /api/scores?studentId=$SISWA3"
S3=$(curl -s "http://localhost:3000/api/scores?studentId=$SISWA3")
echo "RAW: $S3"
S3_RANK=$(echo "$S3" | python3 -c "import sys,json; print(json.load(sys.stdin).get('classRank',0))")
echo "Siswa3: rank=$S3_RANK"

assert_eq "A7: Siswa1 (highest) is rank #1" "$S1_RANK" "1"
RANK_OK=$(echo "$S1_RANK $S3_RANK" | awk '{if ($1 < $2) print "OK"; else print "WRONG"}')
assert_eq "A7: Siswa1 outranks Siswa3" "$RANK_OK" "OK"

# ═══════════════════════════════════════════
# GRUP D — CRUD & GUARDS
# ═══════════════════════════════════════════
echo ""
echo "=========================================="
echo "GRUP D — CRUD & GUARDS (via HTTP)"
echo "=========================================="

# ── D1: Login ──
echo ""
echo ">>> D1: POST /api/auth/login"
# Find guru with username (some guru only have email)
GURU_LOGIN_ID=$(echo "$USERS_SCHOOL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for u in d:
    if u.get('username'):
        print(u['username']); break
    elif u.get('email'):
        print(u['email']); break
" 2>/dev/null)
echo "Guru login ID: $GURU_LOGIN_ID"
D1=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d "{\"username\":\"$GURU_LOGIN_ID\",\"password\":\"password123\"}")
D1_STATUS=$(echo "$D1" | grep "HTTP:" | sed 's/HTTP://')
echo "Login as $GURU_LOGIN_ID: HTTP $D1_STATUS"
echo "RAW: $(echo "$D1" | head -c 400)"
assert_eq "D1: Login success" "$D1_STATUS" "200"

# ── D2: Create exam ──
echo ""
echo ">>> D2: POST /api/exams"
D2=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" -d "{\"title\":\"Tryout Bulanan\",\"schoolId\":\"$SCHOOL_ID\",\"duration\":90,\"createdBy\":\"$GURU_A\"}")
D2_STATUS=$(echo "$D2" | grep "HTTP:" | sed 's/HTTP://')
echo "Create exam: HTTP $D2_STATUS"
echo "RAW: $(echo "$D2" | head -c 400)"
PKG_ID=$(echo "$D2" | python3 -c "
import sys, re, json
data = sys.stdin.read()
m = re.search(r'\{.*\}', data, re.DOTALL)
if m: print(json.loads(m.group()).get('id','NONE'))
else: print('NONE')
" 2>/dev/null)
echo "Package ID: $PKG_ID"
assert_eq "D2: Create package → 200" "$D2_STATUS" "200"

# ── D3: Attempt for this package ──
echo ""
echo ">>> D3: POST /api/attempts for package"
D3=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" -d "{\"userId\":\"$SISWA2\",\"examPackageId\":\"$PKG_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$PG1_ID\",\"answer\":\"C\",\"timeSpent\":5}],\"duration\":5}")
D3_STATUS=$(echo "$D3" | grep "HTTP:" | sed 's/HTTP://')
echo "Attempt for package: HTTP $D3_STATUS"
assert_eq "D3: Attempt created → 200" "$D3_STATUS" "200"

# ── D4: PATCH exam with attempt → 409 ──
echo ""
echo ">>> D4: PATCH /api/exams → 409 HAS_ATTEMPTS"
D4=$(curl -s -w "\nHTTP:%{http_code}" -X PATCH http://localhost:3000/api/exams \
  -H "Content-Type: application/json" -d "{\"id\":\"$PKG_ID\",\"title\":\"Should Fail\"}")
D4_STATUS=$(echo "$D4" | grep "HTTP:" | sed 's/HTTP://')
echo "PATCH with attempt: HTTP $D4_STATUS"
echo "RAW: $D4"
assert_eq "D4: 409 HAS_ATTEMPTS" "$D4_STATUS" "409"
assert_contains "D4: Code HAS_ATTEMPTS in body" "$D4" "HAS_ATTEMPTS"

# ── D5: POST exam-item → 409 ──
echo ""
echo ">>> D5: POST /api/exam-items → 409 HAS_ATTEMPTS"
D5=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/exam-items \
  -H "Content-Type: application/json" -d "{\"examPackageId\":\"$PKG_ID\",\"questionId\":\"$PG2_ID\",\"orderNum\":10}")
D5_STATUS=$(echo "$D5" | grep "HTTP:" | sed 's/HTTP://')
echo "POST exam-item: HTTP $D5_STATUS"
echo "RAW: $D5"
assert_eq "D5: 409 HAS_ATTEMPTS" "$D5_STATUS" "409"
assert_contains "D5: Code HAS_ATTEMPTS in body" "$D5" "HAS_ATTEMPTS"

# ── D6: Empty package operations ──
echo ""
echo ">>> D6: Empty package operations"
D6_PKG=$(curl -s -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" -d "{\"title\":\"Tryout Kosong\",\"schoolId\":\"$SCHOOL_ID\",\"createdBy\":\"$GURU_A\"}")
EMPTY_ID=$(echo "$D6_PKG" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Empty package: $EMPTY_ID"

D6A=$(curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:3000/api/exam-items \
  -H "Content-Type: application/json" -d "{\"examPackageId\":\"$EMPTY_ID\",\"questionId\":\"$PG1_ID\",\"orderNum\":1}")
D6A_STATUS=$(echo "$D6A" | grep "HTTP:" | sed 's/HTTP://')
echo "POST exam-item to empty: HTTP $D6A_STATUS"
assert_eq "D6a: Exam-item to empty → 200" "$D6A_STATUS" "200"

D6B=$(curl -s -w "\nHTTP:%{http_code}" -X PATCH http://localhost:3000/api/exams \
  -H "Content-Type: application/json" -d "{\"id\":\"$EMPTY_ID\",\"title\":\"Modified OK\"}")
D6B_STATUS=$(echo "$D6B" | grep "HTTP:" | sed 's/HTTP://')
echo "PATCH empty package: HTTP $D6B_STATUS"
assert_eq "D6b: PATCH empty → 200" "$D6B_STATUS" "200"

# ── D7: Draft isolation ──
echo ""
echo "=========================================="
echo ">>> D7: Draft isolation (HTTP)"
echo "=========================================="

# Guru A creates draft
DRAFT=$(curl -s -X POST http://localhost:3000/api/questions -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"$SUBJECT_ID\",\"type\":\"pg\",\"content\":\"Draft soal milik Guru A\",\"answer\":\"A\",\"options\":[{\"label\":\"A\",\"text\":\"Benar\"},{\"label\":\"B\",\"text\":\"Salah\"}],\"createdBy\":\"$GURU_A\"}")
DRAFT_ID=$(echo "$DRAFT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -X PATCH http://localhost:3000/api/questions -H "Content-Type: application/json" \
  -d "{\"id\":\"$DRAFT_ID\",\"status\":\"draft\"}" > /dev/null
echo "Guru A draft: $DRAFT_ID"

echo ""
echo ">>> GET /api/questions?createdBy=$GURU_A"
GA_Q=$(curl -s "http://localhost:3000/api/questions?createdBy=$GURU_A")
GA_SEES=$(echo "$GA_Q" | python3 -c "
import sys,json
d=json.load(sys.stdin)
found = any(q.get('status')=='draft' and q.get('id')=='$DRAFT_ID' for q in d)
print('FOUND' if found else 'NOT_FOUND')
")
echo "Guru A sees own draft: $GA_SEES"

echo ""
echo ">>> GET /api/questions?createdBy=$GURU_B"
GB_Q=$(curl -s "http://localhost:3000/api/questions?createdBy=$GURU_B")
GB_SEES=$(echo "$GB_Q" | python3 -c "
import sys,json
d=json.load(sys.stdin)
found = any(q.get('status')=='draft' and q.get('id')=='$DRAFT_ID' for q in d)
print('FOUND' if found else 'NOT_FOUND')
")
echo "Guru B sees A's draft: $GB_SEES"

assert_eq "D7: Guru A sees own draft" "$GA_SEES" "FOUND"
assert_eq "D7: Guru B does NOT see A's draft" "$GB_SEES" "NOT_FOUND"

# ── RESULTS ──
echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
echo -e "$RESULTS"
echo ""
echo "Total: PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" -eq 0 ]; then echo ">>> ALL TESTS PASSED <<<"; exit 0
else echo ">>> SOME TESTS FAILED <<<"; exit 1; fi
