#!/usr/bin/env bash
# Klinika Kassasi demo (Linux / macOS / WSL Ubuntu): bash run-demo.sh
set -e
cd "$(dirname "$0")"
docker info >/dev/null 2>&1 || { echo "Docker ishlamayapti. Docker Desktop'ni oching (WSL: Settings > Resources > WSL integration)."; exit 1; }
[ -f .env ] || cp .env.demo .env
mkdir -p deploy/state
echo "Dastur yig'ilmoqda va ishga tushmoqda (birinchi marta 3-8 daqiqa)..."
docker compose up -d --build
for i in $(seq 1 60); do
  curl -fs -o /dev/null http://localhost:3000/ && break
  sleep 3
done
curl -fs -o /dev/null http://localhost:3000/ || { echo "Dastur javob bermadi. Log: docker compose logs app"; exit 1; }
echo
echo "TAYYOR: http://localhost:3000"
echo "Login: admin01   Parol: admin01"
echo "To'xtatish: docker compose down"
