# Shifoxona — Tibbiyot markazi boshqaruv tizimi

Shifoxona va tibbiyot markazlari uchun to‘liq boshqaruv tizimi. U kiosk orqali murojaat, registratura, to‘lov, real-time navbat, shifokor kabineti, TV navbat ekrani, hisobotlar va auditni o‘z ichiga oladi.

```
Kiosk → Registrator → To‘lov (Naqd/Karta/Shartnoma) → Navbat (A19) → Chek
      → Shifokor "Chaqirish" → TV: "A19 · 204-xona" 🔊 → Visit → COMPLETED → Dashboard
```

---

## 1. Loyiha haqida

| Rol | Imkoniyatlar |
|---|---|
| **ADMIN** | Xodimlar, shifokorlar, bemorlar, bo‘limlar, xizmatlar, narxlar, to‘lovlar, navbatlar, hisobotlar, audit, kirish tarixi, sozlamalar |
| **REGISTRAR** | Kiosk murojaatlari, bemor qidirish/yaratish, xizmat va shifokor tanlash, to‘lov, navbat, chek |
| **DOCTOR** | O‘z kabineti, xonasi, xizmatlari, navbat, chaqirish, ko‘rik (start/complete), skip |
| **KIOSK** | Touchscreen: bo‘lim → xizmatlar → jami summa → ma'lumotlar → yuborish |
| **TV ekran** (`/display`, public) | Chaqirilgan navbat + xona, keyingi navbatlar, ovozli e'lon |

## 2. Arxitektura

- **Frontend**: Nuxt 4 · Vue 3 · TypeScript · Nuxt UI v4 · Tailwind CSS v4 · Pinia · VueUse · @nuxtjs/i18n (uz/ru) · ECharts · socket.io-client
- **Backend**: NestJS 11 · TypeORM · PostgreSQL 16 · JWT (access + refresh rotation) · RBAC · class-validator · Swagger · Socket.IO (+ Redis adapter) · exceljs · pdfkit
- **Infra**: Docker Compose (frontend, backend, postgres, redis)

Batafsil: [docs/architecture.md](docs/architecture.md) · [docs/database.md](docs/database.md) · [docs/api.md](docs/api.md) · [docs/queue-system.md](docs/queue-system.md) · [docs/roles-permissions.md](docs/roles-permissions.md) · [docs/deployment.md](docs/deployment.md)

```
shifoxona/
├── backend/                 # NestJS API (domain modullar: src/modules/*)
├── frontend/                # Nuxt 4 SPA (app/pages, app/components, app/composables …)
├── docker/postgres/         # init.sql (extensionlar)
├── docs/                    # hujjatlar
├── docker-compose.yml       # dev
├── docker-compose.prod.yml  # prod override
├── .env.example
└── README.md
```

## 3. Talablar

- Docker 24+ va Docker Compose v2 — **yoki** lokal ishlab chiqish uchun:
- Node.js 22+ (npm 10+), PostgreSQL 16, Redis 7

## 4. O‘rnatish

```bash
git clone <repo> shifoxona && cd shifoxona
cp .env.example .env        # kerak bo‘lsa portlar va secret'larni o‘zgartiring
```

## 5. Environment o‘zgaruvchilari

Hammasi `.env.example`da izohlari bilan berilgan. Asosiylari:

| O‘zgaruvchi | Default | Izoh |
|---|---|---|
| `FRONTEND_PORT` / `BACKEND_PORT` | 3000 / 4000 | host portlari |
| `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` | 5433 / 6380 | host portlari (konteyner ichida 5432/6379) |
| `DATABASE_HOST, _PORT, _NAME, _USER, _PASSWORD` | postgres, 5432, shifoxona … | PostgreSQL |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | — | **prod'da albatta almashtiring** |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | 15m / 7d | token muddati |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | redis, 6379 | Socket.IO adapter |
| `CORS_ORIGINS` | http://localhost:3000 | vergul bilan ajratilgan |
| `BODY_LIMIT` | 5mb | so‘rov hajmi limiti |
| `TIMEZONE` | Asia/Tashkent | "bugun" va hisobotlar shu zonada |
| `RUN_MIGRATIONS` / `RUN_SEED` / `SEED_DEMO_DATA` | true | konteyner startida |
| `NUXT_PUBLIC_API_BASE` / `NUXT_PUBLIC_WS_URL` | http://localhost:4000/api/v1 / http://localhost:4000 | brauzer backend'ga shu manzil orqali ulanadi |

Secret'lar kodda hardcode qilinmagan — backend startda env'ni validatsiya qiladi va yetishmasa ishga tushmaydi.

## 6. Docker orqali ishga tushirish

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

| | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |
| TV navbat ekrani | http://localhost:3000/display |
| Kiosk | http://localhost:3000/kiosk (panel01) |

Port band bo‘lsa `.env`da boshqa port bering (masalan `FRONTEND_PORT=3100`) va `CORS_ORIGINS`, `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_WS_URL`ni moslang.

To‘xtatish: `docker compose down` · ma'lumotlar bilan o‘chirish: `docker compose down -v`.

## 7. Lokal ishlab chiqish (Docker'siz app)

```bash
# faqat DB va Redis konteynerda
docker compose up -d postgres redis

# backend
cd backend
npm install
DATABASE_HOST=localhost DATABASE_PORT=5433 REDIS_HOST=localhost REDIS_PORT=6380 npm run migration:run
DATABASE_HOST=localhost DATABASE_PORT=5433 REDIS_HOST=localhost REDIS_PORT=6380 npm run seed
DATABASE_HOST=localhost DATABASE_PORT=5433 REDIS_HOST=localhost REDIS_PORT=6380 npm run start:dev

# frontend (boshqa terminalda)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Backend `.env`ni loyiha ildizidan (`../.env`) va `backend/.env`dan o‘qiydi; lokal uchun `backend/.env` yaratib `DATABASE_HOST=localhost` va boshqa portlarni yozib qo‘yish qulay.

## 8. Database migratsiya

`synchronize` hech qachon yoqilmaydi — sxema faqat migratsiyalar orqali o‘zgaradi.

```bash
cd backend
npm run migration:run                                         # qo‘llash
npm run migration:revert                                      # oxirgisini qaytarish
npm run migration:generate -- src/database/migrations/Name    # entity o‘zgarishidan yangi migratsiya
```

Docker'da backend konteyneri startda migratsiyalarni avtomatik qo‘llaydi.

## 9. Seed

```bash
cd backend && npm run seed
```

Seed idempotent (qayta ishga tushirish xavfsiz). U quyidagilarni yaratadi:
- admin, kiosk, registrator va 5 ta shifokor akkaunti
- 5 ta bo‘lim (Kardiologiya **A**, Laboratoriya **L**, UZI **U**, Terapiya **T**, Nevrologiya **N**) va har biriga bir nechta xizmat (narx, kod, davomiylik)
- xizmat ↔ shifokor biriktirishlari, tizim sozlamalari
- `SEED_DEMO_DATA=true` bo‘lsa, dashboard grafiklari to‘lishi uchun 60 kunlik demo bemor/to‘lov/navbat tarixi

## 10. API

REST, prefiks `/api/v1`. Barcha javoblar bir xil formatda:

```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 125, "totalPages": 7 } }
{ "success": false, "error": { "statusCode": 409, "code": "CONFLICT", "message": "...", "path": "...", "timestamp": "..." } }
```

Asosiy resurslar: `/auth`, `/profile`, `/users`, `/doctors`, `/departments`, `/services`, `/patients`, `/kiosk`, `/kiosk-requests`, `/registrations`, `/payments`, `/queues`, `/reports`, `/audit`, `/login-history`, `/settings`, `/health`. Barcha list endpointlarda `page, limit, search, sortBy, sortOrder` va filterlar bor.

To‘liq kontrakt: [docs/api.md](docs/api.md).

## 11. Swagger

http://localhost:4000/api/docs — "Authorize" tugmasiga `POST /auth/login`dan olingan `accessToken`ni kiriting.

## 12. Default akkauntlar (development)

| Rol | Login | Parol |
|---|---|---|
| Admin | `admin01` | `admin01` |
| Kiosk | `panel01` | `panel01` |
| Registrator | `registrar01` | `registrar01` |
| Shifokorlar | `doctor01` … `doctor05` | login bilan bir xil |

> ⚠️ `NODE_ENV=production`da seed qilingan akkauntlar `mustChangePassword=true` bo‘ladi: parol almashtirilmaguncha barcha API'lar `403 PASSWORD_CHANGE_REQUIRED` qaytaradi va frontend foydalanuvchini `/change-password`ga yo‘naltiradi. Parollar bcrypt bilan hash qilinadi.

## 13. Rollar

Backend'da global `JwtAuthGuard` (hamma endpoint default yopiq) + `@Roles()` bilan `RolesGuard`. Har bir so‘rovda foydalanuvchi statusi DB'dan tekshiriladi — bloklangan/deaktivatsiya qilingan xodim darhol kira olmaydi. Frontend route guard (`middleware/auth.global.ts`) faqat UX uchun; himoya backend'da.

Ruxsatlar matritsasi: [docs/roles-permissions.md](docs/roles-permissions.md).

## 14. Navbat tizimi

- Raqam: `<bo‘lim prefiksi><kunlik tartib raqami>` → `A19`, `L7`, `U103`. Har kuni (Asia/Tashkent) 1 dan boshlanadi.
- Generatsiya atomik: `queue_counters` jadvalida `INSERT … ON CONFLICT DO UPDATE SET last_number = last_number + 1 RETURNING` checkout transaction ichida + `UNIQUE(queue_date, ticket_number)`. 10 ta registrator bir vaqtda ishlasa ham dublikat chiqmaydi.
- Bemor bir nechta shifokorga yozilsa — har bir shifokor uchun alohida talon.
- Statuslar: `WAITING → CALLED → IN_PROGRESS → COMPLETED`, shuningdek `SKIPPED` (kelmadi, qayta navbatga qo‘yish mumkin) va `CANCELLED`. Noto‘g‘ri o‘tish → `409`.
- Real-time: Socket.IO `/realtime` — `queue:called`, `queue:updated`, `kiosk:new`. TV ekrani ovozli e'lon qiladi: *"A19 navbatdagi bemor, 204-xonaga marhamat."* (ovoz moduli `VoiceProvider` interfeysi orqali almashtiriladi).

Batafsil: [docs/queue-system.md](docs/queue-system.md).

## 15. To‘lov tizimi

- Turlar: `CASH` (Naqd), `CARD` (Karta), `CONTRACT` (Shartnoma — shartnoma raqami majburiy)
- Holatlar: `PAID`, `PARTIALLY_PAID`, `UNPAID`, `REFUNDED`, `CANCELLED`
- Har bir pul harakati `payment_transactions`da (`PAYMENT` / `REFUND`) — qisman to‘lov, keyinroq qo‘shimcha to‘lov, qisman/to‘liq refund qo‘llab-quvvatlanadi
- Checkout (bemor + to‘lov + itemlar + shartnoma + navbat + audit) **bitta DB transaction** — xato bo‘lsa to‘liq rollback
- Dublikat to‘lovdan himoya: `idempotencyKey` (UNIQUE)
- `payment_items` xizmat nomi/narxini snapshot qiladi; narx o‘zgarishi `service_price_history`da va auditda saqlanadi
- To‘lanmagan to‘lovni bekor qilish (`cancel`) yoki to‘langanini qaytarish (`refund`, faqat Admin) — kutayotgan navbatlar avtomatik bekor bo‘ladi

## 16. Hisobotlar

Admin → Hisobotlar: to‘lovlar (sana/oraliq, shifokor, xizmat, bo‘lim, to‘lov turi, status), bemorlar, xizmatlar, shifokorlar, bo‘limlar, navbatlar (o‘rtacha kutish/xizmat vaqti), audit log, kirish tarixi. Dashboard: bugungi bemorlar, xizmatlar, to‘lovlar, tushum (Naqd/Karta/Shartnoma), kutayotganlar, faol shifokorlar va kunlik/haftalik/oylik/yillik grafiklar. Tushum cash-flow asosida (to‘lovlar − refundlar).

## 17. Excel / PDF export

`GET /api/v1/reports/export/:type?format=xlsx|pdf&<filterlar>` — `type`: `payments, patients, services, doctors, queues, audit, login-history`. Fayl sarlavhasida davr va jami ko‘rsatkichlar bo‘ladi (masalan, `01.09.2026 - 30.09.2026 · Jami bemorlar: 1 245 · Jami tushum: 154 200 000 UZS`). Chek: `GET /payments/:id/receipt/pdf` (80 mm termoprinter formati) yoki brauzerdan print.

## 18. Production deployment

```bash
cp .env.example .env.production   # secret'lar, domenlar, NODE_ENV=production, SEED_DEMO_DATA=false
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Nginx + HTTPS, WebSocket proxy, masshtablash, backup va tekshiruv ro‘yxati: [docs/deployment.md](docs/deployment.md).
