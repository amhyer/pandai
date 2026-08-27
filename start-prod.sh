#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
export NEXT_TELEMETRY_DISABLED=1

while true; do
  echo "=== Starting Next.js PROD server at $(date) ===" >> /home/z/my-project/dev.log
  (npx next start -p 3000 >> /home/z/my-project/dev.log 2>&1)
  EXIT_CODE=$?
  echo "=== Prod server exited with code $EXIT_CODE at $(date), restarting in 3s ===" >> /home/z/my-project/dev.log
  sleep 3
done
