#!/bin/bash
# GRUP A — Scoring Engine Audit (curl-based, no code review)
# Output to /home/z/my-project/results-grup-a.txt

OUT="/home/z/my-project/results-grup-a.txt"
BASE="http://localhost:3000"

echo "============================================" > "$OUT"
echo "GRUP A — SCORING ENGINE AUDIT" >> "$OUT"
echo "Timestamp: $(date)" >> "$OUT"
echo "============================================" >> "$OUT"

# Wait for server
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE" 2>/dev/null)
  if [ "$CODE" = "200" ]; then
    echo "Server ready after ${i}s" >> "$OUT"
    break
  fi
  sleep 1
done

# Tokens
SA_TOKEN="12265d2a-7e84-b9fe-d560-4c5c7f95bfd7"   # SUPER_ADMIN
ADMIN_TOKEN="28d6394f-cddc-181e-3c18-b7ee7a562422"  # ADMIN_SCHOOL (school1)
GURU_TOKEN="aed2f4fc-0b59-9759-e0c9-7d1cbdab58e6"   # GURU (school1)
ORTU_TOKEN="fdfd7382-1256-e7e0-a145-9bff7008d72c"   # ORANG_TUA
SCHOOL1="cmsqspjkh0000rcxth4v57002"
SCHOOL2="cmsqspjkl0001rcxt7skak7ki"

# --- TEST A1: Submit attempt and verify atomic creation ---
echo "" >> "$OUT"
echo "===== TEST A1: Attempt submission (findMany + transaction check) =====" >> "$OUT"

# First, find a valid examSession
echo "--- Finding exam session ---" >> "$OUT"
SESSION_DATA=$(curl -s "$BASE/api/exam-sessions" 2>/dev/null)
echo "$SESSION_DATA" >> "$OUT"

# Get exam items for a session to know what questions to answer
echo "" >> "$OUT"
echo "--- Getting exam items ---" >> "$OUT"
ITEMS_DATA=$(curl -s "$BASE/api/exam-items?examSessionId=cmsqspjl7001" 2>/dev/null)
echo "$ITEMS_DATA" >> "$OUT"

# Let's look at existing attempts
echo "" >> "$OUT"
echo "--- Existing attempts ---" >> "$OUT"
ATTEMPTS=$(curl -s -H "Authorization: Bearer $SA_TOKEN" "$BASE/api/attempts" 2>/dev/null)
echo "$ATTEMPTS" | head -200 >> "$OUT"

# Count student answers vs student attempts
echo "" >> "$OUT"
echo "--- DB check: StudentAttempt vs StudentAnswer counts ---" >> "$OUT"

# Get a question to test with
echo "" >> "$OUT"
echo "--- Sample question ---" >> "$OUT"
Q_DATA=$(curl -s -H "Authorization: Bearer $SA_TOKEN" "$BASE/api/questions?schoolId=$SCHOOL1" 2>/dev/null)
echo "$Q_DATA" | head -100 >> "$OUT"

# --- TEST A2: Submit a real attempt ---
echo "" >> "$OUT"
echo "===== TEST A2: Submit real attempt (PG type) =====" >> "$OUT"

# Submit attempt with 3 simple answers
SUBMIT_RESULT=$(curl -s -X POST "$BASE/api/attempts" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cmsqspjla0020rcxtsu3zmqos",
    "examSessionId": "cmsqspjl7001",
    "examPackageId": "cmsqspjn0001",
    "schoolId": "'$SCHOOL1'",
    "classId": "cmsqspjl8001wrcxt9tmc4y47",
    "answers": [
      {"questionId": "cmsqspjn0001", "answer": "A", "timeSpent": 10}
    ],
    "duration": 60
  }' 2>/dev/null)
echo "Submit response:" >> "$OUT"
echo "$SUBMIT_RESULT" >> "$OUT"

# Check if attempt was created
echo "" >> "$OUT"
echo "--- Verify attempt in DB via API ---" >> "$OUT"
VERIFY=$(curl -s -H "Authorization: Bearer $SA_TOKEN" "$BASE/api/attempts?userId=cmsqspjla0020rcxtsu3zmqos" 2>/dev/null)
echo "$VERIFY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total attempts for siswa1: {len(d)}'); a=d[0] if d else {}; print(f'Latest: score={a.get(\"score\")}, correct={a.get(\"totalCorrect\")}, wrong={a.get(\"totalWrong\")}, pct={a.get(\"percentage\")}, tka={a.get(\"tkaPrediction\")}, answers={len(a.get(\"answers\",[]))}')" 2>> "$OUT" >> "$OUT"

# --- TEST A3: TKA Prediction formula check ---
echo "" >> "$OUT"
echo "===== TEST A3: TKA Prediction formula =====" >> "$OUT"
echo "Expected formula: Math.round(percentage * 8 + 200)" >> "$OUT"
echo "If score=1/1=100%, TKA = round(100*8+200) = 1000" >> "$OUT"

# Submit a second attempt with different score
SUBMIT2=$(curl -s -X POST "$BASE/api/attempts" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cmsqspjla0020rcxtsu3zmqos",
    "examSessionId": "cmsqspjl7001",
    "examPackageId": "cmsqspjn0001",
    "schoolId": "'$SCHOOL1'",
    "classId": "cmsqspjl8001wrcxt9tmc4y47",
    "answers": [
      {"questionId": "cmsqspjn0001", "answer": "WRONG_ANSWER", "timeSpent": 5},
      {"questionId": "cmsqspjn0002", "answer": "", "timeSpent": 3}
    ],
    "duration": 30
  }' 2>/dev/null)
echo "Submit2 response:" >> "$OUT"
echo "$SUBMIT2" >> "$OUT"

# Parse TKA prediction
echo "$SUBMIT2" | python3 -c "
import sys, json
d = json.load(sys.stdin)
pct = d.get('percentage', 0)
tka = d.get('tkaPrediction', 0)
expected = round(pct * 8 + 200)
print(f'percentage={pct}, tkaPrediction={tka}, expected_linear={expected}, is_sigmoid={tka != expected}')
print(f'Formula: {\"LINEAR (pct*8+200)\" if tka == expected else \"UNKNOWN/SIGMOID\"}')" 2>> "$OUT" >> "$OUT"

# --- TEST A4: Ranking via /api/scores ---
echo "" >> "$OUT"
echo "===== TEST A4: Ranking (M5) =====" >> "$OUT"

SCORES=$(curl -s -H "Authorization: Bearer $SA_TOKEN" "$BASE/api/scores?studentId=cmsqspjla0020rcxtsu3zmqos" 2>/dev/null)
echo "Scores response:" >> "$OUT"
echo "$SCORES" >> "$OUT"

echo "" >> "$OUT"
echo "$SCORES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'avgScore={d.get(\"avgScore\")}, highScore={d.get(\"highScore\")}, classRank={d.get(\"classRank\")}, totalClassmates={d.get(\"totalClassmates\")}')
print(f'totalTryout={d.get(\"totalTryout\")}')
print(f'Ranking formula check: if avgScore>75 then rank=3, else ceil(avg/20). This is NOT real ranking from DB.')" 2>> "$OUT" >> "$OUT"

# --- TEST A5: PG Kompleks Scoring ---
echo "" >> "$OUT"
echo "===== TEST A5: PG Kompleks scoring =====" >> "$OUT"

# Check if any PG_KOMPLEKS questions exist
echo "Checking for pg_kompleks questions..." >> "$OUT"
ALL_Q=$(curl -s -H "Authorization: Bearer $SA_TOKEN" "$BASE/api/questions?schoolId=$SCHOOL1" 2>/dev/null)
echo "$ALL_Q" | python3 -c "
import sys, json
d = json.load(sys.stdin) if isinstance(json.loads(sys.stdin.read().replace(\\\"$ALL_Q\\\",'')), list) else []
" 2>> "$OUT" >> "$OUT"

# Let's just check question types
echo "$ALL_Q" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    types = [q.get('type','?') for q in data]
    print(f'Total questions: {len(data)}, Types: {set(types)}')
    for q in data[:3]:
        print(f'  Q: {q.get(\"id\",\"?\")} type={q.get(\"type\")} answer={q.get(\"answer\")}')
" 2>> "$OUT" >> "$OUT"

echo "" >> "$OUT"
echo "============================================" >> "$OUT"
echo "GRUP A COMPLETE" >> "$OUT"
echo "============================================" >> "$OUT"
