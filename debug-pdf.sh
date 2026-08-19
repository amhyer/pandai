#!/bin/bash
GURU_CK=$(grep -i 'set-cookie.*pandai_session' /tmp/h_3502155678090002.txt | sed 's/.*pandai_session=\([^;]*\).*/pandai_session=\1/' | tr -d '\r\n')
echo "Cookie len: ${#GURU_CK}"
echo "--- T5a: Guru SD rapor SMP ---"
GURUSD_CK=$(grep -i 'set-cookie.*pandai_session' /tmp/h_198504152010011001.txt | sed 's/.*pandai_session=\([^;]*\).*/pandai_session=\1/' | tr -d '\r\n')
curl -s -m 30 -b "$GURUSD_CK" 'http://127.0.0.1:3000/api/reports/rapor-siswa?studentId=cmszr2cj3001enl3hw2fksbe1&term=2024/2025-Ganjil'
echo ""
echo "--- T5c: PDF rapor ---"
curl -v -m 30 -b "$GURU_CK" 'http://127.0.0.1:3000/api/reports/rapor-siswa?studentId=cmszr2cj3001enl3hw2fksbe1&term=2024/2025-Ganjil&format=pdf' -o /tmp/rapor_debug.pdf 2>&1
echo ""
echo "--- First 200 bytes ---"
head -c 200 /tmp/rapor_debug.pdf
echo ""
echo "--- T5d: PDF legger ---"
curl -v -m 30 -b "$GURU_CK" 'http://127.0.0.1:3000/api/reports/legger?classId=cmszr2cin000onl3h1p31xbvz&term=2024/2025-Ganjil&format=pdf' -o /tmp/legger_debug.pdf 2>&1
echo ""
echo "--- First 200 bytes ---"
head -c 200 /tmp/legger_debug.pdf
echo ""
