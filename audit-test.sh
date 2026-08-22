#!/bin/bash
# PANDAI Functional Audit - API Test Script
# Runs against production build, saves results to /tmp/audit-results/

RESULTS_DIR="/tmp/audit-results"
mkdir -p "$RESULTS_DIR"
SUMMARY="$RESULTS_DIR/summary.txt"
> "$SUMMARY"

cd /home/z/my-project
export DATABASE_URL='file:/home/z/my-project/db/custom.db'
export JWT_SECRET='dev_jwt_secret_do_not_use_in_prod_CHANGE_BEFORE_DEPLOY'
export NODE_ENV='production'

# Start server in background with keepalive
(while true; do node .next/standalone/server.js 2>/dev/null; sleep 1; done) &
KEEPER_PID=$!
sleep 4

# Verify server is alive
HEALTH=$(curl -s http://127.0.0.1:3000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"ok"'; then
  echo "✅ Server started successfully"
else
  echo "❌ Server failed to start"
  kill $KEEPER_PID 2>/dev/null
  exit 1
fi

# Helper functions
api_call() {
  local method="$1"
  local path="$2"
  local data="$3"
  local token="$4"
  local headers="-H 'Content-Type: application/json'"
  if [ -n "$token" ]; then
    headers="$headers -H 'Authorization: Bearer $token'"
  fi
  if [ -n "$data" ]; then
    eval "curl -s -X $method $headers -d '$data' http://127.0.0.1:3000$path 2>/dev/null"
  else
    eval "curl -s -X $method $headers http://127.0.0.1:3000$path 2>/dev/null"
  fi
}

test_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local data="$4"
  local token="$5"
  local expected_status="$6"
  
  RESULT=$(api_call "$method" "$path" "$data" "$token")
  STATUS=$(curl -so /dev/null -w '%{http_code}' -X $method -H 'Content-Type: application/json' ${token:+-H "Authorization: Bearer $token"} ${data:+-d "$data"} http://127.0.0.1:3000$path 2>/dev/null)
  
  if [ "$STATUS" = "$expected_status" ]; then
    echo "✅ $name → $STATUS"
    echo "✅ $name → $STATUS" >> "$SUMMARY"
  else
    echo "❌ $name → expected $expected_status, got $STATUS"
    echo "❌ $name → expected $expected_status, got $STATUS" >> "$SUMMARY"
    echo "   Response: $(echo "$RESULT" | head -c 200)"
  fi
}

get_token() {
  local loginId="$1"
  local pwd="$2"
  local response=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$loginId\",\"password\":\"$pwd\"}" 2>/dev/null)
  # Extract token from cookie
  local cookie=$(curl -sI -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$loginId\",\"password\":\"$pwd\"}" 2>/dev/null | grep -i 'set-cookie' | grep 'session=' | sed 's/.*session=\([^;]*\).*/\1/')
  echo "$cookie"
}

echo ""
echo "========================================"
echo "  PANDAI FUNCTIONAL AUDIT - API TESTS"
echo "========================================"
echo ""

# ════════════════════════════════════════════════
echo "── 1. AUTH: LOGIN ALL ROLES ──"
echo "── 1. AUTH: LOGIN ALL ROLES ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

# We need to use cookie-based auth since that's what the app uses
login_and_save() {
  local name="$1"
  local loginId="$2"
  local pwd="$3"
  
  RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$loginId\",\"password\":\"$pwd\"}" 2>/dev/null)
  STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$loginId\",\"password\":\"$pwd\"}" 2>/dev/null)
  
  if [ "$STATUS" = "200" ]; then
    echo "✅ Login $name → 200"
    echo "✅ Login $name → 200" >> "$SUMMARY"
    # Extract user data
    USER_ID=$(echo "$RESPONSE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
    echo "$RESPONSE" > "$RESULTS_DIR/user-${name// /-}.json"
    echo "$USER_ID" > "$RESULTS_DIR/id-${name// /-}.txt"
  else
    echo "❌ Login $name → $STATUS: $(echo $RESPONSE | head -c 200)"
    echo "❌ Login $name → $STATUS" >> "$SUMMARY"
    echo "FAIL" > "$RESULTS_DIR/id-${name// /-}.txt"
  fi
}

login_and_save "SuperAdmin" "superadmin@pandai.id" "password123"
sleep 1
login_and_save "AdminSekolah" "admin.sdn1@pandai.id" "password123"
sleep 1
login_and_save "Guru" "198504152010011001" "password123"
sleep 1
login_and_save "Siswa" "0051234567" "password123"
sleep 1
login_and_save "OrangTua" "rahman" "123"
sleep 1
login_and_save "KepalaSekolah" "kepsek.sdn1" "password123"

# Get tokens via cookie for subsequent API calls
get_auth_cookie() {
  local loginId="$1"
  local pwd="$2"
  local cookie=$(curl -sI -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$loginId\",\"password\":\"$pwd\"}" 2>/dev/null | grep -i 'set-cookie.*session=' | head -1 | sed 's/.*session=\([^;]*\).*/\1/')
  echo "$cookie"
}

SA_TOKEN=$(get_auth_cookie "superadmin@pandai.id" "password123")
AS_TOKEN=$(get_auth_cookie "admin.sdn1@pandai.id" "password123")
GURU_TOKEN=$(get_auth_cookie "198504152010011001" "password123")
SISWA_TOKEN=$(get_auth_cookie "0051234567" "password123")
ORTU_TOKEN=$(get_auth_cookie "rahman" "123")
KEPSEK_TOKEN=$(get_auth_cookie "kepsek.sdn1" "password123")

echo ""
echo "Tokens obtained: SA=${SA_TOKEN:0:10}... AS=${AS_TOKEN:0:10}..."

# ════════════════════════════════════════════════
echo ""
echo "── 2. SUPER ADMIN ENDPOINTS ──"
echo "── 2. SUPER ADMIN ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/schools" GET "/api/schools" "" "$SA_TOKEN" "200"
test_endpoint "GET /api/users (global)" GET "/api/users" "" "$SA_TOKEN" "200"
test_endpoint "GET /api/analytics" GET "/api/analytics" "" "$SA_TOKEN" "200"
test_endpoint "GET /api/subjects" GET "/api/subjects" "" "$SA_TOKEN" "200"

echo ""
echo "── 3. ADMIN SEKOLAH ENDPOINTS ──"
echo "── 3. ADMIN SEKOLAH ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/classes (admin)" GET "/api/classes" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/users (school)" GET "/api/users" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/subjects (school)" GET "/api/subjects" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/teacher-assignments" GET "/api/teacher-assignments" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/attendance" GET "/api/attendance" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/timetable" GET "/api/timetable" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/teaching-journals" GET "/api/teaching-journals" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/activity-log" GET "/api/activity-log" "" "$AS_TOKEN" "200"

echo ""
echo "── 4. GURU ENDPOINTS ──"
echo "── 4. GURU ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/questions" GET "/api/questions" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/assignments" GET "/api/assignments" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/materials" GET "/api/materials" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/teaching-journals (guru)" GET "/api/teaching-journals" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/attendance (guru)" GET "/api/attendance" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/character-reports" GET "/api/character-reports" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/scores (guru)" GET "/api/scores" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/student-grades" GET "/api/student-grades" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/grade-components" GET "/api/grade-components" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/competency-assessments" GET "/api/competency-assessments" "" "$GURU_TOKEN" "200"

echo ""
echo "── 5. SISWA ENDPOINTS ──"
echo "── 5. SISWA ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/assignments (siswa)" GET "/api/assignments" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/scores (siswa)" GET "/api/scores" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/attempts" GET "/api/attempts" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/materials (siswa)" GET "/api/materials" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/attendance (siswa)" GET "/api/attendance" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/student-grades (siswa)" GET "/api/student-grades" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/external-quiz-scores" GET "/api/external-quiz-scores" "" "$SISWA_TOKEN" "200"

echo ""
echo "── 6. ORANG TUA ENDPOINTS ──"
echo "── 6. ORANG TUA ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/scores (ortu)" GET "/api/scores" "" "$ORTU_TOKEN" "200"
test_endpoint "GET /api/attendance (ortu)" GET "/api/attendance" "" "$ORTU_TOKEN" "200"
test_endpoint "GET /api/character-reports (ortu)" GET "/api/character-reports" "" "$ORTU_TOKEN" "200"
test_endpoint "GET /api/student-grades (ortu)" GET "/api/student-grades" "" "$ORTU_TOKEN" "200"

echo ""
echo "── 7. KEPALA SEKOLAH ENDPOINTS ──"
echo "── 7. KEPALA SEKOLAH ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/kepsek/dashboard" GET "/api/kepsek/dashboard" "" "$KEPSEK_TOKEN" "200"
test_endpoint "GET /api/attendance (kepsek)" GET "/api/attendance" "" "$KEPSEK_TOKEN" "200"
test_endpoint "GET /api/teaching-journals (kepsek)" GET "/api/teaching-journals" "" "$KEPSEK_TOKEN" "200"

echo ""
echo "── 8. FORM VALIDATION & EDGE CASES ──"
echo "── 8. FORM VALIDATION & EDGE CASES ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

# Empty login
STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
[ "$STATUS" = "400" ] && echo "✅ Empty login → 400" || echo "❌ Empty login → $STATUS (expected 400)"

# Wrong password
STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"superadmin@pandai.id","password":"wrong"}' 2>/dev/null)
[ "$STATUS" = "401" ] && echo "✅ Wrong password → 401" || echo "❌ Wrong password → $STATUS (expected 401)"

# Non-existent user
STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"nonexistent@test.com","password":"test"}' 2>/dev/null)
[ "$STATUS" = "401" ] && echo "✅ Non-existent user → 401" || echo "❌ Non-existent user → $STATUS (expected 401)"

# Access protected endpoint without token
STATUS=$(curl -so /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/schools 2>/dev/null)
[ "$STATUS" = "401" ] && echo "✅ No token → 401" || echo "❌ No token → $STATUS (expected 401)"

# Access admin endpoint as student
STATUS=$(curl -so /dev/null -w '%{http_code}' -H "Authorization: Bearer $SISWA_TOKEN" http://127.0.0.1:3000/api/schools 2>/dev/null)
[ "$STATUS" = "403" ] && echo "✅ Student accessing schools → 403" || echo "⚠️ Student accessing schools → $STATUS (expected 403)"

echo ""
echo "── 9. CREATE/POST ENDPOINTS (Guru creates question) ──"
echo "── 9. CREATE/POST ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

# Get school ID for guru
SCHOOL_ID=$(cat "$RESULTS_DIR/user-Guru.json" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("schoolId",""))' 2>/dev/null)
GURU_ID=$(cat "$RESULTS_DIR/id-Guru.txt" 2>/dev/null)
CLASS_ID=$(curl -s http://127.0.0.1:3000/api/classes -H "Authorization: Bearer $AS_TOKEN" 2>/dev/null | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")' 2>/dev/null)
SUBJECT_ID=$(curl -s http://127.0.0.1:3000/api/subjects 2>/dev/null | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")' 2>/dev/null)

echo "School: $SCHOOL_ID, Class: $CLASS_ID, Subject: $SUBJECT_ID"

# Create a question
Q_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/questions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"text\":\"Soal audit test?\",\"type\":\"MULTIPLE_CHOICE\",\"options\":[\"A. Opsi 1\",\"B. Opsi 2\",\"C. Opsi 3\",\"D. Opsi 4\"],\"correctAnswer\":\"A. Opsi 1\",\"explanation\":\"Karena A benar\",\"subjectId\":\"$SUBJECT_ID\",\"difficulty\":\"sedang\",\"bloomLevel\":\"C3\"}" 2>/dev/null)
Q_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/questions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"text\":\"Soal audit test 2?\",\"type\":\"MULTIPLE_CHOICE\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswer\":\"A\",\"subjectId\":\"$SUBJECT_ID\"}" 2>/dev/null)
echo "Create question → $Q_STATUS"
echo "Create question → $Q_STATUS" >> "$SUMMARY"
Q_ID=$(echo "$Q_RESPONSE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
echo "Question ID: $Q_ID"

# Create assignment
A_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/assignments \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"title\":\"Tugas Audit Test\",\"description\":\"Deskripsi tugas audit\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"type\":\"assignment\",\"deadline\":\"2026-12-31T23:59:59Z\"}" 2>/dev/null)
A_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/assignments \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"title\":\"Tugas Audit 2\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"type\":\"assignment\",\"deadline\":\"2026-12-31T23:59:59Z\"}" 2>/dev/null)
echo "Create assignment → $A_STATUS"
echo "Create assignment → $A_STATUS" >> "$SUMMARY"
A_ID=$(echo "$A_RESPONSE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
echo "Assignment ID: $A_ID"

# Create teaching journal
J_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/teaching-journals \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"date\":\"2026-08-21\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"topic\":\"Audit test topic\",\"activity\":\"Audit test activity\",\"notes\":\"Audit test notes\"}" 2>/dev/null)
echo "Create teaching journal → $J_STATUS"
echo "Create teaching journal → $J_STATUS" >> "$SUMMARY"

# Attendance
ATT_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/attendance \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $GURU_TOKEN" \
  -d "{\"date\":\"2026-08-21\",\"classId\":\"$CLASS_ID\",\"records\":[{\"studentId\":\"$(cat $RESULTS_DIR/id-Siswa.txt 2>/dev/null)\",\"status\":\"hadir\"}]}" 2>/dev/null)
echo "Create attendance → $ATT_STATUS"
echo "Create attendance → $ATT_STATUS" >> "$SUMMARY"

echo ""
echo "── 10. REPORTS ENDPOINTS ──"
echo "── 10. REPORTS ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/reports/rapor-siswa" GET "/api/reports/rapor-siswa?classId=$CLASS_ID" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/reports/rekap-kelas" GET "/api/reports/rekap-kelas?classId=$CLASS_ID" "" "$AS_TOKEN" "200"
test_endpoint "GET /api/grades/final" GET "/api/grades/final?classId=$CLASS_ID" "" "$GURU_TOKEN" "200"

# ════════════════════════════════════════════════
echo ""
echo "── 11. AI ENDPOINTS ──"
echo "── 11. AI ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/ai/config" GET "/api/ai/config" "" "$GURU_TOKEN" "200"
test_endpoint "GET /api/ai/usage" GET "/api/ai/usage" "" "$GURU_TOKEN" "200"

echo ""
echo "── 12. SPECIAL: Create school as Super Admin ──"
echo "── 12. SPECIAL: Create school as Super Admin ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

SCH_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/schools \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d '{"name":"SMA Audit Test","code":"SMA-AUDIT-001","address":"Jl. Audit No.1","province":"Jawa Barat","city":"Bandung","schoolType":"SMA","accreditation":"A"}' 2>/dev/null)
SCH_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/schools \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d '{"name":"SMA Audit Test 2","code":"SMA-AUDIT-002","address":"Jl. Test","schoolType":"SMA"}' 2>/dev/null)
echo "Create school → $SCH_STATUS"
echo "Create school → $SCH_STATUS" >> "$SUMMARY"
SCH_ID=$(echo "$SCH_RESPONSE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
echo "New School ID: $SCH_ID"

# Create admin for new school
if [ -n "$SCH_ID" ]; then
  ADMIN_RESP=$(curl -s -X POST http://127.0.0.1:3000/api/users \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $SA_TOKEN" \
    -d "{\"name\":\"Admin Audit\",\"email\":\"admin.audit@pandai.id\",\"role\":\"ADMIN_SCHOOL\",\"schoolId\":\"$SCH_ID\",\"password\":\"password123\"}" 2>/dev/null)
  ADMIN_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/users \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $SA_TOKEN" \
    -d "{\"name\":\"Admin Audit 2\",\"email\":\"admin.audit2@pandai.id\",\"role\":\"ADMIN_SCHOOL\",\"schoolId\":\"$SCH_ID\",\"password\":\"password123\"}" 2>/dev/null)
  echo "Create admin for school → $ADMIN_STATUS"
  echo "Create admin for school → $ADMIN_STATUS" >> "$SUMMARY"
fi

# ════════════════════════════════════════════════
echo ""
echo "── 13. EXAMS ENDPOINTS ──"
echo "── 13. EXAMS ENDPOINTS ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

test_endpoint "GET /api/exams" GET "/api/exams" "" "$SISWA_TOKEN" "200"
test_endpoint "GET /api/exams (guru)" GET "/api/exams" "" "$GURU_TOKEN" "200"

# ════════════════════════════════════════════════
echo ""
echo "── 14. LOGOUT ──"
echo "── 14. LOGOUT ──" >> "$SUMMARY"
# ════════════════════════════════════════════════

LOGOUT_STATUS=$(curl -so /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/logout \
  -H "Authorization: Bearer $SA_TOKEN" 2>/dev/null)
echo "Logout → $LOGOUT_STATUS"
[ "$LOGOUT_STATUS" = "200" ] && echo "✅ Logout → 200" || echo "❌ Logout → $LOGOUT_STATUS"

# ════════════════════════════════════════════════
echo ""
echo "========================================"
echo "  AUDIT SUMMARY"
echo "========================================"
echo ""
grep -c '✅' "$SUMMARY" | xargs -I{} echo "Passed: {}"
grep -c '❌' "$SUMMARY" | xargs -I{} echo "Failed: {}"
grep -c '⚠️' "$SUMMARY" | xargs -I{} echo "Warnings: {}"

echo ""
echo "=== DETAILED RESULTS ==="
cat "$SUMMARY"

# Cleanup
kill $KEEPER_PID 2>/dev/null

echo ""
echo "Results saved to $RESULTS_DIR/"
