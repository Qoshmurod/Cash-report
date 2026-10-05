# Clinika / LabMed

Clinika LabMed — Nuxt 3, NestJS, Prisma va PostgreSQL asosidagi Docker Compose ilovasi.

## Talablar

- Docker Engine yoki Docker Desktop va Docker Compose v2
- Production uchun HTTPS reverse proxy yoki HTTPS tunnel

## Birinchi sozlash

`.env.example` faylidan `.env` nusxa yarating va maxfiy qiymatlarni o'zingiznikiga almashtiring. PowerShell'da `Copy-Item .env.example .env`, Linux/macOS'da `cp .env.example .env` buyrug'ini ishlating. `.env` faylini Git'ga qo'shmang.

PowerShell'da tasodifiy 32 baytli hex qiymat yaratish:

```powershell
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$rng.Dispose()
[BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
```

Bu buyruqni database paroli va JWT maxfiy kaliti uchun alohida ishlating. DB paroli URL uchun xavfsiz belgilar bilan kamida 24 ta, JWT maxfiy kaliti esa kamida 32 ta belgidan iborat bo'lsin. Super Admin parolini kamida 12 ta belgidan tanlang. Linux/macOS'da 32 baytli hex qiymat yaratish uchun `openssl rand -hex 32` buyrug'idan foydalaning.

`.env` faylida quyidagi qiymatlarni kiriting:

```dotenv
POSTGRES_USER=clinika
POSTGRES_PASSWORD=
POSTGRES_DB=clinika
JWT_ACCESS_SECRET=
OWNER_NAME=Super Admin
OWNER_LOGIN=
OWNER_PASSWORD=
APP_ENV=production
COOKIE_SECURE=true
```

## Lokal sinov (HTTP)

`.env` faylga maxfiy qiymatlarni kiritgandan so'ng:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Ilova `http://localhost:8081` manzilida ochiladi. Development override lokal HTTP sinovi uchun `APP_ENV=development` va `COOKIE_SECURE=false` qiymatlarini qo'llaydi. Kirish uchun `.env` faylidagi `OWNER_LOGIN` va `OWNER_PASSWORD` ishlatiladi; standart login/parol yo'q. Development override web, API va PostgreSQL uchun mos ravishda `3002`, `3001`, `5432` localhost portlarini beradi; native frontend preview ishlayotgan bo'lsa u `3000` portida qoladi.

Ishga tushganini tekshirish:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
curl http://localhost:8081/api/v1/health
```

`db`, `api`, `web` xizmatlari `healthy` holatida bo'lishi kerak; health endpoint `{ "ok": true, ... }` javobini qaytaradi. Windows PowerShell'da `curl` o'rniga `curl.exe` ishlating.

To'xtatish uchun ayni `-f` parametrlarini ko'rsatib `docker compose down` buyrug'ini bajaring. `docker compose down -v` database'dagi barcha saqlangan ma'lumotlarni o'chiradi; faqat ataylab tozalashda foydalaning.

## Production'ga joylash

1. `.env` faylida kuchli va alohida maxfiy qiymatlar belgilang; `APP_ENV=production`, `COOKIE_SECURE=true` bo'lsin.
2. HTTPS reverse proxy yoki tunnelni hostdagi `http://127.0.0.1:8081` manziliga ulang va tashqi kirish faqat HTTPS orqali bo'lishini ta'minlang. Compose porti faqat localhost’da tinglaydi. Session cookie `HttpOnly`, `SameSite=Lax`, `Secure` atributlariga ega.
3. `docker compose up --build -d` buyrug'ini ishga tushiring. `docker compose ps` orqali `db`, `api`, `web` xizmatlari `healthy` holatga kelganini tekshiring.
4. Muammolarni `docker compose logs -f api` va `docker compose logs -f web` orqali ko'ring. Production Compose to'g'ridan-to'g'ri internetga ochilmaydi; HTTPS proxy yoki tunnelni hostda alohida sozlang.

Kerakli qiymatlar yetishmasa, Compose ishga tushmaydi. API maxfiy kalit uzunligi, admin credential va production cookie sozlamalarini start paytida qayta tekshiradi. Ilova hozir faqat access JWT tokenidan foydalanadi. Prisma sxemasi migratsiya fayllari bilan emas, `prisma db push` orqali boshqariladi (`apps/api` ichida `npm run prisma:push` mavjud). API konteyneri ishga tushganda `db push` bajaradi, ammo `--accept-data-loss` berilmaydi; ma'lumotni o'chirishi mumkin bo'lgan sxema o'zgarishi avtomatik tasdiqlanmaydi. Har bir production yangilashdan oldin backup oling va `docker compose logs api` chiqishini tekshiring. DB push migration history yaratmaydi; versiyalangan Prisma migratsiyalariga o'tishda avval schema va amaldagi DB holatini solishtirib, alohida migration rejasini tayyorlang.

Oldingi `admin` login/parol, database paroli yoki JWT maxfiy kalitlarini ishlatmang. `OWNER_NAME`, `OWNER_LOGIN`, `OWNER_PASSWORD` faqat yangi Super Admin yaratishda seed qilinadi. Database'da owner allaqachon mavjud bo'lsa, `.env` qiymatlarini o'zgartirish uning login/parolini almashtirmaydi yoki yangi owner yaratmaydi.

### Docker'ni Windows + Ubuntu/WSL'da ishga tushirish

Windows'da Docker CLI daemon'ga ulana olmasa, Docker Desktop'ni ochib **Settings → Resources → WSL Integration** bo'limida Ubuntu integratsiyasini yoqing. Ubuntu terminalida:

```sh
cd /mnt/c/Users/L.E.G.E.N.D.A/PycharmProjects/copilot-worktrees/Cash-report/qoshmurod-fluffy-umbrella
docker version
docker compose version
```

`docker version` Client va Server qismlarini ko'rsatgandan keyingina `.env`ni sozlab development Compose buyrug'ini ishga tushiring. Agar Ubuntu ichida Docker Engine allaqachon o'rnatilgan bo'lsa, Ubuntu admin huquqi bilan `sudo systemctl start docker` ishlatish mumkin. Boshqa xizmatlarni to'xtatish yoki `docker compose down -v` ishlatish shart emas.

## Asosiy imkoniyatlar

- Kirish/chiqish va rollarga asoslangan huquqlar: Super Admin, Rahbar, Buxgalter, Kassir, Mutaxassis
- Boshqaruv paneli, kassa, to'lov turlari va kunni yopish
- Xizmatlar, bo'limlar, bemor/mijozlar va xodimlarni boshqarish
- Shartnoma to'lovlari, qoldiq summa va 10% ogohlantirishi
- Audit jurnali, davr/to'lov turi bo'yicha hisobotlar
- Excel eksporti va xizmatlarni Excel'dan import qilish
- PostgreSQL saqlash joyi va Nginx reverse proxy

### Excel importi

Birinchi sheet quyidagi ustunlarga ega bo'lishi kerak:

`code | name | deptKey | price`

Misol: `BAK-01 | Staphylococcus aureus tekshiruvi | bakteriologiya | 87376`

## Zaxiralash va tiklash

Linux/macOS/WSL terminalida zaxira nusxa olish:

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > backup.sql
```

Tiklash (mavjud database ma'lumotlariga ta'sir qiladi):

```sh
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup.sql
```

Windows'da backup yaratish uchun ilova ishlayotgan loyiha papkasidan `backup-windows.bat` faylini ishga tushiring. Skript database nomi va foydalanuvchisini konteynerdan oladi. Zaxira nusxani Git repository'dan tashqarida, kirish huquqi cheklangan joyda saqlang.
