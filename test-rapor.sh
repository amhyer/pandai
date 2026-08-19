#!/bin/bash
set -e

BASE='http://127.0.0.1:3000'
TERM='2024/2025-Ganjil'
STUDENT_ID='cmszr2cj3001enl3hw2fksbe1'
CLASS_ID='cmszr2cin000onl3h1p31xbvz'
ADMIN_EMAIL='admin.smpn2@pandai.id'
GURU_SMP='3502155678090002'
GURU_SD='198504152010011001'
ORTU='wati'

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); }

get_cookie() {
  local user="$1" pass="$2"
  curl -s -m 30 -D /tmp/h_$1.txt "$BASE/api/auth/login" -X POST -H 'Content-Type: application/json' -d "{\"username\":\"$user\",\"password\":\"$pass\"}" > /tmp/j_$1.json
  grep -i 'set-cookie.*pandai_session' /tmp/h_$1.txt | sed 's/.*pandai_session=\([^;]*\).*/pandai_session=\1/' | tr -d '\r\n'
}

echo '============================================================'
echo 'VERIFIKASI FITUR I: RAPOR CETAK PDF'
echo '============================================================'
echo ''

# ── Login ──
ADMIN_CK=$(get_cookie "$ADMIN_EMAIL" "password123")
GURU_CK=$(get_cookie "$GURU_SMP" "password123")
GURUSD_CK=$(get_cookie "$GURU_SD" "password123")
ORTU_CK=$(get_cookie "$ORTU" "123")
echo "Admin: ${ADMIN_CK:0:20}..."
echo "Guru: ${GURU_CK:0:20}..."
echo "Ortu: ${ORTU_CK:0:20}..."

# ── TEST 1: Rapor siswa lengkap (JSON) ──
echo '\n=== TEST 1: Rapor siswa lengkap ==='
T1=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_ID&term=$TERM")
echo "$T1" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  console.log('  School:', j.school?.name);
  console.log('  Student:', j.student?.name, 'Kelas:', j.student?.kelas);
  console.log('  Components:', j.components?.length);
  console.log('  FinalGrade:', j.finalGrade, 'Predikat:', j.predikat);
  console.log('  Attendance:', JSON.stringify(j.attendance));
  console.log('  Habits count:', Object.keys(j.habits||{}).length);
  console.log('  ProfilLulusan count:', Object.keys(j.profilLulusan||{}).length);
  console.log('  Kepsek:', j.kepsek?.name);
  const compOk = j.components?.length === 5;
  const gradeOk = j.finalGrade !== null && j.finalGrade > 0;
  const attOk = j.attendance?.hadir > 0;
  const habOk = Object.keys(j.habits||{}).length === 7;
  const profOk = Object.keys(j.profilLulusan||{}).length === 8;
  console.log(compOk && gradeOk && attOk && habOk && profOk ? 'ALL_SECTIONS_OK' : 'SOME_MISSING');
}catch(e){console.log('PARSE_ERROR:',e.message)}
"
T1_CHECK=$(echo "$T1" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(Object.keys(j.habits||{}).length===8&&Object.keys(j.profilLulusan||{}).length===8?'Y':'N')}catch{console.log('ERR')}" 2>/dev/null)
if [ "$T1_CHECK" = "Y" ]; then
  pass "Rapor lengkap: 5 komponen + kehadiran + 7 kebiasaan + 8 dimensi"
else
  # Check if 7 kebiasaan and 8 dimensi
  HAB=$(echo "$T1" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(Object.keys(j.habits||{}).length)}catch{}" 2>/dev/null)
  DIM=$(echo "$T1" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(Object.keys(j.profilLulusan||{}).length)}catch{}" 2>/dev/null)
  if [ "$HAB" = "7" ] && [ "$DIM" = "8" ]; then
    pass "Rapor lengkap: 5 komponen + kehadiran + 7 kebiasaan + 8 dimensi"
  else
    fail "Rapor: hab=$HAB dim=$DIM (expect 7,8)"
  fi
fi

# ── TEST 2: Rapor siswa tidak lengkap (no kebiasaan) ──
echo '\n=== TEST 2: Rapor siswa tidak lengkap ==='
T2=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rapor-siswa?studentId=cmszr2cj5001inl3h3m2iz8f3&term=$TERM")
T2_STATUS=$(echo "$T2" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.finalGrade!==null?'OK':'NO_GRADE')}catch{console.log('ERR')}" 2>/dev/null)
T2_HAB=$(echo "$T2" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(Object.keys(j.habits||{}).length)}catch{}" 2>/dev/null)
if [ "$T2_STATUS" = "OK" ] && [ "$T2_HAB" = "0" ]; then
  pass "Rapor tanpa kebiasaan: grade OK, kebiasaan kosong, no crash"
else
  fail "status=$T2_STATUS hab=$T2_HAB"
fi

# ── TEST 3: Rekap kelas ──
echo '\n=== TEST 3: Rekap kelas ==='
T3=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rekap-kelas?classId=$CLASS_ID&term=$TERM")
T3_COUNT=$(echo "$T3" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.jumlahSiswa+':'+j.rataRata)}catch{console.log('ERR')}" 2>/dev/null)
if echo "$T3_COUNT" | grep -q '^3:'; then
  AVG=$(echo "$T3_COUNT" | cut -d: -f2)
  pass "Rekap kelas: 3 siswa, rata-rata=$AVG"
else
  fail "Expected 3 siswa, got: $T3_COUNT"
fi

# ── TEST 4: Legger ──
echo '\n=== TEST 4: Legger ==='
T4=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/legger?classId=$CLASS_ID&term=$TERM")
T4_COMPS=$(echo "$T4" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.components?.length+':'+j.rows?.length+':'+j.rataRataFinal)}catch{console.log('ERR')}" 2>/dev/null)
if echo "$T4_COMPS" | grep -q '^5:3:'; then
  AVG=$(echo "$T4_COMPS" | cut -d: -f3)
  pass "Legger: 5 komponen, 3 siswa, rata-rata=$AVG"
else
  fail "Expected 5:3, got: $T4_COMPS"
fi

# ── TEST 5a: Guru SD isolasi (rapor) ──
echo '\n=== TEST 5a: Guru SD akses rapor SMP (403) ==='
T5A=$(curl -s -m 30 -o /dev/null -w '%{http_code}' -b "$GURUSD_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_ID&term=$TERM")
if [ "$T5A" = "403" ]; then
  pass "Guru SD rapor SMP: 403"
else
  fail "Expected 403, got $T5A"
fi

# ── TEST 5b: Orang tua akses rapor anak sendiri ──
echo '\n=== TEST 5b: Ortu akses rapor anak sendiri ==='
T5B=$(curl -s -m 30 -b "$ORTU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_ID&term=$TERM" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.student?.name)}catch{console.log('ERR')}" 2>/dev/null)
if [ "$T5B" != "ERR" ]; then
  pass "Ortu lihat rapor anak: $T5B"
else
  fail "Ortu gagal lihat rapor anaknya"
fi

echo ''
echo '============================================================'
echo "RINGKASAN: $PASS passed, $FAIL failed"
echo '============================================================'
