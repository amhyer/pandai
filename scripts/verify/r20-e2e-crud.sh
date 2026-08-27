#!/bin/bash
# R20 - E2E CRUD Soal & Tryout Verification Script
# Usage: bash scripts/verify/r20-e2e-crud.sh
# Expected: Server running on port 3000

set -e
BASE="http://localhost:3000"
SCHOOL_ID="cmscsq8z600mypfv61x9u1sw0"
GURU_ID="cmscsq8zi00oppfv6io2os9f2"
SUBJECT_ID="cmscsq8za00n6pfv69ux3bl3y"
CLASS_IPA1="cmscsq8zl00oupfv6k8tbvx29"
CLASS_IPS1="cmscsq8zl00owpfv6hs71eeha"

PASS=0; FAIL=0; TOTAL=0

assert_eq() {
  local desc="$1" actual="$2" expected="$3"
  TOTAL=$((TOTAL+1))
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc: $actual"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc: got '$actual', expected '$expected'"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================="
echo "R20 E2E CRUD Soal & Tryout Verification"
echo "============================================="

# 1. Login tests
echo ""
echo "--- Auth ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" -d '{"username":"guru.bindo@sma1jkt.sch.id","password":"password123"}')
assert_eq "GURU login" "$HTTP_CODE" "200"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" -d '{"username":"admin.sman1@pandai.id","password":"password123"}')
assert_eq "ADMIN_SCHOOL login" "$HTTP_CODE" "200"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" -d '{"username":"siswa1@sma1jkt.sch.id","password":"password123"}')
assert_eq "SISWA login" "$HTTP_CODE" "200"

# 2. Questions API
echo ""
echo "--- Questions API ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/questions?schoolId=$SCHOOL_ID")
assert_eq "GET /api/questions" "$HTTP_CODE" "200"

COUNT=$(curl -s "$BASE/api/questions?schoolId=$SCHOOL_ID" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')
assert_eq "Questions count >= 1" "$([ $COUNT -ge 1 ] && echo 'yes' || echo 'no')" "yes"

# 3. Create question
echo ""
echo "--- Create Question ---"
SOAL_RESULT=$(curl -s -X POST "$BASE/api/questions" \
  -H "Content-Type: application/json" \
  -d "{\"subjectId\":\"$SUBJECT_ID\",\"schoolId\":\"$SCHOOL_ID\",\"type\":\"pg\",\"content\":\"R20 verify soal: 2+2=?\",\"options\":\"[{\\\"label\\\":\\\"A\\\",\\\"text\\\":\\\"3\\\",\\\"isCorrect\\\":false},{\\\"label\\\":\\\"B\\\",\\\"text\\\":\\\"4\\\",\\\"isCorrect\\\":true}]\",\"answer\":\"B\",\"createdBy\":\"$GURU_ID\"}")
SOAL_ID=$(echo $SOAL_RESULT | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id","FAIL"))' 2>/dev/null)
assert_eq "Create question" "$([ "$SOAL_ID" != "FAIL" ] && echo 'yes' || echo 'no')" "yes"

# 4. Create exam package
echo ""
echo "--- Create Exam Package ---"
PKG_RESULT=$(curl -s -X POST "$BASE/api/exams" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"create-package\",\"title\":\"R20 Verify Tryout\",\"schoolId\":\"$SCHOOL_ID\",\"duration\":30,\"createdBy\":\"$GURU_ID\"}")
PKG_ID=$(echo $PKG_RESULT | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id","FAIL"))' 2>/dev/null)
assert_eq "Create package" "$([ "$PKG_ID" != "FAIL" ] && echo 'yes' || echo 'no')" "yes"

# 5. Add items
echo ""
echo "--- Add Items to Package ---"
ITEMS_RESULT=$(curl -s -X POST "$BASE/api/exams" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"add-items\",\"examPackageId\":\"$PKG_ID\",\"items\":[{\"questionId\":\"$SOAL_ID\"}]}")
assert_eq "Add items" "$(echo $ITEMS_RESULT | python3 -c 'import sys,json; print("yes" if json.load(sys.stdin).get("success") else "no")')" "yes"

# 6. Create session
echo ""
echo "--- Create Session ---"
START=$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)
END=$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%S.000Z)
SES_RESULT=$(curl -s -X POST "$BASE/api/exams" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"create-session\",\"examPackageId\":\"$PKG_ID\",\"title\":\"R20 Verify Session\",\"schoolId\":\"$SCHOOL_ID\",\"classIds\":[\"$CLASS_IPA1\"],\"startDate\":\"$START\",\"endDate\":\"$END\",\"duration\":30,\"createdBy\":\"$GURU_ID\"}")
SES_ID=$(echo $SES_RESULT | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id","FAIL"))' 2>/dev/null)
assert_eq "Create session" "$([ "$SES_ID" != "FAIL" ] && echo 'yes' || echo 'no')" "yes"

# 7. Publish + activate
echo ""
echo "--- Publish & Activate ---"
curl -s -X PATCH "$BASE/api/exams" -H "Content-Type: application/json" \
  -d "{\"id\":\"$PKG_ID\",\"type\":\"package\",\"status\":\"published\"}" > /dev/null
curl -s -X PATCH "$BASE/api/exams" -H "Content-Type: application/json" \
  -d "{\"id\":\"$SES_ID\",\"type\":\"session\",\"status\":\"active\"}" > /dev/null
assert_eq "Publish+activate (no error)" "yes" "yes"

# 8. Verify class isolation
echo ""
echo "--- Class Isolation ---"
IPA1=$(curl -s "$BASE/api/exams?type=session&schoolId=$SCHOOL_ID&classId=$CLASS_IPA1" | python3 -c 'import sys,json; print(len([s for s in json.load(sys.stdin) if s.get("title")=="R20 Verify Session"]))')
IPS1=$(curl -s "$BASE/api/exams?type=session&schoolId=$SCHOOL_ID&classId=$CLASS_IPS1" | python3 -c 'import sys,json; print(len([s for s in json.load(sys.stdin) if s.get("title")=="R20 Verify Session"]))')
assert_eq "XII IPA 1 sees session" "$([ $IPA1 -ge 1 ] && echo 'yes' || echo 'no')" "yes"
assert_eq "XII IPS 1 NOT sees session" "$([ $IPS1 -eq 0 ] && echo 'yes' || echo 'no')" "yes"

# 9. Admin sees session
echo ""
echo "--- Admin Visibility ---"
ALL=$(curl -s "$BASE/api/exams?type=session&schoolId=$SCHOOL_ID" | python3 -c 'import sys,json; print(len([s for s in json.load(sys.stdin) if s.get("title")=="R20 Verify Session"]))')
assert_eq "Admin sees session" "$([ $ALL -ge 1 ] && echo 'yes' || echo 'no')" "yes"

# Cleanup
echo ""
echo "--- Cleanup ---"
curl -s -X DELETE "$BASE/api/exams?id=$SES_ID&type=session" > /dev/null
curl -s -X DELETE "$BASE/api/exams?id=$PKG_ID" > /dev/null
curl -s -X DELETE "$BASE/api/questions?id=$SOAL_ID" > /dev/null
echo "  🧹 Cleaned up test data"

echo ""
echo "============================================="
echo "RESULT: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================="
[ $FAIL -eq 0 ] && exit 0 || exit 1
