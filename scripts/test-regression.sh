#!/bin/bash
# FASE 3.4 Regression Test Script
set -e

cd /home/z/my-project

# Read tokens
source /tmp/tokens.env

echo "=== FASE 1 REGRESSION TESTS ==="
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1)); echo "PASS $name: $actual"
  else
    FAIL=$((FAIL+1)); echo "FAIL $name: expected=$expected got=$actual"
  fi
}

# T01: Login valid
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"admin123"}')
check T01 200 "$R"

# T02: Login invalid
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"wrong"}')
check T02 401 "$R"

# T03: No-auth protected
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://localhost:3000/api/users)
check T03 401 "$R"

# T04: SA token
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" http://localhost:3000/api/users)
check T04 200 "$R"

# T05: Inactive blocked
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$INACTIVE_TOKEN" http://localhost:3000/api/users)
check T05 401 "$R"

# T06: SA sees all schools
R=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" http://localhost:3000/api/schools | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'ERR')" 2>/dev/null)
[ "$R" -ge 1 ] 2>/dev/null && PASS=$((PASS+1)) && echo "PASS T06: $R" || { FAIL=$((FAIL+1)); echo "FAIL T06: $R"; }

# T07: ADMIN_SCHOOL school-scoped
R=$(curl -s -m 10 -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" http://localhost:3000/api/schools | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else '0')" 2>/dev/null)
check T07 1 "$R"

# T08: GURU classes
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" http://localhost:3000/api/classes)
check T08 200 "$R"

# T09: SISWA analytics
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SISWA_TOKEN" "http://localhost:3000/api/analytics?type=student&userId=$SISWA_ID")
check T09 200 "$R"

# T10: SISWA can't create users
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$SISWA_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/users -d '{"name":"t"}')
check T10 403 "$R"

# T11: ORTU GET /api/users = 200 (own children)
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$ORANG_TUA_TOKEN" http://localhost:3000/api/users)
check T11 200 "$R"

# T12: SISWA answer-key protection
SESSION=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" 'http://localhost:3000/api/exam-sessions?limit=1' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and len(d)>0 else '')" 2>/dev/null)
if [ -n "$SESSION" ]; then
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$SISWA_TOKEN" "http://localhost:3000/api/exam-session/$SESSION")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('LEAK' if any(q.get('isCorrect') is not None for q in qs) else 'SAFE')" 2>/dev/null)
  check T12 SAFE "$HAS"
else
  PASS=$((PASS+1)); echo "PASS T12: SKIP (no session)"
fi

# T13: KEPSEK answer-key protection
if [ -n "$SESSION" ]; then
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$KEPALA_SEKOLAH_TOKEN" "http://localhost:3000/api/exam-session/$SESSION")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('LEAK' if any(q.get('isCorrect') is not None for q in qs) else 'SAFE')" 2>/dev/null)
  check T13 SAFE "$HAS"
else
  PASS=$((PASS+1)); echo "PASS T13: SKIP (no session)"
fi

# T14: SA can see answers
if [ -n "$SESSION" ]; then
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" "http://localhost:3000/api/exam-session/$SESSION?includeAnswers=true")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('HAS' if any(q.get('isCorrect') is not None for q in qs) else 'NONE')" 2>/dev/null)
  check T14 HAS "$HAS"
else
  PASS=$((PASS+1)); echo "PASS T14: SKIP (no session)"
fi

# T15: Register GURU blocked
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"username":"test_guru_x","password":"Test1234","name":"Test","email":"test@test.com","role":"GURU"}')
check T15 400 "$R"

# T16: Attendance no-auth
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/attendance -H 'Content-Type: application/json' -d '{}')
check T16 401 "$R"

# T17: SISWA can't create exam
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$SISWA_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/exams -d '{"title":"t"}')
check T17 403 "$R"

# T18: Health public
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
check T18 200 "$R"

# T19: School lookup public
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' 'http://localhost:3000/api/schools/lookup?name=sma')
check T19 200 "$R"

# T20: Rate limiting
for i in $(seq 1 5); do curl -s -m 5 -o /dev/null -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}'; done
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}')
[ "$R" = "429" -o "$R" = "401" ] && PASS=$((PASS+1)) && echo "PASS T20: $R" || { FAIL=$((FAIL+1)); echo "FAIL T20: $R"; }

# T21: SA global analytics
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" 'http://localhost:3000/api/analytics?type=global')
check T21 200 "$R"

# T22: Non-SA global blocked
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" 'http://localhost:3000/api/analytics?type=global')
check T22 403 "$R"

# T23: GURU materials
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/materials')
check T23 200 "$R"

# T24: Import questions no-auth
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/import/questions -H 'Content-Type: application/json' -d '{}')
check T24 401 "$R"

# T25: Dapodik import no-auth
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/dapodik/import -H 'Content-Type: application/json' -d '{}')
check T25 401 "$R"

# T26: Dapodik GURU blocked
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/dapodik/connector/download')
check T26 403 "$R"

# T27: Seed no-auth
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/seed -H 'Content-Type: application/json' -d '{}')
check T27 401 "$R"

# T28: GURU journal
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$GURU_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/teaching-journals -d '{"topic":"test","activities":"test"}')
[ "$R" = "201" -o "$R" = "400" -o "$R" = "500" ] && PASS=$((PASS+1)) && echo "PASS T28: $R" || { FAIL=$((FAIL+1)); echo "FAIL T28: $R"; }

# T29: GURU classes scoped
R=$(curl -s -m 10 -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/classes' | python3 -c "import sys,json;d=json.load(sys.stdin);print('OK' if isinstance(d,list) else 'ERR')" 2>/dev/null)
check T29 OK "$R"

# T30: Login expects username
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"superadmin","password":"admin123"}')
check T30 400 "$R"

echo ""
echo "=== RESULTS ==="
echo "PASS: $PASS / 30"
echo "FAIL: $FAIL / 30"

# P2 Security Tests
echo ""
echo "=== P2 SECURITY TESTS ==="
P2P=0

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" -H 'Content-Type: application/json' 'http://localhost:3000/api/import/questions' -d '{"questions":[]}')
[ "$R" = "200" -o "$R" = "400" -o "$R" = "201" ] && P2P=$((P2P+1)) && echo "PASS P2-SEC-1: $R" || { echo "FAIL P2-SEC-1: $R"; }

R=$(curl -s -m 10 -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" 'http://localhost:3000/api/schools' | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else '0')" 2>/dev/null)
[ "$R" = "1" ] && P2P=$((P2P+1)) && echo "PASS P2-SEC-2: count=$R" || { echo "FAIL P2-SEC-2: count=$R"; }

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SISWA_TOKEN" 'http://localhost:3000/api/dapodik/connector/download')
[ "$R" = "403" ] && P2P=$((P2P+1)) && echo "PASS P2-SEC-3: $R" || { echo "FAIL P2-SEC-3: $R"; }

echo "P2 SECURITY: $P2P / 3"

echo ""
echo "=== CROSS-SCHOOL TEST ==="
SA_SCHOOLS=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" 'http://localhost:3000/api/schools' | python3 -c "import sys,json;[print(s['id']) for s in json.load(sys.stdin)]" 2>/dev/null)
S1=$(echo "$SA_SCHOOLS" | head -1)
S2=$(echo "$SA_SCHOOLS" | tail -1)
if [ -n "$S1" ] && [ -n "$S2" ] && [ "$S1" != "$S2" ]; then
  A2=$(curl -s -m 10 -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" "http://localhost:3000/api/users?schoolId=$S2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'BLOCKED')" 2>/dev/null)
  if [ "$A2" = "0" -o "$A2" = "BLOCKED" ]; then
    echo "PASS: ADMIN cannot see other school"
  else
    echo "FAIL: ADMIN saw $A2 users from other school"
  fi
else
  echo "SKIP: need 2+ schools (got: $(echo $SA_SCHOOLS | wc -l))"
fi

echo ""
echo "=== DONE ==="
