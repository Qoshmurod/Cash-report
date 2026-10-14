#!/usr/bin/env bash
# Klinika Kassasi update agent. Runs from cron every minute (installed by deploy/install.sh).
#   - every 5 minutes: checks GitHub for new commits and publishes the result to the app
#   - applies an update only when a permitted user pressed "Update now" in the app,
#     or at the nightly time (UPDATE_TIME in .env, default 22:00) if one is available
# Manual use:  sudo bash deploy/auto-update.sh check | apply | auto
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-auto}"
STATE="deploy/state"
mkdir -p "$STATE"
chown 1000:1000 "$STATE" 2>/dev/null || true   # the app container runs as uid 1000
exec 9>/tmp/klinika-auto-update.lock
flock -n 9 || exit 0

BRANCH="${UPDATE_BRANCH:-main}"
UPDATE_TIME="$( (grep -E '^UPDATE_TIME=' .env 2>/dev/null || true) | tail -1 | cut -d= -f2 | tr -d '"' )"
UPDATE_TIME="${UPDATE_TIME:-22:00}"

check() {
  git fetch --quiet origin "$BRANCH"
  local local_rev remote_rev count
  local_rev="$(git rev-parse HEAD)"
  remote_rev="$(git rev-parse "origin/$BRANCH")"
  count="$(git rev-list --count "HEAD..origin/$BRANCH")"
  {
    echo "current=$(git rev-parse --short HEAD)"
    echo "remote=$(git rev-parse --short "origin/$BRANCH")"
    echo "available=$([ "$local_rev" != "$remote_rev" ] && [ "$count" -gt 0 ] && echo 1 || echo 0)"
    echo "count=$count"
    echo "checkedAt=$(date -Iseconds)"
    echo "updateTime=$UPDATE_TIME"
  } > "$STATE/status.tmp"
  git log --format='%h %s' "HEAD..origin/$BRANCH" | head -30 > "$STATE/commits.txt"
  mv "$STATE/status.tmp" "$STATE/status.env"
  chown 1000:1000 "$STATE"/* 2>/dev/null || true
}

apply() {
  check
  if grep -q '^available=1' "$STATE/status.env"; then
    local from; from="$(git rev-parse --short HEAD)"
    echo "$(date '+%F %T') yangilanish: $from -> $(git rev-parse --short "origin/$BRANCH") (${1:-qo‘lda})"
    if git merge --ff-only --quiet "origin/$BRANCH" && docker compose build --quiet app && docker compose up -d; then
      echo "lastUpdate=$(date -Iseconds) $from->$(git rev-parse --short HEAD) ok" > "$STATE/last.env"
      docker image prune -f >/dev/null 2>&1 || true
      echo "$(date '+%F %T') tayyor: $(git log --oneline -1)"
    else
      echo "lastUpdate=$(date -Iseconds) $from xato" > "$STATE/last.env"
      echo "$(date '+%F %T') XATO: yangilanish bajarilmadi"
    fi
  fi
  rm -f "$STATE/request"
  check
}

case "$MODE" in
  check) check ;;
  apply) apply "qo‘lda" ;;
  auto)
    if [ -f "$STATE/request" ]; then
      apply "so‘rov: $(head -c 120 "$STATE/request")"
    elif [ "$(date +%H:%M)" = "$UPDATE_TIME" ]; then
      check
      grep -q '^available=1' "$STATE/status.env" && apply "kechki yangilanish $UPDATE_TIME"
    elif [ $(( 10#$(date +%M) % 5 )) -eq 0 ] || [ ! -f "$STATE/status.env" ]; then
      check
    fi ;;
  *) echo "usage: $0 [check|apply|auto]"; exit 1 ;;
esac
