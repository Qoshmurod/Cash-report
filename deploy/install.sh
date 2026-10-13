#!/usr/bin/env bash
# Shifoxona — Ubuntu serverga bir buyruqda o'rnatish.
#   sudo ./deploy/install.sh clinic.example.uz you@example.uz
# 1) Docker va nginx o'rnatiladi  2) .env.production kuchli parollar bilan yaratiladi
# 3) konteynerlar build qilinib ishga tushadi  4) nginx + Let's Encrypt HTTPS sozlanadi
set -euo pipefail

DOMAIN="${1:?Foydalanish: sudo ./deploy/install.sh <domen> [email]}"
EMAIL="${2:-}"
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
ENV_FILE="$ROOT/.env.production"

if [ "$(id -u)" -ne 0 ]; then echo "sudo bilan ishga tushiring"; exit 1; fi

echo "==> 1/5 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

echo "==> 2/5 .env.production"
if [ ! -f "$ENV_FILE" ]; then
  rnd() { openssl rand -hex "$1"; }
  ADMIN_PASS="A$(rnd 6)1"
  SUPER_PASS="S$(rnd 8)1"
  KIOSK_PASS="K$(rnd 6)1"
  sed \
    -e "s|^NODE_ENV=.*|NODE_ENV=production|" \
    -e "s|^APP_URL=.*|APP_URL=https://$DOMAIN|" \
    -e "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN|" \
    -e "s|^RUN_SEED=.*|RUN_SEED=true|" \
    -e "s|^DATABASE_PASSWORD=.*|DATABASE_PASSWORD=$(rnd 24)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(rnd 48)|" \
    -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(rnd 48)|" \
    -e "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(rnd 24)|" \
    -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$ADMIN_PASS|" \
    -e "s|^SEED_SUPER_ADMIN_PASSWORD=.*|SEED_SUPER_ADMIN_PASSWORD=$SUPER_PASS|" \
    -e "s|^SEED_KIOSK_PASSWORD=.*|SEED_KIOSK_PASSWORD=$KIOSK_PASS|" \
    -e "s|^SEED_DEMO_DATA=.*|SEED_DEMO_DATA=false|" \
    -e "s|^SEED_DEMO_STAFF=.*|SEED_DEMO_STAFF=false|" \
    -e "s|^NUXT_PUBLIC_API_BASE=.*|NUXT_PUBLIC_API_BASE=https://$DOMAIN/api/v1|" \
    -e "s|^NUXT_PUBLIC_WS_URL=.*|NUXT_PUBLIC_WS_URL=https://$DOMAIN|" \
    .env.example > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  cat > "$ROOT/deploy/CREDENTIALS.txt" <<CRED
Shifoxona — boshlang'ich kirish ma'lumotlari ($DOMAIN)
Birinchi kirishda parolni almashtirish majburiy. Bu faylni o'qib bo'lgach o'chiring!

Super admin : superadmin / $SUPER_PASS
Admin       : admin01    / $ADMIN_PASS
Kiosk       : panel01    / $KIOSK_PASS
CRED
  chmod 600 "$ROOT/deploy/CREDENTIALS.txt"
  echo "    yaratildi: .env.production, deploy/CREDENTIALS.txt"
else
  echo "    mavjud .env.production ishlatiladi"
fi

echo "==> 3/5 Build va ishga tushirish (bir necha daqiqa)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

echo "==> 4/5 Nginx"
apt-get update -y >/dev/null
apt-get install -y nginx >/dev/null
sed "s/__DOMAIN__/$DOMAIN/g" deploy/nginx.conf > /etc/nginx/sites-available/shifoxona.conf
ln -sf /etc/nginx/sites-available/shifoxona.conf /etc/nginx/sites-enabled/shifoxona.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> 5/5 HTTPS (Let's Encrypt)"
if [ -n "$EMAIL" ]; then
  apt-get install -y certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect || echo "    certbot muvaffaqiyatsiz — DNS $DOMAIN -> server IP ekanini tekshirib, qayta ishga tushiring"
else
  echo "    email berilmadi — HTTPS keyinroq: sudo certbot --nginx -d $DOMAIN"
fi

echo
echo "Tayyor: https://$DOMAIN"
[ -f "$ROOT/deploy/CREDENTIALS.txt" ] && cat "$ROOT/deploy/CREDENTIALS.txt"
