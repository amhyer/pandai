#!/bin/bash
# P52 — Full Regression + Blocker Verification (cookie-based auth)
set +e
source /tmp/pandai-env.sh

SCHOOL_ID='cmscsq8z600mypfv61x9u1sw0'
SCHOOL2_ID='cmscsq8z700mzpfv6m35djzo9'
ORTU_ID='cmscsq91i019hpfv6thtxqt5w'
SISWA_ID='cmscsq8zn00oypfv6aiwnotzp'
CHILD_ID='cmscsq8zn00oypfv6aiwnotzp'
GURU_ID='cmscsq8zi00oppfv6io2os9f2'
SUBJECT_ID='cmscsq8za00n4pfv6ezr22aik'
CLASS_ID='cmscsq8zl00oupfv6k8tbvx29'

PASS=0; FAIL=0; SKIP=0
check() {
  local f=$1 l=$2 e=$3 g=$4 b=$5
  if [ "$g" = "$e" ]; then
    echo "  ✅ [$f] $l → $g"; PASS=$((PASS+1))
  else
    echo "  ❌ [$f] $l → got $g (expected $e)"; echo "         body: $(echo "$b" | head -c 200)"; FAIL=$((FAIL+1))
  fi
}

api() {
  local m=$1 p=$2 bf=$3 tk=$4
  local tmpf=/tmp/api-p52-$RANDOM.txt
  local args=(-s -o "$tmpf" -w '%{http_code}' -X $m -H 'Content-Type: application/json')
  [ -n "$tk" ] && args+=(-H "Cookie: pandai_session=$tk")
  [ -n "$bf" ] && args+=(-d "$bf")
  local http_status=$(curl "${args[@]}" "http://localhost:3000$p" 2>/dev/null)
  local body=$(cat "$tmpf" 2>/dev/null)
  echo "${http_status}|||${body}"
}

pstatus() { echo "$1" | cut -d'|' -f1; }
pbody() { echo "$1" | sed 's/^[0-9]*|||//'; }

other_school_siswa() {
  node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'SISWA',schoolId:{not:'$SCHOOL_ID'},isActive:true}}).then(s=>console.log(s?.id||'NONE')).finally(()=>d.\$disconnect())" 2>/dev/null
}

extract_id() {
  echo "$1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null
}

cleanup() {
  [ -n "$1" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().\$executeRaw\(\`DELETE FROM \$1 WHERE id='"$1"'\`).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null
}

echo '╔══════════════════════════════════════════════════════════════╗'
echo '║  LANGKAH 1+2: Full Regression + Blocker Verification         ║'
echo '╚══════════════════════════════════════════════════════════════╝'

# ═══ FEATURE A: 7 Kebiasaan ═══
echo ''
echo '═══ Feature A: 7 Kebiasaan (character-reports) ═══'
A1_JSON='{"studentId":"'$CHILD_ID'","classId":"'$CLASS_ID'","schoolId":"'$SCHOOL_ID'","reporterId":"'$ORTU_ID'","date":"2026-08-27","habit":"bangun_pagi","rating":4,"note":"P52 verify"}'
A1=$(api POST '/api/character-reports' "$A1_JSON" "$OT_TOKEN")
A1S=$(pstatus "$A1"); A1B=$(pbody "$A1")
check A 'A.1 POST character report' 201 "$A1S" "$A1B"

A2=$(api GET "/api/character-reports?studentId=$CHILD_ID" '' "$OT_TOKEN")
A2S=$(pstatus "$A2"); A2B=$(pbody "$A2")
check A 'A.2 GET reports for own child' 200 "$A2S" "$A2B"

A_RID=$(extract_id "$A1B")
[ -n "$A_RID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().characterReport.delete({where:{id:'$A_RID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE B: External Quiz Links ═══
echo ''
echo '═══ Feature B: External Quiz Links ═══'
B1_JSON='{"content":"Soal eksternal P52","type":"essay","subjectId":"'$SUBJECT_ID'","schoolId":"'$SCHOOL_ID'","externalLink":"https://quiz.example.com/p52-test","createdBy":"'$GURU_ID'"}'
B1=$(api POST '/api/questions' "$B1_JSON" "$GU_TOKEN")
B1S=$(pstatus "$B1"); B1B=$(pbody "$B1")
check B 'B.1 Create question with externalLink' 200 "$B1S" "$B1B"
echo "$B1B" | grep -q 'quiz.example.com' && check B 'B.2 Response has externalLink' 200 200 'found' || check B 'B.2 Response has externalLink' 200 404 'missing'
B_QID=$(extract_id "$B1B")
[ -n "$B_QID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().question.delete({where:{id:'$B_QID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE D: Scores ═══
echo ''
echo '═══ Feature D: Scores ═══'
D1=$(api GET "/api/scores?studentId=$SISWA_ID" '' "$GU_TOKEN")
D1S=$(pstatus "$D1"); D1B=$(pbody "$D1")
check D 'D.1 GET scores (GURU)' 200 "$D1S" "$D1B"

# ═══ FEATURE E: Assignment System ═══
echo ''
echo '═══ Feature E: Assignment System ═══'
E1_JSON='{"title":"P52 Assignment","description":"Test","subjectId":"'$SUBJECT_ID'","schoolId":"'$SCHOOL_ID'","classId":"'$CLASS_ID'","type":"tugas","status":"published","createdBy":"'$GURU_ID'"}'
E1=$(api POST '/api/assignments' "$E1_JSON" "$GU_TOKEN")
E1S=$(pstatus "$E1"); E1B=$(pbody "$E1")
check E 'E.1 Create assignment' 200 "$E1S" "$E1B"

E2=$(api GET "/api/assignments?schoolId=$SCHOOL_ID" '' "$GU_TOKEN")
E2S=$(pstatus "$E2"); E2B=$(pbody "$E2")
check E 'E.2 List assignments' 200 "$E2S" "$E2B"

E_EID=$(extract_id "$E1B")
[ -n "$E_EID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().assignment.delete({where:{id:'$E_EID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE F: Tryout System (Exams) ═══
echo ''
echo '═══ Feature F: Tryout System (Exams) ═══'
F1_JSON='{"action":"create-package","title":"P52 Exam Package","schoolId":"'$SCHOOL_ID'","duration":30,"totalQuestions":0,"createdBy":"'$GURU_ID'"}'
F1=$(api POST '/api/exams' "$F1_JSON" "$GU_TOKEN")
F1S=$(pstatus "$F1"); F1B=$(pbody "$F1")
check F 'F.1 Create exam package' 200 "$F1S" "$F1B"

F2=$(api GET '/api/exams' '' "$SI_TOKEN")
F2S=$(pstatus "$F2"); F2B=$(pbody "$F2")
check F 'F.2 SISWA GET exams' 200 "$F2S" "$F2B"

F_FID=$(extract_id "$F1B")
[ -n "$F_FID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().examPackage.delete({where:{id:'$F_FID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE G: Profil Lulusan ═══
echo ''
echo '═══ Feature G: Competency Assessments ═══'
G1=$(api GET "/api/competency-assessments?schoolId=$SCHOOL_ID" '' "$GU_TOKEN")
G1S=$(pstatus "$G1"); G1B=$(pbody "$G1")
check G 'G.1 GET competency-assessments' 200 "$G1S" "$G1B"

G2_JSON='{"studentId":"'$SISWA_ID'","schoolId":"'$SCHOOL_ID'","classId":"'$CLASS_ID'","assessedBy":"'$GURU_ID'","period":"2024/2025","term":"1","dimension":"beriman","rating":3,"date":"2026-08-27","note":"P52 verify"}'
G2=$(api POST '/api/competency-assessments' "$G2_JSON" "$GU_TOKEN")
G2S=$(pstatus "$G2"); G2B=$(pbody "$G2")
check G 'G.2 POST competency assessment' 200 "$G2S" "$G2B"

G_GID=$(extract_id "$G2B")
[ -n "$G_GID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().competencyAssessment.delete({where:{id:'$G_GID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE H: Komponen Nilai ═══
echo ''
echo '═══ Feature H: Komponen Nilai ═══'
H1=$(api GET "/api/grade-components?schoolId=$SCHOOL_ID" '' "$GU_TOKEN")
H1S=$(pstatus "$H1"); H1B=$(pbody "$H1")
check H 'H.1 GET grade-components' 200 "$H1S" "$H1B"

H2_JSON='{"name":"P52 Komponen","type":"FORMATIVE","weight":20,"schoolId":"'$SCHOOL_ID'","term":"1"}'
H2=$(api POST '/api/grade-components' "$H2_JSON" "$AS_TOKEN")
H2S=$(pstatus "$H2"); H2B=$(pbody "$H2")
check H 'H.2 POST grade-component' 200 "$H2S" "$H2B"

H3=$(api GET "/api/student-grades?schoolId=$SCHOOL_ID" '' "$GU_TOKEN")
H3S=$(pstatus "$H3"); H3B=$(pbody "$H3")
check H 'H.3 GET student-grades' 200 "$H3S" "$H3B"

H_HID=$(extract_id "$H2B")
[ -n "$H_HID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().gradeComponent.delete({where:{id:'$H_HID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ FEATURE I: Feedback ═══
echo ''
echo '═══ Feature I: Feedback ═══'
I1_JSON='{"schoolId":"'$SCHOOL_ID'","category":"saran","subject":"general","message":"P52 feedback test"}'
I1=$(api POST '/api/feedback' "$I1_JSON" "$GU_TOKEN")
I1S=$(pstatus "$I1"); I1B=$(pbody "$I1")
check I 'I.1 POST feedback' 200 "$I1S" "$I1B"

I2=$(api GET "/api/feedback?schoolId=$SCHOOL_ID" '' "$OT_TOKEN")
I2S=$(pstatus "$I2"); I2B=$(pbody "$I2")
check I 'I.2 GET feedback (ORANG_TUA)' 200 "$I2S" "$I2B"

I_IID=$(extract_id "$I1B")
[ -n "$I_IID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().feedback.delete({where:{id:'$I_IID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ RBAC + SECURITY ═══
echo ''
echo '═══ RBAC & Security ═══'

# Unauthenticated
X1=$(api GET '/api/student-grades' '' '')
X1S=$(pstatus "$X1")
check X 'X.1 Unauthenticated → 401' 401 "$X1S" ''

# ORANG_TUA own child scores
X2=$(api GET "/api/scores?studentId=$CHILD_ID" '' "$OT_TOKEN")
X2S=$(pstatus "$X2")
check X 'X.2 ORANG_TUA scores own child → 200' 200 "$X2S" ''

# ORANG_TUA attendance own child
X4=$(api GET "/api/attendance?studentId=$CHILD_ID" '' "$OT_TOKEN")
X4S=$(pstatus "$X4")
check X 'X.4 ORANG_TUA attendance own child → 200' 200 "$X4S" ''

# ORANG_TUA student-grades own child
X5=$(api GET "/api/student-grades?studentId=$CHILD_ID&schoolId=$SCHOOL_ID" '' "$OT_TOKEN")
X5S=$(pstatus "$X5")
check X 'X.5 ORANG_TUA student-grades own child → 200' 200 "$X5S" ''

# ORANG_TUA other school child
OTHER_SID=$(other_school_siswa)
if [ "$OTHER_SID" != 'NONE' ] && [ -n "$OTHER_SID" ]; then
  X3=$(api GET "/api/scores?studentId=$OTHER_SID" '' "$OT_TOKEN")
  X3S=$(pstatus "$X3"); X3B=$(pbody "$X3")
  check X 'X.3 ORANG_TUA scores other-school child → 403' 403 "$X3S" "$X3B"

  # IDOR: SISWA submit as other student
  X6_JSON='{"assignmentId":"dummy","studentId":"'$OTHER_SID'","answers":{}}'
  X6=$(api POST '/api/assignment-submissions' "$X6_JSON" "$SI_TOKEN")
  X6S=$(pstatus "$X6"); X6B=$(pbody "$X6")
  check X 'X.6 IDOR: SISWA submit as other → 403' 403 "$X6S" "$X6B"
else
  echo '  ⚠️  X.3/X.6 Skipped — no other-school siswa'; SKIP=$((SKIP+2))
fi

# POST /api/classes with duplicate check
echo ''
echo '═══ Blocker: POST /api/classes + duplicate check ═══'
CL1_JSON='{"name":"P52 Test Class","level":"X","schoolId":"'$SCHOOL_ID'","academicYear":"2024/2025"}'
CL1=$(api POST '/api/classes' "$CL1_JSON" "$AS_TOKEN")
CL1S=$(pstatus "$CL1"); CL1B=$(pbody "$CL1")
check BL 'BL.1 POST /api/classes' 200 "$CL1S" "$CL1B"

CL2=$(api POST '/api/classes' "$CL1_JSON" "$AS_TOKEN")
CL2S=$(pstatus "$CL2"); CL2B=$(pbody "$CL2")
check BL 'BL.2 Duplicate class → 409/400' 409 "$CL2S" "$CL2B"

CL_CID=$(extract_id "$CL1B")
[ -n "$CL_CID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().class.delete({where:{id:'$CL_CID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# Privilege escalation: ADMIN_SCHOOL → SUPER_ADMIN
echo ''
echo '═══ Blocker: Privilege escalation prevention ═══'
ESCALATE_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'GURU',schoolId:'$SCHOOL_ID',isActive:true}}).then(u=>console.log(u?.id||'NONE')).finally(()=>d.\$disconnect())" 2>/dev/null)
if [ "$ESCALATE_ID" != 'NONE' ] && [ -n "$ESCALATE_ID" ]; then
  ESCALATE_JSON='{"role":"SUPER_ADMIN"}'
  ESCALATE=$(api PATCH "/api/users/$ESCALATE_ID" "$ESCALATE_JSON" "$AS_TOKEN")
  ESCALATES=$(pstatus "$ESCALATE"); ESCALATEB=$(pbody "$ESCALATE")
  check BL 'BL.3 ADMIN→SUPER_ADMIN escalation → 403' 403 "$ESCALATES" "$ESCALATEB"
else
  echo '  ⚠️  BL.3 Skipped'; SKIP=$((SKIP+1))
fi

echo ''
echo '╔══════════════════════════════════════════════════════════════╗'
echo "║  RESULTS: $PASS PASS, $FAIL FAIL, $SKIP SKIP                          ║"
echo '╚══════════════════════════════════════════════════════════════╝'
exit $FAIL