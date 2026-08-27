#!/bin/bash
# Auto-restart wrapper for Next.js dev server
# Designed to survive sandbox process cleanup
LOG="/home/z/my-project/dev.log"
PROJECT="/home/z/my-project"

while true; do
  # Kill stale processes on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 1
  
  echo "=== [$(date +%H:%M:%S)] Starting PANDAI server ===" >> "$LOG"
  cd "$PROJECT"
  bun --bun next dev -p 3000 >> "$LOG" 2>&1
  CODE=$?
  echo "=== [$(date +%H:%M:%S)] Server exited (code=$CODE), restarting in 2s ===" >> "$LOG"
  sleep 2
done
