#!/usr/bin/env bash
set -e
if ! command -v docker >/dev/null 2>&1; then echo "Docker topilmadi"; exit 1; fi
if [ ! -f .env ]; then
  echo ".env topilmadi. Avval .env.example faylidan nusxa yarating va maxfiy qiymatlarni kiriting."
  exit 1
fi
docker compose up --build -d
echo "Tayyor: http://localhost:8081"
echo ".env faylidagi OWNER_LOGIN va OWNER_PASSWORD orqali kiring."
