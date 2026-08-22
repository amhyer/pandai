#!/usr/bin/env bash
# ============================================================================
# PANDAI — One-Command VPS Deployment & Smoke Test
# For a fresh Ubuntu 22.04/24.04 VPS with 2GB+ RAM.
#
# Usage:
#   cd /path/to/pandai && POSTGRES_PASSWORD=MySecurePass123 ./deploy.sh
#   cd /path/to/pandai && DOMAIN=pandai.yourschool.id ./deploy.sh
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

# ── 1. Prerequisites ──
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
  log "Docker installed."
fi

if ! docker compose version &>/dev/null; then
  err "docker compose v2 not found. Install Docker Compose plugin."
fi

if ! command -v jq &>/dev/null; then
  log "Installing jq..."
  apt-get install -y -qq jq 2>/dev/null || yum install -y -q jq 2>/dev/null || true
fi

# ── 2. Configuration ──
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=')}"
export JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
DOMAIN="${DOMAIN:-}"

log "PostgreSQL password: ${#POSTGRES_PASSWORD} chars (auto-generated)"
log "JWT secret: ${#JWT_SECRET} chars (auto-generated)"

# ── 3. Write .env for docker-compose variable substitution ──
cat > .env << EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF

# ── 4. Write .env.production for app container ──
log "Writing .env.production..."
cat > .env.production << EOF
DATABASE_URL=postgresql://pandai:${POSTGRES_PASSWORD}@db:5432/pandai?schema=public
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=3000
EOF

# ── 5. Build & Start ──
log "Building Docker images and starting services (3-5 min)..."
docker compose up -d --build 2>&1 | tail -20

# ── 6. Wait for app healthy ──
log "Waiting for app to become healthy (max 120s)..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/api/health 2>/dev/null | grep -q '"db":"connected"'; then
    log "App is healthy!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo ""
    err "App did not become healthy. Last logs:"
    docker compose logs --tail=30 app
  fi
  sleep 2
done

# ── 7. Seed database ──
log "Seeding database with smoke test data..."
mkdir -p .smoke-data
docker compose --profile seed run --rm seed 2>&1
log "Seed complete."

# ── 8. Smoke Test ──
log "Running smoke tests..."
echo ""
if BASE_URL=http://localhost:3000 bash smoke-test.sh; then
  echo ""
  log "===================================================================="
  log "  ALL SMOKE TESTS PASSED — Safe to proceed to production"
  log "===================================================================="
  echo ""
  log "Credentials (SAVE THESE NOW — they won't be shown again):"
  log "  PostgreSQL Password : $POSTGRES_PASSWORD"
  log "  JWT Secret          : $JWT_SECRET"
  echo ""
  if [ -n "$DOMAIN" ]; then
    log "For SSL with Caddy, add to your Caddyfile:"
    log "  $DOMAIN {"
    log "    reverse_proxy localhost:3000"
    log "  }"
    log "Then run: caddy reload"
  fi
  echo ""
  log "Useful commands:"
  log "  View logs : docker compose logs -f app"
  log "  Stop      : docker compose down"
  log "  Restart   : docker compose restart app"
else
  echo ""
  err "SMOKE TESTS FAILED. Fix the issues above before deploying to production."
fi
