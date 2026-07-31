#!/bin/bash
# PANDAI Development Server Keep-Alive
cd /home/z/my-project
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "[$(date)] Starting PANDAI dev server on port 3000..." >> /tmp/pandai-server.log
    npx next dev -p 3000 >> /tmp/pandai-server.log 2>&1 &
    echo "[$(date)] Server started (PID: $!)" >> /tmp/pandai-server.log
  fi
  sleep 2
done
