# Deployment

## 1. Development (Docker)

```bash
cp .env.example .env
docker compose up -d --build
```

| Servis | URL (default) |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

Port band bo‘lsa `.env`da o‘zgartiring (`FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`). Frontend yoki backend porti o‘zgarsa, `CORS_ORIGINS`, `NUXT_PUBLIC_API_BASE` va `NUXT_PUBLIC_WS_URL`ni ham moslang.

Backend konteyneri ishga tushganda:
1. `RUN_MIGRATIONS=true` → `migration:run`
2. `RUN_SEED=true` → idempotent seed (akkauntlar, bo‘limlar, xizmatlar, sozlamalar; `SEED_DEMO_DATA=true` bo‘lsa 60 kunlik demo statistika)

## 2. Production

### 2.1 Tayyorgarlik

```bash
cp .env.example .env.production
```

Majburiy o‘zgartirishlar:

| O‘zgaruvchi | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_PASSWORD` | kuchli parol |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | `openssl rand -hex 48` (har biri alohida) |
| `REDIS_PASSWORD` | kuchli parol |
| `CORS_ORIGINS` | `https://clinic.example.uz` |
| `APP_URL` | `https://api.clinic.example.uz` |
| `NUXT_PUBLIC_API_BASE` | `https://api.clinic.example.uz/api/v1` |
| `NUXT_PUBLIC_WS_URL` | `https://api.clinic.example.uz` |
| `SEED_DEMO_DATA` | `false` |
| `SEED_ADMIN_PASSWORD`, `SEED_KIOSK_PASSWORD` | vaqtinchalik parol (birinchi kirishda almashtirish majburiy) |

### 2.2 Ishga tushirish

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Prod override: Postgres/Redis host'ga ochilmaydi, demo data o‘chirilgan, log rotation va memory limitlar.

### 2.3 Reverse proxy (Nginx) + HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name clinic.example.uz;
    ssl_certificate     /etc/letsencrypt/live/clinic.example.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinic.example.uz/privkey.pem;
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}

server {
    listen 443 ssl http2;
    server_name api.clinic.example.uz;
    ssl_certificate     /etc/letsencrypt/live/api.clinic.example.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.clinic.example.uz/privkey.pem;
    client_max_body_size 6m;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Backend `trust proxy` yoqilgan — login tarixidagi IP `X-Forwarded-For`dan olinadi.

### 2.4 Masshtablash

- Backend stateless (JWT), bir nechta replika ishga tushirish mumkin: `docker compose up -d --scale backend=3` (load balancer orqasida). Socket.IO Redis adapter orqali eventlar barcha replikalarga tarqaladi; load balancer'da sticky session (yoki faqat `websocket` transport) yoqing.
- Navbat raqami generatsiyasi DB darajasida atomik — replikalar soniga bog‘liq emas.

### 2.5 Backup

```bash
# kunlik backup
docker compose exec -T postgres pg_dump -U shifoxona -Fc shifoxona > backup_$(date +%F).dump
# tiklash
docker compose exec -T postgres pg_restore -U shifoxona -d shifoxona --clean < backup_2026-10-01.dump
```

### 2.6 Migratsiyalar

Prod'da `synchronize` doim o‘chiq. Sxema o‘zgarishi:

```bash
cd backend
npm run migration:generate -- src/database/migrations/AddSomething
npm run build && npm run migration:run
```

Konteyner restart bo‘lganda yangi migratsiyalar avtomatik qo‘llanadi (`RUN_MIGRATIONS=true`).

### 2.7 Tekshiruv ro‘yxati

- [ ] Barcha secret'lar almashtirilgan, `.env.production` git'da emas
- [ ] HTTPS yoqilgan, `CORS_ORIGINS` faqat prod domen
- [ ] admin01 / panel01 parollari birinchi kirishda almashtirilgan
- [ ] Postgres backup cron sozlangan
- [ ] `GET /api/v1/health` monitoring'ga ulangan
