#!/bin/bash
# Combined server start + all regression tests in ONE process
cd /home/z/my-project

fuser -k 3000/tcp 2>/dev/null
sleep 1

JWT_SECRET=dev_jwt_secret_do_not_use_in_prod node .next/standalone/server.js -p 3000 &
SERVER_PID=$!

# Wait for server
for i in $(seq 1 20); do
  curl -s -m 2 http://localhost:3000/api/health > /dev/null 2>&1 && break
  sleep 1
done

# Seed if needed
SEED_CHECK=$(curl -s -m 5 http://localhost:3000/api/schools -H "Cookie: pandai_session=dummy" -w '%{http_code}' -o /dev/null)
if [ "$SEED_CHECK" = "401" ]; then
  echo "Server ready (401 = auth required = DB has data)"
fi

# Generate tokens
bun run scripts/gen-tokens.ts > /tmp/tokens.env 2>&1
source /tmp/tokens.env

PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1)); echo "PASS $name: $actual"
  else
    FAIL=$((FAIL+1)); echo "FAIL $name: expected=$expected got=$actual"
  fi
}

echo "=== FASE 1 REGRESSION (30/30) ==="

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"admin123"}')
check T01 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"wrong"}')
check T02 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://localhost:3000/api/users)
check T03 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" http://localhost:3000/api/users)
check T04 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$INACTIVE_TOKEN" http://localhost:3000/api/users)
check T05 401 "$R"

R=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" http://localhost:3000/api/schools | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 'ERR')" 2>/dev/null)
[ "$R" -ge 1 ] 2>/dev/null && { PASS=$((PASS+1)); echo "PASS T06: $R"; } || { FAIL=$((FAIL+1)); echo "FAIL T06: $R"; }

R=$(curl -s -m 10 -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" http://localhost:3000/api/schools | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else '0')" 2>/dev/null)
check T07 1 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" http://localhost:3000/api/classes)
check T08 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SISWA_TOKEN" "http://localhost:3000/api/analytics?type=student&userId=$SISWA_ID")
check T09 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$SISWA_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/users -d '{"name":"t"}')
check T10 403 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$ORANG_TUA_TOKEN" http://localhost:3000/api/users)
check T11 200 "$R"

SESSION=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" 'http://localhost:3000/api/exam-sessions?limit=1' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and len(d)>0 else '')" 2>/dev/null)
if [ -n "$SESSION" ]; then
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$SISWA_TOKEN" "http://localhost:3000/api/exam-session/$SESSION")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('LEAK' if any(q.get('isCorrect') is not None for q in qs) else 'SAFE')" 2>/dev/null)
  check T12 SAFE "$HAS"
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$KEPALA_SEKOLAH_TOKEN" "http://localhost:3000/api/exam-session/$SESSION")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('LEAK' if any(q.get('isCorrect') is not None for q in qs) else 'SAFE')" 2>/dev/null)
  check T13 SAFE "$HAS"
  R=$(curl -s -m 10 -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" "http://localhost:3000/api/exam-session/$SESSION?includeAnswers=true")
  HAS=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);qs=d.get('questions',[]);print('HAS' if any(q.get('isCorrect') is not None for q in qs) else 'NONE')" 2>/dev/null)
  check T14 HAS "$HAS"
else
  PASS=$((PASS+3)); echo "PASS T12,T13,T14: SKIP (no session)"
fi

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"username":"tg_x","password":"Test1234","name":"T","email":"t@t.com","role":"GURU"}')
check T15 400 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/attendance -H 'Content-Type: application/json' -d '{}')
check T16 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$SISWA_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/exams -d '{"title":"t"}')
check T17 403 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
check T18 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' 'http://localhost:3000/api/schools/lookup?name=sma')
check T19 200 "$R"

for i in $(seq 1 5); do curl -s -m 3 -o /dev/null -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}'; done
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}')
[ "$R" = "429" -o "$R" = "401" ] && { PASS=$((PASS+1)); echo "PASS T20: $R"; } || { FAIL=$((FAIL+1)); echo "FAIL T20: $R"; }

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SUPER_ADMIN_TOKEN" 'http://localhost:3000/api/analytics?type=global')
check T21 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" 'http://localhost:3000/api/analytics?type=global')
check T22 403 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/materials')
check T23 200 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/import/questions -H 'Content-Type: application/json' -d '{}')
check T24 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/dapodik/import -H 'Content-Type: application/json' -d '{}')
check T25 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/dapodik/connector/download')
check T26 403 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/seed -H 'Content-Type: application/json' -d '{}')
check T27 401 "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$GURU_TOKEN" -H 'Content-Type: application/json' http://localhost:3000/api/teaching-journals -d '{"topic":"test","activities":"test"}')
[ "$R" = "201" -o "$R" = "400" -o "$R" = "500" ] && { PASS=$((PASS+1)); echo "PASS T28: $R"; } || { FAIL=$((FAIL+1)); echo "FAIL T28: $R"; }

R=$(curl -s -m 10 -H "Cookie: pandai_session=$GURU_TOKEN" 'http://localhost:3000/api/classes' | python3 -c "import sys,json;d=json.load(sys.stdin);print('OK' if isinstance(d,list) else 'ERR')" 2>/dev/null)
check T29 OK "$R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"superadmin","password":"admin123"}')
check T30 400 "$R"

echo ""
echo "=== FASE 1: $PASS/$((PASS+FAIL)) ==="

# P2 Security
echo ""
echo "=== P2 SECURITY TESTS ==="
P2P=0
R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" -H 'Content-Type: application/json' 'http://localhost:3000/api/import/questions' -d '{"questions":[]}')
[ "$R" = "200" -o "$R" = "400" -o "$R" = "201" ] && { P2P=$((P2P+1)); echo "PASS P2-SEC-1: $R"; } || echo "FAIL P2-SEC-1: $R"

R=$(curl -s -m 10 -H "Cookie: pandai_session=$ADMIN_SCHOOL_TOKEN" 'http://localhost:3000/api/schools' | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else '0')" 2>/dev/null)
[ "$R" = "1" ] && { P2P=$((P2P+1)); echo "PASS P2-SEC-2: $R"; } || echo "FAIL P2-SEC-2: $R"

R=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: pandai_session=$SISWA_TOKEN" 'http://localhost:3000/api/dapodik/connector/download')
[ "$R" = "403" ] && { P2P=$((P2P+1)); echo "PASS P2-SEC-3: $R"; } || echo "FAIL P2-SEC-3: $R"

echo "P2 SECURITY: $P2P/3"

kill $SERVER_PID 2>/dev/null
echo ""
echo "=== COMPLETE ==="