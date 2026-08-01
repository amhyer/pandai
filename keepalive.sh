#!/bin/bash
cd /home/z/my-project
> dev.log
while true; do
  echo "$(date) Starting server..." >> keepalive.log
  NODE_OPTIONS="--max-old-space-size=2048" npx next dev -p 3000 --turbopack >> dev.log 2>&1
  EXIT_CODE=$?
  echo "$(date) Server exited with code $EXIT_CODE, restarting in 3s..." >> keepalive.log
  sleep 3
done
