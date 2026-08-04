#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  # Start server
  npx next dev -p 3000 --webpack > /home/z/my-project/dev.log 2>&1 &
  SERVER_PID=$!
  
  # Wait for port
  for i in $(seq 1 15); do
    sleep 2
    if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
      break
    fi
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      break
    fi
  done
  
  # Keep alive: ping server every 5s
  while kill -0 $SERVER_PID 2>/dev/null && ss -tlnp 2>/dev/null | grep -q ":3000 "; do
    curl -s --max-time 5 -o /dev/null http://localhost:3000/ 2>/dev/null
    sleep 5
  done
  
  kill $SERVER_PID 2>/dev/null
  wait $SERVER_PID 2>/dev/null
  sleep 2
done
