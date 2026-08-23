#!/bin/bash
# PANDAI Final Launch Audit — Putaran 47
# Semua bukti curl + query DB
set -euo pipefail
BASE='http://127.0.0.1:3000'
DB='/home/z/my-project/db/custom.db'
PASS=0; FAIL=0; WARN=0; SKIP=0
PASS_LIST=''; FAIL_LIST=''; WARN_LIST=''; SKIP_LIST=''

log_pass() { PASS=$((PASS+1)); PASS_LIST="$PASS_LIST\n  ✅ $1"; }
log_fail() { FAIL=$((FAIL+1)); FAIL_LIST="$FAIL_LIST\n  ❌ $1"; }
log_warn() { WARN=$((WARN+1)); WARN_LIST="$WARN_LIST\n  ⚠️  $1"; }
log_skip() { SKIP=$((SKIP+1)); SKIP_LIST="$SKIP_LIST\n  ⏭️  $1"; }

# Cookie-based auth helper
login() {
  local user="$1" pass="$2" cookie_file="$3"
  curl -s -c /tmp/"$cookie_file" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" -o /tmp/"${cookie_file}.json" 2>/dev/null
  STATUS=$(curl -so /dev/null -w '%{http_code}' -c /tmp/"$cookie_file" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" 2>/dev/null)
  echo "$STATUS"
}

api() {
  local method="$1" path="$2" data="$3" cookie="$4"
  local extra_headers=''
  if [ -n "$cookie" ]; then
    extra_headers="-b /tmp/$cookie"
  fi
  if [ -n "$data" ]; then
    RESP=$(curl -s -w '\n%{http_code}' -X $method $extra_headers \
      -H 'Content-Type: application/json' \
      -d "$data" "$BASE$path" 2>/dev/null)
  else
    RESP=$(curl -s -w '\n%{http_code}' -X $method $extra_headers "$BASE$path" 2>/dev/null)
  fi
  STATUS=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  echo "$STATUS"
  echo "$BODY"
}

api_raw() {
  local method="$1" path="$2" data="$3" cookie="$4"
  local extra_headers=''
  if [ -n "$cookie" ]; then
    extra_headers="-b /tmp/$cookie"
  fi
  if [ -n "$data" ]; then
    curl -s -o /dev/null -w '%{http_code}|%{time_total}' -X $method $extra_headers \
      -H 'Content-Type: application/json' \
      -d "$data" "$BASE$path" 2>/dev/null
  else
    curl -s -o /dev/null -w '%{http_code}|%{time_total}' -X $method $extra_headers "$BASE$path" 2>/dev/null
  fi
}

db_query() {
  sqlite3 "$DB" "$1" 2>/dev/null
}

# ════════════════════════════════════════════════
echo "========================================"
echo "  PANDAI FINAL LAUNCH AUDIT"
echo "  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================"
echo ""

# ── 0. GIT STATUS ──
echo "── BAGIAN 0: GIT & SERVER STATUS ──"
GIT_HEAD=$(git log --oneline -1 2>/dev/null)
GIT_REMOTE=$(git remote get-url origin 2>/dev/null | sed 's/https:\/\/@.*@/https:\/\/[REDACTED]@/')
GIT_AHEAD=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
GIT_BEHIND=$(git log --oneline HEAD..origin/main 2>/dev/null | wc -l)
echo "  HEAD: $GIT_HEAD"
echo "  Remote: $GIT_REMOTE"
echo "  Divergence: ${GIT_AHEAD} ahead, ${GIT_BEHIND} behind"
if [ "$GIT_AHEAD" -eq 0 ] && [ "$GIT_BEHIND" -eq 0 ]; then
  log_pass "Git HEAD = origin/main (no divergence)"
else
  log_warn "Git divergence: $GIT_AHEAD ahead, $GIT_BEHIND behind"
fi

echo "  Uncommitted: $(git status --short 2>/dev/null | wc -l) files"
if [ "$(git status --short 2>/dev/null | wc -l)" -gt 0 ]; then
  log_warn "$(git status --short 2>/dev/null | wc -l) uncommitted files"
fi

# Health check
HEALTH=$(curl -s "$BASE/api/health" 2>/dev/null)
echo "  Health: $HEALTH"
if echo "$HEALTH" | grep -q '"ok"'; then
  log_pass "Server running, DB connected"
else
  log_fail "Server not running"
  exit 1
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1: AUTH REGRESSION ──"
# ════════════════════════════════════════════════

# Login each role
SA_STATUS=$(login "superadmin@pandai.id" "password123" "sa.cookie")
if [ "$SA_STATUS" = "200" ]; then log_pass "Login SUPER_ADMIN → 200"; else log_fail "Login SUPER_ADMIN → $SA_STATUS"; fi

sleep 1
AS_STATUS=$(login "admin.sdn1@pandai.id" "password123" "as.cookie")
if [ "$AS_STATUS" = "200" ]; then log_pass "Login ADMIN_SCHOOL → 200"; else log_fail "Login ADMIN_SCHOOL → $AS_STATUS"; fi

sleep 1
KS_STATUS=$(login "kepsek.sdn1" "password123" "ks.cookie")
if [ "$KS_STATUS" = "200" ]; then log_pass "Login KEPALA_SEKOLAH → 200"; else log_fail "Login KEPALA_SEKOLAH → $KS_STATUS"; fi

sleep 1
GU_STATUS=$(login "198504152010011001" "password123" "gu.cookie")
if [ "$GU_STATUS" = "200" ]; then log_pass "Login GURU → 200"; else log_fail "Login GURU → $GU_STATUS"; fi

sleep 1
SW_STATUS=$(login "0051234567" "password123" "sw.cookie")
if [ "$SW_STATUS" = "200" ]; then log_pass "Login SISWA → 200"; else log_fail "Login SISWA → $SW_STATUS"; fi

sleep 1
OT_STATUS=$(login "rahman" "123" "ot.cookie")
if [ "$OT_STATUS" = "200" ]; then log_pass "Login ORANG_TUA → 200"; else log_fail "Login ORANG_TUA → $OT_STATUS"; fi

# Validate login responses
SA_BODY=$(cat /tmp/sa.cookie.json 2>/dev/null)
if echo "$SA_BODY" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d["role"]=="SUPER_ADMIN";assert "nik" not in d' 2>/dev/null; then
  log_pass "SA response: role correct, NIK absent (PII safe)"
else
  log_fail "SA response: role wrong or NIK leaked"
fi

# Empty login
EMPTY_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
if [ "$EMPTY_STATUS" = "400" ]; then log_pass "Empty login → 400"; else log_fail "Empty login → $EMPTY_STATUS"; fi

# Wrong password
WRONG_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"superadmin@pandai.id","password":"wrong"}' 2>/dev/null)
if [ "$WRONG_STATUS" = "401" ]; then log_pass "Wrong password → 401"; else log_fail "Wrong password → $WRONG_STATUS"; fi

# No token → 401
NOTOK=$(curl -so /dev/null -w '%{http_code}' "$BASE/api/schools" 2>/dev/null)
if [ "$NOTOK" = "401" ]; then log_pass "No token → 401"; else log_fail "No token → $NOTOK"; fi

# Logout
LOGOUT_STATUS=$(curl -so /dev/null -w '%{http_code}' -b /tmp/sa.cookie -X POST "$BASE/api/auth/logout" 2>/dev/null)
if [ "$LOGOUT_STATUS" = "200" ]; then log_pass "Logout → 200"; else log_fail "Logout → $LOGOUT_STATUS"; fi

# Re-login SA after logout
sleep 1
SA_STATUS2=$(login "superadmin@pandai.id" "password123" "sa2.cookie")
if [ "$SA_STATUS2" = "200" ]; then log_pass "Re-login after logout → 200"; else log_fail "Re-login after logout → $SA_STATUS2"; fi

# Use sa2 for remaining SA tests
mv /tmp/sa2.cookie /tmp/sa.cookie 2>/dev/null; mv /tmp/sa2.cookie.json /tmp/sa.cookie.json 2>/dev/null

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1b: SUPER ADMIN ENDPOINTS ──"
# ════════════════════════════════════════════════

RESULT=$(api GET "/api/schools" "" "sa.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
SCHOOL_COUNT=$(echo "$BODY" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' 2>/dev/null || echo '0')
if [ "$STATUS" = "200" ]; then log_pass "GET /api/schools → 200 ($SCHOOL_COUNT schools)"; else log_fail "GET /api/schools → $STATUS"; fi

RESULT=$(api GET "/api/users" "" "sa.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/users (global) → 200"; else log_fail "GET /api/users (global) → $STATUS"; fi

RESULT=$(api GET "/api/subjects" "" "sa.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/subjects → 200"; else log_fail "GET /api/subjects → $STATUS"; fi

# Create school
NEW_SCH=$(api POST "/api/schools" '{"name":"SMA Audit 47","code":"SMA-AUD47","address":"Jl. Test","schoolType":"SMA","province":"Jawa Barat","city":"Bandung"}' "sa.cookie")
SCH_STATUS=$(echo "$NEW_SCH" | head -1); SCH_BODY=$(echo "$NEW_SCH" | tail -n +2)
NEW_SCH_ID=$(echo "$SCH_BODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
if [ "$SCH_STATUS" = "200" ] || [ "$SCH_STATUS" = "201" ]; then log_pass "POST /api/schools → $SCH_STATUS"; else log_fail "POST /api/schools → $SCH_STATUS"; fi

# Create admin for new school
if [ -n "$NEW_SCH_ID" ]; then
  ADM_RESULT=$(api POST "/api/users" "{\"name\":\"Admin Audit\",\"email\":\"admin.audit47@pandai.id\",\"role\":\"ADMIN_SCHOOL\",\"schoolId\":\"$NEW_SCH_ID\",\"password\":\"password123\"}" "sa.cookie")
  ADM_STATUS=$(echo "$ADM_RESULT" | head -1)
  if [ "$ADM_STATUS" = "200" ]; then log_pass "POST /api/users (create admin) → $ADM_STATUS"; else log_fail "POST /api/users (create admin) → $ADM_STATUS"; fi
fi

# DB verify school count
DB_SCHOOLS=$(db_query "SELECT COUNT(*) FROM School")
echo "  [DB] Total schools: $DB_SCHOOLS"

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1c: ADMIN SEKOLAH ENDPOINTS ──"
# ════════════════════════════════════════════════

RESULT=$(api GET "/api/classes" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/classes (admin) → 200"; else log_fail "GET /api/classes (admin) → $STATUS"; fi

RESULT=$(api GET "/api/users?role=SISWA" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/users?role=SISWA (admin) → 200"; else log_fail "GET /api/users?role=SISWA → $STATUS"; fi

RESULT=$(api GET "/api/teacher-assignments" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/teacher-assignments → 200"; else log_fail "GET /api/teacher-assignments → $STATUS"; fi

RESULT=$(api GET "/api/timetable" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/timetable → 200"; else log_fail "GET /api/timetable → $STATUS"; fi

RESULT=$(api GET "/api/teaching-journals" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/teaching-journals → 200"; else log_fail "GET /api/teaching-journals → $STATUS"; fi

# Create class (should this work? API has no POST...)
CLASS_RESULT=$(api POST "/api/classes" '{"name":"Kelas Test 47","grade":7,"academicYear":"2025/2026"}' "as.cookie")
CLASS_STATUS=$(echo "$CLASS_RESULT" | head -1)
if [ "$CLASS_STATUS" = "405" ] || [ "$CLASS_STATUS" = "404" ]; then
  log_fail "POST /api/classes → $CLASS_STATUS (no create endpoint exists)"
else
  log_warn "POST /api/classes → $CLASS_STATUS (unexpected)"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1d: GURU ENDPOINTS ──"
# ════════════════════════════════════════════════

# Get school/class/subject IDs
SCHOOL_ID=$(db_query "SELECT id FROM School WHERE code='SDN1-MKS' LIMIT 1")
CLASS_ID=$(db_query "SELECT id FROM Class WHERE schoolId='$SCHOOL_ID' LIMIT 1")
SUBJECT_ID=$(db_query "SELECT id FROM Subject LIMIT 1")
GURU_ID=$(db_query "SELECT id FROM User WHERE username='198504152010011001'")
SISWA_ID=$(db_query "SELECT id FROM User WHERE username='0051234567'")
echo "  School=$SCHOOL_ID Class=$CLASS_ID Subject=$SUBJECT_ID Guru=$GURU_ID Siswa=$SISWA_ID"

RESULT=$(api GET "/api/questions" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/questions (guru) → 200"; else log_fail "GET /api/questions → $STATUS"; fi

RESULT=$(api GET "/api/assignments" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/assignments (guru) → 200"; else log_fail "GET /api/assignments → $STATUS"; fi

RESULT=$(api GET "/api/materials" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/materials (guru) → 200"; else log_fail "GET /api/materials → $STATUS"; fi

RESULT=$(api GET "/api/character-reports" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/character-reports (guru) → 200"; else log_fail "GET /api/character-reports → $STATUS"; fi

RESULT=$(api GET "/api/grade-components" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/grade-components (guru) → 200"; else log_fail "GET /api/grade-components → $STATUS"; fi

RESULT=$(api GET "/api/student-grades" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/student-grades (guru) → 200"; else log_fail "GET /api/student-grades → $STATUS"; fi

RESULT=$(api GET "/api/competency-assessments" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/competency-assessments (guru) → 200"; else log_fail "GET /api/competency-assessments → $STATUS"; fi

RESULT=$(api GET "/api/attendance" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/attendance (guru) → 200"; else log_fail "GET /api/attendance → $STATUS"; fi

# Create question
Q_RESULT=$(api POST "/api/questions" "{\"text\":\"Soal audit 47?\",\"type\":\"pg\",\"options\":[\"A. Ya\",\"B. Tidak\",\"C. Mungkin\",\"D. Tidak tahu\"],\"answer\":\"A. Ya\",\"explanation\":\"Karena A benar\",\"subjectId\":\"$SUBJECT_ID\",\"difficulty\":\"sedang\",\"bloomLevel\":\"C3\"}" "gu.cookie")
Q_STATUS=$(echo "$Q_RESULT" | head -1); Q_BODY=$(echo "$Q_RESULT" | tail -n +2)
Q_ID=$(echo "$Q_BODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
if [ "$Q_STATUS" = "200" ] || [ "$Q_STATUS" = "201" ]; then log_pass "POST /api/questions (create) → $Q_STATUS"; else log_fail "POST /api/questions → $Q_STATUS"; fi

# Create assignment with questions
A_RESULT=$(api POST "/api/assignments" "{\"title\":\"Tugas Audit 47\",\"description\":\"Deskripsi\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"type\":\"assignment\",\"deadline\":\"2027-01-01T00:00:00Z\"}" "gu.cookie")
A_STATUS=$(echo "$A_RESULT" | head -1); A_BODY=$(echo "$A_RESULT" | tail -n +2)
A_ID=$(echo "$A_BODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
if [ "$A_STATUS" = "200" ] || [ "$A_STATUS" = "201" ]; then log_pass "POST /api/assignments (create) → $A_STATUS"; else log_fail "POST /api/assignments → $A_STATUS"; fi

# Add question to assignment
if [ -n "$A_ID" ] && [ -n "$Q_ID" ]; then
  AQ_RESULT=$(api POST "/api/assignments/$A_ID/questions" "{\"questionId\":\"$Q_ID\",\"points\":10}" "gu.cookie")
  AQ_STATUS=$(echo "$AQ_RESULT" | head -1)
  if [ "$AQ_STATUS" = "200" ]; then log_pass "POST /api/assignments/:id/questions → $AQ_STATUS"; else log_fail "POST /api/assignments/:id/questions → $AQ_STATUS"; fi
fi

# Teaching journal
J_RESULT=$(api POST "/api/teaching-journals" "{\"date\":\"2026-08-21\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"topic\":\"Audit test\",\"activity\":\"Audit activity\",\"notes\":\"Audit notes\"}" "gu.cookie")
J_STATUS=$(echo "$J_RESULT" | head -1)
if [ "$J_STATUS" = "200" ] || [ "$J_STATUS" = "201" ]; then log_pass "POST /api/teaching-journals → $J_STATUS"; else log_fail "POST /api/teaching-journals → $J_STATUS"; fi

# External quiz score
EQS_RESULT=$(api POST "/api/external-quiz-scores" "{\"studentId\":\"$SISWA_ID\",\"title\":\"Quiz Audit\",\"score\":85,\"maxScore\":100,\"subject\":\"Matematika\"}" "gu.cookie")
EQS_STATUS=$(echo "$EQS_RESULT" | head -1)
if [ "$EQS_STATUS" = "200" ] || [ "$EQS_STATUS" = "201" ]; then log_pass "POST /api/external-quiz-scores → $EQS_STATUS"; else log_fail "POST /api/external-quiz-scores → $EQS_STATUS"; fi

# Attendance
ATT_RESULT=$(api POST "/api/attendance" "{\"date\":\"2026-08-21\",\"classId\":\"$CLASS_ID\",\"records\":[{\"studentId\":\"$SISWA_ID\",\"status\":\"hadir\"}]}" "gu.cookie")
ATT_STATUS=$(echo "$ATT_RESULT" | head -1)
if [ "$ATT_STATUS" = "200" ]; then log_pass "POST /api/attendance → $ATT_STATUS"; else log_fail "POST /api/attendance → $ATT_STATUS"; fi

# Grade components
GC_RESULT=$(api POST "/api/grade-components" "{\"name\":\"Tugas Harian\",\"weight\":30,\"type\":\"pengetahuan\"}" "gu.cookie")
GC_STATUS=$(echo "$GC_RESULT" | head -1)
if [ "$GC_STATUS" = "200" ] || [ "$GC_STATUS" = "201" ]; then log_pass "POST /api/grade-components → $GC_STATUS"; else log_fail "POST /api/grade-components → $GC_STATUS"; fi

# Student grades
SG_RESULT=$(api POST "/api/student-grades" "{\"studentId\":\"$SISWA_ID\",\"subjectId\":\"$SUBJECT_ID\",\"componentId\":\"$(db_query 'SELECT id FROM GradeComponent LIMIT 1')\",\"score\":85}" "gu.cookie")
SG_STATUS=$(echo "$SG_RESULT" | head -1)
if [ "$SG_STATUS" = "200" ] || [ "$SG_STATUS" = "201" ]; then log_pass "POST /api/student-grades → $SG_STATUS"; else log_fail "POST /api/student-grades → $SG_STATUS"; fi

# Character report
CR_RESULT=$(api POST "/api/character-reports" "{\"studentId\":\"$SISWA_ID\",\"period\":\"2026/2027\",\"habits\":{\"disiplin\":4,\"kerjasama\":3,\"tanggungJawab\":5}}" "gu.cookie")
CR_STATUS=$(echo "$CR_RESULT" | head -1)
if [ "$CR_STATUS" = "200" ] || [ "$CR_STATUS" = "201" ]; then log_pass "POST /api/character-reports → $CR_STATUS"; else log_fail "POST /api/character-reports → $CR_STATUS"; fi

# Competency assessment
CA_RESULT=$(api POST "/api/competency-assessments" "{\"studentId\":\"$SISWA_ID\",\"subjectId\":\"$SUBJECT_ID\",\"dimension\":\"pengetahuan\",\"score\":80,\"notes\":\"Audit test\"}" "gu.cookie")
CA_STATUS=$(echo "$CA_RESULT" | head -1)
if [ "$CA_STATUS" = "200" ] || [ "$CA_STATUS" = "201" ]; then log_pass "POST /api/competency-assessments → $CA_STATUS"; else log_fail "POST /api/competency-assessments → $CA_STATUS"; fi

# Feedback
FB_RESULT=$(api POST "/api/feedback" "{\"title\":\"Feedback Audit\",\"category\":\"saran\",\"message\":\"Ini feedback audit putaran 47\"}" "gu.cookie")
FB_STATUS=$(echo "$FB_RESULT" | head -1)
if [ "$FB_STATUS" = "200" ] || [ "$FB_STATUS" = "201" ]; then log_pass "POST /api/feedback → $FB_STATUS"; else log_fail "POST /api/feedback → $FB_STATUS"; fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1e: SISWA ENDPOINTS ──"
# ════════════════════════════════════════════════

RESULT=$(api GET "/api/assignments" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/assignments (siswa) → 200"; else log_fail "GET /api/assignments (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/scores" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/scores (siswa) → 200"; else log_fail "GET /api/scores (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/attempts" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/attempts (siswa) → 200"; else log_fail "GET /api/attempts (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/materials" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/materials (siswa) → 200"; else log_fail "GET /api/materials (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/attendance" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/attendance (siswa) → 200"; else log_fail "GET /api/attendance (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/student-grades" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/student-grades (siswa) → 200"; else log_fail "GET /api/student-grades (siswa) → $STATUS"; fi

RESULT=$(api GET "/api/external-quiz-scores" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/external-quiz-scores (siswa) → 200"; else log_fail "GET /api/external-quiz-scores (siswa) → $STATUS"; fi

# Siswa submit assignment
if [ -n "$A_ID" ]; then
  SUB_RESULT=$(api POST "/api/assignments/$A_ID/submissions" "{\"studentId\":\"$SISWA_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"action\":\"submit\",\"answers\":[{\"questionId\":\"$Q_ID\",\"answer\":\"A. Ya\"}]}" "sw.cookie")
  SUB_STATUS=$(echo "$SUB_RESULT" | head -1)
  if [ "$SUB_STATUS" = "200" ]; then
    log_pass "POST submissions (siswa submit) → $SUB_STATUS"
    # DB verify
    DB_SUB=$(db_query "SELECT COUNT(*) FROM AssignmentSubmission WHERE assignmentId='$A_ID'")
    echo "  [DB] Submissions for assignment: $DB_SUB"
    DB_ANS=$(db_query "SELECT COUNT(*) FROM AssignmentAnswer")
    echo "  [DB] Total answers: $DB_ANS"
  else
    log_fail "POST submissions (siswa submit) → $SUB_STATUS"
  fi
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1f: ORANG TUA ENDPOINTS ──"
# ════════════════════════════════════════════════

RESULT=$(api GET "/api/scores" "" "ot.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
if [ "$STATUS" = "200" ]; then
  log_pass "GET /api/scores (ortu) → 200"
else
  log_fail "GET /api/scores (ortu) → $STATUS"
  echo "  Body: $(echo $BODY | head -c 200)"
fi

RESULT=$(api GET "/api/attendance" "" "ot.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/attendance (ortu) → 200"; else log_fail "GET /api/attendance (ortu) → $STATUS"; fi

RESULT=$(api GET "/api/character-reports" "" "ot.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/character-reports (ortu) → 200"; else log_fail "GET /api/character-reports (ortu) → $STATUS"; fi

RESULT=$(api GET "/api/student-grades" "" "ot.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/student-grades (ortu) → 200"; else log_fail "GET /api/student-grades (ortu) → $STATUS"; fi

# CRITICAL: Ortu trying to get children list (the known bug)
RESULT=$(api GET "/api/users?parentId=$(db_query "SELECT id FROM User WHERE username='rahman'")" "" "ot.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
if [ "$STATUS" = "403" ]; then
  log_fail "GET /api/users?parentId=X (ortu) → 403 — RBAC blocks Orang Tua from own children data"
  echo "  Body: $(echo $BODY | head -c 200)"
elif [ "$STATUS" = "200" ]; then
  log_pass "GET /api/users?parentId=X (ortu) → 200"
else
  log_warn "GET /api/users?parentId=X (ortu) → $STATUS (unexpected)"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 1g: KEPALA SEKOLAH ENDPOINTS ──"
# ════════════════════════════════════════════════

RESULT=$(api GET "/api/kepsek/dashboard" "" "ks.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/kepsek/dashboard → 200"; else log_fail "GET /api/kepsek/dashboard → $STATUS"; fi

RESULT=$(api GET "/api/attendance" "" "ks.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/attendance (kepsek) → 200"; else log_fail "GET /api/attendance (kepsek) → $STATUS"; fi

# Kepsek should NOT access individual user data
RESULT=$(api GET "/api/users" "" "ks.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
if [ "$STATUS" = "403" ]; then
  log_pass "GET /api/users (kepsek) → 403 (correctly blocked)"
else
  log_fail "GET /api/users (kepsek) → $STATUS (should be 403)"
  echo "  Body: $(echo $BODY | head -c 200)"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 2: REPORTS & HEAVY ENDPOINTS ──"
# ════════════════════════════════════════════════

# Rapor
TIMING=$(api_raw GET "/api/reports/rapor-siswa?classId=$CLASS_ID" "" "gu.cookie")
RAPOR_STATUS=$(echo "$TIMING" | cut -d'|' -f1)
RAPOR_TIME=$(echo "$TIMING" | cut -d'|' -f2)
if [ "$RAPOR_STATUS" = "200" ]; then
  log_pass "GET /api/reports/rapor-siswa → 200 (${RAPOR_TIME}s)"
else
  log_fail "GET /api/reports/rapor-siswa → $RAPOR_STATUS (${RAPOR_TIME}s)"
fi

# Rekap kelas
TIMING=$(api_raw GET "/api/reports/rekap-kelas?classId=$CLASS_ID" "" "as.cookie")
REKAP_STATUS=$(echo "$TIMING" | cut -d'|' -f1)
REKAP_TIME=$(echo "$TIMING" | cut -d'|' -f2)
if [ "$REKAP_STATUS" = "200" ]; then
  log_pass "GET /api/reports/rekap-kelas → 200 (${REKAP_TIME}s)"
else
  log_fail "GET /api/reports/rekap-kelas → $REKAP_STATUS (${REKAP_TIME}s)"
fi

# Final grades
TIMING=$(api_raw GET "/api/grades/final?classId=$CLASS_ID" "" "gu.cookie")
FINAL_STATUS=$(echo "$TIMING" | cut -d'|' -f1)
FINAL_TIME=$(echo "$TIMING" | cut -d'|' -f2)
if [ "$FINAL_STATUS" = "200" ]; then
  log_pass "GET /api/grades/final → 200 (${FINAL_TIME}s)"
else
  log_fail "GET /api/grades/final → $FINAL_STATUS (${FINAL_TIME}s)"
fi

# Submissions (guru view)
if [ -n "$A_ID" ]; then
  TIMING=$(api_raw GET "/api/assignments/$A_ID/submissions" "" "gu.cookie")
  SUB_G_STATUS=$(echo "$TIMING" | cut -d'|' -f1)
  SUB_G_TIME=$(echo "$TIMING" | cut -d'|' -f2)
  if [ "$SUB_G_STATUS" = "200" ]; then
    log_pass "GET /api/assignments/:id/submissions → 200 (${SUB_G_TIME}s)"
  else
    log_fail "GET /api/assignments/:id/submissions → $SUB_G_STATUS (${SUB_G_TIME}s)"
  fi
fi

# AI endpoints
RESULT=$(api GET "/api/ai/config" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/ai/config → 200"; else log_fail "GET /api/ai/config → $STATUS"; fi

RESULT=$(api GET "/api/ai/usage" "" "gu.cookie")
STATUS=$(echo "$RESULT" | head -1)
if [ "$STATUS" = "200" ]; then log_pass "GET /api/ai/usage → 200"; else log_fail "GET /api/ai/usage → $STATUS"; fi

# Exams (siswa)
RESULT=$(api GET "/api/exams" "" "sw.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
EXAM_BODY=$(echo "$BODY" | head -c 200)
if [ "$STATUS" = "200" ]; then
  log_pass "GET /api/exams (siswa) → 200"
elif [ "$STATUS" = "403" ]; then
  log_fail "GET /api/exams (siswa) → 403 — siswa blocked from exams"
  echo "  Body: $EXAM_BODY"
else
  log_warn "GET /api/exams (siswa) → $STATUS"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 3: SECURITY — AUTH & ISOLATION ──"
# ════════════════════════════════════════════════

# 3a. No token
NOTOK=$(curl -so /dev/null -w '%{http_code}' "$BASE/api/schools" 2>/dev/null)
[ "$NOTOK" = "401" ] && log_pass "3a. No token /api/schools → 401" || log_fail "3a. No token → $NOTOK"

NOTOK2=$(curl -so /dev/null -w '%{http_code}' "$BASE/api/questions" 2>/dev/null)
[ "$NOTOK2" = "401" ] && log_pass "3a. No token /api/questions → 401" || log_fail "3a. No token → $NOTOK2"

NOTOK3=$(curl -so /dev/null -w '%{http_code}' "$BASE/api/assignments" 2>/dev/null)
[ "$NOTOK3" = "401" ] && log_pass "3a. No token /api/assignments → 401" || log_fail "3a. No token → $NOTOK3"

# 3b. Cross-school isolation (admin SD tries to access SMP data)
SMP_SCHOOL_ID=$(db_query "SELECT id FROM School WHERE code='SMPN2-SBY'")
SMP_CLASS_ID=$(db_query "SELECT id FROM Class WHERE schoolId='$SMP_SCHOOL_ID' LIMIT 1")
RESULT=$(api GET "/api/users?schoolId=$SMP_SCHOOL_ID" "" "as.cookie")
STATUS=$(echo "$RESULT" | head -1); BODY=$(echo "$RESULT" | tail -n +2)
# Admin SD is scoped to own school - but the API allows SUPER_ADMIN to pass schoolId
# Admin School doesn't have schoolId filter override in the query
USERS_BODY=$(echo "$BODY" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for u in d:
  if u.get("schoolId") != "'"'"$SCHOOL_ID"'"'":
    print(f"LEAK: user {u.get(\"id\")} from school {u.get(\"schoolId\")}")
    sys.exit(1)
print("OK: all users from own school")
' 2>/dev/null)
if [ $? -eq 0 ]; then
  log_pass "3b. Cross-school isolation (admin) — no data leak"
else
  log_fail "3b. Cross-school isolation LEAK: $USERS_BODY"
fi

# 3c. Siswa tries to create question
SQ_RESULT=$(api POST "/api/questions" '{"text":"cheat"}' "sw.cookie")
SQ_STATUS=$(echo "$SQ_RESULT" | head -1)
if [ "$SQ_STATUS" = "403" ]; then
  log_pass "3c. Siswa POST /api/questions → 403 (blocked)"
else
  log_fail "3c. Siswa POST /api/questions → $SQ_STATUS (should be 403)"
fi

# 3d. Siswa tries to create assignment
SA2_RESULT=$(api POST "/api/assignments" '{"title":"cheat"}' "sw.cookie")
SA2_STATUS=$(echo "$SA2_RESULT" | head -1)
if [ "$SA2_STATUS" = "403" ]; then
  log_pass "3d. Siswa POST /api/assignments → 403 (blocked)"
else
  log_fail "3d. Siswa POST /api/assignments → $SA2_STATUS (should be 403)"
fi

# 3e. Orang Tua tries to access grade components (admin feature)
OT_GC=$(api GET "/api/grade-components" "" "ot.cookie")
OT_GC_STATUS=$(echo "$OT_GC" | head -1)
if [ "$OT_GC_STATUS" = "403" ]; then
  log_pass "3e. Ortu GET /api/grade-components → 403 (blocked)"
else
  log_warn "3e. Ortu GET /api/grade-components → $OT_GC_STATUS (should be 403?)"
fi

# 3f. Ortu tries to POST competency assessment
OT_CA=$(api POST "/api/competency-assessments" '{"score":100}' "ot.cookie")
OT_CA_STATUS=$(echo "$OT_CA" | head -1)
if [ "$OT_CA_STATUS" = "403" ]; then
  log_pass "3f. Ortu POST /api/competency-assessments → 403 (blocked)"
else
  log_warn "3f. Ortu POST /api/competency-assessments → $OT_CA_STATUS (should be 403?)"
fi

# 3g. Siswa tries to submit as ANOTHER student (IDOR test)
OTHER_SISWA=$(db_query "SELECT id FROM User WHERE username='0051234568' LIMIT 1")
if [ -n "$OTHER_SISWA" ] && [ -n "$A_ID" ]; then
  IDOR_RESULT=$(api POST "/api/assignments/$A_ID/submissions" "{\"studentId\":\"$OTHER_SISWA\",\"action\":\"draft\",\"answers\":[]}" "sw.cookie")
  IDOR_STATUS=$(echo "$IDOR_RESULT" | head -1)
  if [ "$IDOR_STATUS" = "403" ]; then
    log_pass "3g. Siswa IDOR (submit as other student) → 403 (blocked)"
  else
    log_fail "3g. Siswa IDOR (submit as other student) → $IDOR_STATUS (VULN: should be 403)"
  fi
fi

# 3h. Rate limiting still works
for i in $(seq 1 6); do
  RL_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}' 2>/dev/null)
done
if [ "$RL_STATUS" = "429" ]; then
  log_pass "3h. Rate limit → 429 after 6 attempts"
else
  log_warn "3h. Rate limit → $RL_STATUS after 6 attempts (expected 429)"
fi

# 3i. Seed endpoint
SEED_STATUS=$(curl -so /dev/null -w '%{http_code}' "$BASE/api/seed" 2>/dev/null)
if [ "$SEED_STATUS" = "401" ]; then
  log_pass "3i. GET /api/seed (no auth) → 401"
else
  log_fail "3i. GET /api/seed → $SEED_STATUS (should be 401 — dangerous endpoint)"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 4: OPERATIONAL READINESS ──"
# ════════════════════════════════════════════════

# 4a. Check .env for secrets
if rg -q 'ghp_[a-zA-Z0-9]{30,}' .env 2>/dev/null; then
  log_fail "4a. GitHub token found in .env!"
else
  log_pass "4a. No GitHub token in .env"
fi

if rg -q 'JWT_SECRET' .env 2>/dev/null; then
  log_warn "4a. JWT_SECRET found in .env (expected for dev, must not be in production)"
else
  log_pass "4a. No JWT_SECRET in .env (uses default dev secret)"
fi

# 4b. Check .env.production
if [ -f .env.production ]; then
  if rg -q 'CHANGE_ME' .env.production 2>/dev/null; then
    log_warn "4b. .env.production still has placeholder CHANGE_ME"
  else
    log_pass "4b. .env.production has no CHANGE_ME placeholders"
  fi
else
  log_warn "4b. .env.production not found"
fi

# 4c. Build size
if [ -d .next/standalone ]; then
  BUILD_SIZE=$(du -sh .next/standalone 2>/dev/null | cut -f1)
  log_pass "4c. Build size: $BUILD_SIZE"
else
  log_warn "4c. No .next/standalone (production build may not exist)"
fi

# 4d. Check migration files exist
if [ -f prisma/migrations/20260821075723_init/migration.sql ]; then
  MIG_LINES=$(wc -l < prisma/migrations/20260821075723_init/migration.sql)
  log_pass "4d. Migration file exists ($MIG_LINES lines)"
else
  log_fail "4d. No migration file found"
fi

# 4e. Check DEPLOYMENT.md exists
if [ -f DEPLOYMENT.md ]; then
  log_pass "4e. DEPLOYMENT.md exists"
else
  log_warn "4e. DEPLOYMENT.md missing"
fi

# 4f. Check Dockerfile exists
if [ -f Dockerfile ]; then
  log_pass "4f. Dockerfile exists"
  DOCKER_HAS_MIGRATE=$(rg -c 'migrate deploy' Dockerfile 2>/dev/null)
  if [ "$DOCKER_HAS_MIGRATE" -gt 0 ]; then
    log_pass "4f. Dockerfile includes prisma migrate deploy"
  else
    log_warn "4f. Dockerfile missing prisma migrate deploy"
  fi
else
  log_fail "4f. Dockerfile missing"
fi

# 4g. scripts/verify/ exists and has A-I scripts?
VERIFY_COUNT=$(ls scripts/verify/*.sh 2>/dev/null | wc -l)
if [ "$VERIFY_COUNT" -ge 9 ]; then
  log_pass "4g. scripts/verify/ has $VERIFY_COUNT test scripts"
else
  log_fail "4g. scripts/verify/ only has $VERIFY_COUNT scripts (expected 9 for A-I)"
fi

echo ""

# ════════════════════════════════════════════════
echo "── BAGIAN 5: SCRIPTS VERIFY YANG ADA ──"
# ════════════════════════════════════════════════

for script in scripts/verify/*.sh; do
  if [ -f "$script" ]; then
    SCRIPT_NAME=$(basename "$script")
    # Check if script is executable and has proper structure
    if head -5 "$script" | grep -q '#!/'; then
      log_pass "5. $SCRIPT_NAME: valid script"
    else
      log_warn "5. $SCRIPT_NAME: missing shebang"
    fi
  fi
done

echo ""

echo "========================================"
echo "  AUDIT SUMMARY"
echo "========================================"
echo ""
echo "  ✅ PASS: $PASS"
echo "  ❌ FAIL: $FAIL"
echo "  ⚠️  WARN: $WARN"
echo "  ⏭️  SKIP: $SKIP"
echo ""
if [ $PASS -gt 0 ]; then echo "  PASSED:"; echo -e "$PASS_LIST"; fi
if [ $FAIL -gt 0 ]; then echo "  FAILED:"; echo -e "$FAIL_LIST"; fi
if [ $WARN -gt 0 ]; then echo "  WARNINGS:"; echo -e "$WARN_LIST"; fi
if [ $SKIP -gt 0 ]; then echo "  SKIPPED:"; echo -e "$SKIP_LIST"; fi

echo ""
echo "  [DB] Final counts:"
echo "    Schools: $(db_query 'SELECT COUNT(*) FROM School')"
echo "    Users:   $(db_query 'SELECT COUNT(*) FROM User')"
echo "    Classes: $(db_query 'SELECT COUNT(*) FROM Class')"
echo "    Questions: $(db_query 'SELECT COUNT(*) FROM Question')"
echo "    Assignments: $(db_query 'SELECT COUNT(*) FROM Assignment')"
echo "    Submissions: $(db_query 'SELECT COUNT(*) FROM AssignmentSubmission')"
echo "    TeachingJournals: $(db_query 'SELECT COUNT(*) FROM TeachingJournal')"
echo "    Attendance: $(db_query 'SELECT COUNT(*) FROM Attendance')"
echo "    CharacterReports: $(db_query 'SELECT COUNT(*) FROM CharacterReport')"
echo "    GradeComponents: $(db_query 'SELECT COUNT(*) FROM GradeComponent')"
echo "    StudentGrades: $(db_query 'SELECT COUNT(*) FROM StudentGrade')"
echo "    CompetencyAssessments: $(db_query 'SELECT COUNT(*) FROM CompetencyAssessment')"
echo "    Feedback: $(db_query 'SELECT COUNT(*) FROM Feedback')"
echo "    ExternalQuizScores: $(db_query 'SELECT COUNT(*) FROM ExternalQuizScore')"
echo ""

# Save results
{ echo "PASS=$PASS"; echo "FAIL=$FAIL"; echo "WARN=$WARN"; echo "SKIP=$SKIP"; } > /tmp/audit-summary.txt
