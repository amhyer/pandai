#!/bin/bash
# LANGKAH 8.1 — Audit Log Anomaly Detection
# Checks AuditLog for suspicious patterns: one user accessing > 5 different targetUsers in 10 min

set +e

BASE_URL="http://127.0.0.1:3000"
COOKIE_JAR="/tmp/audit-admin-cookie.txt"

# Login as ADMIN_SCHOOL
rm -f "$COOKIE_JAR"
echo "=== 8.1 Audit Log Anomaly Check ==="
echo ""
echo "--- Login as ADMIN_SCHOOL ---"
LOGIN_RESP=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin.sdn1@pandai.id","password":"password123"}')

SESSION=$(awk '/pandai_session/{print $NF}' "$COOKIE_JAR")
if [ -z "$SESSION" ]; then
  echo "ERROR: Login failed. Response: $LOGIN_RESP"
  exit 1
fi
echo "Login OK, session: ${SESSION:0:20}..."
echo ""

# Run anomaly check with default params (> 5 targets in 10 min)
echo "--- Anomaly Check: > 5 target berbeda dalam 10 menit ---"
ANOMALY_RESP=$(curl -s -b "pandai_session=$SESSION" "$BASE_URL/api/audit/suspicious-access")
echo "$ANOMALY_RESP" | python3 -m json.tool 2>/dev/null || echo "$ANOMALY_RESP"

echo ""
echo "--- Anomaly Check: > 3 target berbeda dalam 60 menit (lebih sensitif) ---"
ANOMALY_WIDE=$(curl -s -b "pandai_session=$SESSION" "$BASE_URL/api/audit/suspicious-access?windowMinutes=60&threshold=3")
echo "$ANOMALY_WIDE" | python3 -m json.tool 2>/dev/null || echo "$ANOMALY_WIDE"

echo ""

# Also check raw AuditLog count
echo "--- Total AuditLog Records ---"
COUNT_RESP=$(curl -s -b "pandai_session=$SESSION" "$BASE_URL/api/audit/suspicious-access?windowMinutes=10080&threshold=1")
TOTAL_SUSPICIOUS=$(echo "$COUNT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['summary']['totalSuspiciousUsers'])" 2>/dev/null || echo "N/A")
echo "Total users with >1 target in 7 days: $TOTAL_SUSPICIOUS"

echo ""
echo "=== 8.1 COMPLETE ==="

# Cleanup
rm -f "$COOKIE_JAR"
