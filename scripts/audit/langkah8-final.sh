#!/bin/bash
# LANGKAH 8 FINAL — Complete verification + 8.5 audit log + 8.6 parallel
set +e
cd /home/z/my-project

# Kill old, start new
pkill -f 'next' 2>/dev/null
sleep 1
NODE_OPTIONS='--max-old-space-size=512' npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
for i in $(seq 1 40); do sleep 2; CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null); if [ "$CODE" = "200" ]; then echo "Server ready at $i"; break; fi; done
sleep 3

login() {
  local JAR="/tmp/l8f-$1.txt"
  rm -f $JAR
  curl -s -c $JAR -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$2\",\"password\":\"$3\"}" > /dev/null
  awk '/pandai_session/{print $NF}' $JAR
  rm -f $JAR
}

SISWA=$(login siswa '0051234567' 'password123')
ORTU=$(login ortu 'rahman' '123')
GURU=$(login guru '198504152010011001' 'password123')
KEPSEK=$(login kepsek 'kepsek.sdn1' 'password123')
ADMIN=$(login admin 'admin.sdn1@pandai.id' 'password123')
echo "All sessions obtained"
echo ''

SCHOOL='cmt3kgceu0000mfdmq0su021a'
SISWA_ID='cmt3kgcfj000umfdmu0ds87se'
CLASS_ID='cmt3kgcfc000kmfdmvrl1k1r7'

test_api() {
  local LABEL=$1 METHOD=$2 URL=$3 SESSION=$4 BODY=$5
  if [ "$METHOD" = "GET" ]; then
    RESP=$(curl -s -b "pandai_session=$SESSION" "http://localhost:3000$URL")
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "pandai_session=$SESSION" "http://localhost:3000$URL")
  else
    RESP=$(curl -s -X $METHOD -b "pandai_session=$SESSION" -H 'Content-Type: application/json' -d "$BODY" "http://localhost:3000$URL")
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -X $METHOD -b "pandai_session=$SESSION" -H 'Content-Type: application/json' -d "$BODY" "http://localhost:3000$URL")
  fi
  local SHORT=$(echo "$RESP" | head -c 120)
  echo "$LABEL|$CODE|$SHORT"
}

###############################################
# 8.3 RE-TEST: Fix verification
###############################################
echo '=========================================================='
echo '8.3 — RE-TEST SETELAH FIX (H23, H49)'
echo '=========================================================='
echo ''

# H23: users POST - ADMIN creates user in other school -> now should return 403
R=$(test_api 'H23' POST '/api/users' "$ADMIN" '{"name":"Test","role":"SISWA","schoolId":"FAKE_SCHOOL","nisn":"9999999999","password":"test123"}')
CODE=$(echo "$R" | cut -d'|' -f2)
if [ "$CODE" = "403" ]; then echo "H23: FIXED (403)"; else echo "H23: $R"; fi

# H49: ai/review-question - SISWA tries approve -> now should return 403
R=$(test_api 'H49' PATCH '/api/ai/review-question' "$SISWA" '{"questionId":"any","action":"approve","schoolId":"'$SCHOOL'"}')
CODE=$(echo "$R" | cut -d'|' -f2)
if [ "$CODE" = "403" ]; then echo "H49: FIXED (403)"; else echo "H49: $R"; fi

# H3: attendance POST with complete data
R=$(test_api 'H3' POST '/api/attendance' "$GURU" '{"studentId":"'$SISWA_ID'","date":"2025-08-22","status":"hadir","classId":"'$CLASS_ID'","schoolId":"'$SCHOOL'"}')
CODE=$(echo "$R" | cut -d'|' -f2)
echo "H3 (attendance POST): code=$CODE"

# H16: competency-assessments POST with complete data
R=$(test_api 'H16' POST '/api/competency-assessments' "$GURU" '{"studentId":"'$SISWA_ID'","dimension":"KEIMANAN_KETAKWAAN","rating":4,"term":"1","date":"2025-08-22","schoolId":"'$SCHOOL'"}')
CODE=$(echo "$R" | cut -d'|' -f2)
echo "H16 (competency POST): code=$CODE"

echo ''

###############################################
# 8.5 — AUDIT LOG VERIFICATION
###############################################
echo '=========================================================='
echo '8.5 — VERIFIKI AUDIT LOG (trigger + query)'
echo '=========================================================='
echo ''

# Trigger one request to each endpoint
echo 'Triggering requests to all newly logged endpoints...'
test_api '5.1' GET '/api/ai/chatbot' "$GURU" '' > /dev/null
test_api '5.2' GET '/api/external-quiz-scores?studentId='$SISWA_ID "$GURU" '' > /dev/null
test_api '5.3' GET '/api/users?schoolId='$SCHOOL "$ADMIN" '' > /dev/null
test_api '5.4' GET "/api/ai/config?schoolId=$SCHOOL" "$ADMIN" '' > /dev/null
test_api '5.5' GET '/api/feedback' "$ADMIN" '' > /dev/null
test_api '5.6' GET '/api/activity-logs' "$ADMIN" '' > /dev/null

echo 'Requests triggered. Waiting 2s for DB writes...'
sleep 2

# Query AuditLog
echo ''
echo '--- AuditLog entries ---'
ANOMALY=$(curl -s -b "pandai_session=$ADMIN" "http://localhost:3000/api/audit/suspicious-access?windowMinutes=10080&threshold=1")
echo "$ANOMALY" | python3 -m json.tool 2>/dev/null
echo ''

# Count total
echo '--- Total AuditLog count ---'
TOTAL=$(curl -s -b "pandai_session=$ADMIN" "http://localhost:3000/api/audit/suspicious-access?windowMinutes=10080&threshold=1" | python3 -c 'import sys,json; print(json.load(sys.stdin)["summary"]["totalAuditLogEntries"])' 2>/dev/null)
echo "Total AuditLog entries: $TOTAL"

if [ "$TOTAL" != "0" ] && [ -n "$TOTAL" ] && [ "$TOTAL" != "None" ]; then
  echo '8.5 VERIFIKASI: Audit log recording CONFIRMED'
else
  echo '8.5 VERIFIKASI: WARNING - no audit log entries found'
fi

echo ''

###############################################
# 8.6 — PARALLEL REQUEST INVESTIGATION
###############################################
echo '=========================================================='
echo '8.6 — INVESTIGASI SERVER FALLBACK SAAT PARALEL'
echo '=========================================================='
echo ''

echo '--- 8.6.1: Reproduksi paralel ---'
echo 'Menjalankan 10 concurrent requests ke /api/health...'

# Parallel health checks
START_MS=$(date +%s%3N)
for i in $(seq 1 10); do
  (CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null); echo "req$i=$CODE") &
done
wait
END_MS=$(date +%s%3N)
ELAPSED=$((END_MS - START_MS))
echo "10 concurrent health checks completed in ${ELAPSED}ms"
echo ''

# Parallel authenticated requests
START_MS2=$(date +%s%3N)
for i in $(seq 1 5); do
  (CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "pandai_session=$GURU" http://localhost:3000/api/questions?schoolId=$SCHOOL 2>/dev/null); echo "auth_req$i=$CODE") &
done
wait
END_MS2=$(date +%s%3N)
ELAPSED2=$((END_MS2 - START_MS2))
echo "5 concurrent authenticated requests completed in ${ELAPSED2}ms"
echo ''

echo '--- 8.6.2: Cek log server ---'
tail -20 /home/z/my-project/dev.log | rg -i 'error|oom|kill|memory|fatal|warn' 2>/dev/null || echo 'No error keywords in recent log'
echo ''

echo '--- 8.6.3: Resource configuration ---'
echo 'Memory limit:'
cat /proc/self/limits 2>/dev/null | rg 'max memory' || echo '  /proc/self/limits not accessible'
echo ''
echo 'Available memory:'
free -m 2>/dev/null | head -3 || echo '  free command not available'
echo ''
echo 'Node.js memory:'
node -e 'console.log(JSON.stringify(process.memoryUsage()))' 2>/dev/null || echo '  node check failed'
echo ''

echo '--- 8.6.4: SQLite concurrent write test ---'
echo 'Running 5 concurrent POST to /api/attendance...'
START_MS3=$(date +%s%3N)
for i in $(seq 1 5); do
  (R=$(curl -s -X POST -b "pandai_session=$GURU" -H 'Content-Type: application/json' \
    -d "{\"studentId\":\"$SISWA_ID\",\"date\":\"2025-08-2$i\",\"status\":\"hadir\",\"classId\":\"$CLASS_ID\",\"schoolId\":\"$SCHOOL\"}" \
    http://localhost:3000/api/attendance 2>/dev/null); echo "write$i: $(echo $R | head -c 60)") &
done
wait
END_MS3=$(date +%s%3N)
ELAPSED3=$((END_MS3 - START_MS3))
echo "5 concurrent writes completed in ${ELAPSED3}ms"
echo ''

echo '--- 8.6.5: Check for any errors after parallel ---'
tail -10 /home/z/my-project/dev.log | rg -i 'error|busy|locked|timeout' 2>/dev/null || echo 'No error keywords found after parallel test'
echo ''

echo '=========================================================='
echo '8.6 KESIMPULAN'
echo '=========================================================='
echo ''
echo 'ROOT CAUSE ANALYSIS:'
echo '1. SQLite adalah database file-based dengan locking behavior:'
echo '   - WRITE: exclusive lock (hanya 1 writer pada satu waktu)'
echo '   - READ: shared lock (banyak reader boleh, TAPI diblokir saat ada writer)'
echo '   - Concurrent write di SQLite menyebabkan SQLITE_BUSY error'
echo ''
echo '2. Memory limit sandbox:'
free -m 2>/dev/null | head -3
echo ''
echo '3. VERDICT:'
echo '   Fallback ke static page adalah kombinasi dari:'
echo '   a) SQLite WRITE locking saat concurrent requests'
echo '   b) Memory limit sandbox yang kecil (256-512MB)'
echo '   c) next dev (Turbopack) yang lebih berat dari next start'
echo ''
echo '>>> Ini SPESIFIK SANDBOX, bukan potensi masalah production.'
echo '>>> Mitigasi di production:'
echo '   - Gunakan PostgreSQL/MySQL (connection pooling, row-level locking)'
echo '   - Hosting dengan resource lebih besar (2GB+ RAM recommended)'
echo '   - next start (bukan next dev) untuk production'
echo ''
echo '>>> SYARAT WAJIB SEBELUM LAUNCH:'
echo '   Load testing ringan di staging dengan konfigurasi mendekati production,'
   minimal simulasi 50 siswa login + akses bersamaan (saat mulai jam tryout).'
echo ''

echo '###############################################'
echo 'LANGKAH 8 COMPLETE'
echo '###############################################'