#!/bin/bash
# R21 — Dead Code Audit Verification

echo "=== R21 Dead Code Audit Verification ==="
echo ""

PASS=0
FAIL=0
TOTAL=0

pass() {
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  echo "  ✅ PASS — $1"
}

fail() {
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  echo "  ❌ FAIL — $1"
}

# 1. DELETE /api/materials endpoint exists
echo "[1] DELETE /api/materials endpoint exists..."
if rg -q "export async function DELETE" src/app/api/materials/route.ts 2>/dev/null; then
  pass "DELETE handler found in materials route"
else
  fail "DELETE handler NOT found in materials route"
fi

# 2. DELETE /api/teaching-journals endpoint exists
echo "[2] DELETE /api/teaching-journals endpoint exists..."
if rg -q "export async function DELETE" src/app/api/teaching-journals/route.ts 2>/dev/null; then
  pass "DELETE handler found in teaching-journals route"
else
  fail "DELETE handler NOT found in teaching-journals route"
fi

# 3. Guru handleDelete calls API
echo "[3] Guru handleDelete (materials) calls fetch DELETE..."
if rg -q "fetch.*api/materials.*DELETE" src/components/views/guru-new-views.tsx 2>/dev/null; then
  pass "handleDelete calls DELETE /api/materials"
else
  fail "handleDelete does NOT call API"
fi

# 4. Guru handleDeleteJournal calls API
echo "[4] Guru handleDeleteJournal calls fetch DELETE..."
if rg -q "fetch.*api/teaching-journals.*DELETE" src/components/views/guru-new-views.tsx 2>/dev/null; then
  pass "handleDeleteJournal calls DELETE /api/teaching-journals"
else
  fail "handleDeleteJournal does NOT call API"
fi

# 5. Siswa handleRefresh uses real API
echo "[5] Siswa handleRefresh uses doFetchMaterials (not setTimeout)..."
if rg -q "doFetchMaterials" src/components/views/siswa-new-views.tsx 2>/dev/null; then
  pass "handleRefresh uses doFetchMaterials callback"
else
  fail "handleRefresh still uses mock setTimeout"
fi

# 6. Count disabled buttons with tooltip
echo "[6] Dead buttons disabled with 'Fitur dalam pengembangan' tooltip..."
COUNT=$(rg -c "Fitur dalam pengembangan" src/components/views/*.tsx 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ "$COUNT" -ge 38 ]; then
  pass "$COUNT dead buttons have disabled tooltip (target: 38+)"
else
  fail "Only $COUNT buttons have tooltip (expected 38+)"
fi

# 7. No fake setTimeout toasts in super-admin
echo "[7] No fake setTimeout+toast patterns in super-admin..."
FAKE=$(rg "setTimeout.*\d+\).*toast\.(success|info)" src/components/views/super-admin-views.tsx 2>/dev/null | wc -l)
if [ "$FAKE" -eq 0 ]; then
  pass "No fake setTimeout+toast patterns in super-admin"
else
  fail "$FAKE fake toast patterns still exist in super-admin"
fi

# 8. Super-admin dead buttons have disabled prop
echo "[8] Super-admin dead buttons have disabled prop..."
DISABLED_COUNT=$(rg -c "disabled" src/components/views/super-admin-views.tsx 2>/dev/null)
if [ "$DISABLED_COUNT" -ge 10 ]; then
  pass "$DISABLED_COUNT disabled elements in super-admin (target: 10+)"
else
  fail "Only $DISABLED_COUNT disabled elements (expected 10+)"
fi

# 9. Fake 'segera hadir' toast.info onClick removed from buttons
echo "[9] Fake 'segera hadir' toast.info onClick removed from buttons..."
REMAINING=$(rg 'onClick.*toast\.info.*segera hadir' src/components/views/*.tsx 2>/dev/null | wc -l)
if [ "$REMAINING" -eq 0 ]; then
  pass "All 'segera hadir' toast.info onClick handlers removed"
else
  fail "$REMAINING 'segera hadir' onClick handlers still present"
fi

# 10. No fake 'berhasil diunduh' without real download
echo "[10] No fake 'berhasil diunduh' toasts on export/download buttons..."
FAKE_DL=$(rg 'onClick.*toast\.success.*berhasil diunduh' src/components/views/orang-tua-views.tsx 2>/dev/null | wc -l)
if [ "$FAKE_DL" -eq 0 ]; then
  pass "No fake 'berhasil diunduh' onClick toasts in ortu views"
else
  fail "$FAKE_DL fake download toasts still present"
fi

echo ""
echo "======================================"
echo "  TOTAL: $TOTAL  |  PASS: $PASS  |  FAIL: $FAIL"
echo "======================================"

if [ $FAIL -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED"
  exit 0
else
  echo "❌ SOME CHECKS FAILED"
  exit 1
fi
