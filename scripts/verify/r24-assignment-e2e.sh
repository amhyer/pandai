#!/bin/bash
# R24 Assignment E2E Verification
set -euo pipefail

PASS=0
FAIL=0
pass() { echo "✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL+1)); }

BASE="http://localhost:3000/api"

# ===== 1. AUTH + CREATE ASSIGNMENT =====
echo ""
echo "=== TEST 1: Create Assignment (GURU) ==="
# First get a guru user
GURU=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const u=await db.user.findFirst({where:{role:'GURU',schoolId:{not:null},isActive:true},select:{id:true,schoolId:true}});
  console.log(JSON.stringify(u||{}));
  await db.\$disconnect();
})();
" 2>/dev/null)
GURU_ID=$(echo "$GURU" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))" 2>/dev/null)
SCHOOL_ID=$(echo "$GURU" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).schoolId))" 2>/dev/null)

if [ -z "$GURU_ID" ]; then fail "No guru user found"; else pass "Found guru: $GURU_ID (school: $SCHOOL_ID)"; fi

# Get a class and subject for this school
CLASS_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const c=await db.class.findFirst({where:{schoolId:'$SCHOOL_ID'},select:{id:true}});
  console.log(c?.id||'');
  await db.\$disconnect();
})();
" 2>/dev/null)
SUBJECT_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const s=await db.subject.findFirst({select:{id:true}});
  console.log(s?.id||'');
  await db.\$disconnect();
})();
" 2>/dev/null)

if [ -n "$CLASS_ID" ]; then pass "Found class: $CLASS_ID"; else fail "No class found"; fi
if [ -n "$SUBJECT_ID" ]; then pass "Found subject: $SUBJECT_ID"; else fail "No subject found"; fi

# Create PG assignment
DEADLINE=$(node -e "console.log(new Date(Date.now()+7*86400000).toISOString())" 2>/dev/null)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assignments" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU" \
  -d "{\"title\":\"Tugas PG R24 Test\",\"description\":\"Soal PG untuk verifikasi\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"deadline\":\"$DEADLINE\",\"submissionType\":\"pg_only\",\"maxScore\":100}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
PG_ASSIGNMENT_ID=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id||''))" 2>/dev/null)

if [ "$HTTP_CODE" = "201" ] && [ -n "$PG_ASSIGNMENT_ID" ]; then
  pass "Created PG assignment: $PG_ASSIGNMENT_ID (HTTP $HTTP_CODE)"
else
  fail "Create PG assignment failed (HTTP $HTTP_CODE): $BODY"
fi

# Create Essay assignment
RESP2=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assignments" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU" \
  -d "{\"title\":\"Tugas Esai R24 Test\",\"description\":\"Tulis esai untuk verifikasi\",\"subjectId\":\"$SUBJECT_ID\",\"classId\":\"$CLASS_ID\",\"deadline\":\"$DEADLINE\",\"submissionType\":\"essay_only\",\"maxScore\":100}")
HTTP_CODE2=$(echo "$RESP2" | tail -1)
BODY2=$(echo "$RESP2" | sed '$d')
ESSAY_ASSIGNMENT_ID=$(echo "$BODY2" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id||''))" 2>/dev/null)

if [ "$HTTP_CODE2" = "201" ] && [ -n "$ESSAY_ASSIGNMENT_ID" ]; then
  pass "Created Essay assignment: $ESSAY_ASSIGNMENT_ID (HTTP $HTTP_CODE2)"
else
  fail "Create Essay assignment failed (HTTP $HTTP_CODE2): $BODY2"
fi

# ===== 2. ADD QUESTIONS TO PG ASSIGNMENT =====
echo ""
echo "=== TEST 2: Add Questions from Bank Soal ==="
QUESTION_IDS=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const qs=await db.question.findMany({where:{type:'pg',status:'published'},take:3,select:{id:true}});
  console.log(qs.map(q=>q.id).join(','));
  await db.\$disconnect();
})();
" 2>/dev/null)

RESP3=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assignments/$PG_ASSIGNMENT_ID/questions" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU" \
  -d "{\"questionIds\":[$(echo "$QUESTION_IDS" | sed "s/,/\",\"/g" | sed 's/^/"/' | sed 's/$/"/')]}")
HTTP_CODE3=$(echo "$RESP3" | tail -1)
BODY3=$(echo "$RESP3" | sed '$d')
ADDED=$(echo "$BODY3" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).addedCount||0))" 2>/dev/null)

if [ "$HTTP_CODE3" = "200" ] && [ "$ADDED" -gt 0 ]; then
  pass "Added $ADDED questions to PG assignment (HTTP $HTTP_CODE3)"
else
  fail "Add questions failed (HTTP $HTTP_CODE3): $BODY3"
fi

# ===== 3. VERIFY DETAIL =====
echo ""
echo "=== TEST 3: Get Assignment Detail ==="
RESP4=$(curl -s -w "\n%{http_code}" "$BASE/assignments?id=$PG_ASSIGNMENT_ID" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU")
HTTP_CODE4=$(echo "$RESP4" | tail -1)
BODY4=$(echo "$RESP4" | sed '$d')
Q_COUNT=$(echo "$BODY4" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).questions?.length||0))" 2>/dev/null)

if [ "$HTTP_CODE4" = "200" ] && [ "$Q_COUNT" -gt 0 ]; then
  pass "Assignment detail has $Q_COUNT questions (HTTP $HTTP_CODE4)"
else
  fail "Get detail failed (HTTP $HTTP_CODE4, questions: $Q_COUNT)"
fi

# ===== 4. PUBLISH ASSIGNMENT =====
echo ""
echo "=== TEST 4: Publish Assignment ==="
RESP5=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE/assignments" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU" \
  -d "{\"id\":\"$PG_ASSIGNMENT_ID\",\"status\":\"published\"}")
HTTP_CODE5=$(echo "$RESP5" | tail -1)
PUB_STATUS=$(echo "$RESP5" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status||''))" 2>/dev/null)

if [ "$HTTP_CODE5" = "200" ] && [ "$PUB_STATUS" = "published" ]; then
  pass "Assignment published (HTTP $HTTP_CODE5)"
else
  fail "Publish failed (HTTP $HTTP_CODE5, status: $PUB_STATUS)"
fi

# ===== 5. SISWA FETCHES ASSIGNMENTS =====
echo ""
echo "=== TEST 5: Siswa sees published assignments ==="
SISWA_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const u=await db.user.findFirst({where:{role:'SISWA',schoolId:'$SCHOOL_ID',classId:'$CLASS_ID',isActive:true},select:{id:true}});
  console.log(u?.id||'');
  await db.\$disconnect();
})();
" 2>/dev/null)

if [ -z "$SISWA_ID" ]; then
  fail "No siswa found in class $CLASS_ID"
  SISWA_ID="none"
else
  pass "Found siswa: $SISWA_ID"
  RESP6=$(curl -s -w "\n%{http_code}" "$BASE/assignments" \
    -H "X-User-Id: $SISWA_ID" \
    -H "X-School-Id: $SCHOOL_ID" \
    -H "X-User-Role: SISWA")
  HTTP_CODE6=$(echo "$RESP6" | tail -1)
  BODY6=$(echo "$RESP6" | sed '$d')
  SISWA_COUNT=$(echo "$BODY6" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(Array.isArray(JSON.parse(d))?JSON.parse(d).length:0))" 2>/dev/null)

  if [ "$HTTP_CODE6" = "200" ] && [ "$SISWA_COUNT" -ge 1 ]; then
    pass "Siswa sees $SISWA_COUNT published assignments (HTTP $HTTP_CODE6)"
  else
    fail "Siswa fetch failed (HTTP $HTTP_CODE6, count: $SISWA_COUNT)"
  fi
fi

# ===== 6. DRAFT SAVE (SISWA) =====
echo ""
echo "=== TEST 6: Siswa draft save ==="
AQ_ID=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const aq=await db.assignmentQuestion.findFirst({where:{assignmentId:'$PG_ASSIGNMENT_ID'},select:{id:true,questionId:true}});
  console.log(JSON.stringify(aq||{}));
  await db.\$disconnect();
})();
" 2>/dev/null)
AQ_ID_VAL=$(echo "$AQ_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id||''))" 2>/dev/null)

if [ -z "$AQ_ID_VAL" ]; then
  fail "No assignment question found"
else
  pass "Found assignment question: $AQ_ID_VAL"

  RESP7=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assignments/$PG_ASSIGNMENT_ID/submissions" \
    -H "Content-Type: application/json" \
    -H "X-User-Id: $SISWA_ID" \
    -H "X-School-Id: $SCHOOL_ID" \
    -H "X-User-Role: SISWA" \
    -d "{\"action\":\"draft\",\"answers\":[{\"assignmentQuestionId\":\"$AQ_ID_VAL\",\"answer\":\"A\"}]}")
  HTTP_CODE7=$(echo "$RESP7" | tail -1)
  SUB_STATUS=$(echo "$RESP7" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status||''))" 2>/dev/null)
  SUB_ID=$(echo "$RESP7" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id||''))" 2>/dev/null)

  if [ "$HTTP_CODE7" = "200" ] && [ "$SUB_STATUS" = "dikerjakan" ]; then
    pass "Draft saved, status: $SUB_STATUS, submission: $SUB_ID"
  else
    fail "Draft save failed (HTTP $HTTP_CODE7, status: $SUB_STATUS)"
  fi

  # ===== 7. SUBMIT (SISWA) =====
  echo ""
  echo "=== TEST 7: Siswa final submit ==="
  RESP8=$(curl -s -w "\n%{http_code}" -X POST "$BASE/assignments/$PG_ASSIGNMENT_ID/submissions" \
    -H "Content-Type: application/json" \
    -H "X-User-Id: $SISWA_ID" \
    -H "X-School-Id: $SCHOOL_ID" \
    -H "X-User-Role: SISWA" \
    -d "{\"action\":\"submit\",\"answers\":[{\"assignmentQuestionId\":\"$AQ_ID_VAL\",\"answer\":\"A\"}]}")
  HTTP_CODE8=$(echo "$RESP8" | tail -1)
  SUB_STATUS8=$(echo "$RESP8" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status||''))" 2>/dev/null)
  SUB_SCORE8=$(echo "$RESP8" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).score??'null'))" 2>/dev/null)

  if [ "$HTTP_CODE8" = "200" ]; then
    pass "Submitted! Status: $SUB_STATUS8, Score: $SUB_SCORE8"
  else
    fail "Submit failed (HTTP $HTTP_CODE8)"
  fi
fi

# ===== 8. GURU SEES PROGRESS =====
echo ""
echo "=== TEST 8: Guru sees submission progress ==="
RESP9=$(curl -s -w "\n%{http_code}" "$BASE/assignments/$PG_ASSIGNMENT_ID/submissions" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $SCHOOL_ID" \
  -H "X-User-Role: GURU")
HTTP_CODE9=$(echo "$RESP9" | tail -1)
BODY9=$(echo "$RESP9" | sed '$d')
SUMMARY=$(echo "$BODY9" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('total:'+j.summary?.total+',submitted:'+j.summary?.submitted+',dinilai:'+j.summary?.dinilai)})" 2>/dev/null)

if [ "$HTTP_CODE9" = "200" ]; then
  pass "Guru sees progress: $SUMMARY (HTTP $HTTP_CODE9)"
else
  fail "Progress fetch failed (HTTP $HTTP_CODE9)"
fi

# ===== 9. CROSS-SCHOOL SECURITY =====
echo ""
echo "=== TEST 9: Security — cross-school isolation ==="
OTHER_SCHOOL=$(node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const s=await db.school.findFirst({where:{id:{not:'$SCHOOL_ID'}},select:{id:true}});
  console.log(s?.id||'none');
  await db.\$disconnect();
})();
" 2>/dev/null)

RESP10=$(curl -s -w "\n%{http_code}" "$BASE/assignments?id=$PG_ASSIGNMENT_ID" \
  -H "X-User-Id: $GURU_ID" \
  -H "X-School-Id: $OTHER_SCHOOL" \
  -H "X-User-Role: GURU")
HTTP_CODE10=$(echo "$RESP10" | tail -1)

if [ "$HTTP_CODE10" = "403" ]; then
  pass "Cross-school access blocked (HTTP 403)"
else
  fail "Cross-school NOT blocked (HTTP $HTTP_CODE10)"
fi

# ===== 10. DELETE CLEANUP =====
echo ""
echo "=== TEST 10: Cleanup ==="
curl -s -o /dev/null -w "DELETE PG: HTTP %{http_code}\n" -X DELETE "$BASE/assignments?id=$PG_ASSIGNMENT_ID" \
  -H "X-User-Id: $GURU_ID" -H "X-School-Id: $SCHOOL_ID" -H "X-User-Role: GURU"
curl -s -o /dev/null -w "DELETE Essay: HTTP %{http_code}\n" -X DELETE "$BASE/assignments?id=$ESSAY_ASSIGNMENT_ID" \
  -H "X-User-Id: $GURU_ID" -H "X-School-Id: $SCHOOL_ID" -H "X-User-Role: GURU"
pass "Cleanup done"

# ===== SUMMARY =====
echo ""
echo "================================"
echo "R24 E2E VERIFICATION COMPLETE"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "================================"

if [ $FAIL -gt 0 ]; then exit 1; fi
