#!/bin/bash
# Production server auto-restart for PANDAI
PROJECT="/home/z/my-project"
LOG="/home/z/my-project/dev.log"

while true; do
  # Kill stale processes on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 2
  
  echo "=== [$(date +%H:%M:%S)] Starting PANDAI server ===" >> "$LOG"
  cd "$PROJECT"
  NODE_OPTIONS="--max-old-space-size=256" bun --bun next start -p 3000 >> "$LOG" 2>&1
  CODE=$?
  echo "=== [$(date +%H:%M:%S)] Exited (code=$CODE), retrying in 3s ===" >> "$LOG"
  sleep 3
done
