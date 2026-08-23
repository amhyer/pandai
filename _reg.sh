#!/bin/bash
JWT_SECRET=dev_jwt_secret_do_not_use_in_prod B='http://localhost:3000'
SA=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'sa',role:'SUPER_ADMIN',schoolId:null}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_use_prod'));console.log(t)})()")
AA=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'aa',role:'ADMIN_SCHOOL',schoolId:'schA'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
GA=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'ga',role:'GURU',schoolId:'schA'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
SIS=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'sis',role:'SISWA',schoolId:'schA'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
SI=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'si',role:'SISWA',schoolId:'schA',isActive:false}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
SB=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'sb',role:'SISWA',schoolId:'schB'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
KA=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'ka',role:'KEPALA_SEKOLAH',schoolId:'schA'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
OA=$(node -e "const{SignJWT}=require('jose');(async()=>{const t=await new SignJWT({userId:'oa',role:'ORANG_TUA',schoolId:'schA'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('24h').sign(new TextEncoder().encode('dev_jwt_secret_do_not_prod'));console.log(t)})()")
PASS=0 FAIL=0
run(){ local l=$1 m=$2 u=$3 b=$4 e=$5 ck=$6; local r c d
if [ "$m" = "GET" ]; then r=$(curl -s -m 10 -w '
%{http_code}' -H "Cookie: pandai_session=$u" "$B$u" 2>&1)
else r=$(curl -s -m 10 -w '
%{http_code}' -X "$m" -H 'Content-Type: application/json' -H "Cookie: pandai_session=$u" -d "$b" "$B$u" 2>&1); fi
c=$(echo "$r" | tail -1); d=$(echo "$r" | sed '$d')
if [ "$c" = "000" ]; then echo "UNVERIFIED $l"; FAIL=$((FAIL+1)); return; fi
if [ "$c" != "$e" ]; then echo "FAIL $l got=$c exp=$e"; FAIL=$((FAIL+1)); return; fi
if [ -n "$ck" ]; then v=$(echo "$d" | python3 -c "$ck" 2>&1) || true; if [ "$v" = "PASS" ]; then echo "PASS $l"; PASS=$((PASS+1)); else echo "FAIL $l check=$v"; FAIL=$((FAIL+1)); fi; else echo "PASS $l"; PASS=$((PASS+1)); fi; }

# P0-01 Exam Time Window
run 'T5 SISWA GET active' GET '/api/exam-session/xxx' '$SIS' '' 200 ''
run 'T6 SISWA GET scheduled' GET '/api/exam-session/xxx' '$SIS' '' 422 ''
run 'T7 SISWA GET wrong-time' GET '/api/exam-session/xxx' '$SIS' '' 422 ''
run 'T2 POST scheduled' POST '/api/attempts' '$SIS' '{"examSessionId":"x","examPackageId":"x","schoolId":"x","classId":"x","answers":[],"duration":60}' 422 ''
run 'T3 POST ended' POST '/api/attempts' '$SIS' '{"examSessionId":"x","examPackageId":"x","schoolId":"x","classId":"x","answers":[],"duration":60}' 422 ''
run 'T4 POST wrong-time' POST '/api/attempts' '$SIS' '{"examSessionId":"x","examPackageId":"x","schoolId":"x","classId":"x","answers":[],"duration":60}' 422 ''

# P0-02 Deadline
run 'T9 POST past deadline' POST '/api/assignments/xxx/submissions' '$SIS' '{"schoolId":"x","classId":"x","action":"draft","answers":[]}' 422 ''

# P0-03 Answer Key
run 'T10 SISWA no isCorrect' GET '/api/exam-session/xxx' '$SIS' '' 200 'import json,sys;d=json.load(sys.stdin);opts=json.loads(d["questions"][0]["options"]);sys.exit(0 if not any("isCorrect" in o for o in opts) else 1)'
run 'T11 GURU has isCorrect' GET '/api/exam-session/xxx' '$GA' '' 200 'import json,sys;d=json.load(sys.stdin);opts=json.loads(d["questions"][0]["options"]);sys.exit(0 if any("isCorrect" in o for o in opts) else 1)'
run 'T12 SISWA questions no answer' GET '/api/questions?schoolId=x' '$SIS' '' 200 'import json,sys;d=json.load(sys.stdin);q=[x for x in d if "T" in x.get("content","")];print("PASS" if q and "answer" not in q[0] else "FAIL")'
run 'T13 GURU questions has answer' GET '/api/questions?schoolId=x' '$GA' '' 200 'import json,sys;d=json.load(sys.stdin);q=[x for x in d if "T" in x.get("content","")];print("PASS" if q and "answer" in q[0] else "FAIL")'

# P0-04 Inactive User
run 'T14 Inactive user' GET '/api/questions' '$SI' '' 401 'import json,sys;d=json.load(sys.stdin);print("PASS" if "tidak aktif" in d.get("error","").lower() else "FAIL: "+str(d))'

# P0-05 Activity Log POST
run 'T15 POST activity-logs' POST '/api/activity-logs' '$SA' '{"action":"test"}' 405 ''

# P0-06 Role Restriction
run 'T16 SUPER_ADMIN logs' GET '/api/activity-logs' '$SA' '' 200 ''
run 'T17 ADMIN logs' GET '/api/activity-logs' '$AA' '' 200 ''
run 'T18 GURU logs 403' GET '/api/activity-logs' '$GA' '' 403 ''
run 'T19 SISWA logs 403' GET '/api/activity-logs' '$SIS' '' 403 ''

# Cross-School
run 'T20 SB cross-school POST attempt' POST '/api/attempts' '$SB' '{"examSessionId":"x","examPackageId":"x","schoolId":"schA","classId":"x","answers":[],"duration":60}' 403 ''
run 'T21 SB cross-school assignment' POST '/api/assignments/xxx/submissions' '$SB' '{"schoolId":"schA","classId":"x","action":"draft","answers":[]}' 403 ''

# No Auth
run 'T23 No cookie' GET '/api/questions' '' '' 401 ''

# IDOR protection
run 'TIDOR fake studentId' POST '/api/assignments/xxx/submissions' '$SIS' '{"studentId":"FAKE","schoolId":"x","classId":"x","action":"draft","answers":[]}' 403 ''

echo ""
echo "RESULTS: PASS=$PASS FAIL=$FAIL TOTAL=$((PASS+FAIL))"
ps aux | rg 'server.js' | rg -v rg || echo 'server dead'