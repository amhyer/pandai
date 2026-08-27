#!/bin/bash
# scripts/verify/group-c-cleanup.sh
# Verifikasi: NPSN database has no SMA/SMK/MA, constants has no SMA subjects
# Exit code 0 = all PASS, 1 = any FAIL

cd /home/z/my-project
PASS=0
FAIL=0

assert() {
  local name="$1" condition="$2" detail="$3"
  if eval "$condition"; then
    PASS=$((PASS+1)); echo "  ✅ PASS: $name"
  else
    FAIL=$((FAIL+1)); echo "  ❌ FAIL: $name — $detail"
  fi
}

echo "=== GROUP C — DATA CLEANUP SD/SMP ==="

# C1: No SMA in NPSN
SMA_COUNT=$(rg -c "schoolType: 'SMA'" src/lib/npsn-database.ts 2>/dev/null || echo "0")
assert "C1: No SMA in npsn-database.ts" "[ '$SMA_COUNT' = '0' ]" "Found $SMA_COUNT SMA entries"

# C2: No SMK in NPSN
SMK_COUNT=$(rg -c "schoolType: 'SMK'" src/lib/npsn-database.ts 2>/dev/null || echo "0")
assert "C2: No SMK in npsn-database.ts" "[ '$SMK_COUNT' = '0' ]" "Found $SMK_COUNT SMK entries"

# C3: No MA in NPSN
MA_COUNT=$(rg -c "schoolType: 'MA'" src/lib/npsn-database.ts 2>/dev/null || echo "0")
assert "C3: No MA in npsn-database.ts" "[ '$MA_COUNT' = '0' ]" "Found $MA_COUNT MA entries"

# C4: Has SD entries
SD_COUNT=$(rg -c "schoolType: 'SD'" src/lib/npsn-database.ts 2>/dev/null || echo "0")
assert "C4: Has SD entries" "[ '$SD_COUNT' -gt '0' ]" "Found $SD_COUNT SD entries"

# C5: Has SMP entries
SMP_COUNT=$(rg -c "schoolType: 'SMP'" src/lib/npsn-database.ts 2>/dev/null || echo "0")
assert "C5: Has SMP entries" "[ '$SMP_COUNT' -gt '0' ]" "Found $SMP_COUNT SMP entries"

# C6: No Fisika in constants
assert "C6: No Fisika in constants.ts" "! rg -q 'Fisika' src/lib/constants.ts 2>/dev/null" "Still has Fisika"

# C7: No Kimia in constants
assert "C7: No Kimia in constants.ts" "! rg -q 'Kimia' src/lib/constants.ts 2>/dev/null" "Still has Kimia"

# C8: No Biologi in constants
assert "C8: No Biologi in constants.ts" "! rg -q 'Biologi' src/lib/constants.ts 2>/dev/null" "Still has Biologi"

# C9: No Ekonomi in constants
assert "C9: No Ekonomi in constants.ts" "! rg -q 'Ekonomi' src/lib/constants.ts 2>/dev/null" "Still has Ekonomi"

# C10: No Sosiologi in constants
assert "C10: No Sosiologi in constants.ts" "! rg -q 'Sosiologi' src/lib/constants.ts 2>/dev/null" "Still has Sosiologi"

# C11: No Geografi in constants
assert "C11: No Geografi in constants.ts" "! rg -q 'Geografi' src/lib/constants.ts 2>/dev/null" "Still has Geografi"

# C12: Has SD/SMP-appropriate subjects
assert "C12: Has Bahasa Indonesia" "rg -q 'Bahasa Indonesia' src/lib/constants.ts" "Missing B.Indo"
assert "C13: Has IPA (Terpadu)" "rg -q 'IPA' src/lib/constants.ts" "Missing IPA Terpadu"
assert "C14: Has IPS (Terpadu)" "rg -q 'IPS' src/lib/constants.ts" "Missing IPS Terpadu"

echo ""
echo "=== RESULTS: $PASS PASS, $FAIL FAIL ==="
[ $FAIL -eq 0 ] && exit 0 || exit 1
