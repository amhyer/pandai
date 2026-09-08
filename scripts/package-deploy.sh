#!/usr/bin/env bash
#
# package-deploy.sh — Build lokal + kemas artifact deploy untuk server cPanel.
#
# Output: deploy/pandai-deploy-<timestamp>.tar.gz (+ berkas .sha256)
#
# Isi bundle:
#   .next/            (hasil build:plain, TANPA .next/cache)
#   public/           (TANPA *.exe kecuali --with-exe)
#   server.js         (startup file Passenger)
#   next.config.ts
#   package.json + package-lock.json  (untuk npm install --omit=dev di server)
#   prisma/           (schema untuk prisma generate + db push di server)
#   scripts/create-super-admin.ts
#   .env.production   (hanya jika --with-env)
#   .z-ai-config      (hanya jika file ada)
#
# Pemakaian:
#   bash scripts/package-deploy.sh                # build ulang + kemas
#   bash scripts/package-deploy.sh --no-build     # kemas build yang sudah ada
#   bash scripts/package-deploy.sh --with-exe     # sertakan public/*.exe (~120MB)
#   bash scripts/package-deploy.sh --with-env     # sertakan .env.production di arsip
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NO_BUILD=0
WITH_EXE=0
WITH_ENV=0
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    --with-exe) WITH_EXE=1 ;;
    --with-env) WITH_ENV=1 ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--no-build] [--with-exe] [--with-env]" >&2
      exit 2
      ;;
  esac
done

if [ "$NO_BUILD" -eq 0 ]; then
  # NEXT_PUBLIC_APP_URL di-inline ke bundle saat build — cek placeholder dulu.
  APP_URL="$(grep -E '^NEXT_PUBLIC_APP_URL=' .env.production 2>/dev/null | cut -d= -f2- || true)"
  if [ -z "$APP_URL" ] || printf '%s' "$APP_URL" | grep -q 'domain-anda\.com'; then
    echo "⚠️  NEXT_PUBLIC_APP_URL masih placeholder ('$APP_URL')." >&2
    echo "    Nilai ini DI-INLINE saat build — isi domain asli di .env.production" >&2
    echo "    bila ini build final untuk production." >&2
    sleep 2
  fi
  echo "==> Build production (build:plain)..."
  NODE_OPTIONS=--max-old-space-size=4096 npm run build:plain
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: .next/BUILD_ID tidak ditemukan — jalankan build dulu." >&2
  exit 1
fi
echo "==> BUILD_ID: $(cat .next/BUILD_ID)"

# Lockfile membuat `npm install --omit=dev` di server reproducible.
if [ ! -f package-lock.json ]; then
  echo "==> Membuat package-lock.json (--package-lock-only)..."
  npm install --package-lock-only
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$REPO_ROOT/deploy"
BUNDLE="$OUT/bundle"
TARBALL="$OUT/pandai-deploy-$STAMP.tar.gz"
rm -rf "$BUNDLE"
mkdir -p "$BUNDLE" "$OUT"

echo "==> Menyalin artifact ke bundle..."
cp -r .next "$BUNDLE/.next"
rm -rf "$BUNDLE/.next/cache"   # cache build tidak dibutuhkan di server
cp -r public "$BUNDLE/public"
cp server.js next.config.ts package.json "$BUNDLE/"
cp package-lock.json "$BUNDLE/"
cp -r prisma "$BUNDLE/prisma"
find "$BUNDLE/prisma" -name '*.bak' -delete   # backup lokal — tidak untuk server
mkdir -p "$BUNDLE/scripts"
cp scripts/create-super-admin.ts "$BUNDLE/scripts/"

if [ "$WITH_EXE" -eq 0 ]; then
  find "$BUNDLE/public" -name '*.exe' -delete
fi

if [ "$WITH_ENV" -eq 1 ] && [ -f .env.production ]; then
  cp .env.production "$BUNDLE/.env.production"
fi

if [ -f .z-ai-config ]; then
  cp .z-ai-config "$BUNDLE/.z-ai-config"
fi

echo "==> Membuat arsip..."
tar -czf "$TARBALL" -C "$BUNDLE" .
rm -rf "$BUNDLE"
sha256sum "$TARBALL" > "$TARBALL.sha256"

echo
echo "✅ Paket siap:"
du -h "$TARBALL"
cat "$TARBALL.sha256"
echo
echo "Langkah berikutnya:"
echo "  1. Upload arsip ke server (scp / cPanel File Manager)."
echo "  2. Di server: mkdir -p ~/pandai && tar -xzf <arsip> -C ~/pandai"
echo "  3. Ikuti CPANEL_DEPLOYMENT_RUNBOOK.md mulai Langkah 4 (npm install --omit=dev)."
