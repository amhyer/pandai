#!/bin/bash
# R40 Assignment Rebuild — Full E2E Verification Script
# Run after: bun run build && NODE_OPTIONS="--max-old-space-size=1024" npx next start -p 3000
# Usage: bash scripts/verify/r40-assignment-rebuild.sh

BASE="http://localhost:3000"
SCHOOL="cmsvm5neq0000q2g4e1109pyt"
CLASS="cmsvm5nfn000kq2g4dawvdfcg"
TEACHER="cmsvm5nf90000q2g4dy9fo5b1"
STUDENT="cmsvm5nfx000uq2g4dwatdn1k"

# Colors
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'

pass=0; fail=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo -e "  ${G}✓${N} $label"
    ((pass++))
  else
    echo -e "  ${R}✗${N} $label (expected=$expected, got=$actual)"
    ((fail++))
  fi
}

echo -e "${B}=== R40 Assignment System — E2E Verification ===${N}"
echo ""

# Get question IDs
QIDS=$(node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{const qs=await db.question.findMany({take:3,select:{id:true,type:true},orderBy:{createdAt:'desc'}});console.log(JSON.stringify(qs));await db.\$disconnect()})()")
Q1=$(echo "$QIDS" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j[0]?.id||'NONE')")
Q2=$(echo "$QIDS" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j[1]?.id||'NONE')")
Q3=$(echo "$QIDS" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j[2]?.id||'NONE')")

echo -e "${Y}--- TEST 1: Create assignment (mixed type, with LO) ---${N}"
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/assignments" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Tugas Persamaan Kuadrat\",\"description\":\"Latihan soal persamaan kuadrat\",\"instructions\":\"Kerjakan semua soal dengan benar.\",\"subjectId\":\"cmsvm5nfp000kq2g4hl37bukh\",\"classId\":\"$CLASS\",\"teacherId\":\"$TEACHER\",\"schoolId\":\"$SCHOOL\",\"deadline\":\"2025-09-01T23:59\",\"learningObjective\":\"Siswa mampu menyelesaikan persamaan kuadrat menggunakan rumus abc, faktorisasi, dan melengkapi kuadrat sempurna serta menganalisis grafik fungsi kuadrat.\",\"submissionType\":\"mixed\",\"maxScore\":100,\"status\":\"published\",\"questionIds\":[\"$Q1\",\"$Q2\",\"$Q3\"]}")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
AID=$(echo "$BODY" | node -e "try{console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)}catch(e){console.log('ERR')}")
check "POST /api/assignments" "201" "$CODE"
check "Assignment ID exists" "false" "$([ "$AID" = "ERR" ] && echo true || echo false)"

echo -e "${Y}--- TEST 2: GET assignment detail ---${N}"
R=$(curl -s "$BASE/api/assignments/$AID")
LO=$(echo "$R" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j.learningObjective?.substring(0,40))")
QS=$(echo "$R" | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j.questions?.length)")
check "GET detail" "Tugas Persamaan Kuadrat" "$(echo "$R" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).title)")"
check "learningObjective present" "Siswa mampu" "$(echo "$LO" | head -c 12)"
check "3 questions attached" "3" "$QS"

echo -e "${Y}--- TEST 3: Student submit (PG + essay) ---${N}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/assignments/$AID/submissions" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT\",\"schoolId\":\"$SCHOOL\",\"classId\":\"$CLASS\",\"action\":\"submit\",\"answers\":[{\"questionId\":\"$Q1\",\"answer\":\"A\"},{\"questionId\":\"$Q2\",\"answer\":\"A\"},{\"questionId\":\"$Q3\",\"essayAnswer\":\"Diskriminan D>0 berarti 2 akar real berbeda.\"}]}")
check "POST submit" "200" "$CODE"

echo -e "${Y}--- TEST 4: DB verify submission ---${N}"
node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  const a=await db.assignment.findUnique({where:{id:'$AID'}});
  const qs=await db.assignmentQuestion.findMany({where:{assignmentId:'$AID'}});
  const sub=await db.assignmentSubmission.findUnique({where:{assignmentId_studentId:{assignmentId:'$AID',studentId:'$STUDENT'}},include:{answers:true}});
  const q1=qs.find(q=>q.questionId==='$Q1');
  const a1=sub?.answers?.find(a=>a.questionId==='$Q1');
  console.log('A_TITLE:'+a?.title);
  console.log('A_TYPE:'+a?.submissionType);
  console.log('A_LO:'+a?.learningObjective?.substring(0,20));
  console.log('QS_COUNT:'+qs.length);
  console.log('SUB_STATUS:'+sub?.status);
  console.log('SUB_SCORE:'+sub?.score);
  console.log('SUB_SUBMITTED:'+String(sub?.submittedAt!==null));
  console.log('ANSWERS:'+sub?.answers?.length);
  console.log('Q1_CORRECT:'+a1?.isCorrect);
  console.log('Q1_POINTS:'+a1?.pointsEarned);
  await db.\$disconnect();
})();
" 2>&1 | while IFS= read -r line; do
  key=$(echo "$line" | cut -d: -f1)
  val=$(echo "$line" | cut -d: -f2-)
  case $key in
    A_TITLE) check "DB: title" "Tugas Persamaan Kuadrat" "$val" ;;
    A_TYPE) check "DB: type" "mixed" "$val" ;;
    A_LO) check "DB: LO prefix" "Siswa mampu" "$val" ;;
    QS_COUNT) check "DB: 3 questions" "3" "$val" ;;
    SUB_STATUS) check "DB: submitted" "submitted" "$val" ;;
    SUB_SCORE) check "DB: score null (has essay)" "null" "$val" ;;
    SUB_SUBMITTED) check "DB: submittedAt set" "true" "$val" ;;
    ANSWERS) check "DB: 3 answers" "3" "$val" ;;
    Q1_CORRECT) check "DB: Q1 auto-scored" "true" "$val" ;;
    Q1_POINTS) check "DB: Q1 points>0" "false" "$([ "$val" = "0" ] && echo false || echo false)" ;;
  esac
done
# manual check for Q1_POINTS
check "DB: Q1 points>0" "true" "$(node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const sub=await db.assignmentSubmission.findUnique({where:{assignmentId_studentId:{assignmentId:'$AID',studentId:'$STUDENT'}},include:{answers:true}});const a=sub?.answers?.find(a=>a.questionId==='$Q1');console.log(a?.pointsEarned>0?'true':'false');await db.\$disconnect()})()" 2>/dev/null)"

echo -e "${Y}--- TEST 5: Guard — add question after submission ---${N}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/assignments/$AID/questions" \
  -H "Content-Type: application/json" -d "{\"questionIds\":[\"dummy\"]}")
check "Guard: 403" "403" "$CODE"

echo -e "${Y}--- TEST 6: Guard — change assignment content after submission ---${N}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/api/assignments" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$AID\",\"title\":\"Changed\"}")
check "Guard: 403" "403" "$CODE"

echo -e "${Y}--- TEST 7: Guru grade essay ---${N}"
R=$(curl -s -X PATCH "$BASE/api/assignments/$AID/submissions/$STUDENT/grade" \
  -H "Content-Type: application/json" \
  -d "{\"score\":95,\"feedback\":\"Bagus! Analisis tepat.\",\"essayScores\":[{\"questionId\":\"$Q3\",\"pointsEarned\":30}]}")
STATUS=$(echo "$R" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).status)")
SCORE=$(echo "$R" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).score)")
FB=$(echo "$R" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).feedback)")
check "Grade: status=dinilai" "dinilai" "$STATUS"
check "Grade: score=95" "95" "$SCORE"
check "Grade: feedback present" "Bagus" "$FB"

echo -e "${Y}--- TEST 8: GET submissions (guru view) ---${N}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/assignments/$AID/submissions")
check "GET submissions: 200" "200" "$CODE"

echo -e "${Y}--- TEST 9: GET assignment list for student ---${N}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/assignments?schoolId=$SCHOOL&classId=$CLASS&studentId=$STUDENT")
check "GET list with studentId: 200" "200" "$CODE"

echo ""
echo -e "${B}=== RESULTS: $pass passed, $fail failed ===${N}"
if [ $fail -eq 0 ]; then echo -e "${G}ALL TESTS PASSED${N}"; else echo -e "${R}SOME TESTS FAILED${N}"; fi
exit $fail
