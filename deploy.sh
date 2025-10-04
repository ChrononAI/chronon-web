#!/usr/bin/env bash
set -Eeuo pipefail

############################################
# CONFIG – override at runtime if you like #
############################################

# Validate deployment environment parameter
if [ $# -eq 0 ]; then
    echo "Usage: $0 <stage|prod>"
    echo "  stage: Deploy to staging environment (stageapi.auth.chronon.co.in)"
    echo "  prod:  Deploy to production environment (api.auth.chronon.co.in)"
    exit 1
fi

DEPLOY_ENV="$1"
if [ "$DEPLOY_ENV" != "stage" ] && [ "$DEPLOY_ENV" != "prod" ]; then
    echo "Error: Invalid environment. Use 'stage' or 'prod'"
    exit 1
fi

# Set API endpoint based on environment
if [ "$DEPLOY_ENV" = "stage" ]; then
    export VITE_API_BASE_URL="https://stageapi.auth.chronon.co.in"
    export VITE_API_BASE_URL_V2="https://stageapi.auth.chronon.co.in"
    log() { printf "\033[1;34m➜  %s\033[0m\n" "$*"; }
    err() { printf "\033[1;31m✖  %s\033[0m\n" "$*" >&2; exit 1; }
    log "Deploying to STAGING environment..."
else
    export VITE_API_BASE_URL="https://api.auth.chronon.co.in"
    export VITE_API_BASE_URL_V2="https://api.auth.chronon.co.in"
    log() { printf "\033[1;34m➜  %s\033[0m\n" "$*"; }
    err() { printf "\033[1;31m✖  %s\033[0m\n" "$*" >&2; exit 1; }
    log "Deploying to PRODUCTION environment..."
fi

EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST:-65.2.30.111}"
EC2_KEY="${EC2_KEY:-$HOME/.ssh/yagna.pem}"
EC2_SSH="$EC2_USER@$EC2_HOST"

REMOTE_BASE="/data/web"
REMOTE_RELEASES="$REMOTE_BASE/releases"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"   # local timestamp → passed to server
KEEP_RELEASES="${KEEP_RELEASES:-5}"  # how many old builds to keep
LOCAL_BUILD_DIR="${LOCAL_BUILD_DIR:-dist}"
HEALTHCHECK_URL="http://$EC2_HOST"

############################################
# Helper functions                         #
############################################
log() { printf "\033[1;34m➜  %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✖  %s\033[0m\n" "$*" >&2; exit 1; }

############################################
# 1. Build the frontend locally            #
############################################
log "Building frontend (npm run build) with $DEPLOY_ENV environment..."
npm run build || err "Build failed"

############################################
# 2. Create release dir on the server      #
############################################
REMOTE_RELEASE_DIR="$REMOTE_RELEASES/$TIMESTAMP"
log "Creating release dir: $REMOTE_RELEASE_DIR"
ssh -i "$EC2_KEY" "$EC2_SSH" "mkdir -p '$REMOTE_RELEASE_DIR'" \
  || err "Cannot create release directory on server"

############################################
# 3. Upload artifacts with rsync           #
############################################
log "Uploading $LOCAL_BUILD_DIR → $REMOTE_RELEASE_DIR (rsync)…"
rsync -az --delete -e "ssh -i $EC2_KEY" \
      "$LOCAL_BUILD_DIR"/ "$EC2_SSH:$REMOTE_RELEASE_DIR/" \
  || err "Upload failed"

############################################
# 4. Activate the new release remotely     #
############################################
log "Activating new release & reloading Nginx…"
ssh -i "$EC2_KEY" "$EC2_SSH" /bin/bash <<REMOTE
  set -Eeuo pipefail
  export TIMESTAMP="$TIMESTAMP" KEEP_RELEASES="$KEEP_RELEASES"
  BASE="$REMOTE_BASE"
  NEW="\$BASE/releases/\$TIMESTAMP"
  CUR="\$BASE/current"
  PRE="\$BASE/previous"

  # Swap symlinks atomically (rollback safety)
  if [ -L "\$CUR" ]; then mv -Tf "\$CUR" "\$PRE"; fi
  ln -sfn "\$NEW" "\$CUR"
  sudo chmod -R o+r "\$NEW"

  # Reload Nginx
  sudo nginx -t && sudo systemctl reload nginx

  # Prune old releases, keep only \$KEEP_RELEASES
  cd "\$BASE/releases"
  ls -1tr | head -n -"\$KEEP_RELEASES" | xargs -r sudo rm -rf --
REMOTE

############################################
# 5. Smoke‑test; auto‑rollback if needed   #
############################################
log "Health‑checking ${HEALTHCHECK_URL} …"
if curl -fsSL --max-time 5 "$HEALTHCHECK_URL" >/dev/null; then
  log "✅  Deployment succeeded — $TIMESTAMP is live"
else
  err "Health‑check failed — rolling back…" && \
  ssh -i "$EC2_KEY" "$EC2_SSH" "ln -sfn /data/web/previous /data/web/current && sudo systemctl reload nginx" \
  && err "Rollback complete; investigate the build."
fi
