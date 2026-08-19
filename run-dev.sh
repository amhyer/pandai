#!/bin/bash
cd /home/z/my-project
pkill -f 'next start' 2>/dev/null
pkill -f 'next dev' 2>/dev/null
sleep 2
NODE_OPTIONS='--max-old-space-size=640' npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo "PID=$!"
sleep 15
tail -20 /home/z/my-project/dev.log
echo '---PORT---'
ss -tlnp | grep 3000
echo '---PROC---'
ps aux | grep 'next' | grep -v grep
