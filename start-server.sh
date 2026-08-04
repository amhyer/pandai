#!/bin/bash
# Keep-alive dev server for PANDAI
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=768'

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  npx next dev -p 3000 --webpack 2>&1 | tee -a /home/z/my-project/dev.log &
  SERVER_PID=$!
  
  # Wait for server to start (up to 30s)
  for i in $(seq 1 15); do
    sleep 2
    if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
      echo "[$(date)] Server ready on port 3000"
      break
    fi
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[$(date)] Server process died during startup"
      break
    fi
  done
  
  # Wait for server to die (check every 5s)
  while kill -0 $SERVER_PID 2>/dev/null; do
    if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
      sleep 5
    else
      echo "[$(date)] Port 3000 lost, server might be dead"
      break
    fi
  done
  
  # Clean up
  kill $SERVER_PID 2>/dev/null
  wait $SERVER_PID 2>/dev/null
  echo "[$(date)] Server died, restarting in 3s..."
  sleep 3
done
