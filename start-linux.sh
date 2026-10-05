#!/usr/bin/env bash
set -e
if ! command -v docker >/dev/null 2>&1; then echo "Docker topilmadi"; exit 1; fi
docker compose up --build -d
echo "Tayyor: http://localhost"
echo "Login: admin"
