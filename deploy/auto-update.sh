#!/usr/bin/env bash
# Pulls new commits from GitHub and rebuilds the app when main changed.
# Installed by deploy/install.sh as a cron job (every 5 minutes); safe to run by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/klinika-auto-update.lock
flock -n 9 || exit 0   # a previous run is still building

BRANCH="${UPDATE_BRANCH:-main}"
git fetch --quiet origin "$BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
[ "$LOCAL" = "$REMOTE" ] && exit 0

echo "$(date '+%F %T') yangilanish: ${LOCAL:0:7} -> ${REMOTE:0:7}"
git merge --ff-only --quiet "origin/$BRANCH"
# Build the new image first; the running app keeps serving until the switch (a few seconds).
docker compose build --quiet app
docker compose up -d
docker image prune -f >/dev/null 2>&1 || true
echo "$(date '+%F %T') tayyor: $(git log --oneline -1)"
