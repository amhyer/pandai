#!/usr/bin/env bash
#
# purge-git-secrets.sh
# --------------------
# Safely remove sensitive credential files from Git history.
#
# It NEVER prints file contents; it only lists/works with file paths.
#
# 1) Inspect first (default, non-destructive):
#      ./scripts/purge-git-secrets.sh --inspect
#
# 2) Purge with BFG Repo-Cleaner (requires Java):
#      ./scripts/purge-git-secrets.sh --bfg --yes
#
# 3) Purge with git-filter-repo (no Java needed):
#      pip install git-filter-repo
#      ./scripts/purge-git-secrets.sh --filter-repo --yes
#
# Always force-push every affected branch after a rewrite.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

MODE="${1:-inspect}"
CONFIRM="${2:-}"
BFG_VERSION="1.14.0"
BFG_CACHE="${HOME}/.cache/bfg-${BFG_VERSION}.jar"
BFG_URL="https://repo1.maven.org/maven2/com/madgag/bfg/${BFG_VERSION}/bfg-${BFG_VERSION}.jar"

log() { printf '\n[purge-git-secrets] %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# Candidate sensitive paths. We keep `.env.example` because it is safe by design
# and must remain tracked.
SENSITIVE_GIT_PATHS=(
  ".env"
  ".env.local"
  ".env.development"
  ".env.production"
  ".env.staging"
  ".env.test"
  ".env.development.local"
  ".env.test.local"
  ".env.production.local"
  "*.env"
  "*.env.production"
  "*.env.local"
  ".credentials"
  "credentials.json"
  "serviceAccount.json"
  "*.pem"
  "id_rsa"
  "id_dsa"
  ".ssh/*"
  "db/custom.db"
  "db/*.db"
)

show_inspect() {
  log "Scanning Git history for sensitive file names (contents are NOT displayed)."
  echo
  echo "Matched paths in history:"
  local found=0
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    # Do not report .env.example.
    if [[ "${path}" == ".env.example" || "${path}" == "*.example" ]]; then
      continue
    fi
    for pat in "${SENSITIVE_GIT_PATHS[@]}"; do
      if [[ "${path}" == ${pat} ]]; then
        echo "  ${path}"
        found=1
        break
      fi
    done
  done < <(git log --all --pretty=format: --name-only --diff-filter=A 2>/dev/null | sort -u)
  if [[ ${found} -eq 0 ]]; then
    echo "  (none)"
  fi
  echo
  log "To purge: ./scripts/purge-git-secrets.sh --bfg --yes  (or --filter-repo --yes)"
}

require_yes() {
  if [[ "${CONFIRM}" != "--yes" ]]; then
    die "This operation rewrites Git history and requires --yes."
  fi
}

run_bfg() {
  require_yes
  command -v java >/dev/null 2>&1 || die "Java is required for BFG. Install Java or use --filter-repo."
  if [[ ! -f "${BFG_CACHE}" ]]; then
    mkdir -p "$(dirname "${BFG_CACHE}")"
    log "Downloading BFG ${BFG_VERSION}..."
    curl -fsSL "${BFG_URL}" -o "${BFG_CACHE}" || die "Failed to download BFG. Try git-filter-repo."
  fi

  log "Running BFG --delete-files on sensitive env/credential paths (contents not shown)..."
  java -jar "${BFG_CACHE}" \
    --delete-files .env \
    --delete-files .env.local \
    --delete-files .env.development \
    --delete-files .env.production \
    --delete-files .env.staging \
    --delete-files .env.test \
    --delete-files .env.development.local \
    --delete-files .env.test.local \
    --delete-files .env.production.local \
    --delete-files '.gitattributes' \
    --delete-files '*.db' \
    --delete-files 'id_rsa' \
    --delete-files 'id_dsa' \
    "${REPO_ROOT}"

  log "Expiring reflog and pruning unreachable objects..."
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
}

run_filter_repo() {
  require_yes
  command -v git-filter-repo >/dev/null 2>&1 || die "git-filter-repo not found. Install: pip install git-filter-repo"
  log "Running git-filter-repo with exact sensitive paths (contents not shown)..."
  git filter-repo --force --invert-paths \
    --path .env \
    --path .env.local \
    --path .env.development \
    --path .env.production \
    --path .env.staging \
    --path .env.test \
    --path .env.development.local \
    --path .env.test.local \
    --path .env.production.local \
    --path credentials.json \
    --path serviceAccount.json \
    --path id_rsa \
    --path id_dsa

  log "Expiring reflog and pruning unreachable objects..."
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
}

post_rewrite_instructions() {
  log "History rewrite complete."
  log "DO NOT reuse the old credentials."
  log "Rotate all credentials that may have been committed:"
  log "  - Neon: https://console.neon.tech -> Settings -> Members -> Rotate password"
  log "  - Vercel: https://vercel.com/dashboard -> Settings -> OIDC Token -> Regenerate"
  log "  - App: ./scripts/generate-credentials.sh (JWT_SECRET/PASSWORD_SALT)"
  log
  log "Force-push every affected branch (example):"
  log "  git push --force-with-lease origin main"
  log "  git push --force-with-lease origin arena/01a064ff-pandai"
}

case "${MODE}" in
  --inspect|inspect)
    show_inspect
    ;;
  --bfg)
    run_bfg
    post_rewrite_instructions
    ;;
  --filter-repo)
    run_filter_repo
    post_rewrite_instructions
    ;;
  *)
    cat <<'EOF'
Usage:
  ./scripts/purge-git-secrets.sh --inspect
  ./scripts/purge-git-secrets.sh --bfg --yes
  ./scripts/purge-git-secrets.sh --filter-repo --yes
EOF
    exit 2
    ;;
esac
