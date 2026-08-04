#!/bin/bash
# Custom dev script for PANDAI
# This script runs in foreground within the start.sh subshell,
# keeping the dev server alive for the lifetime of the container.

cd /home/z/my-project

# Install dependencies
echo "[DEV] Installing dependencies..."
bun install 2>&1

# Setup database
echo "[DEV] Setting up database..."
bun run db:push 2>&1

# Start dev server in foreground (blocks this script, keeps subshell alive)
echo "[DEV] Starting Next.js dev server..."
exec env NODE_OPTIONS='--max-old-space-size=512' npx next dev -p 3000 --webpack
