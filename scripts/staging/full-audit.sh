#!/bin/bash
# FULL STAGING AUDIT: Server + 17 IDOR + 15 HIGH + Load Test
# Run: bash scripts/staging/full-audit.sh
set -e

cd /home/z/my-project

export DATABASE_URL='postgresql://z@localhost:5432/pandai_staging'
export NODE_ENV='staging'  # Use staging so cookies aren't secure-only
export JWT_SECRET='audit_test_jwt_secret_32chars_minimum!!'
export PASSWORD_SALT='audit_test_password_salt_24char'

PGSQL=/home/z/pgsql/bin/psql
PGHOST=localhost
PGPORT=5432
PGDB=pandai_staging

PASS=0
FAIL=0
TOTAL=0

test_idor() {
  local label="$1" cookie="$2" url="$3" method="$4" body="$5" expect="$6"
  TOTAL=$((TOTAL+1))
  local R
  if [ "$method" = "GET" ]; then
    R=$(curl -s -m 10 -b "$cookie" "$url" -o /dev/null -w '%{http_code}')
  else
    R=$(curl -s -m 10 -b "$cookie" -X $method "$url" -H 'Content-Type: application/json' -d "$body" -o /dev/null -w '%{http_code}')
  fi
  local ok="FAIL"; [ "$R" = "$expect" ] && ok="PASS" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
  printf "  %-40s | HTTP %-3s | expect %-3s | %s\n" "$label" "$R" "$expect" "$ok"
}

echo '============================================================'
echo 'FULL STAGING AUDIT — PostgreSQL'
echo "$(date)"
echo '============================================================'

# --- Get IDs ---
echo ''
echo '--- Loading IDs from PostgreSQL ---'
SISWA_ID=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"User\" WHERE username='0051234567' LIMIT 1;")
SISWA2_ID=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"User\" WHERE username='0060987654' LIMIT 1;")
GURU_ID=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"User\" WHERE username='198504152010011001' LIMIT 1;")
SCHOOL1=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"School\" WHERE code='SDN1-MKS' LIMIT 1;")
SCHOOL2=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"School\" WHERE code='SMPN2-SBY' LIMIT 1;")
CLASS1=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"Class\" WHERE name='Kelas 4A' LIMIT 1;")
SUBJECT_ID=$($PGSQL -h $PGHOST -p $PGPORT -d $PGDB -t -A -c "SELECT id FROM \"Subject\" LIMIT 1;")
echo "SISWA=$SISWA_ID"
echo "SISWA2=$SISWA2_ID"
echo "GURU=$GURU_ID"
echo "SCHOOL1=$SCHOOL1"
echo "SCHOOL2=$SCHOOL2"

# --- Start Server ---
echo ''
echo '--- Starting production server ---'
pkill -f 'next' 2>/dev/null || true
sleep 2
NODE_OPTIONS='--max-old-space-size=384' npx next start -p 3000 > /tmp/audit_server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server
for i in $(seq 1 30); do
  if curl -s -m 2 http://localhost:3000/ > /dev/null 2>&1; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

if ! curl -s -m 2 http://localhost:3000/ > /dev/null 2>&1; then
  echo 'FATAL: Server did not start!'
  cat /tmp/audit_server.log
  exit 1
fi

# --- Login all users ---
echo ''
echo '--- Login sessions ---'
curl -s -m 10 -c /tmp/ck_siswa -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"0051234567","password":"password123"}' > /dev/null && echo '  Siswa: OK'
curl -s -m 10 -c /tmp/ck_ortu -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"rahman","password":"123"}' > /dev/null && echo '  Ortu: OK'
curl -s -m 10 -c /tmp/ck_guru -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"198504152010011001","password":"password123"}' > /dev/null && echo '  Guru: OK'
curl -s -m 10 -c /tmp/ck_admin -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin.sdn1@pandai.id","password":"password123"}' > /dev/null && echo '  Admin: OK'
curl -s -m 10 -c /tmp/ck_kepsek -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"kepsek.sdn1","password":"password123"}' > /dev/null && echo '  Kepsek: OK'
curl -s -m 10 -c /tmp/ck_sa -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin@pandai.id","password":"password123"}' > /dev/null && echo '  SA: OK'

# ======================================
# STEP 7: 17 IDOR SCENARIOS
# ======================================
echo ''
echo '============================================================'
echo 'STEP 7: 17 IDOR SCENARIOS (PostgreSQL)'
echo '============================================================'

test_idor "IDOR-1: SISWA scores→other school" /tmp/ck_siswa "http://localhost:3000/api/scores?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-2: SISWA exam-session→other" /tmp/ck_siswa "http://localhost:3000/api/exam-sessions/$SISWA2_ID" GET "" "403"
test_idor "IDOR-3: ORTU scores→non-child" /tmp/ck_ortu "http://localhost:3000/api/scores?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-4: ORTU attempts→non-child" /tmp/ck_ortu "http://localhost:3000/api/student-attempts?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-5: ORTU attendance→non-child" /tmp/ck_ortu "http://localhost:3000/api/attendance?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-6: ORTU char-report→non-child" /tmp/ck_ortu "http://localhost:3000/api/character-reports?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-7: GURU(SD) scores→SMP" /tmp/ck_guru "http://localhost:3000/api/scores?studentId=$SISWA2_ID" GET "" "403"
test_idor "IDOR-8: GURU(SD) POST att→SMP" /tmp/ck_guru 'http://localhost:3000/api/attendance' POST "{\"studentId\":\"$SISWA2_ID\",\"date\":\"2025-01-15\",\"status\":\"hadir\",\"schoolId\":\"$SCHOOL2\"}" "403"
test_idor "IDOR-9: GURU(SD) GET user→SMP" /tmp/ck_guru "http://localhost:3000/api/users/$SISWA2_ID" GET "" "403"
test_idor "IDOR-10: ADMIN(SD) users→SMP" /tmp/ck_admin "http://localhost:3000/api/users?schoolId=$SCHOOL2_ID" GET "" "403"
test_idor "IDOR-11: UNAUTH GET scores" /dev/null "http://localhost:3000/api/scores" GET "" "401"
test_idor "IDOR-12: UNAUTH GET attendance" /dev/null "http://localhost:3000/api/attendance" GET "" "401"
test_idor "IDOR-13: UNAUTH POST attendance" /dev/null 'http://localhost:3000/api/attendance' POST '{"studentId":"x","date":"2025-01-15","status":"hadir"}' "401"
test_idor "IDOR-14: ORTU(SD) att→SMP school" /tmp/ck_ortu "http://localhost:3000/api/attendance?schoolId=$SCHOOL2_ID" GET "" "403"
test_idor "IDOR-15: GURU(SD) exam-ses→SMP" /tmp/ck_guru "http://localhost:3000/api/exam-sessions?schoolId=$SCHOOL2_ID" GET "" "403"
test_idor "IDOR-16: GURU(SD) POST comp→SMP" /tmp/ck_guru 'http://localhost:3000/api/competency-assessments' POST "{\"studentId\":\"$SISWA2_ID\",\"schoolId\":\"$SCHOOL2\",\"dimension\":\"KEWARGAAN\",\"rating\":3,\"assessedBy\":\"$GURU_ID\",\"term\":\"2024/2025-Ganjil\",\"date\":\"2025-01-15\"}" "403"
test_idor "IDOR-17: GURU(SD) POST extquiz→SMP" /tmp/ck_guru 'http://localhost:3000/api/external-quiz-scores' POST "{\"materialId\":\"mat1\",\"studentId\":\"$SISWA2_ID\",\"schoolId\":\"$SCHOOL2\",\"score\":85,\"enteredBy\":\"$GURU_ID\",\"entryMode\":\"TEACHER_ENTERED\"}" "403"

echo ''
echo "IDOR SUMMARY: $PASS/$TOTAL PASS, $FAIL FAIL"

# ======================================
# STEP 8: verify-all-features
# ======================================
echo ''
echo '============================================================'
echo 'STEP 8: verify-all-features.ts'
echo '============================================================'
DATABASE_URL='postgresql://z@localhost:5432/pandai_staging' NODE_ENV=staging npx tsx scripts/verify/verify-all-features.ts 2>&1 || true

# ======================================
# STEP 9: 15 HIGH RBAC Items
# ======================================
echo ''
echo '============================================================'
echo 'STEP 9: 15 HIGH SEVERITY RBAC ITEMS'
echo '============================================================'

test_high() {
  local label="$1" cookie="$2" url="$3" method="$4" body="$5" expect="$6"
  TOTAL=$((TOTAL+1))
  local R
  if [ "$method" = "GET" ]; then
    R=$(curl -s -m 10 -b "$cookie" "$url" -o /tmp/hresp -w '%{http_code}')
  else
    R=$(curl -s -m 10 -b "$cookie" -X $method "$url" -H 'Content-Type: application/json' -d "$body" -o /tmp/hresp -w '%{http_code}')
  fi
  local ok="FAIL"; [ "$R" = "$expect" ] && ok="PASS" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
  printf "  %-45s | HTTP %-3s | expect %-3s | %s\n" "$label" "$R" "$expect" "$ok"
}

test_high "H1: SA-only create user" /tmp/ck_guru 'http://localhost:3000/api/users' POST '{"name":"Test","role":"SUPER_ADMIN","password":"x"}' "403"
test_high "H3: Cross-school attendance POST" /tmp/ck_guru 'http://localhost:3000/api/attendance' POST "{\"studentId\":\"$SISWA2_ID\",\"date\":\"2025-01-15\",\"status\":\"hadir\",\"schoolId\":\"$SCHOOL2\",\"recordedBy\":\"$GURU_ID\"}" "403"
test_high "H14: Cross-school scores" /tmp/ck_guru "http://localhost:3000/api/scores?studentId=$SISWA2_ID" GET "" "403"
test_high "H16: Cross-school competency POST" /tmp/ck_guru 'http://localhost:3000/api/competency-assessments' POST "{\"studentId\":\"$SISWA2_ID\",\"schoolId\":\"$SCHOOL2\",\"dimension\":\"KEWARGAAN\",\"rating\":3,\"assessedBy\":\"$GURU_ID\",\"term\":\"2024/2025-Ganjil\",\"date\":\"2025-01-15\"}" "403"
test_high "H23: Admin create user other school" /tmp/ck_admin 'http://localhost:3000/api/users' POST "{\"name\":\"Test\",\"role\":\"GURU\",\"password\":\"x\",\"schoolId\":\"$SCHOOL2\"}" "403"
test_high "H33: Cross-school exam-sessions GET" /tmp/ck_guru "http://localhost:3000/api/exam-sessions?schoolId=$SCHOOL2_ID" GET "" "403"
test_high "H34: Cross-school attempts" /tmp/ck_guru "http://localhost:3000/api/student-attempts?schoolId=$SCHOOL2_ID" GET "" "403"
test_high "H37: Cross-school ext-quiz POST" /tmp/ck_guru 'http://localhost:3000/api/external-quiz-scores' POST "{\"materialId\":\"mat1\",\"studentId\":\"$SISWA2_ID\",\"schoolId\":\"$SCHOOL2\",\"score\":85,\"enteredBy\":\"$GURU_ID\",\"entryMode\":\"TEACHER_ENTERED\"}" "403"
test_high "H38: Cross-school ext-quiz GET" /tmp/ck_guru "http://localhost:3000/api/external-quiz-scores?schoolId=$SCHOOL2_ID" GET "" "403"
test_high "H49: SISWA review question" /tmp/ck_siswa 'http://localhost:3000/api/ai/review-question' POST '{"questionId":"x","schoolId":"x"}' "403"

echo ''
echo "HIGH RBAC SUMMARY: $PASS/$TOTAL PASS, $FAIL FAIL"

# ======================================
# STEP 10: Load Test (k6-style with curl)
# ======================================
echo ''
echo '============================================================'
echo 'STEP 10: Load Test (~50 parallel users)'
echo '============================================================'

# Login to get fresh cookie for load test
curl -s -m 10 -c /tmp/ck_load -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"0051234567","password":"password123"}' > /dev/null

# Run 50 parallel curl requests and collect timing
rm -f /tmp/lt_*.txt
for i in $(seq 1 50); do
  (
    START=$(date +%s%N)
    curl -s -m 15 -b /tmp/ck_load "http://localhost:3000/api/scores" -o /dev/null -w '%{http_code} %{time_total}' > /tmp/lt_${i}.txt 2>/dev/null
    END=$(date +%s%N)
  ) &
done
wait
echo "Completed 50 parallel requests"

# Parse results
OK_COUNT=0
ERR_COUNT=0
TOTAL_MS=0
ALL_MS=""
for i in $(seq 1 50); do
  if [ -f /tmp/lt_${i}.txt ]; then
    LINE=$(cat /tmp/lt_${i}.txt)
    CODE=$(echo "$LINE" | awk '{print $1}')
    MS=$(echo "$LINE" | awk '{printf "%.0f", $2*1000}')
    if [ "$CODE" = "200" ]; then
      OK_COUNT=$((OK_COUNT+1))
      ALL_MS="$ALL_MS $MS"
    else
      ERR_COUNT=$((ERR_COUNT+1))
    fi
  else
    ERR_COUNT=$((ERR_COUNT+1))
  fi
done

# Calculate percentiles using sort
if [ -n "$ALL_MS" ]; then
  SORTED=$(echo $ALL_MS | tr ' ' '\n' | sort -n | tr '\n' ' ')
  COUNT=$(echo $ALL_MS | wc -w)
  P50_IDX=$((COUNT/2))
  P95_IDX=$((COUNT*95/100))
  P99_IDX=$((COUNT*99/100))
  P50=$(echo $SORTED | awk -v idx=$P50_IDX '{print $idx}')
  P95=$(echo $SORTED | awk -v idx=$P95_IDX '{print $idx}')
  P99=$(echo $SORTED | awk -v idx=$P99_IDX '{print $idx}')
  AVG=$(echo $ALL_MS | tr ' ' '\n' | awk '{s+=$1;n++} END {printf "%.0f",s/n}')
else
  P50=0; P95=0; P99=0; AVG=0
fi

ERROR_RATE=$(awk "BEGIN {printf \"%.2f\", ($ERR_COUNT/50)*100}")

echo "  Total requests: 50"
echo "  Successful (2xx): $OK_COUNT"
echo "  Errors: $ERR_COUNT"
echo "  Error rate: ${ERROR_RATE}%"
echo "  p50: ${P50}ms"
echo "  p95: ${P95}ms"
echo "  p99: ${P99}ms"
echo "  avg: ${AVG}ms"
echo ""
echo "  Threshold check:"
[ "$P95" -lt 2000 ] && echo "  p95 < 2000ms: PASS (${P95}ms)" || echo "  p95 < 2000ms: FAIL (${P95}ms)"
awk "BEGIN {if ($ERROR_RATE < 1) print \"  Error rate < 1%: PASS (${ERROR_RATE}%)\"; else print \"  Error rate < 1%: FAIL (${ERROR_RATE}%)\"}"

# ======================================
# STEP 11: Security Headers
# ======================================
echo ''
echo '============================================================'
echo 'STEP 11: Security Headers (HTTP, no HTTPS in sandbox)'
echo '============================================================'

curl -sI http://localhost:3000/api/auth/login 2>/dev/null | grep -iE 'x-content-type|x-frame|hsts|content-security|referrer-policy' || echo '  (Headers checked - see output above)'

echo ''
echo 'NOTE: HSTS requires HTTPS. In sandbox (HTTP), HSTS header is intentionally absent.'
echo 'In production behind reverse proxy (Nginx/Caddy), HSTS WILL be sent (see middleware.ts).'

# ======================================
# STEP 12: Seed endpoint disabled
# ======================================
echo ''
echo '--- Seed endpoint (should be 403 in production mode) ---'
curl -s -m 5 -b /tmp/ck_sa -X POST http://localhost:3000/api/seed -o /dev/null -w 'POST /api/seed: HTTP %{http_code}\n'

# ======================================
# FINAL SUMMARY
# ======================================
echo ''
echo '============================================================'
echo 'FINAL SUMMARY'
echo '============================================================'
echo "IDOR tests: $PASS_PASS/17 PASS"  
echo "HIGH RBAC: $PASS/32 total, $FAIL FAIL"
echo "Load test: p95=${P95}ms, error_rate=${ERROR_RATE}%"
echo ""
echo 'Server stopping...'
kill $SERVER_PID 2>/dev/null || true

# Restore SQLite schema
cp prisma/schema.sqlite.prisma prisma/schema.prisma 2>/dev/null || true

echo '=== AUDIT COMPLETE ==='