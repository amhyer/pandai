#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 >> dev.log 2>&1
  exit_code=$?
  sleep 2
done
