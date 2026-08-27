#!/bin/bash
# R22 — Notification Persistence + Broadcast Disable Verification

echo "=== R22 Verification ==="
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

# 1. Notification model exists in Prisma schema
echo "[1] Notification model in Prisma schema..."
if rg -q "model Notification" prisma/schema.prisma 2>/dev/null; then
  pass "Notification model found in schema"
else
  fail "Notification model NOT found"
fi

# 2. GET /api/notifications endpoint exists
echo "[2] GET /api/notifications endpoint exists..."
if [ -f "src/app/api/notifications/route.ts" ]; then
  pass "Route file exists"
else
  fail "Route file missing"
fi

# 3. PATCH /api/notifications/[id] endpoint exists
echo "[3] PATCH /api/notifications/[id] endpoint exists..."
if [ -f "src/app/api/notifications/[id]/route.ts" ]; then
  pass "Route file exists"
else
  fail "Route file missing"
fi

# 4. PATCH /api/notifications/mark-all-read endpoint exists
echo "[4] PATCH /api/notifications/mark-all-read endpoint exists..."
if [ -f "src/app/api/notifications/mark-all-read/route.ts" ]; then
  pass "Route file exists"
else
  fail "Route file missing"
fi

# 5. NotificationsView uses real API (not mock)
echo "[5] NotificationsView fetches from /api/notifications..."
if rg -q "api/notifications" src/components/views/shared-views.tsx 2>/dev/null && \
   rg -q "mark-all-read" src/components/views/shared-views.tsx 2>/dev/null; then
  pass "NotificationsView wired to real API endpoints"
else
  fail "NotificationsView not using real API"
fi

# 6. handleMarkRead calls PATCH API
echo "[6] handleMarkRead calls PATCH /api/notifications/[id]..."
if rg -q "fetch.*api/notifications.*PATCH" src/components/views/shared-views.tsx 2>/dev/null; then
  pass "handleMarkRead uses PATCH API call"
else
  fail "handleMarkRead does not call API"
fi

# 7. handleMarkAllRead calls PATCH API
echo "[7] handleMarkAllRead calls PATCH /api/notifications/mark-all-read..."
if rg -q "mark-all-read.*PATCH" src/components/views/shared-views.tsx 2>/dev/null; then
  pass "handleMarkAllRead uses PATCH API call"
else
  fail "handleMarkAllRead does not call API"
fi

# 8. No more SAMPLE_NOTIFICATIONS usage
echo "[8] SAMPLE_NOTIFICATIONS mock data removed..."
REFS=$(rg -c "SAMPLE_NOTIFICATIONS" src/components/views/shared-views.tsx 2>/dev/null || echo "0")
REFS=$(echo "$REFS" | awk -F: '{print $NF}')
if [ "${REFS:-0}" -eq 0 ] 2>/dev/null; then
  pass "No SAMPLE_NOTIFICATIONS references"
else
  fail "$REFS SAMPLE_NOTIFICATIONS references still present"
fi

# 9. No more SAMPLE_BROADCASTS usage
echo "[9] SAMPLE_BROADCASTS mock data removed..."
REFS=$(rg -c "SAMPLE_BROADCASTS" src/components/views/shared-views.tsx 2>/dev/null || echo "0")
REFS=$(echo "$REFS" | awk -F: '{print $NF}')
if [ "${REFS:-0}" -eq 0 ] 2>/dev/null; then
  pass "No SAMPLE_BROADCASTS references"
else
  fail "$REFS SAMPLE_BROADCASTS references still present"
fi

# 10. BroadcastsView is simplified (no fake data, no handleMarkRead)
echo "[10] BroadcastsView is placeholder only..."
if rg -q "Fitur dalam pengembangan" src/components/views/shared-views.tsx 2>/dev/null && \
   ! rg -q "handleMarkRead.*broadcast" src/components/views/shared-views.tsx 2>/dev/null && \
   ! rg -q "SAMPLE_BROADCASTS" src/components/views/shared-views.tsx 2>/dev/null; then
  pass "BroadcastsView shows EmptyState placeholder only"
else
  fail "BroadcastsView still has fake data or interaction"
fi

# 11. Notification table exists in DB
echo "[11] Notification table exists in database..."
if [ -f "db/custom.db" ]; then
  TABLE_CHECK=$(node -e "const db=require('better-sqlite3')('./db/custom.db');console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='Notification'\").get()?.name||'');db.close();" 2>/dev/null)
  if [ "$TABLE_CHECK" = "Notification" ]; then
    pass "Notification table exists in SQLite"
  else
    fail "Notification table NOT found in SQLite"
  fi
else
  fail "Database file not found"
fi

# 12. Dead mapper functions removed
echo "[12] Unused mapper functions removed..."
REMAINING=$(rg -c "mapActivityLogsTo" src/components/views/shared-views.tsx 2>/dev/null || echo "0")
REMAINING=$(echo "$REMAINING" | awk -F: '{print $NF}')
if [ "${REMAINING:-0}" -eq 0 ] 2>/dev/null; then
  pass "All mapActivityLogsTo* functions removed"
else
  fail "$REMAINING mapper functions still present"
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
