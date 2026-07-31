#!/bin/bash
cd /home/z/my-project
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "$(date) - Starting Next.js..." >> /tmp/keepalive.log
    npx next dev -p 3000 >> /tmp/keepalive.log 2>&1 &
    echo "$(date) - PID: $!" >> /tmp/keepalive.log
  fi
  sleep 3
done
