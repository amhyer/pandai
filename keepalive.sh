#!/bin/bash
cd /home/z/my-project
export JWT_SECRET=dev_jwt_secret_do_not_use_in_prod
while true; do
  if ! ss -tlnp 2>/dev/null | rg -q ':3000'; then
    echo "[$(date)] Starting server..." >> /home/z/my-project/dev.log
    NODE_OPTIONS='--max-old-space-size=256' node .next/standalone/server.js -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    SERVER_PID=$!
    wait $SERVER_PID
    echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
    sleep 2
  fi
  sleep 3
done
