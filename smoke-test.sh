#!/usr/bin/env bash
# ============================================================================
# PANDAI — Production Smoke Test Script
# Runs against a live PANDAI instance (Docker or bare metal) with PostgreSQL.
#
# Usage:
#   BASE_URL=http://localhost:3000 ./smoke-test.sh
#   BASE_URL=https://staging.pandai.id ./smoke-test.sh
# ============================================================================
set -euo pipefail

# ── Config ──
BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS_COUNT=0
FAIL_COUNT=0
RESULTS=()

# ── Colors ──
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  RESULTS+=("PASS|$1|$2")
  echo -e "${GREEN}  PASS${NC} $1"
  echo "        → $2"
}

log_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  RESULTS+=("FAIL|$1|$2")
  echo -e "${RED}  FAIL${NC} $1"
  echo "        → $2"
}

log_info() {
  echo -e "${CYAN}  INFO${NC} $1"
}

log_section() {
  echo ""
  echo -e "${YELLOW}━━━ $1 ━━━${NC}"
}

# ── HTTP helpers ──
http_get() {
  local url="$1" cookie="$2"
  curl -sf -w '\n%{http_code}' "$url" \
    -H "Cookie: pandai_session=$cookie" \
    -H 'Content-Type: application/json' 2>&1
}

http_post() {
  local url="$1" body="$2" cookie="$3"
  curl -sf -w '\n%{http_code}' -X POST "$url" \
    -H "Cookie: pandai_session=$cookie" \
    -H 'Content-Type: application/json' \
    -d "$body" 2>&1
}

http_status_only() {
  local url="$1" cookie="$2" method="${3:-GET}" body="${4:-}"
  if [ "$method" = "POST" ]; then
    curl -so /dev/null -w '%{http_code}' -X POST "$url" \
      -H "Cookie: pandai_session=$cookie" \
      -H 'Content-Type: application/json' \
      -d "$body" 2>&1
  else
    curl -so /dev/null -w '%{http_code}' "$url" \
      -H "Cookie: pandai_session=$cookie" 2>&1
  fi
}

# Extract last line (HTTP status code) from curl -w output
get_status() {
  echo "$1" | tail -1
}

# Extract body (everything except last line)
get_body() {
  echo "$1" | sed '$d'
}

# ── Main ──
echo "============================================================================"
echo " PANDAI SMOKE TEST — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " Target: $BASE_URL"
echo "============================================================================"

# ────────────────────────────────────────────────────────────────
log_section "TEST 1: /api/health — PostgreSQL Connection"
# ────────────────────────────────────────────────────────────────
HEALTH_RESP=$(curl -sf "$BASE_URL/api/health")
HEALTH_STATUS=$(curl -so /dev/null -w '%{http_code}' "$BASE_URL/api/health")

if [ "$HEALTH_STATUS" != "200" ]; then
  log_fail "/api/health HTTP status" "Expected 200, got $HEALTH_STATUS. Body: $HEALTH_RESP"
else
  DB_STATUS=$(echo "$HEALTH_RESP" | jq -r '.db')
  if [ "$DB_STATUS" = "connected" ]; then
    log_pass "/api/health" "HTTP 200, db=$DB_STATUS"
    log_info "Full response: $HEALTH_RESP"
  else
    log_fail "/api/health db status" "Expected 'connected', got '$DB_STATUS'. Body: $HEALTH_RESP"
  fi
fi

# ────────────────────────────────────────────────────────────────
log_section "TEST 2: Login All Roles (superadmin, admin, guru, siswa A, siswa B)"
# ────────────────────────────────────────────────────────────────

# Login Super Admin
SA_RESP=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin@smoke.test","password":"SmokeTest123!"}' 2>&1)
SA_COOKIE=$(echo "$SA_RESP" | grep -o 'pandai_session\s*[^\s]*' | awk '{print $NF}' | tr -d '\r')
SA_BODY=$(echo "$SA_RESP" | grep -v '^#' | grep -v 'pandai_session' | tr -d '\r' | grep -v '^$')
SA_HTTP=$(curl -so /dev/null -w '%{http_code}' -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin@smoke.test","password":"SmokeTest123!"}' 2>/dev/null)

if [ -z "$SA_COOKIE" ]; then
  log_fail "Super Admin login" "No session cookie. HTTP $SA_HTTP. Raw: $(echo "$SA_RESP" | head -5)"
  echo "FATAL: Cannot proceed without Super Admin session. Did you run smoke-seed?"
  exit 1
fi
log_pass "Super Admin login" "Cookie obtained, HTTP $SA_HTTP"

# Verify NIK is NOT in super admin login response
NIK_PRESENT=$(echo "$SA_BODY" | jq 'has("nik")' 2>/dev/null || echo "parse_error")
if [ "$NIK_PRESENT" = "false" ]; then
  log_pass "NIK absent (superadmin)" "Login response does NOT contain 'nik' field"
else
  log_fail "NIK absent (superadmin)" "NIK field IS present! Response: $SA_BODY"
fi

# Login Admin Sekolah
ADMIN_RESP=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin@smoke.test","password":"SmokeTest123!"}' 2>&1)
ADMIN_COOKIE=$(echo "$ADMIN_RESP" | grep -o 'pandai_session\s*[^\s]*' | awk '{print $NF}' | tr -d '\r')
ADMIN_HTTP=$(curl -so /dev/null -w '%{http_code}' -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin@smoke.test","password":"SmokeTest123!"}' 2>/dev/null)
if [ -n "$ADMIN_COOKIE" ]; then
  log_pass "Admin Sekolah login" "Cookie obtained, HTTP $ADMIN_HTTP"
else
  log_fail "Admin Sekolah login" "No session cookie. HTTP $ADMIN_HTTP"
fi

# Login Guru
GURU_RESP=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"198501012010011001","password":"SmokeTest123!"}' 2>&1)
GURU_COOKIE=$(echo "$GURU_RESP" | grep -o 'pandai_session\s*[^\s]*' | awk '{print $NF}' | tr -d '\r')
GURU_BODY=$(echo "$GURU_RESP" | grep -v '^#' | grep -v 'pandai_session' | tr -d '\r' | grep -v '^$')
GURU_HTTP=$(curl -so /dev/null -w '%{http_code}' -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"198501012010011001","password":"SmokeTest123!"}' 2>/dev/null)
if [ -n "$GURU_COOKIE" ]; then
  log_pass "Guru login (NIP)" "Cookie obtained, HTTP $GURU_HTTP"
else
  log_fail "Guru login (NIP)" "No session cookie. HTTP $GURU_HTTP"
fi

# Verify NIK is NOT in guru login response (guru HAS nik in DB!)
GURU_NIK=$(echo "$GURU_BODY" | jq 'has("nik")' 2>/dev/null || echo "parse_error")
if [ "$GURU_NIK" = "false" ]; then
  log_pass "NIK absent (guru)" "Guru has NIK in DB but it's NOT in login response"
else
  log_fail "NIK absent (guru)" "CRITICAL: NIK field leaked in guru login response! Body: $GURU_BODY"
fi

# Login Siswa A
SISWA_A_RESP=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"0099900001","password":"SmokeTest123!"}' 2>&1)
SISWA_A_COOKIE=$(echo "$SISWA_A_RESP" | grep -o 'pandai_session\s*[^\s]*' | awk '{print $NF}' | tr -d '\r')
SISWA_A_BODY=$(echo "$SISWA_A_RESP" | grep -v '^#' | grep -v 'pandai_session' | tr -d '\r' | grep -v '^$')
SISWA_A_HTTP=$(curl -so /dev/null -w '%{http_code}' -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"0099900001","password":"SmokeTest123!"}' 2>/dev/null)
if [ -n "$SISWA_A_COOKIE" ]; then
  log_pass "Siswa A login (NISN)" "Cookie obtained, HTTP $SISWA_A_HTTP"
else
  log_fail "Siswa A login (NISN)" "No session cookie. HTTP $SISWA_A_HTTP"
fi

# Login Siswa B
SISWA_B_RESP=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"0099900002","password":"SmokeTest123!"}' 2>&1)
SISWA_B_COOKIE=$(echo "$SISWA_B_RESP" | grep -o 'pandai_session\s*[^\s]*' | awk '{print $NF}' | tr -d '\r')
SISWA_B_HTTP=$(curl -so /dev/null -w '%{http_code}' -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"0099900002","password":"SmokeTest123!"}' 2>/dev/null)
if [ -n "$SISWA_B_COOKIE" ]; then
  log_pass "Siswa B login (NISN)" "Cookie obtained, HTTP $SISWA_B_HTTP"
else
  log_fail "Siswa B login (NISN)" "No session cookie. HTTP $SISWA_B_HTTP"
fi

# Get Siswa A's user ID from login response (needed for IDOR tests)
SISWA_A_ID=$(echo "$SISWA_A_BODY" | jq -r '.id')
SISWA_B_ID=$(echo "$SISWA_B_RESP" | jq -r '.id')
log_info "Siswa A ID: $SISWA_A_ID, Siswa B ID: $SISWA_B_ID"

# Also verify NIK absent from siswa login
SISWA_A_NIK=$(echo "$SISWA_A_BODY" | jq 'has("nik")' 2>/dev/null || echo "parse_error")
if [ "$SISWA_A_NIK" = "false" ]; then
  log_pass "NIK absent (siswa A)" "NIK field NOT in siswa login response"
else
  log_fail "NIK absent (siswa A)" "NIK field present! Body: $SISWA_A_BODY"
fi

# ────────────────────────────────────────────────────────────────
log_section "TEST 3: IDOR — Submit Exam as Wrong Student"
# ────────────────────────────────────────────────────────────────
# Read seed data to get examSessionId
SEED_DATA="${SEED_DATA:-./.smoke-data/smoke-seed-data.json}"
if [ ! -f "$SEED_DATA" ]; then
  log_fail "Seed data" "$SEED_DATA not found. Run: docker compose --profile seed run --rm seed"
else
  EXAM_SESSION_ID=$(jq -r '.examSessionId' "$SEED_DATA")
  EXAM_PKG_ID=$(jq -r '.examPackageId' "$SEED_DATA")
  SCHOOL_ID=$(jq -r '.schoolId' "$SEED_DATA")
  CLASS_ID=$(jq -r '.classId' "$SEED_DATA")

  # 3a. Siswa A submits exam — should SUCCEED (own session)
  IDOR_SUBMIT_A=$(http_post \
    "$BASE_URL/api/attempts" \
    "{\"examSessionId\":\"$EXAM_SESSION_ID\",\"examPackageId\":\"$EXAM_PKG_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$(jq -r '.questionIds[0]' "$SEED_DATA")\",\"answer\":\"C\"},{\"questionId\":\"$(jq -r '.questionIds[1]' "$SEED_DATA")\",\"answer\":\"B\"},{\"questionId\":\"$(jq -r '.questionIds[2]' "$SEED_DATA")\",\"answer\":\"C\"}],\"duration\":120}" \
    "$SISWA_A_COOKIE")
  IDOR_A_STATUS=$(get_status "$IDOR_SUBMIT_A")
  IDOR_A_BODY=$(get_body "$IDOR_SUBMIT_A")

  if [ "$IDOR_A_STATUS" = "200" ] || [ "$IDOR_A_STATUS" = "201" ]; then
    log_pass "Submit exam as Siswa A (self)" "HTTP $IDOR_A_STATUS — score: $(echo "$IDOR_A_BODY" | jq -r '.totalCorrect // .score // "?"')"
  else
    log_fail "Submit exam as Siswa A (self)" "Expected 200/201, got HTTP $IDOR_A_STATUS. Body: $IDOR_A_BODY"
  fi

  # 3b. Siswa A tries to submit AGAIN — should get 409 (duplicate)
  IDOR_SUBMIT_A2=$(http_post \
    "$BASE_URL/api/attempts" \
    "{\"examSessionId\":\"$EXAM_SESSION_ID\",\"examPackageId\":\"$EXAM_PKG_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$(jq -r '.questionIds[0]' "$SEED_DATA")\",\"answer\":\"C\"}],\"duration\":120}" \
    "$SISWA_A_COOKIE")
  IDOR_A2_STATUS=$(get_status "$IDOR_SUBMIT_A2")

  if [ "$IDOR_A2_STATUS" = "409" ]; then
    log_pass "Duplicate exam submit → 409" "HTTP 409 as expected (ATTEMPT_EXISTS or P2002)"
  else
    log_fail "Duplicate exam submit → 409" "Expected 409, got HTTP $IDOR_A2_STATUS. Body: $(get_body "$IDOR_SUBMIT_A2")"
  fi

  # 3c. Siswa B tries to submit exam with userId=SISWA_A_ID — should get 403 (IDOR)
  IDOR_SUBMIT_B=$(http_post \
    "$BASE_URL/api/attempts" \
    "{\"userId\":\"$SISWA_A_ID\",\"examSessionId\":\"$EXAM_SESSION_ID\",\"examPackageId\":\"$EXAM_PKG_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"answers\":[{\"questionId\":\"$(jq -r '.questionIds[0]' "$SEED_DATA")\",\"answer\":\"C\"}],\"duration\":120}" \
    "$SISWA_B_COOKIE")
  IDOR_B_STATUS=$(get_status "$IDOR_SUBMIT_B")
  IDOR_B_BODY=$(get_body "$IDOR_SUBMIT_B")

  if [ "$IDOR_B_STATUS" = "403" ]; then
    log_pass "IDOR: Siswa B submit as Siswa A → 403" "HTTP 403 — 'Tidak diizinkan' (IDOR fix working)"
    log_info "Response: $IDOR_B_BODY"
  else
    log_fail "IDOR: Siswa B submit as Siswa A → 403" "Expected 403, got HTTP $IDOR_B_STATUS. Body: $IDOR_B_BODY"
  fi
fi

# ────────────────────────────────────────────────────────────────
log_section "TEST 4: IDOR — View Other Student's Scores"
# ────────────────────────────────────────────────────────────────

# 4a. Siswa A views own scores — should SUCCEED
SCORES_A_RESP=$(http_get "$BASE_URL/api/scores?studentId=$SISWA_A_ID" "$SISWA_A_COOKIE")
SCORES_A_STATUS=$(get_status "$SCORES_A_RESP")
SCORES_A_BODY=$(get_body "$SCORES_A_RESP")

if [ "$SCORES_A_STATUS" = "200" ]; then
  log_pass "Siswa A view own scores" "HTTP 200 — totalTryout: $(echo "$SCORES_A_BODY" | jq -r '.totalTryout // 0')"
else
  log_fail "Siswa A view own scores" "Expected 200, got HTTP $SCORES_A_STATUS. Body: $SCORES_A_BODY"
fi

# 4b. Siswa A views Siswa B's scores — should get 403
SCORES_B_RESP=$(http_get "$BASE_URL/api/scores?studentId=$SISWA_B_ID" "$SISWA_A_COOKIE")
SCORES_B_STATUS=$(get_status "$SCORES_B_RESP")
SCORES_B_BODY=$(get_body "$SCORES_B_RESP")

if [ "$SCORES_B_STATUS" = "403" ]; then
  log_pass "IDOR: Siswa A view Siswa B scores → 403" "HTTP 403 — 'Tidak diizinkan'"
  log_info "Response: $SCORES_B_BODY"
else
  log_fail "IDOR: Siswa A view Siswa B scores → 403" "Expected 403, got HTTP $SCORES_B_STATUS. Body: $SCORES_B_BODY"
fi

# 4c. Siswa B views Siswa A's scores — should get 403
SCORES_AB_RESP=$(http_get "$BASE_URL/api/scores?studentId=$SISWA_A_ID" "$SISWA_B_COOKIE")
SCORES_AB_STATUS=$(get_status "$SCORES_AB_RESP")
SCORES_AB_BODY=$(get_body "$SCORES_AB_RESP")

if [ "$SCORES_AB_STATUS" = "403" ]; then
  log_pass "IDOR: Siswa B view Siswa A scores → 403" "HTTP 403 — 'Tidak diizinkan'"
else
  log_fail "IDOR: Siswa B view Siswa A scores → 403" "Expected 403, got HTTP $SCORES_AB_STATUS. Body: $SCORES_AB_BODY"
fi

# ────────────────────────────────────────────────────────────────
log_section "TEST 5: NIK Field Absence in Login Response (Detailed)"
# ────────────────────────────────────────────────────────────────
# Re-login as guru to get fresh full response
GURU_FULL=$(curl -sf -c - "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"198501012010011001","password":"SmokeTest123!"}' 2>&1)
GURU_JSON=$(echo "$GURU_FULL" | grep -v '^#' | grep -v 'pandai_session' | tr -d '\r' | grep -v '^$')

# Check specific fields that SHOULD be present
for field in id name role email nisn nip; do
  HAS_FIELD=$(echo "$GURU_JSON" | jq "has(\"$field\")")
  if [ "$HAS_FIELD" = "true" ]; then
    log_pass "Guru login has '$field'" "present in response"
  else
    log_fail "Guru login has '$field'" "MISSING from response!"
  fi
done

# Check fields that MUST NOT be present
for field in nik password; do
  HAS_FORBIDDEN=$(echo "$GURU_JSON" | jq "has(\"$field\")")
  if [ "$HAS_FORBIDDEN" = "false" ]; then
    log_pass "Guru login excludes '$field'" "correctly absent from response"
  else
    log_fail "Guru login excludes '$field'" "CRITICAL: forbidden field '$field' IS in response!"
  fi
done

# ────────────────────────────────────────────────────────────────
log_section "TEST 6: Race Condition — Concurrent Assignment Submissions"
# ────────────────────────────────────────────────────────────────

if [ -f "$SEED_DATA" ]; then
  ASSIGNMENT_ID=$(jq -r '.assignmentId' "$SEED_DATA")
  Q1_ID=$(jq -r '.questionIds[0]' "$SEED_DATA")

  log_info "Assignment ID: $ASSIGNMENT_ID"
  log_info "Firing 2 concurrent submissions from Siswa A..."

  # Fire two concurrent curl requests in background
  RACE_1=$(mktemp)
  RACE_2=$(mktemp)

  BODY="{\"studentId\":\"$SISWA_A_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$CLASS_ID\",\"action\":\"submit\",\"answers\":[{\"questionId\":\"$Q1_ID\",\"answer\":\"C\"}]}"

  curl -so "$RACE_1" -w '%{http_code}' -X POST "$BASE_URL/api/assignments/$ASSIGNMENT_ID/submissions" \
    -H "Cookie: pandai_session=$SISWA_A_COOKIE" \
    -H 'Content-Type: application/json' \
    -d "$BODY" &
  PID1=$!

  curl -so "$RACE_2" -w '%{http_code}' -X POST "$BASE_URL/api/assignments/$ASSIGNMENT_ID/submissions" \
    -H "Cookie: pandai_session=$SISWA_A_COOKIE" \
    -H 'Content-Type: application/json' \
    -d "$BODY" &
  PID2=$!

  wait $PID1
  wait $PID2

  STATUS_1=$(cat "$RACE_1")
  STATUS_2=$(cat "$RACE_2")

  log_info "Concurrent result: Request 1 = HTTP $STATUS_1, Request 2 = HTTP $STATUS_2"

  # At least one should be 409 (conflict), the other 200 or 403 or 409
  if echo "$STATUS_1 $STATUS_2" | grep -q '409'; then
    log_pass "Race condition" "One request got 409 — duplicate prevention working. (R1=$STATUS_1, R2=$STATUS_2)"
  else
    # Check if one is 403 (ALREADY_SUBMITTED) — also acceptable
    if echo "$STATUS_1 $STATUS_2" | grep -q '403'; then
      log_pass "Race condition" "One request got 403 (ALREADY_SUBMITTED) — duplicate prevention working. (R1=$STATUS_1, R2=$STATUS_2)"
    else
      log_fail "Race condition" "Neither request got 409 or 403! Both: R1=$STATUS_1, R2=$STATUS_2 — BOTH may have succeeded (data corruption risk!)"
    fi
  fi

  # Verify only ONE submission exists in DB (via API)
  SUB_COUNT=$(curl -sf "$BASE_URL/api/assignments/$ASSIGNMENT_ID/submissions" \
    -H "Cookie: pandai_session=$GURU_COOKIE" 2>/dev/null | jq 'length')
  log_info "Total submissions for this assignment: $SUB_COUNT"
  if [ "$SUB_COUNT" = "1" ]; then
    log_pass "No duplicate data" "Exactly 1 submission in database"
  else
    log_fail "No duplicate data" "Expected 1 submission, found $SUB_COUNT — data corruption!"
  fi

  rm -f "$RACE_1" "$RACE_2"
else
  log_fail "Race condition test" "Skipped — no seed data"
fi

# ────────────────────────────────────────────────────────────────
log_section "TEST 7: Unauthenticated Access → 401"
# ────────────────────────────────────────────────────────────────

UNAUTH_HEALTH=$(curl -so /dev/null -w '%{http_code}' "$BASE_URL/api/health")
# /api/health is public, so this should be 200
if [ "$UNAUTH_HEALTH" = "200" ]; then
  log_pass "Public health endpoint" "HTTP 200 without auth (correct — health is public)"
else
  log_fail "Public health endpoint" "Expected 200, got $UNAUTH_HEALTH"
fi

UNAUTH_USERS=$(curl -so /dev/null -w '%{http_code}' "$BASE_URL/api/users")
if [ "$UNAUTH_USERS" = "401" ]; then
  log_pass "Protected /api/users → 401" "HTTP 401 without auth"
else
  log_fail "Protected /api/users → 401" "Expected 401, got $UNAUTH_USERS"
fi

UNAUTH_SCORES=$(curl -so /dev/null -w '%{http_code}' "$BASE_URL/api/scores?studentId=$SISWA_A_ID")
if [ "$UNAUTH_SCORES" = "401" ]; then
  log_pass "Protected /api/scores → 401" "HTTP 401 without auth"
else
  log_fail "Protected /api/scores → 401" "Expected 401, got $UNAUTH_SCORES"
fi

# ────────────────────────────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────────────────────────────
echo ""
echo "============================================================================"
echo " SMOKE TEST RESULTS: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "============================================================================"
for r in "${RESULTS[@]}"; do
  TYPE=$(echo "$r" | cut -d'|' -f1)
  NAME=$(echo "$r" | cut -d'|' -f2)
  DETAIL=$(echo "$r" | cut -d'|' -f3-)
  if [ "$TYPE" = "PASS" ]; then
    echo -e "  ${GREEN}PASS${NC} $NAME — $DETAIL"
  else
    echo -e "  ${RED}FAIL${NC} $NAME — $DETAIL"
  fi
done
echo "============================================================================"

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}OUTCOME: FAILED — $FAIL_COUNT test(s) did not pass. Do NOT deploy to production.${NC}"
  exit 1
else
  echo -e "${GREEN}OUTCOME: ALL TESTS PASSED — safe to proceed to production cutover.${NC}"
  exit 0
fi
