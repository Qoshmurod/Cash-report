#!/bin/sh
set -e

is_true() {
  case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes) return 0 ;;
    *) return 1 ;;
  esac
}

if is_true "${RUN_MIGRATIONS:-true}"; then
  echo "[entrypoint] Running database migrations..."
  node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
fi

if is_true "${RUN_SEED:-false}"; then
  echo "[entrypoint] Running idempotent seed..."
  node dist/database/seeds/run-seed.js
fi

echo "[entrypoint] Starting API..."
exec "$@"
