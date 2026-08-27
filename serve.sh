#!/bin/bash
cd /home/z/my-project
rm -rf .next

while true; do
  lsof -i :3000 2>/dev/null | awk 'NR>1{print $2}' | xargs kill -9 2>/dev/null
  sleep 1
  
  echo "[$(date)] Starting Next.js on port 3000..."
  NODE_OPTIONS='--max-old-space-size=1536' node node_modules/.bin/next dev -p 3000 &
  NPID=$!
  
  # Wait for ready
  for i in $(seq 1 30); do
    sleep 2
    if ! kill -0 $NPID 2>/dev/null; then
      break
    fi
    if grep -q "Ready" /tmp/pandai-boot.log 2>/dev/null; then
      break
    fi
  done 2>/dev/null
  
  # Wait for this child to finish
  wait $NPID 2>/dev/null
  echo "[$(date)] Server exited, restarting in 5s..."
  sleep 5
done
