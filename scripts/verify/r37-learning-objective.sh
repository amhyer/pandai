#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Verify Feature D: Tujuan Pembelajaran di Input Nilai (R37)
# ═══════════════════════════════════════════════════════════════
# Run after: bun run prisma/seed.ts && bun run db:push
# Usage: bash scripts/verify/r37-learning-objective.sh
# ═══════════════════════════════════════════════════════════════

set -e
BASE="http://localhost:3000"

# ── Get IDs ──
SCHOOL_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.school.findFirst({where:{code:'SMAN1-MKS'}}).then(s=>console.log(s.id)).finally(()=>p.\$disconnect())")
GURU_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findFirst({where:{nip:'198504152010011001'}}).then(u=>console.log(u.id)).finally(()=>p.\$disconnect())")
SISWA1_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findFirst({where:{nisn:'0051234567'}}).then(u=>console.log(u.id+'|'+u.classId)).finally(()=>p.\$disconnect())")
SISWA2_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findFirst({where:{nisn:'0051234568'}}).then(u=>console.log(u.id+'|'+u.classId)).finally(()=>p.\$disconnect())")
S1UID=$(echo "$SISWA1_ID" | cut -d'|' -f1); S1CID=$(echo "$SISWA1_ID" | cut -d'|' -f2)
S2UID=$(echo "$SISWA2_ID" | cut -d'|' -f1); S2CID=$(echo "$SISWA2_ID" | cut -d'|' -f2)

# ── Create test data ──
SUBJ_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.subject.findFirst().then(s=>console.log(s.id)).finally(()=>p.\$disconnect())")
TOPIC_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.topic.findFirst().then(t=>console.log(t.id)).finally(()=>p.\$disconnect())")
Q_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.question.create({data:{content:'Soal verifikasi TP',type:'pg',answer:'A',subjectId:'$SUBJ_ID',schoolId:'$SCHOOL_ID',topicId:'$TOPIC_ID',createdBy:'$GURU_ID'}}).then(q=>console.log(q.id)).finally(()=>p.\$disconnect())")
EXAM_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.examPackage.create({data:{title:'Tes Verifikasi TP R37',schoolId:'$SCHOOL_ID',duration:30,totalQuestions:1}}).then(e=>console.log(e.id)).finally(()=>p.\$disconnect())")

echo "═══ TEST 1: POST DENGAN learningObjective ═══"
curl -s -X POST "$BASE/api/attempts" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" -H "X-School-Id: $SCHOOL_ID" -H "X-User-Role: GURU" \
  -d "{\"userId\":\"$S1UID\",\"examPackageId\":\"$EXAM_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$S1CID\",\"answers\":[{\"questionId\":\"$Q_ID\",\"answer\":\"A\",\"timeSpent\":10}],\"duration\":60,\"learningObjective\":\"Siswa mampu menganalisis struktur teks eksplanasi dan mengidentifikasi ciri kebahasaannya\"}" | python3 -m json.tool 2>/dev/null || echo "POST 1 result above"

echo ""
echo "═══ TEST 2: POST TANPA learningObjective ═══"
curl -s -X POST "$BASE/api/attempts" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" -H "X-School-Id: $SCHOOL_ID" -H "X-User-Role: GURU" \
  -d "{\"userId\":\"$S2UID\",\"examPackageId\":\"$EXAM_ID\",\"schoolId\":\"$SCHOOL_ID\",\"classId\":\"$S2CID\",\"answers\":[{\"questionId\":\"$Q_ID\",\"answer\":\"B\",\"timeSpent\":8}],\"duration\":45}" | python3 -m json.tool 2>/dev/null || echo "POST 2 result above"

echo ""
echo "═══ TEST 3: DB verify ═══"
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.studentAttempt.findMany({where:{examPackageId:'$EXAM_ID'},select:{percentage:true,learningObjective:true,user:{select:{name:true}}}}).then(r=>{
  console.log('DB Records:', r.length);
  r.forEach(row=>console.log((row.learningObjective?'✅ HAS LO':'⚪ NULL (OK)')+' | '+row.user?.name+' | pct='+row.percentage+' | LO='+(row.learningObjective||'(kosong)')));
}).finally(()=>p.\$disconnect());
"

echo ""
echo "═══ TEST 4: GET /api/scores (siswa) includes LO ═══"
curl -s "$BASE/api/scores?studentId=$S1UID" \
  -H "X-User-Id: $S1UID" -H "X-School-Id: $SCHOOL_ID" -H "X-User-Role: SISWA" | python3 -m json.tool 2>/dev/null

echo ""
echo "═══ ALL TESTS COMPLETE ═══"
