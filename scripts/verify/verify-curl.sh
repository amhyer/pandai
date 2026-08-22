#!/bin/bash
# PANDAI — Verify All Features A-I (curl-based, single-process)
set +e
cd "$(dirname "$0")/../.."

pkill -f 'next' 2>/dev/null; pkill -f 'standalone' 2>/dev/null; sleep 1
NODE_OPTIONS='--max-old-space-size=256' npx next start -p 3000 >/tmp/pandai-srv.log 2>&1 &
SRVPID=$!
for i in $(seq 1 40); do
  if curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health 2>/dev/null | grep -q 200; then
    echo "Server ready after ${i}s"; break
  fi
  sleep 1
done

echo ''
echo '╔═══════════════════════════════════════════════════════╗'
echo '║  PANDAI — Verify All Features A-I (curl)              ║'
echo '╚═══════════════════════════════════════════════════════╝'
curl -s http://127.0.0.1:3000/api/health; echo ''

PASS=0; FAIL=0
check() {
  local f=$1 l=$2 e=$3 g=$4 b=$5
  if [ "$g" = "$e" ]; then
    echo "  ✅ [$f] $l → $g (expected $e)"; PASS=$((PASS+1))
  else
    echo "  ❌ [$f] $l → got $g (expected $e)"; echo "         body: $(echo "$b" | head -c 200)"; FAIL=$((FAIL+1))
  fi
}

login() {
  local user=$1 pass=$2 ckfile=$3
  curl -s -c "$ckfile" -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"username":"'"$user"'","password":"'"$pass"'"}' http://127.0.0.1:3000/api/auth/login > /tmp/login-out-$user.txt 2>&1
  local status=$(tail -1 /tmp/login-out-$user.txt)
  local cookie=$(awk '/pandai_session/{print $NF}' "$ckfile" 2>/dev/null)
  echo "${status}|${cookie}"
}

api() {
  local m=$1 p=$2 bf=$3 ck=$4
  local tmpf=/tmp/api-out-$RANDOM.txt
  local args=(-s -o "$tmpf" -w '%{http_code}' -X $m -H 'Content-Type: application/json')
  [ -n "$ck" ] && args+=(-H "Cookie: pandai_session=$ck")
  [ -n "$bf" ] && args+=(-d "$bf")
  local http_status=$(curl "${args[@]}" "http://127.0.0.1:3000$p" 2>/dev/null)
  local body=$(cat "$tmpf" 2>/dev/null)
  echo "___STATUS___${http_status}"
  echo "${body}"
}

parse_api() {
  local raw="$1"
  local body=$(echo "$raw" | sed '/^___STATUS___/d')
  local status=$(echo "$raw" | rg -o '___STATUS___([0-9]+)' -r '$1')
  echo "$status"
  echo "$body"
}

# ─── Logins ───
echo ''
echo '── Logging in all roles... ──'

ORTU_L=$(login 'rahman' '123' /tmp/ck-ortu)
ORTU_S=$(echo "$ORTU_L" | cut -d'|' -f1); ORTU_CK=$(echo "$ORTU_L" | cut -d'|' -f2)
echo "  ORANG_TUA: status=$ORTU_S cookie=${ORTU_CK:0:20}..."

GURU_L=$(login '198504152010011001' 'password123' /tmp/ck-guru)
GURU_S=$(echo "$GURU_L" | cut -d'|' -f1); GURU_CK=$(echo "$GURU_L" | cut -d'|' -f2)
echo "  GURU: status=$GURU_S cookie=${GURU_CK:0:20}..."

KEPSEK_L=$(login 'kepsek.sdn1' 'password123' /tmp/ck-kepsek)
KEPSEK_S=$(echo "$KEPSEK_L" | cut -d'|' -f1); KEPSEK_CK=$(echo "$KEPSEK_L" | cut -d'|' -f2)
echo "  KEPALA_SEKOLAH: status=$KEPSEK_S cookie=${KEPSEK_CK:0:20}..."

ADMIN_L=$(login 'admin.sdn1@pandai.id' 'password123' /tmp/ck-admin)
ADMIN_S=$(echo "$ADMIN_L" | cut -d'|' -f1); ADMIN_CK=$(echo "$ADMIN_L" | cut -d'|' -f2)
echo "  ADMIN_SCHOOL: status=$ADMIN_S cookie=${ADMIN_CK:0:20}..."

SISWA_L=$(login '0051234567' 'password123' /tmp/ck-siswa)
SISWA_S=$(echo "$SISWA_L" | cut -d'|' -f1); SISWA_CK=$(echo "$SISWA_L" | cut -d'|' -f2)
echo "  SISWA: status=$SISWA_S cookie=${SISWA_CK:0:20}..."

if [ -z "$ORTU_CK" ] || [ -z "$GURU_CK" ]; then
  echo '❌ Critical login failure.'; kill $SRVPID 2>/dev/null; exit 1
fi

# ─── DB IDs ───
ORTU_ID='cmt3kgcfh000smfdmsd0pio09'
SCHOOL_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.school.findFirst({where:{status:'active'}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
SISWA_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'SISWA',isActive:true,classId:{not:null}}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
CHILD_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{parentId:'$ORTU_ID'}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
GURU_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'GURU',isActive:true}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
SUBJECT_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.subject.findFirst().then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
CLASS_ID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{id:'$SISWA_ID'}}).then(s=>console.log(s?.classId||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
echo ""
echo "IDs: school=$SCHOOL_ID siswa=$SISWA_ID child=$CHILD_ID guru=$GURU_ID subject=$SUBJECT_ID class=$CLASS_ID"

# ═══ Feature A ═══
echo ''
echo '═══ Feature A: 7 Kebiasaan (character-reports) ═══'
A1_JSON='{"studentId":"'$CHILD_ID'","classId":"'$CLASS_ID'","schoolId":"'$SCHOOL_ID'","reporterId":"'$ORTU_ID'","date":"2026-08-22","habit":"bangun_pagi","rating":4,"note":"verify test"}'
r=$(api POST '/api/character-reports' "$A1_JSON" "$ORTU_CK")
A1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); A1B=$(echo "$r" | sed '/^___STATUS___/d')
check A 'A.1 POST character report' 201 "$A1S" "$A1B"

r2=$(api GET "/api/character-reports?studentId=$CHILD_ID" '' "$ORTU_CK")
A2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); A2B=$(echo "$r2" | sed '/^___STATUS___/d')
check A 'A.2 GET reports for own child' 200 "$A2S" "$A2B"

echo "$A2B" | grep -q 'bangun_pagi' && check A 'A.3 Content matches' 200 200 'found' || check A 'A.3 Content matches' 200 404 'not found'
RID=$(echo "$A2B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const a=JSON.parse(d);const r=a.find(x=>x.habit==='bangun_pagi'&&x.note==='verify test');console.log(r?.id||'')}catch{}})" 2>/dev/null)
[ -n "$RID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().characterReport.delete({where:{id:'$RID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ Feature B ═══
echo ''
echo '═══ Feature B: External Quiz Links ═══'
if [ -n "$SUBJECT_ID" ]; then
  B1_JSON='{"content":"Soal eksternal verify","type":"essay","subjectId":"'$SUBJECT_ID'","schoolId":"'$SCHOOL_ID'","externalLink":"https://quiz.example.com/verify-test","createdBy":"'$GURU_ID'"}'
  r=$(api POST '/api/questions' "$B1_JSON" "$GURU_CK")
  B1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); B1B=$(echo "$r" | sed '/^___STATUS___/d')
  check B 'B.1 Create question with externalLink' 200 "$B1S" "$B1B"
  echo "$B1B" | grep -q 'quiz.example.com' && check B 'B.2 Response has externalLink' 200 200 'found' || check B 'B.2 Response has externalLink' 200 404 'missing'
  QID=$(echo "$B1B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
  [ -n "$QID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().question.delete({where:{id:'$QID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null
else
  echo '  ⚠️  Skipped — no subject in DB'
fi

# ═══ Feature C ═══
echo ''
echo '═══ Feature C: Kepala Sekolah Dashboard ═══'
r=$(api GET '/api/kepsek/dashboard' '' "$KEPSEK_CK")
C1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); C1B=$(echo "$r" | sed '/^___STATUS___/d')
check C 'C.1 GET kepsek dashboard' 200 "$C1S" "$C1B"

# ═══ Feature D ═══
echo ''
echo '═══ Feature D: Tujuan Pembelajaran ═══'
r=$(api GET "/api/scores?studentId=$SISWA_ID" '' "$GURU_CK")
D1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); D1B=$(echo "$r" | sed '/^___STATUS___/d')
check D 'D.1 GET scores' 200 "$D1S" "$D1B"

# ═══ Feature E ═══
echo ''
echo '═══ Feature E: Assignment System ═══'
if [ -n "$SUBJECT_ID" ]; then
  E1_JSON='{"title":"Verify Assignment E","description":"Test","subjectId":"'$SUBJECT_ID'","schoolId":"'$SCHOOL_ID'","classId":"'$CLASS_ID'","type":"tugas","status":"published","createdBy":"'$GURU_ID'"}'
  r=$(api POST '/api/assignments' "$E1_JSON" "$GURU_CK")
  E1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); E1B=$(echo "$r" | sed '/^___STATUS___/d')
  check E 'E.1 Create assignment' 200 "$E1S" "$E1B"
  r2=$(api GET "/api/assignments?schoolId=$SCHOOL_ID" '' "$GURU_CK")
  E2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); E2B=$(echo "$r2" | sed '/^___STATUS___/d')
  check E 'E.2 List assignments' 200 "$E2S" "$E2B"
  EID=$(echo "$E1B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
  [ -n "$EID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().assignment.delete({where:{id:'$EID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null
else
  echo '  ⚠️  Skipped — no subject in DB'
fi

# ═══ Feature F ═══
echo ''
echo '═══ Feature F: Tryout System (Exams) ═══'
F1_JSON='{"action":"create-package","title":"Verify Exam Package","schoolId":"'$SCHOOL_ID'","duration":30,"totalQuestions":0,"createdBy":"'$GURU_ID'"}'
r=$(api POST '/api/exams' "$F1_JSON" "$GURU_CK")
F1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); F1B=$(echo "$r" | sed '/^___STATUS___/d')
check F 'F.1 Create exam package' 200 "$F1S" "$F1B"

r2=$(api GET '/api/exams' '' "$SISWA_CK")
F2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); F2B=$(echo "$r2" | sed '/^___STATUS___/d')
check F 'F.2 SISWA GET exams' 200 "$F2S" "$F2B"

r3=$(api GET "/api/scores?studentId=$SISWA_ID" '' "$GURU_CK")
F3S=$(echo "$r3" | rg -o '___STATUS___([0-9]+)' -r '$1'); F3B=$(echo "$r3" | sed '/^___STATUS___/d')
check F 'F.3 GET tryout scores' 200 "$F3S" "$F3B"

FID=$(echo "$F1B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
[ -n "$FID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().examPackage.delete({where:{id:'$FID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ Feature G ═══
echo ''
echo '═══ Feature G: Profil Lulusan 8 Dimensi ═══'
r=$(api GET "/api/competency-assessments?schoolId=$SCHOOL_ID" '' "$GURU_CK")
G1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); G1B=$(echo "$r" | sed '/^___STATUS___/d')
check G 'G.1 GET competency-assessments' 200 "$G1S" "$G1B"

G2_JSON='{"studentId":"'$SISWA_ID'","schoolId":"'$SCHOOL_ID'","classId":"'$CLASS_ID'","assessedBy":"'$GURU_ID'","period":"2024/2025","term":"1","dimension":"beriman","rating":3,"date":"2026-08-22","note":"verify test"}'
r2=$(api POST '/api/competency-assessments' "$G2_JSON" "$GURU_CK")
G2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); G2B=$(echo "$r2" | sed '/^___STATUS___/d')
check G 'G.2 POST competency assessment' 200 "$G2S" "$G2B"

GID=$(echo "$G2B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
[ -n "$GID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().competencyAssessment.delete({where:{id:'$GID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ Feature H ═══
echo ''
echo '═══ Feature H: Komponen Nilai + SIMANTAP ═══'
r=$(api GET "/api/grade-components?schoolId=$SCHOOL_ID" '' "$GURU_CK")
H1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); H1B=$(echo "$r" | sed '/^___STATUS___/d')
check H 'H.1 GET grade-components' 200 "$H1S" "$H1B"

H2_JSON='{"name":"Verify Komponen","type":"FORMATIVE","weight":20,"schoolId":"'$SCHOOL_ID'","term":"1"}'
r2=$(api POST '/api/grade-components' "$H2_JSON" "$ADMIN_CK")
H2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); H2B=$(echo "$r2" | sed '/^___STATUS___/d')
check H 'H.2 POST grade-component' 200 "$H2S" "$H2B"

r3=$(api GET "/api/student-grades?schoolId=$SCHOOL_ID" '' "$GURU_CK")
H3S=$(echo "$r3" | rg -o '___STATUS___([0-9]+)' -r '$1'); H3B=$(echo "$r3" | sed '/^___STATUS___/d')
check H 'H.3 GET student-grades' 200 "$H3S" "$H3B"

HID=$(echo "$H2B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
[ -n "$HID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().gradeComponent.delete({where:{id:'$HID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ Feature I ═══
echo ''
echo '═══ Feature I: Kotak Masukan (Feedback) ═══'
I1_JSON='{"schoolId":"'$SCHOOL_ID'","category":"saran","subject":"general","message":"Verify feedback test"}'
r=$(api POST '/api/feedback' "$I1_JSON" "$GURU_CK")
I1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); I1B=$(echo "$r" | sed '/^___STATUS___/d')
check I 'I.1 POST feedback' 200 "$I1S" "$I1B"

r2=$(api GET "/api/feedback?schoolId=$SCHOOL_ID" '' "$ORTU_CK")
I2S=$(echo "$r2" | rg -o '___STATUS___([0-9]+)' -r '$1'); I2B=$(echo "$r2" | sed '/^___STATUS___/d')
check I 'I.2 GET feedback list (ORANG_TUA)' 200 "$I2S" "$I2B"

IID=$(echo "$I1B" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{}})" 2>/dev/null)
[ -n "$IID" ] && node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().feedback.delete({where:{id:'$IID'}}).catch(()=>{}).finally(()=>process.exit(0))" 2>/dev/null

# ═══ Cross-cutting RBAC ═══
echo ''
echo '═══ Cross-cutting: RBAC ═══'

OTHER_SID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'SISWA',schoolId:{not:'$SCHOOL_ID'},isActive:true}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
if [ -n "$OTHER_SID" ]; then
  r=$(api GET "/api/scores?studentId=$OTHER_SID" '' "$ORTU_CK")
  X1S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); X1B=$(echo "$r" | sed '/^___STATUS___/d')
  check X 'X.1 ORANG_TUA scores other-school' 403 "$X1S" "$X1B"
else
  echo '  ⚠️  X.1 Skipped — no other-school siswa'
fi

OTHER_OID=$(node -e "const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.user.findFirst({where:{role:'ORANG_TUA',id:{not:'$ORTU_ID'},isActive:true}}).then(s=>console.log(s?.id||'')).finally(()=>d.\$disconnect())" 2>/dev/null)
if [ -n "$OTHER_OID" ]; then
  r=$(api GET "/api/users?parentId=$OTHER_OID" '' "$ORTU_CK")
  X2S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); X2B=$(echo "$r" | sed '/^___STATUS___/d')
  check X 'X.2 ORANG_TUA users other parentId' 403 "$X2S" "$X2B"
else
  echo '  ⚠️  X.2 Skipped — no other ORANG_TUA'
fi

r=$(api GET '/api/student-grades' '' '')
X3S=$(echo "$r" | rg -o '___STATUS___([0-9]+)' -r '$1'); X3B=$(echo "$r" | sed '/^___STATUS___/d')
check X 'X.3 Unauthenticated → 401' 401 "$X3S" "$X3B"

# ═══ Summary ═══
echo ''
echo '╔═══════════════════════════════════════════════════════╗'
echo "║  RESULTS: $PASS PASS, $FAIL FAIL (of $((PASS+FAIL)) tests)       ║"
echo '╚═══════════════════════════════════════════════════════╝'

kill $SRVPID 2>/dev/null
exit $FAIL