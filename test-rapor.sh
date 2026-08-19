#!/bin/bash
set -e

BASE='http://127.0.0.1:3000'
TERM='2024/2025-Ganjil'
# Student with FULL data: 5 grades, 7 kebiasaan, 8 dimensi profil lulusan
STUDENT_FULL='cmszr2cj3001enl3hw2fksbe1'
# Student with grades ONLY: 5 grades, 0 kebiasaan, 0 dimensi
STUDENT_NOHABIT='cmszr2cj5001inl3h3m2iz8f3'
# Student with NO grades at all (for edge case)
STUDENT_NOGRADE='cmszr2cj7001mnl3h4u5shpmk'
CLASS_ID='cmszr2cin000onl3h1p31xbvz'
GURU_SMP='3502155678090002'
GURU_SD='198504152010011001'
ORTU='wati'

PASS=0
FAIL=0
TOTAL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

tag() { echo ""; echo "=== TEST $1: $2 ==="; }

get_cookie() {
  local user="$1" pass="$2"
  curl -s -m 30 -D /tmp/h_$1.txt "$BASE/api/auth/login" -X POST -H 'Content-Type: application/json' -d "{\"username\":\"$user\",\"password\":\"$pass\"}" > /tmp/j_$1.json
  grep -i 'set-cookie.*pandai_session' /tmp/h_$1.txt | sed 's/.*pandai_session=\([^;]*\).*/pandai_session=\1/' | tr -d '\r\n'
}

echo '============================================================'
echo 'VERIFIKASI FITUR I: RAPOR CETAK PDF (5 TEST)'
echo '============================================================'

# ── Login ──
echo ''
echo '── Login semua role ──'
GURU_CK=$(get_cookie "$GURU_SMP" "password123")
GURUSD_CK=$(get_cookie "$GURU_SD" "password123")
ORTU_CK=$(get_cookie "$ORTU" "123")
echo "  Guru SMP: ${GURU_CK:0:20}..."
echo "  Guru SD:  ${GURUSD_CK:0:20}..."
echo "  Ortu:     ${ORTU_CK:0:20}..."

# ═══════════════════════════════════════════════════════════════
# TEST 1: Rapor siswa LENGKAP (semua seksi terisi)
# ═══════════════════════════════════════════════════════════════
tag "1" "Rapor siswa LENGKAP — 5 komponen + 7 kebiasaan + 8 dimensi"
T1=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_FULL&term=$TERM")
T1_OUT=$(echo "$T1" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  if(j.error){process.exit(99)}
  const compLen = j.components?.length || 0;
  const habLen = Object.keys(j.habits||{}).length;
  const dimLen = Object.keys(j.profilLulusan||{}).length;
  const hasGrade = j.finalGrade !== null && j.finalGrade > 0;
  const hasSchool = !!j.school?.name;
  const hasStudent = !!j.student?.name;
  const hasKepsek = !!j.kepsek?.name;
  const hasPredikat = !!j.predikat && j.predikat !== '-';
  console.log(compLen+':'+habLen+':'+dimLen+':'+(hasGrade?'1':'0')+':'+(hasSchool?'1':'0')+':'+(hasStudent?'1':'0')+':'+(hasKepsek?'1':'0')+':'+(hasPredikat?'1':'0')+':'+j.finalGrade+':'+j.predikat);
}catch(e){console.log('ERR:'+e.message)}
" 2>/dev/null)

if echo "$T1_OUT" | grep -q '^ERR:'; then
  fail "Parse error: $(echo "$T1_OUT" | sed 's/ERR://')"
elif echo "$T1_OUT" | grep -qE '^5:7:8:1:1:1:1:1:'; then
  GRADE=$(echo "$T1_OUT" | cut -d: -f9)
  PRED=$(echo "$T1_OUT" | cut -d: -f10)
  pass "Rapor lengkap: 5 komp, 7 hab, 8 dim, grade=$GRADE, predikat=$PRED"
else
  fail "Expected 5:7:8:1:1:1:1:1, got: $T1_OUT"
fi

# ═══════════════════════════════════════════════════════════════
# TEST 2: Rapor siswa TIDAK LENGKAP (nilai ada, kebiasaan kosong)
# ═══════════════════════════════════════════════════════════════
tag "2" "Rapor siswa TIDAK LENGKAP — nilai OK, kebiasaan/dimensi kosong, no crash"
T2=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_NOHABIT&term=$TERM")
T2_OUT=$(echo "$T2" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  if(j.error){process.exit(99)}
  const compLen = j.components?.length || 0;
  const habLen = Object.keys(j.habits||{}).length;
  const dimLen = Object.keys(j.profilLulusan||{}).length;
  const hasGrade = j.finalGrade !== null && j.finalGrade > 0;
  console.log(compLen+':'+habLen+':'+dimLen+':'+(hasGrade?'1':'0')+':'+j.finalGrade);
}catch(e){console.log('ERR:'+e.message)}
" 2>/dev/null)

if echo "$T2_OUT" | grep -q '^ERR:'; then
  fail "Parse error: $(echo "$T2_OUT" | sed 's/ERR://')"
elif echo "$T2_OUT" | grep -qE '^5:0:0:1:'; then
  GRADE2=$(echo "$T2_OUT" | cut -d: -f5)
  pass "Rapor tidak lengkap: 5 komp, 0 hab, 0 dim, grade=$GRADE2 (no crash)"
else
  fail "Expected 5:0:0:1:X, got: $T2_OUT"
fi

# ═══════════════════════════════════════════════════════════════
# TEST 3: Rekap kelas (3 siswa + rata-rata)
# ═══════════════════════════════════════════════════════════════
tag "3" "Rekap kelas — semua siswa + rata-rata"
T3=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rekap-kelas?classId=$CLASS_ID&term=$TERM")
T3_OUT=$(echo "$T3" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  if(j.error){process.exit(99)}
  console.log(j.jumlahSiswa+':'+j.rataRata+':'+j.nilaiTertinggi+':'+j.nilaiTerendah+':'+j.students?.length);
}catch(e){console.log('ERR:'+e.message)}
" 2>/dev/null)

if echo "$T3_OUT" | grep -q '^3:'; then
  AVG=$(echo "$T3_OUT" | cut -d: -f2)
  HIGH=$(echo "$T3_OUT" | cut -d: -f3)
  LOW=$(echo "$T3_OUT" | cut -d: -f4)
  pass "Rekap kelas: 3 siswa, rata-rata=$AVG, max=$HIGH, min=$LOW"
else
  fail "Expected 3:..., got: $T3_OUT"
fi

# ═══════════════════════════════════════════════════════════════
# TEST 4: Legger (5 komponen × 3 siswa + rata-rata)
# ═══════════════════════════════════════════════════════════════
tag "4" "Legger — 5 komponen × 3 siswa + rata-rata per komponen + rata-rata final"
T4=$(curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/legger?classId=$CLASS_ID&term=$TERM")
T4_OUT=$(echo "$T4" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  if(j.error){process.exit(99)}
  const compLen = j.components?.length || 0;
  const rowLen = j.rows?.length || 0;
  const avgFinal = j.rataRataFinal;
  const avgComp = Object.keys(j.rataRataPerKomponen||{}).length;
  console.log(compLen+':'+rowLen+':'+avgComp+':'+avgFinal);
}catch(e){console.log('ERR:'+e.message)}
" 2>/dev/null)

if echo "$T4_OUT" | grep -qE '^5:3:5:'; then
  AVG4=$(echo "$T4_OUT" | cut -d: -f4)
  pass "Legger: 5 komponen, 3 siswa, 5 rata-rata komp, rata-rata final=$AVG4"
else
  fail "Expected 5:3:5:X, got: $T4_OUT"
fi

# ═══════════════════════════════════════════════════════════════
# TEST 5: Keamanan + Akses + PDF validasi
# ═══════════════════════════════════════════════════════════════
tag "5a" "Guru SD akses rapor SMP → 403 (school isolation)"
T5A_CODE=$(curl -s -m 30 -o /dev/null -w '%{http_code}' -b "$GURUSD_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_FULL&term=$TERM")
if [ "$T5A_CODE" = "403" ]; then
  pass "Guru SD akses rapor SMP: 403 ✓"
else
  fail "Expected 403, got $T5A_CODE"
fi

tag "5b" "Orang tua akses rapor anak sendiri → 200 + nama siswa"
T5B=$(curl -s -m 30 -b "$ORTU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_FULL&term=$TERM")
T5B_NAME=$(echo "$T5B" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{const j=JSON.parse(d);console.log(j.student?.name || 'NONAME')}catch{console.log('ERR')}
" 2>/dev/null)
if [ "$T5B_NAME" != "ERR" ] && [ "$T5B_NAME" != "NONAME" ]; then
  pass "Ortu lihat rapor anak: $T5B_NAME ✓"
else
  fail "Ortu gagal lihat rapor anaknya (got: $T5B_NAME)"
fi

tag "5c" "PDF rapor siswa — header %PDF- valid + ukuran > 1KB"
curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/rapor-siswa?studentId=$STUDENT_FULL&term=$TERM&format=pdf" -o /tmp/rapor_test.pdf
PDF_HEADER=$(head -c 5 /tmp/rapor_test.pdf | tr -d '\0')
PDF_SIZE=$(wc -c < /tmp/rapor_test.pdf)
if [ "$PDF_HEADER" = '%PDF-' ] && [ "$PDF_SIZE" -gt 1000 ]; then
  pass "PDF header: %PDF- ✓, ukuran: $PDF_SIZE bytes"
else
  fail "PDF invalid: header='$PDF_HEADER', size=$PDF_SIZE"
fi

tag "5d" "PDF legger — header %PDF- valid + ukuran > 1KB"
curl -s -m 30 -b "$GURU_CK" "$BASE/api/reports/legger?classId=$CLASS_ID&term=$TERM&format=pdf" -o /tmp/legger_test.pdf
PDF_HEADER2=$(head -c 5 /tmp/legger_test.pdf | tr -d '\0')
PDF_SIZE2=$(wc -c < /tmp/legger_test.pdf)
if [ "$PDF_HEADER2" = '%PDF-' ] && [ "$PDF_SIZE2" -gt 1000 ]; then
  pass "PDF header: %PDF- ✓, ukuran: $PDF_SIZE2 bytes"
else
  fail "PDF invalid: header='$PDF_HEADER2', size=$PDF_SIZE2"
fi

echo ''
echo '============================================================'
echo "RINGKASAN: $PASS passed, $FAIL failed (dari $TOTAL test)"
echo '============================================================'
if [ $FAIL -gt 0 ]; then exit 1; fi
