#!/bin/bash
# LANGKAH 9.1 + 9.2 — Seed data + real curl verification
# CRITICAL: Everything in one bash session
set +e
cd /home/z/my-project

SCHOOL_A='cmt3kgceu0000mfdmq0su021a'
SISWA_ID='cmt3kgcfj000umfdmu0ds87se'
GURU_ID='cmt3kgcfa000gmfdmz0wzfx79'
CLASS_ID='cmt3kgcfc000kmfdmvrl1k1r7'

###############################################
# STEP 1: Seed second school + GURU via direct DB
###############################################
echo '=== SEEDING SECOND SCHOOL + GURU ==='

# Check if School B already exists
SCHOOL_B=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.school.findFirst({where:{code:'SD-TEST-B'}}).then(s=>{console.log(s?s.id:'NONE');p.\$disconnect()});
" 2>/dev/null)

echo "School B: $SCHOOL_B"

if [ "$SCHOOL_B" = "NONE" ] || [ -z "$SCHOOL_B" ]; then
  SCHOOL_B=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.school.create({data:{name:'SD Negeri 2 Test',code:'SD-TEST-B',address:'Test',schoolType:'SD',status:'active'}}).then(s=>{console.log(s.id);p.\$disconnect()});
" 2>/dev/null)
  echo "Created School B: $SCHOOL_B"
fi

# Check if GURU_B exists
GURU_B_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.user.findFirst({where:{username:'guru_test_b',schoolId:'$SCHOOL_B'}}).then(u=>{console.log(u?u.id:'NONE');p.\$disconnect()});
" 2>/dev/null)

if [ "$GURU_B_ID" = "NONE" ] || [ -z "$GURU_B_ID" ]; then
  GURU_B_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
const crypto=require('crypto');
const bcrypt=require('bcryptjs')||require('bcrypt');
const hash=bcrypt.hashSync('password123',12);
p.user.create({data:{username:'guru_test_b',password:hash,name:'Guru Test Sekolah B',role:'GURU',schoolId:'$SCHOOL_B',isActive:true}}).then(u=>{console.log(u.id);p.\$disconnect()});
" 2>/dev/null)
  echo "Created GURU_B: $GURU_B_ID"
fi

echo "School B: $SCHOOL_B"
echo "GURU_B:  $GURU_B_ID"
echo ''

###############################################
# STEP 2: Seed attempt + external quiz score
###############################################
echo '=== SEEDING ATTEMPT + QUIZ SCORE ==='

# Seed an attempt for SISWA in School A
ATTEMPT_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.studentAttempt.findFirst({where:{userId:'$SISWA_ID',schoolId:'$SCHOOL_A',isRemedial:false}}).then(a=>{console.log(a?a.id:'NONE');p.\$disconnect()});
" 2>/dev/null)

if [ "$ATTEMPT_ID" = "NONE" ] || [ -z "$ATTEMPT_ID" ]; then
  ATTEMPT_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.studentAttempt.create({data:{userId:'$SISWA_ID',schoolId:'$SCHOOL_A',classId:'$CLASS_ID',examSessionId:'test_session',examPackageId:'test_pkg',score:75,totalCorrect:15,totalWrong:5,totalUnanswered:0,percentage:75,duration:1800,status:'submitted',submittedAt:new Date()}}).then(a=>{console.log(a.id);p.\$disconnect()});
" 2>/dev/null)
  echo "Created attempt: $ATTEMPT_ID"
fi

# Seed material for external quiz
MATERIAL_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.material.findFirst({where:{schoolId:'$SCHOOL_A'}}).then(m=>{console.log(m?m.id:'NONE');p.\$disconnect()});
" 2>/dev/null)

if [ "$MATERIAL_ID" = "NONE" ] || [ -z "$MATERIAL_ID" ]; then
  MATERIAL_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.material.create({data:{title:'Kuis Eksternal Test',content:'test',schoolId:'$SCHOOL_A',subjectId:'cmt3kgcgb001vmfdmeaikd5br',status:'published',externalProvider:'quizizz',externalUrl:'https://quizizz.com/test'}}).then(m=>{console.log(m.id);p.\$disconnect()});
" 2>/dev/null)
  echo "Created material: $MATERIAL_ID"
fi

# Seed external quiz score
QUIZ_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.externalQuizScore.findFirst({where:{studentId:'$SISWA_ID',materialId:'$MATERIAL_ID'}}).then(q=>{console.log(q?q.id:'NONE');p.\$disconnect()});
" 2>/dev/null)

if [ "$QUIZ_ID" = "NONE" ] || [ -z "$QUIZ_ID" ]; then
  QUIZ_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.externalQuizScore.create({data:{studentId:'$SISWA_ID',schoolId:'$SCHOOL_A',materialId:'$MATERIAL_ID',score:85,maxScore:100,enteredBy:'$GURU_ID',entryMode:'TEACHER_ENTERED'}}).then(q=>{console.log(q.id);p.\$disconnect()});
" 2>/dev/null)
  echo "Created quiz score: $QUIZ_ID"
fi

echo "Attempt:   $ATTEMPT_ID"
echo "Material:  $MATERIAL_ID"
echo "Quiz:     $QUIZ_ID"
echo ''

###############################################
# STEP 3: Start server + login all roles
###############################################
echo '=== STARTING SERVER ==='
pkill -f next 2>/dev/null; sleep 1
NODE_OPTIONS='--max-old-space-size=512' npx next dev -p 3000 > /dev/null 2>&1 &
for i in $(seq 1 40); do sleep 2; if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q ok; then echo 'Server ready'; break; fi; done
sleep 2

login() {
  local JAR="/tmp/l9-$1.txt"
  rm -f $JAR
  curl -s -c $JAR -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$2\",\"password\":\"$3\"}" > /dev/null
  awk '/pandai_session/{print $NF}' $JAR
  rm -f $JAR
}

GURU_A=$(login gurua '198504152010011001' 'password123')
GURU_B=$(login gurub 'guru_test_b' 'password123')
ADMIN=$(login admin 'admin.sdn1@pandai.id' 'password123')
echo "Sessions: GURU_A=${GURU_A:0:8} GURU_B=${GURU_B:0:8} ADMIN=${ADMIN:0:8}"
echo ''

###############################################
# 9.1 — H3: Attendance POST
###############################################
echo '========================================'
echo '9.1 H3: POST /api/attendance'
echo '========================================'
echo ''
echo '--- H3 SAME SCHOOL (valid, should succeed 201) ---'
curl -s -X POST -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-09-01\",\"schoolId\":\"$SCHOOL_A\",\"records\":[{\"studentId\":\"$SISWA_ID\",\"status\":\"hadir\"}]}" \
  http://localhost:3000/api/attendance | python3 -m json.tool 2>/dev/null
echo ''
echo '--- H3 CROSS SCHOOL (school B, should fail 403) ---'
curl -s -X POST -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"date\":\"2025-09-01\",\"schoolId\":\"$SCHOOL_B\",\"records\":[{\"studentId\":\"$SISWA_ID\",\"status\":\"hadir\"}]}" \
  http://localhost:3000/api/attendance | python3 -m json.tool 2>/dev/null
echo ''

###############################################
# 9.1 — H16: Competency Assessment POST
###############################################
echo '========================================'
echo '9.1 H16: POST /api/competency-assessments'
echo '========================================'
echo ''
echo '--- H16 SAME SCHOOL (valid, should succeed 201) ---'
curl -s -X POST -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$SISWA_ID\",\"dimension\":\"KEIMANAN_KETAKWAAN\",\"rating\":4,\"term\":\"1\",\"date\":\"2025-09-01\"}" \
  http://localhost:3000/api/competency-assessments | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({"id":d.get("id","?")},indent=2))' 2>/dev/null
echo ''
echo '--- H16 CROSS SCHOOL (student from school A, GURU from school B, should fail 403) ---'
curl -s -X POST -b "pandai_session=$GURU_B" \
  -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$SISWA_ID\",\"dimension\":\"KEIMANAN_KETAKWAAN\",\"rating\":4,\"term\":\"1\",\"date\":\"2025-09-01\"}" \
  http://localhost:3000/api/competency-assessments | python3 -m json.tool 2>/dev/null
echo ''

###############################################
# 9.2 — H33: PATCH /api/attempts
###############################################
echo '========================================'
echo '9.2 H33: PATCH /api/attempts (learningObjective)'
echo '========================================'
echo ''
echo "--- H33 SAME SCHOOL (GURU_A updates own school attempt, should 200) ---"
curl -s -X PATCH -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$ATTEMPT_ID\",\"learningObjective\":\"Memahami konsep dasar\"}" \
  http://localhost:3000/api/attempts | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({"status":"ok" if d.get("learningObjective") else "FAIL","learningObjective":d.get("learningObjective")},indent=2))' 2>/dev/null
echo ''
echo "--- H33 CROSS SCHOOL (GURU_B from school B, attempt from school A, should 403) ---"
curl -s -X PATCH -b "pandai_session=$GURU_B" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$ATTEMPT_ID\",\"learningObjective\":\"hacked\"}" \
  http://localhost:3000/api/attempts | python3 -m json.tool 2>/dev/null
echo ''

###############################################
# 9.2 — H34: POST /api/attempts/remedial
###############################################
echo '========================================'
echo '9.2 H34: POST /api/attempts/remedial'
echo '========================================'
echo ''
echo "--- H34 SAME SCHOOL (GURU_A, should 201) ---"
curl -s -X POST -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"attemptId\":\"$ATTEMPT_ID\"}" \
  http://localhost:3000/api/attempts/remedial | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({"status_code":"201" if d.get("isRemedial") else str(d),"isRemedial":d.get("isRemedial")},indent=2))' 2>/dev/null
echo ''
echo "--- H34 CROSS SCHOOL (GURU_B, should 403) ---"
curl -s -X POST -b "pandai_session=$GURU_B" \
  -H 'Content-Type: application/json' \
  -d "{\"attemptId\":\"$ATTEMPT_ID\"}" \
  http://localhost:3000/api/attempts/remedial | python3 -m json.tool 2>/dev/null
echo ''

###############################################
# 9.2 — H37: PATCH /api/external-quiz-scores
###############################################
echo '========================================'
echo '9.2 H37: PATCH /api/external-quiz-scores'
echo '========================================'
echo ''
echo "--- H37 SAME SCHOOL (GURU_A, should 200) ---"
curl -s -X PATCH -b "pandai_session=$GURU_A" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$QUIZ_ID\",\"score\":90}" \
  http://localhost:3000/api/external-quiz-scores | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps({"id":d.get("id","?"),"score":d.get("score")},indent=2))' 2>/dev/null
echo ''
echo "--- H37 CROSS SCHOOL (GURU_B, should 403) ---"
curl -s -X PATCH -b "pandai_session=$GURU_B" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$QUIZ_ID\",\"score\":0}" \
  http://localhost:3000/api/external-quiz-scores | python3 -m json.tool 2>/dev/null
echo ''

###############################################
# 9.2 — H38: DELETE /api/external-quiz-scores
###############################################
echo '========================================'
echo '9.2 H38: DELETE /api/external-quiz-scores'
echo '========================================'
echo ''
echo "--- H38 CROSS SCHOOL FIRST (GURU_B, should 403) ---"
curl -s -X DELETE -b "pandai_session=$GURU_B" \
  "http://localhost:3000/api/external-quiz-scores?id=$QUIZ_ID" | python3 -m json.tool 2>/dev/null
echo ''
echo "--- H38 SAME SCHOOL (GURU_A, should 200) ---"
curl -s -X DELETE -b "pandai_session=$GURU_A" \
  "http://localhost:3000/api/external-quiz-scores?id=$QUIZ_ID" | python3 -m json.tool 2>/dev/null
echo ''

echo '========================================'
echo '9.1 + 9.2 SELESAI'
echo '========================================'
