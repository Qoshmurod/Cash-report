#!/usr/bin/env bash
# Klinika Kassasi — Ubuntu VPS installer (Docker + PostgreSQL + nginx, optional HTTPS).
# Usage (inside the cloned repo):
#   sudo bash deploy/install.sh                          # http://SERVER_IP
#   sudo bash deploy/install.sh kassa.example.uz you@mail.uz   # https://kassa.example.uz
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:-}"
EMAIL="${2:-}"

[ "$(id -u)" -eq 0 ] || { echo "Iltimos, sudo bilan ishga tushiring: sudo bash deploy/install.sh"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "==> 1/6 Docker"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y docker.io docker-compose-v2 || { apt-get install -y curl && curl -fsSL https://get.docker.com | sh; }
fi
systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true

echo "==> 2/6 Swap (build uchun xotira zaxirasi)"
if [ "$(swapon --show | wc -l)" -eq 0 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3/6 .env"
if [ ! -f .env ]; then
  cp .env.example .env
  rand() { openssl rand -hex "$1"; }
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\"$(rand 16)\"|" .env
  sed -i "s|^NUXT_SESSION_SECRET=.*|NUXT_SESSION_SECRET=\"$(rand 32)\"|" .env
  sed -i "s|^BOOTSTRAP_ADMIN_TOKEN=.*|BOOTSTRAP_ADMIN_TOKEN=\"$(rand 24)\"|" .env
  sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=\"false\"|" .env
fi
set -a; . ./.env; set +a

echo "==> 4/6 Dasturni yig'ish va ishga tushirish (birinchi marta 3-8 daqiqa)"
docker compose up -d --build
for i in $(seq 1 60); do
  curl -fs -o /dev/null http://127.0.0.1:3000/ && break
  sleep 3
done
curl -fs -o /dev/null http://127.0.0.1:3000/ || { echo "Dastur ishga tushmadi. Log: docker compose logs app"; exit 1; }

echo "==> 5/6 Birinchi super admin"
ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)"
CODE=$(curl -s -o /tmp/bootstrap.json -w '%{http_code}' -X POST http://127.0.0.1:3000/api/auth/bootstrap \
  -H "x-bootstrap-token: ${BOOTSTRAP_ADMIN_TOKEN}" -H 'content-type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASS}\"}")
if [ "$CODE" = "200" ]; then
  echo "admin / ${ADMIN_PASS}" > /root/klinika-admin.txt && chmod 600 /root/klinika-admin.txt
else
  ADMIN_PASS=""   # users already exist
fi

echo "==> 6/6 nginx${DOMAIN:+ va HTTPS}"
if [ "${SKIP_NGINX:-0}" != "1" ]; then
  apt-get install -y nginx
  sed "s/server_name kassa.example.uz;/server_name ${DOMAIN:-_};/" deploy/nginx.conf > /etc/nginx/sites-available/kassa
  ln -sf /etc/nginx/sites-available/kassa /etc/nginx/sites-enabled/kassa
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 'Nginx Full' >/dev/null; fi
  if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect
    sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE="true"|' .env
    docker compose up -d
  fi
fi

IP="$(hostname -I | awk '{print $1}')"
echo
echo "================ TAYYOR ================"
if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then echo "Manzil:  https://${DOMAIN}"; else echo "Manzil:  http://${IP}"; fi
if [ -n "$ADMIN_PASS" ]; then
  echo "Login:   admin"
  echo "Parol:   ${ADMIN_PASS}   (/root/klinika-admin.txt da saqlandi — kirgach almashtiring)"
fi
echo "Loglar:  docker compose logs -f app"
echo "Yangilash: git pull && sudo docker compose up -d --build"
