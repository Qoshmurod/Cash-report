#!/usr/bin/env bash
# Kunlik baza nusxasi: crontab -e →  0 2 * * * /opt/shifoxona/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
set -a; . ./.env.production; set +a
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U "${DATABASE_USER:-shifoxona}" -Fc "${DATABASE_NAME:-shifoxona}" > "backups/shifoxona_$(date +%F_%H%M).dump"
find backups -name '*.dump' -mtime +14 -delete
